import { prisma } from "@/lib/server/db";
import type { MediaRow } from "@/lib/server/media-queries";
import { getPresignedUrlAction } from "@/lib/server/media-actions";
import { getMediaByParent, verifyParentExists } from "@/lib/server/media-queries";
import type { CarNavContext } from "@/lib/server/car-actions";
import type { PartNavContext } from "@/lib/server/part-actions";
import {
  carListingsPath,
  carViewPath,
} from "@/lib/car-routes";
import {
  partListingsPath,
  partViewPath,
} from "@/lib/part-routes";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrandByName, findModelByName } from "@/lib/reference/slug";

export interface TransferValidationResult {
  success: boolean;
  timestamp: string;
  summary: {
    totalCars: number;
    totalParts: number;
    totalMedia: number;
    validCars: number;
    validParts: number;
    validMedia: number;
    orphanMedia: number;
    missingSellers: number;
    missingCompatibility: number;
    missingImages: number;
    invalidPrimary: number;
    invalidOrder: number;
    missingMinioObjects: number;
  };
  errors: TransferValidationError[];
  warnings: TransferValidationWarning[];
}

export interface TransferValidationError {
  type: "missing_seller" | "missing_compatibility" | "missing_image" | "invalid_primary" | "invalid_order" | "orphan_media" | "missing_minio_object" | "invalid_category" | "invalid_condition" | "catalog_mismatch" | "seller_validation_failed";
  entityType: "car" | "part" | "media";
  entityId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface TransferValidationWarning {
  type: "catalog_extra_brands" | "catalog_extra_models" | "low_image_count" | "high_image_count";
  message: string;
  details?: Record<string, unknown>;
}

interface MediaValidationResult {
  isValid: boolean;
  isOrphan: boolean;
}

/**
 * Read-only transfer preflight validation.
 * Validates that existing listings are ready for export without making any changes.
 */
async function validateTransferReadiness(): Promise<TransferValidationResult> {
  const startTime = new Date();
  
  // Initialize counters
  let totalCars = 0;
  let totalParts = 0;
  let totalMedia = 0;
  let validCars = 0;
  let validParts = 0;
  let validMedia = 0;
  let orphanMedia = 0;
  let missingSellers = 0;
  let missingCompatibility = 0;
  let missingImages = 0;
  let invalidPrimary = 0;
  let invalidOrder = 0;
  let missingMinioObjects = 0;
  
  const errors: TransferValidationError[] = [];
  const warnings: TransferValidationWarning[] = [];
  
  try {
    // Load catalog for validation
    const catalog = await loadDatabaseCatalog();
    
    // Validate Cars
    const cars = await prisma.car.findMany({
      select: {
        id: true,
        sellerId: true,
        title: true,
        brand: true,
        model: true,
        year: true,
        price: true,
        originalPrice: true,
        mileageKm: true,
        bodyStyle: true,
        fuelType: true,
        transmission: true,
        condition: true,
        tag: true,
        color: true,
        vin: true,
        description: true,
        city: true,
        location: true,
        status: true,
        rating: true,
        inspectionScore: true,
        publishedAt: true,
        soldAt: true,
      }
    });
    
    totalCars = cars.length;
    
    for (const car of cars) {
      const carIsValid = await validateCar(car, catalog, errors, warnings);
      if (carIsValid) validCars++;
    }
    
    // Validate Parts
    const parts = await prisma.parts.findMany({
      include: {
        compatibilities: {
          include: {
            vehicleModel: {
              include: {
                brand: true
              }
            }
          }
        }
      }
    });
    
    totalParts = parts.length;
    
    for (const part of parts) {
      const partIsValid = await validatePart(part, catalog, errors, warnings);
      if (partIsValid) validParts++;
    }
    
    // Validate Media
    const media = await prisma.media.findMany({
      orderBy: {
        createdAt: "asc"
      }
    });
    
    totalMedia = media.length;
    
    for (const mediaItem of media) {
      const mediaResult = await validateMedia(mediaItem, errors, warnings);
      if (mediaResult.isValid) validMedia++;
      if (mediaResult.isOrphan) orphanMedia++;
    }
    
  } catch (error) {
    console.error("Transfer validation failed:", error);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      summary: {
        totalCars: 0,
        totalParts: 0,
        totalMedia: 0,
        validCars: 0,
        validParts: 0,
        validMedia: 0,
        orphanMedia: 0,
        missingSellers: 0,
        missingCompatibility: 0,
        missingImages: 0,
        invalidPrimary: 0,
        invalidOrder: 0,
        missingMinioObjects: 0
      },
      errors: [{
        type: "seller_validation_failed",
        entityType: "car",
        entityId: "unknown",
        message: `Transfer validation failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.stack : String(error) }
      }],
      warnings: []
    };
  }
  
  const endTime = new Date();
  
  // Compute summary from errors array
  const missingSellersCount = errors.filter(e => e.type === "missing_seller").length;
  const missingCompatibilityCount = errors.filter(e => e.type === "missing_compatibility").length;
  const missingImagesCount = errors.filter(e => e.type === "missing_image").length;
  const invalidPrimaryCount = errors.filter(e => e.type === "invalid_primary").length;
  const invalidOrderCount = errors.filter(e => e.type === "invalid_order").length;
  const orphanMediaCount = errors.filter(e => e.type === "orphan_media").length;
  const missingMinioObjectsCount = errors.filter(e => e.type === "missing_minio_object").length;
  const invalidCategoryCount = errors.filter(e => e.type === "invalid_category").length;
  const invalidConditionCount = errors.filter(e => e.type === "invalid_condition").length;
  const catalogMismatchCount = errors.filter(e => e.type === "catalog_mismatch").length;

  return {
    success: errors.length === 0,
    timestamp: endTime.toISOString(),
    summary: {
      totalCars,
      totalParts,
      totalMedia,
      validCars,
      validParts,
      validMedia,
      orphanMedia: orphanMediaCount,
      missingSellers: missingSellersCount,
      missingCompatibility: missingCompatibilityCount,
      missingImages: missingImagesCount,
      invalidPrimary: invalidPrimaryCount,
      invalidOrder: invalidOrderCount,
      missingMinioObjects: missingMinioObjectsCount
    },
    errors,
    warnings
  };
}

/**
 * Validate a single Car record
 */
async function validateCar(
  car: any, 
  catalog: any, 
  errors: TransferValidationError[],
  warnings: TransferValidationWarning[]
): Promise<boolean> {
  let isValid = true;
  
  // Check seller_id exists and is positive
  if (!car.sellerId || car.sellerId <= 0) {
    errors.push({
      type: "missing_seller",
      entityType: "car",
      entityId: car.id.toString(),
      message: `Car ${car.id} has invalid or missing seller_id: ${car.sellerId}`
    });
    isValid = false;
  }
  
  // Validate brand and model exist in catalog
  const brand = findBrandByName(catalog, car.brand);
  if (!brand) {
    errors.push({
      type: "catalog_mismatch",
      entityType: "car",
      entityId: car.id.toString(),
      message: `Car ${car.id} references unknown brand: ${car.brand}`
    });
    isValid = false;
  } else {
    const model = findModelByName(brand, car.model);
    if (!model) {
      errors.push({
        type: "catalog_mismatch",
        entityType: "car",
        entityId: car.id.toString(),
        message: `Car ${car.id} references unknown model: ${car.model} for brand ${car.brand}`
      });
      isValid = false;
    }
  }
  
  // Validate numeric ranges (basic sanity checks)
  if (car.year !== null && (car.year < 1900 || car.year > 2100)) {
    warnings.push({
      type: "catalog_extra_models",
      message: `Car ${car.id} has unusual year: ${car.year}`,
      details: { year: car.year }
    });
  }
  
  if (car.price !== null && car.price < 0) {
    errors.push({
      type: "invalid_primary",
      entityType: "car",
      entityId: car.id.toString(),
      message: `Car ${car.id} has negative price: ${car.price}`
    });
    isValid = false;
  }
  
  if (car.mileageKm !== null && car.mileageKm < 0) {
    errors.push({
      type: "invalid_primary",
      entityType: "car",
      entityId: car.id.toString(),
      message: `Car ${car.id} has negative mileage: ${car.mileageKm}`
    });
    isValid = false;
  }
  
  if (car.rating !== null && (car.rating < 0 || car.rating > 10)) {
    errors.push({
      type: "invalid_primary",
      entityType: "car",
      entityId: car.id.toString(),
      message: `Car ${car.id} has rating out of range [0,10]: ${car.rating}`
    });
    isValid = false;
  }
  
  return isValid;
}

/**
 * Validate a single Part record
 */
async function validatePart(
  part: any, 
  catalog: any, 
  errors: TransferValidationError[],
  warnings: TransferValidationWarning[]
): Promise<boolean> {
  let isValid = true;
  
  // Validate category
  const validCategories = [
    "engine", "transmission", "suspension", "brakes", "exhaust", "electrical",
    "tires_wheels", "wheels", "body_exterior", "interior", "fluids_lubricants",
    "accessories", "other"
  ];
  
  if (!validCategories.includes(part.category)) {
    errors.push({
      type: "invalid_category",
      entityType: "part",
      entityId: part.id.toString(),
      message: `Part ${part.id} has invalid category: ${part.category}`,
      details: { validCategories }
    });
    isValid = false;
  }
  
  // Validate condition
  const validConditions = ["new", "used", "refurbished"];
  if (!validConditions.includes(part.condition)) {
    errors.push({
      type: "invalid_condition",
      entityType: "part",
      entityId: part.id.toString(),
      message: `Part ${part.id} has invalid condition: ${part.condition}`,
      details: { validConditions }
    });
    isValid = false;
  }
  
  // Validate quantity
  if (part.quantity !== null && part.quantity < 1) {
    errors.push({
      type: "invalid_primary",
      entityType: "part",
      entityId: part.id.toString(),
      message: `Part ${part.id} has invalid quantity: ${part.quantity} (must be >= 1)`
    });
    isValid = false;
  }
  
  // Validate price
  if (part.price !== null && part.price < 0) {
    errors.push({
      type: "invalid_primary",
      entityType: "part",
      entityId: part.id.toString(),
      message: `Part ${part.id} has negative price: ${part.price}`
    });
    isValid = false;
  }
  
  // Check compatibility - at least one compatible model required
  const compatibilityCount = part.compatibilities?.length || 0;
  if (compatibilityCount === 0) {
    errors.push({
      type: "missing_compatibility",
      entityType: "part",
      entityId: part.id.toString(),
      message: `Part ${part.id} has no compatible vehicle models`
    });
    isValid = false;
  } else {
    // Validate each compatibility entry
    for (const compat of part.compatibilities) {
      if (!compat.vehicleModel || !compat.vehicleModel.brand) {
        errors.push({
          type: "missing_compatibility",
          entityType: "part",
          entityId: part.id.toString(),
          message: `Part ${part.id} has incomplete compatibility data`
        });
        isValid = false;
        break;
      }
      
      const brandName = compat.vehicleModel.brand.name;
      const modelName = compat.vehicleModel.name;
      
      const brand = findBrandByName(catalog, brandName);
      if (!brand) {
        errors.push({
          type: "missing_compatibility",
          entityType: "part",
          entityId: part.id.toString(),
          message: `Part ${part.id} references unknown brand in compatibility: ${brandName}`
        });
        isValid = false;
        break;
      }
      
      const model = findModelByName(brand, modelName);
      if (!model) {
        errors.push({
          type: "missing_compatibility",
          entityType: "part",
          entityId: part.id.toString(),
          message: `Part ${part.id} references unknown model: ${modelName} for brand ${brandName}`
        });
        isValid = false;
        break;
      }
    }
  }
  
  return isValid;
}

/**
 * Validate a single Media record
 */
async function validateMedia(
  media: any,
  errors: TransferValidationError[],
  warnings: TransferValidationWarning[]
): Promise<MediaValidationResult> {
  let isValid = true;
  let isOrphan = false;
  
  // Validate mediable_type
  if (!["car", "part"].includes(media.mediableType)) {
    errors.push({
      type: "invalid_primary",
      entityType: "media",
      entityId: media.id.toString(),
      message: `Media ${media.id} has invalid mediable_type: ${media.mediableType} (expected 'car' or 'part')`
    });
    isValid = false;
  }
  
  // Validate parent exists
  try {
    const parentExists = await verifyParentExists(
      media.mediableType as "car" | "part",
      BigInt(media.mediableId)
    );
    
    if (!parentExists) {
      errors.push({
        type: "orphan_media",
        entityType: "media",
        entityId: media.id.toString(),
        message: `Media ${media.id} references non-existent ${media.mediableType} ${media.mediableId}`
      });
      isOrphan = true;
      isValid = false;
    }
  } catch (error) {
    errors.push({
      type: "orphan_media",
      entityType: "media",
      entityId: media.id.toString(),
      message: `Media ${media.id} parent validation failed: ${error instanceof Error ? error.message : String(error)}`
    });
    isOrphan = true;
    isValid = false;
  }
  
  return { isValid, isOrphan };
}

export { validateTransferReadiness };
