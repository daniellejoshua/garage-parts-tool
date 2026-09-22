"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { CarFrontIcon, ChevronRightIcon, SearchIcon, WrenchIcon } from "lucide-react";
import type { VehicleCatalog } from "@/lib/reference/types";
import type { ModuleSlug } from "@/lib/modules";
import { MODULES, modelsPath } from "@/lib/modules";
import { toSlug } from "@/lib/reference/slug";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { CatalogGate } from "@/components/app/catalog-gate";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getBrandLogoPath } from "@/lib/brand-logos";

const MODULE_ICONS: Record<ModuleSlug, typeof CarFrontIcon> = {
  cars: CarFrontIcon,
  parts: WrenchIcon,
};

interface BrandGroup {
  region: string;
  brands: VehicleCatalog["brands"];
}

function groupBrands(catalog: VehicleCatalog, query: string): BrandGroup[] {
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? catalog.brands.filter((brand) =>
        brand.name.toLowerCase().includes(trimmed),
      )
    : catalog.brands;
  return catalog.regions
    .map((region) => ({
      region,
      brands: filtered.filter((brand) => brand.region === region),
    }))
    .filter((group) => group.brands.length > 0);
}

export function BrandSelector({
  module,
  catalog,
}: {
  module: ModuleSlug;
  catalog: VehicleCatalog;
}) {
  const definition = MODULES[module];
  const Icon = MODULE_ICONS[module];
  const [query, setQuery] = useState("");

  const groups = useMemo(() => groupBrands(catalog, query), [catalog, query]);
  const visibleCount = groups.reduce((sum, group) => sum + group.brands.length, 0);

  return (
    <div className="flex flex-col gap-7">
      <Trail
        items={[
          { label: definition.label, href: definition.brandsPath },
          { label: "Brands" },
        ]}
      />
      <PageHeading
        title={`${definition.label} brands`}
        description={definition.description}
      />
      <CatalogGate catalog={catalog} noun="vehicle brands">
        <div className="flex flex-col gap-6">
          <div className="w-full max-w-xl">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search brands"
                aria-label="Search brands"
                className="pl-10"
              />
            </div>
          </div>

          {visibleCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Icon className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No brands match</p>
                <p className="text-sm text-muted-foreground">
                  No brands in the catalog match your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-8">
              {groups.map((group) => (
                <section
                  key={group.region}
                  aria-label={`${group.region} region brands`}
                  className="flex flex-col gap-3"
                >
                  <h2 className="flex items-center gap-3 text-sm font-semibold text-foreground">
                    <span className="h-4 w-1 rounded-full bg-gold" />
                    {group.region}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.brands.map((brand) => {
                      const logoPath = getBrandLogoPath(brand.name);

                      return (
                        <Link
                          key={brand.name}
                          href={modelsPath(module, toSlug(brand.name))}
                          className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <Card className="h-full transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-sm">
                            <CardContent className="flex h-full flex-col gap-6">
                              <div className="flex items-start justify-between gap-2">
                                <span className="flex h-14 w-20 items-center justify-center rounded-lg border border-border/70 bg-white p-2 shadow-sm">
                                  {logoPath ? (
                                    <Image
                                      src={logoPath}
                                      alt=""
                                      width={96}
                                      height={64}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <span
                                      aria-hidden="true"
                                      className="text-lg font-bold text-primary"
                                    >
                                      {brand.name.charAt(0)}
                                    </span>
                                  )}
                                </span>
                                <Badge variant="outline" className="text-muted-foreground">
                                  {brand.models.length}{" "}
                                  {brand.models.length === 1 ? "model" : "models"}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <CardTitle className="truncate font-semibold">{brand.name}</CardTitle>
                                <ChevronRightIcon className="size-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </CatalogGate>
    </div>
  );
}
