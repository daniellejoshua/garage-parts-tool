import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { modelsPath } from "@/lib/modules";
import { carListingsPath } from "@/lib/car-routes";
import { findCarById } from "@/lib/server/car-queries";
import { serializeCar } from "@/lib/server/serialize-car";
import { getMediaByParent } from "@/lib/server/media-queries";
import { Trail } from "@/components/app/trail";
import { CarDetail } from "@/components/cars/car-detail";

export const metadata: Metadata = {
  title: "Car listing",
};

export const dynamic = "force-dynamic";

export default async function CarListingDetailPage({
  params,
}: {
  params: Promise<{ brand: string; model: string; id: string }>;
}) {
  const { brand: brandSlug, model: modelSlug, id } = await params;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();
  const model = findModel(brand, modelSlug);
  if (!model) notFound();

  const car = await findCarById(id);
  if (!car) notFound();

  const row = serializeCar(car);
  if (row.brand !== brand.name || row.model !== model.name) notFound();
  const context = { brandSlug, modelSlug };

  const carId = BigInt(id);
  const media = await getMediaByParent("car", carId);

  return (
    <div className="flex flex-col gap-3">
      <Trail
        items={[
          { label: "Cars", href: "/cars/brands" },
          { label: brand.name, href: modelsPath("cars", brandSlug) },
          { label: model.name, href: carListingsPath(brandSlug, modelSlug) },
          { label: `Listing #${row.id}` },
        ]}
      />
      <CarDetail car={row} context={context} media={media} />
    </div>
  );
}
