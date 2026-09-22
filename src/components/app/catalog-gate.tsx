import type { ReactNode } from "react";
import type { VehicleCatalog } from "@/lib/reference/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CircleAlertIcon, FileQuestionIcon, FolderSearchIcon } from "lucide-react";

export function CatalogGate({
  catalog,
  noun,
  children,
}: {
  catalog: VehicleCatalog;
  noun: string;
  children: ReactNode;
}) {
  if (catalog.issue === "missing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestionIcon className="size-4 shrink-0" />
            Vehicle catalog not loaded
          </CardTitle>
          <CardDescription>
            Brands and models come from the shared GAP Marketplace vehicle
            catalog tables (<code className="rounded bg-muted px-1 py-0.5">vehicle_brands</code>,{" "}
            <code className="rounded bg-muted px-1 py-0.5">vehicle_models</code>) in the
            application database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{catalog.message}</p>
          <p>
            The catalog is seeded from{" "}
            <code className="rounded bg-muted px-1 py-0.5">data/vehicle-catalog.json</code> with{" "}
            <code className="rounded bg-muted px-1 py-0.5">pnpm db:seed</code> — the same
            reference data shown in{" "}
            <code className="rounded bg-muted px-1 py-0.5">data/REFERENCE.md</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (catalog.issue === "invalid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleAlertIcon className="size-4 shrink-0" />
            Vehicle catalog could not be read
          </CardTitle>
          <CardDescription>
            The catalog tables could not be read from the application database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{catalog.message}</p>
          <p>
            Apply pending migrations with{" "}
            <code className="rounded bg-muted px-1 py-0.5">pnpm prisma migrate deploy</code>{" "}
            and seed with{" "}
            <code className="rounded bg-muted px-1 py-0.5">pnpm db:seed</code>.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (catalog.brands.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderSearchIcon className="size-4 shrink-0" />
            No {noun} found
          </CardTitle>
          <CardDescription>
            The database catalog loaded successfully but contains no entries for
            this level.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <>{children}</>;
}