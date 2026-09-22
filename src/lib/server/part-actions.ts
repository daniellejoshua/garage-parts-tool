"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/db";
import { partFormSchema } from "@/lib/validations/part";
import { partIdToBigInt } from "@/lib/server/part-queries";
import { partListingsPath, partViewPath } from "@/lib/part-routes";
import { deleteAllMediaForParentAction } from "@/lib/server/media-actions";

export interface PartNavContext {
  brandSlug: string;
  modelSlug: string;
}

export type PartActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function failure(error: string): PartActionResult {
  return { ok: false, error };
}

function uniqueBigInts(ids: bigint[]): bigint[] {
  return [...new Set(ids.map((id) => id))];
}

export async function createPart(
  context: PartNavContext,
  input: unknown,
  navigatedModelId: bigint,
): Promise<PartActionResult> {
  const parsed = partFormSchema.safeParse(input);
  if (!parsed.success) {
    return failure("The part listing data is invalid. Check the form and try again.");
  }

  const data = parsed.data;
  const compatibleIds = uniqueBigInts([
    navigatedModelId,
    ...data.compatibleModelIds,
  ]);
  if (compatibleIds.length === 0) {
    return failure("Select at least one compatible vehicle model.");
  }

  try {
    const modelCount = await prisma.vehicleModel.count({
      where: { id: { in: compatibleIds } },
    });
    if (modelCount !== compatibleIds.length) {
      return failure("One or more selected vehicle models do not exist.");
    }
  } catch {
    return failure("Could not validate selected vehicle models. Please try again.");
  }

  let partId: bigint;
  try {
    partId = await prisma.$transaction(async (tx) => {
      const part = await tx.parts.create({
        data: {
          title: data.title,
          category: data.category,
          brand: data.brand,
          partNumber: data.partNumber,
          condition: data.condition,
          quantity: data.quantity,
          price: data.price,
          originalPrice: data.originalPrice,
          tag: data.tag,
          freeShipping: data.freeShipping,
          city: data.city,
          location: data.location,
          status: data.status,
          oemNumber: data.oemNumber,
        },
      });

      await tx.partCompatibility.createMany({
        data: compatibleIds.map((vehicleModelId) => ({
          partId: part.id,
          vehicleModelId,
        })),
      });

      return part.id;
    });
  } catch {
    return failure("Could not create the part listing. Please try again.");
  }

  revalidatePath(partListingsPath(context.brandSlug, context.modelSlug));
  return { ok: true, id: partId.toString() };
}

export async function updatePart(
  context: PartNavContext,
  rawId: string,
  input: unknown,
): Promise<PartActionResult> {
  const id = partIdToBigInt(rawId);
  if (id === null) {
    return failure("Invalid listing id.");
  }

  const parsed = partFormSchema.safeParse(input);
  if (!parsed.success) {
    return failure("The part listing data is invalid. Check the form and try again.");
  }

  const data = parsed.data;
  const compatibleIds = uniqueBigInts(data.compatibleModelIds);
  if (compatibleIds.length === 0) {
    return failure("Select at least one compatible vehicle model.");
  }

  try {
    const modelCount = await prisma.vehicleModel.count({
      where: { id: { in: compatibleIds } },
    });
    if (modelCount !== compatibleIds.length) {
      return failure("One or more selected vehicle models do not exist.");
    }
  } catch {
    return failure("Could not validate selected vehicle models. Please try again.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.partCompatibility.findMany({
        where: { partId: id },
        select: { vehicleModelId: true },
      });
      const existingSet = new Set(existing.map((row) => row.vehicleModelId.toString()));
      const newSet = new Set(compatibleIds.map((row) => row.toString()));

      await tx.parts.update({
        where: { id },
        data: {
          title: data.title,
          category: data.category,
          brand: data.brand,
          partNumber: data.partNumber,
          condition: data.condition,
          quantity: data.quantity,
          price: data.price,
          originalPrice: data.originalPrice,
          tag: data.tag,
          freeShipping: data.freeShipping,
          city: data.city,
          location: data.location,
          status: data.status,
          oemNumber: data.oemNumber,
        },
      });

      const toAdd = compatibleIds.filter(
        (m) => !existingSet.has(m.toString()),
      );
      const toRemove = existing
        .filter((m) => !newSet.has(m.vehicleModelId.toString()))
        .map((m) => m.vehicleModelId);

      if (toRemove.length > 0) {
        await tx.partCompatibility.deleteMany({
          where: { partId: id, vehicleModelId: { in: toRemove } },
        });
      }
      if (toAdd.length > 0) {
        await tx.partCompatibility.createMany({
          data: toAdd.map((vehicleModelId) => ({
            partId: id,
            vehicleModelId,
          })),
        });
      }
    });

  } catch {
    return failure("Could not update the part listing. Please try again.");
  }

  revalidatePath(partListingsPath(context.brandSlug, context.modelSlug));
  redirect(partViewPath(context.brandSlug, context.modelSlug, id.toString()));
}

export async function deletePart(
  context: PartNavContext,
  rawId: string,
): Promise<PartActionResult> {
  const id = partIdToBigInt(rawId);
  if (id === null) {
    return failure("Invalid listing id.");
  }

  const mediaResult = await deleteAllMediaForParentAction("part", id.toString(), context.brandSlug, context.modelSlug);
  if (!mediaResult.ok) {
    return failure(`Could not delete part listing: ${mediaResult.error}`);
  }

  try {
    await prisma.parts.delete({ where: { id } });
  } catch {
    return failure("Could not delete the part listing. Please try again.");
  }

  revalidatePath(partListingsPath(context.brandSlug, context.modelSlug));
  return { ok: true };
}
