import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarFrontIcon, PlusIcon } from "lucide-react";
import { loadDatabaseCatalog } from "@/lib/reference/catalog-db";
import { findBrand, findModel } from "@/lib/reference/slug";
import { modelsPath } from "@/lib/modules";
import { carListingsPath, carNewPath } from "@/lib/car-routes";
import { findCarsByBrandModel } from "@/lib/server/car-queries";
import { serializeCar } from "@/lib/server/serialize-car";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CarListingsTable } from "@/components/cars/car-listings-table";
import { ListingModuleSwitcher } from "@/components/app/listing-module-switcher";

export const metadata: Metadata = {
  title: "Car listings",
};

export const dynamic = "force-dynamic";

export default async function CarListingsPage({
  params,
}: {
  params: Promise<{ brand: string; model: string }>;
}) {
  const { brand: brandSlug, model: modelSlug } = await params;
  const catalog = await loadDatabaseCatalog();
  const brand = findBrand(catalog, brandSlug);
  if (!brand) notFound();
  const model = findModel(brand, modelSlug);
  if (!model) notFound();

  const cars = (await findCarsByBrandModel(brand.name, model.name)).map(
    serializeCar,
  );
  const context = { brandSlug, modelSlug };

  return (
    <div className="flex flex-col gap-6">
      <Trail
        items={[
          { label: "Cars", href: "/cars/brands" },
          { label: brand.name, href: modelsPath("cars", brandSlug) },
          { label: model.name, href: carListingsPath(brandSlug, modelSlug) },
          { label: "Listings" },
        ]}
      />
      <PageHeading
        title={`${brand.name} ${model.name} listings`}
        description="Manage individual car listings for this vehicle."
        backHref={modelsPath("cars", brandSlug)}
        aside={
          <Button render={<Link href={carNewPath(brandSlug, modelSlug)} />}>
            <PlusIcon />
            Add car listing
          </Button>
        }
      />
      <ListingModuleSwitcher
        active="cars"
        brandSlug={brandSlug}
        modelSlug={modelSlug}
      />

      {cars.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CarFrontIcon className="size-10 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No car listings yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Add the first listing for {brand.name} {model.name}. The Add
                form preselects this brand and model.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <CarListingsTable cars={cars} context={context} />
      )}
    </div>
  );
}
