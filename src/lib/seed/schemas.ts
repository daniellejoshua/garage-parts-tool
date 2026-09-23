import { z } from "zod";

export const PART_CATEGORIES = [
  "engine",
  "transmission",
  "suspension",
  "brakes",
  "exhaust",
  "electrical",
  "tires_wheels",
  "wheels",
  "body_exterior",
  "interior",
  "fluids_lubricants",
  "accessories",
  "other",
] as const;

export const PART_CONDITIONS = ["new", "used", "refurbished"] as const;

const isoDatetime = z
  .string()
  .datetime()
  .nullable();

const brandModel = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

export const carSeedSchema = z.object({
  seller_id: z.number().int().positive(),
  title: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.number().int().min(1900).max(2100),
  price: z.number().min(0),
  original_price: z.number().min(0).nullable(),
  mileage_km: z.number().int().min(0),
  body_style: z.string().nullable(),
  fuel_type: z.string().nullable(),
  transmission: z.string().nullable(),
  condition: z.string().nullable(),
  tag: z.string().nullable(),
  color: z.string().nullable(),
  vin: z.string().nullable(),
  description: z.string().nullable(),
  city: z.string().nullable(),
  location: z.string().nullable(),
  status: z.string().trim().min(1),
  rating: z.number().min(0).max(10).nullable(),
  inspection_score: z.number().int().min(0).nullable(),
  published_at: isoDatetime,
  sold_at: isoDatetime,
});

export const partSeedSchema = z.object({
  title: z.string().trim().min(1),
  category: z.enum(PART_CATEGORIES),
  brand: z.string().trim().min(1),
  part_number: z.string().nullable(),
  oem_number: z.string().nullable(),
  condition: z.enum(PART_CONDITIONS),
  quantity: z.number().int().min(0),
  price: z.number().min(0),
  original_price: z.number().min(0).nullable(),
  tag: z.string().nullable(),
  free_shipping: z.boolean(),
  city: z.string().nullable(),
  location: z.string().nullable(),
  status: z.string().trim().min(1),
  compatibility: z.array(brandModel),
});

export type CarSeed = z.infer<typeof carSeedSchema>;
export type PartSeed = z.infer<typeof partSeedSchema>;