import type { Parts } from "@prisma/client";
import type { PartFormValues } from "@/lib/validations/part";
import type { PartCategory, PartCondition } from "@/lib/part-values";

export interface PartRow {
  id: string;
  title: string;
  category: PartCategory;
  brand: string;
  partNumber: string | null;
  condition: PartCondition;
  quantity: number;
  price: number;
  originalPrice: number | null;
  tag: string | null;
  freeShipping: boolean;
  city: string | null;
  location: string | null;
  status: string;
  oemNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  compatibleModelIds: string[];
}

export function serializePart(
  part: Parts,
  compatibleModelIds: string[],
): PartRow {
  return {
    id: part.id.toString(),
    title: part.title,
    category: part.category as PartCategory,
    brand: part.brand,
    partNumber: part.partNumber,
    condition: part.condition as PartCondition,
    quantity: part.quantity,
    price: Number(part.price),
    originalPrice:
      part.originalPrice === null ? null : Number(part.originalPrice),
    tag: part.tag,
    freeShipping: part.freeShipping,
    city: part.city,
    location: part.location,
    status: part.status,
    oemNumber: part.oemNumber,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
    compatibleModelIds,
  };
}

export function partToFormDefaults(part: PartRow): PartFormValues {
  return {
    title: part.title,
    category: part.category,
    brand: part.brand,
    partNumber: part.partNumber,
    condition: part.condition,
    quantity: part.quantity,
    price: part.price,
    originalPrice: part.originalPrice,
    tag: part.tag,
    freeShipping: part.freeShipping,
    city: part.city,
    location: part.location,
    status: part.status as PartFormValues["status"],
    oemNumber: part.oemNumber,
    compatibleModelIds: part.compatibleModelIds,
  };
}