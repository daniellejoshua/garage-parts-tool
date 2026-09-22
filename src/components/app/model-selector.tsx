"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CarFrontIcon, ChevronRightIcon, SearchIcon, WrenchIcon } from "lucide-react";
import type { VehicleBrand, VehicleModel } from "@/lib/reference/types";
import type { ModuleSlug } from "@/lib/modules";
import { MODULES, listingsPath, modelsPath } from "@/lib/modules";
import { toSlug } from "@/lib/reference/slug";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const MODULE_ICONS: Record<ModuleSlug, typeof CarFrontIcon> = {
  cars: CarFrontIcon,
  parts: WrenchIcon,
};

const STATUS_LABELS: Record<VehicleModel["productionStatus"], string> = {
  current: "Current",
  discontinued: "Discontinued",
  unknown: "Needs review",
};

const STATUS_STYLES: Record<VehicleModel["productionStatus"], string> = {
  current: "bg-status-current text-status-current-foreground",
  discontinued: "bg-status-discontinued text-status-discontinued-foreground",
  unknown: "bg-status-unknown text-status-unknown-foreground",
};

function orderModels(models: VehicleModel[], query: string): VehicleModel[] {
  const trimmed = query.trim().toLowerCase();
  const matching = trimmed
    ? models.filter((model) => model.name.toLowerCase().includes(trimmed))
    : models;
  const current = matching.filter((model) => model.productionStatus === "current");
  const rest = matching.filter((model) => model.productionStatus !== "current");
  return [...current, ...rest];
}

export function ModelSelector({
  module,
  brand,
  brandSlug,
}: {
  module: ModuleSlug;
  brand: VehicleBrand;
  brandSlug: string;
}) {
  const definition = MODULES[module];
  const Icon = MODULE_ICONS[module];
  const [query, setQuery] = useState("");

  const models = useMemo(
    () => orderModels(brand.models, query),
    [brand.models, query],
  );

  return (
    <div className="flex flex-col gap-7">
      <Trail
        items={[
          { label: definition.label, href: definition.brandsPath },
          { label: brand.name, href: modelsPath(module, brandSlug) },
          { label: "Models" },
        ]}
      />
      <PageHeading
        title={`${brand.name} models`}
        description={`Select a model to manage ${definition.listingLabel} listings.`}
      />

      {brand.models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Icon className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No models found</p>
            <p className="text-sm text-muted-foreground">
              {brand.name} has no models in the reference catalog.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="w-full max-w-xl">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search models"
                aria-label={`Search ${brand.name} models`}
                className="pl-10"
              />
            </div>
          </div>

          {models.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Icon className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No models match</p>
                <p className="text-sm text-muted-foreground">
                  No {brand.name} models in the catalog match your search.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <Link
                  key={model.name}
                  href={listingsPath(module, brandSlug, toSlug(model.name))}
                  className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full min-h-24 transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-sm">
                    <CardContent className="flex h-full items-center justify-between gap-4 py-1">
                      <div className="flex min-w-0 flex-col items-start gap-2">
                        <CardTitle className="truncate font-semibold">{model.name}</CardTitle>
                        <Badge className={STATUS_STYLES[model.productionStatus]}>
                          {STATUS_LABELS[model.productionStatus]}
                        </Badge>
                      </div>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                        <ChevronRightIcon className="size-[18px]" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
