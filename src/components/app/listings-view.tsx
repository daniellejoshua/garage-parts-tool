import { CarFrontIcon, WrenchIcon } from "lucide-react";
import type { VehicleBrand, VehicleModel } from "@/lib/reference/types";
import type { ModuleSlug } from "@/lib/modules";
import { MODULES, listingsPath, modelsPath } from "@/lib/modules";
import { Trail } from "@/components/app/trail";
import { PageHeading } from "@/components/app/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MODULE_ICONS: Record<ModuleSlug, typeof CarFrontIcon> = {
  cars: CarFrontIcon,
  parts: WrenchIcon,
};

export function ListingsView({
  module,
  brand,
  model,
  brandSlug,
  modelSlug,
}: {
  module: ModuleSlug;
  brand: VehicleBrand;
  model: VehicleModel;
  brandSlug: string;
  modelSlug: string;
}) {
  const definition = MODULES[module];
  const Icon = MODULE_ICONS[module];

  return (
    <div className="flex flex-col gap-6">
      <Trail
        items={[
          { label: definition.label, href: definition.brandsPath },
          { label: brand.name, href: modelsPath(module, brandSlug) },
          { label: model.name, href: listingsPath(module, brandSlug, modelSlug) },
        ]}
      />
      <PageHeading
        title={`${definition.label} · ${brand.name} ${model.name}`}
        description={`Manage individual ${definition.listingLabel} listings for this vehicle.`}
        aside={
          <Button disabled aria-disabled="true">
            Add {definition.listingLabel} listing
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon className="size-10 text-muted-foreground/50" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              No {definition.listingLabel} listings yet
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              Listing CRUD for this module starts in a later phase. The Add
              form will preselect {brand.name} {model.name}
              {module === "parts"
                ? " and reflect it in the existing Parts.compatibility format once that format is supplied and approved."
                : " for the car fields."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}