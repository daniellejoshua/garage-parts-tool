import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import {
  carListingsPath,
  carViewPath,
} from "@/lib/car-routes";
import { findCarById } from "@/lib/server/car-queries";
import {
  carToFormDefaults,
  serializeCar,
} from "@/lib/server/serialize-car";
import { getMediaByParent } from "@/lib/server/media-queries";
import { CarMultiStepForm } from "@/components/cars/car-multi-step-form";

export const metadata: Metadata = {
  title: "Edit car listing",
};

export const dynamic = "force-dynamic";

export default async function EditCarListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ brand: string; model: string; id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
  const { brand: brandSlug, model: modelSlug, id } = await params;
  const { section } = await searchParams;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();
  const model = findModel(brand, modelSlug);
  if (!model) notFound();

  const car = await findCarById(id);
  if (!car) notFound();

  const row = serializeCar(car);
  const context = { brandSlug, modelSlug };

  const carId = BigInt(id);
  const media = await getMediaByParent("car", carId);

  return (
    <div>
      <CarMultiStepForm
        mode="edit"
        context={context}
        carId={row.id}
        defaults={carToFormDefaults(row)}
        backHref={carListingsPath(brandSlug, modelSlug)}
        viewHref={carViewPath(brandSlug, modelSlug, row.id)}
        initialMedia={media}
        initialStep={section === "media" ? 4 : 1}
      />
    </div>
  );
}
