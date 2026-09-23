import Link from "next/link";
import { CarFrontIcon, WrenchIcon } from "lucide-react";
import { cn } from "cn";
import type { ModuleSlug } from "@/lib/modules";
import { listingsPath } from "@/lib/modules";

export function ListingModuleSwitcher({
  active,
  brandSlug,
  modelSlug,
}: {
  active: ModuleSlug;
  brandSlug: string;
  modelSlug: string;
}) {
  const items = [
    { module: "cars" as const, label: "Cars", icon: CarFrontIcon },
    { module: "parts" as const, label: "Compatible Parts", icon: WrenchIcon },
  ];

  return (
    <nav
      aria-label="Listing type"
      className="inline-flex w-fit rounded-lg border border-border bg-card p-1"
    >
      {items.map(({ module, label, icon: Icon }) => {
        const isActive = module === active;
        return (
          <Link
            key={module}
            href={listingsPath(module, brandSlug, modelSlug)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "bg-primary text-primary-foreground hover:text-primary-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
