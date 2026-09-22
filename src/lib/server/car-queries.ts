

import type { Car } from "@prisma/client";
import { prisma } from "@/lib/server/db";

export function carIdToBigInt(rawId: string): bigint | null {
  try {
    const id = BigInt(rawId);
    return id >= BigInt(0) ? id : null;
  } catch {
    return null;
  }
}

export async function findCarsByBrandModel(
  brand: string,
  model: string,
): Promise<Car[]> {
  return prisma.car.findMany({
    where: { brand, model },
    orderBy: { createdAt: "desc" },
  });
}

export async function findCarById(rawId: string): Promise<Car | null> {
  const id = carIdToBigInt(rawId);
  if (id === null) return null;
  return prisma.car.findUnique({ where: { id } });
}