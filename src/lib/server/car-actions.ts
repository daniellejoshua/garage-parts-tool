"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { carFormSchema } from "@/lib/validations/car";
import { carIdToBigInt } from "@/lib/server/car-queries";
import {
  carListingsPath,
  carViewPath,
} from "@/lib/car-routes";
import { deleteAllMediaForParentAction } from "@/lib/server/media-actions";

export interface CarNavContext {
  brandSlug: string;
  modelSlug: string;
}

export type CarActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function failure(error: string): CarActionResult {
  return { ok: false, error };
}

function createFailure(error: unknown): CarActionResult {
  console.error("Could not create car listing:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2000" || error.code === "P2020") {
      return failure("One or more values are too large for the listing fields.");
    }
    return failure(`Could not create the car listing (database error ${error.code}).`);
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return failure("One or more listing values could not be stored. Check the numeric fields and try again.");
  }

  return failure("Could not create the car listing. Please try again.");
}

export async function createCar(
  context: CarNavContext,
  input: unknown,
): Promise<CarActionResult> {
  const parsed = carFormSchema.safeParse(input);
  if (!parsed.success) {
    return failure("The listing data is invalid. Check the form and try again.");
  }

  const data = parsed.data;

  let createdCarId: bigint;
  try {
    const car = await prisma.car.create({
      data: {
        sellerId: BigInt(data.sellerId),
        title: data.title,
        brand: data.brand,
        model: data.model,
        year: data.year,
        price: data.price,
        originalPrice: data.originalPrice,
        mileageKm: data.mileageKm,
        bodyStyle: data.bodyStyle,
        fuelType: data.fuelType,
        transmission: data.transmission,
        condition: data.condition,
        tag: data.tag,
        color: data.color,
        vin: data.vin,
        description: data.description,
        city: data.city,
        location: data.location,
        status: data.status,
        rating: data.rating,
        inspectionScore: data.inspectionScore,
        publishedAt: data.publishedAt,
        soldAt: data.soldAt,
      },
    });
    createdCarId = car.id;

  } catch (error) {
    return createFailure(error);
  }

  revalidatePath(carListingsPath(context.brandSlug, context.modelSlug));
  return { ok: true, id: createdCarId.toString() };
}

export async function updateCar(
  context: CarNavContext,
  rawId: string,
  input: unknown,
): Promise<CarActionResult> {
  const parsed = carFormSchema.safeParse(input);
  if (!parsed.success) {
    return failure("The listing data is invalid. Check the form and try again.");
  }

  const id = carIdToBigInt(rawId);
  if (id === null) {
    return failure("Invalid listing id.");
  }

  const data = parsed.data;

  try {
    await prisma.car.update({
      where: { id },
      data: {
        sellerId: BigInt(data.sellerId),
        title: data.title,
        brand: data.brand,
        model: data.model,
        year: data.year,
        price: data.price,
        originalPrice: data.originalPrice,
        mileageKm: data.mileageKm,
        bodyStyle: data.bodyStyle,
        fuelType: data.fuelType,
        transmission: data.transmission,
        condition: data.condition,
        tag: data.tag,
        color: data.color,
        vin: data.vin,
        description: data.description,
        city: data.city,
        location: data.location,
        status: data.status,
        rating: data.rating,
        inspectionScore: data.inspectionScore,
        publishedAt: data.publishedAt,
        soldAt: data.soldAt,
      },
    });

  } catch {
    return failure("Could not update the car listing. Please try again.");
  }

  revalidatePath(carListingsPath(context.brandSlug, context.modelSlug));
  redirect(carViewPath(context.brandSlug, context.modelSlug, id.toString()));
}

export async function deleteCar(
  context: CarNavContext,
  rawId: string,
): Promise<CarActionResult> {
  const id = carIdToBigInt(rawId);
  if (id === null) {
    return failure("Invalid listing id.");
  }

  const mediaResult = await deleteAllMediaForParentAction("car", id.toString(), context.brandSlug, context.modelSlug);
  if (!mediaResult.ok) {
    return failure(`Could not delete car listing: ${mediaResult.error}`);
  }

  try {
    await prisma.car.delete({ where: { id } });
  } catch {
    return failure("Could not delete the car listing. Please try again.");
  }

  revalidatePath(carListingsPath(context.brandSlug, context.modelSlug));
  return { ok: true };
}
