import { z } from "zod";

const toNull = (value: unknown): unknown => {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    (typeof value === "number" && Number.isNaN(value))
  ) {
    return null;
  }
  return value;
};

const requiredNumber = (options: {
  min: number;
  minMessage: string;
  int?: boolean;
  max?: number;
  maxMessage?: string;
}) => {
  let inner = z
    .coerce.number({ message: "Required" })
    .finite({ message: "Required" })
    .min(options.min, options.minMessage);
  if (options.int) inner = inner.int("Whole number required");
  if (options.max !== undefined) {
    inner = inner.max(options.max, options.maxMessage ?? "Value is too large");
  }
  return z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? NaN : value),
    inner,
  );
};

const optionalNumber = (options?: { min?: number; max?: number }) => {
  let inner = z.number().finite();
  if (options?.min !== undefined) inner = inner.min(options.min);
  if (options?.max !== undefined) inner = inner.max(options.max);
  return z.preprocess(toNull, inner.nullable());
};

const optionalInt = (options?: { max?: number }) => {
  let inner = z.number().int().nonnegative();
  if (options?.max !== undefined) inner = inner.max(options.max);
  return z.preprocess(toNull, inner.nullable());
};

const optionalText = () =>
  z.preprocess((value) => {
    const normalized = toNull(value);
    if (typeof normalized === "string") {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return normalized;
  }, z.string().nullable());

const optionalTimestamp = () =>
  z.preprocess((value) => {
    const normalized = toNull(value);
    if (normalized === null) return null;
    if (normalized instanceof Date) return normalized;
    const date = new Date(String(normalized));
    return Number.isNaN(date.getTime()) ? null : date;
  }, z.date().nullable());

export const carFormSchema = z.object({
  sellerId: requiredNumber({
    min: 1,
    minMessage: "Seller id is required",
    int: true,
  }),
  title: z.string().trim().min(1, "Title is required").max(300),
  brand: z.string().trim().min(1, "Brand is required").max(100),
  model: z.string().trim().min(1, "Model is required").max(100),
  year: requiredNumber({
    min: 1900,
    minMessage: "Year must be 1900 or later",
    int: true,
    max: 2100,
    maxMessage: "Year must be 2100 or earlier",
  }),
  price: requiredNumber({
    min: 0.01,
    minMessage: "Price must be greater than zero",
    max: 1_000_000_000,
    maxMessage: "Price is too large",
  }),
  originalPrice: optionalNumber({ min: 0, max: 1_000_000_000 }),
  mileageKm: requiredNumber({
    min: 0,
    minMessage: "Mileage is required",
    int: true,
    max: 2_147_483_647,
    maxMessage: "Mileage is too large",
  }),
  bodyStyle: optionalText(),
  fuelType: optionalText(),
  transmission: optionalText(),
  condition: optionalText(),
  tag: optionalText(),
  color: optionalText(),
  vin: optionalText(),
  description: optionalText(),
  city: optionalText(),
  location: optionalText(),
  status: z.string().trim().min(1, "Status is required").max(100),
  rating: optionalNumber({ min: 0, max: 10 }),
  inspectionScore: optionalInt({ max: 2_147_483_647 }),
  publishedAt: optionalTimestamp(),
  soldAt: optionalTimestamp(),
});

export interface CarFormValues {
  sellerId: number | null;
  title: string;
  brand: string;
  model: string;
  year: number | null;
  price: number | null;
  originalPrice: number | null;
  mileageKm: number | null;
  bodyStyle: string | null;
  fuelType: string | null;
  transmission: string | null;
  condition: string | null;
  tag: string | null;
  color: string | null;
  vin: string | null;
  description: string | null;
  city: string | null;
  location: string | null;
  status: string;
  rating: number | null;
  inspectionScore: number | null;
  publishedAt: string | null;
  soldAt: string | null;
}

export function emptyCarFormValues(brand: string, model: string): CarFormValues {
  return {
    sellerId: null,
    title: "",
    brand,
    model,
    year: null,
    price: null,
    originalPrice: null,
    mileageKm: null,
    bodyStyle: null,
    fuelType: null,
    transmission: null,
    condition: null,
    tag: null,
    color: null,
    vin: null,
    description: null,
    city: null,
    location: null,
    status: "",
    rating: null,
    inspectionScore: null,
    publishedAt: null,
    soldAt: null,
  };
}
