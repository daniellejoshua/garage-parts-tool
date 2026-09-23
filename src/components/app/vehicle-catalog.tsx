"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CarFrontIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  LibraryBigIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react";
import { useDeferredValue, useState, useSyncExternalStore } from "react";
import { CatalogGate } from "@/components/app/catalog-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBrandLogoPath } from "@/lib/brand-logos";
import { catalogModelsPath } from "@/lib/modules";
import { toSlug } from "@/lib/reference/slug";
import type { VehicleBrand, VehicleCatalog as VehicleCatalogData } from "@/lib/reference/types";

const RECENT_BRANDS_KEY = "gap-admin-recent-brands";
const RECENT_BRANDS_EVENT = "gap-admin-recent-brands-change";
const EMPTY_RECENTS: string[] = [];
let cachedRecentRaw: string | null = null;
let cachedRecents = EMPTY_RECENTS;

type SortMode = "az" | "za" | "most-models" | "fewest-models";

const SORT_LABELS: Record<SortMode, string> = {
  az: "A-Z",
  za: "Z-A",
  "most-models": "Most Models",
  "fewest-models": "Fewest Models",
};

type PageItem = number | "ellipsis";

function getPageItems(pageCount: number, activePage: number): PageItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const siblings = 1;
  const items = new Set<number>([1, pageCount]);
  for (let page = activePage - siblings; page <= activePage + siblings; page += 1) {
    if (page >= 1 && page <= pageCount) items.add(page);
  }
  const sorted = [...items].sort((first, second) => first - second);
  const result: PageItem[] = [];
  sorted.forEach((page, index) => {
    if (index === 0) {
      result.push(page);
      return;
    }
    const gap = page - sorted[index - 1];
    if (gap === 2) result.push(sorted[index - 1] + 1);
    else if (gap > 2) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

function getCatalogPageSize() {
  if (typeof window === "undefined") return 20;
  if (window.innerWidth >= 1280) return 20;
  if (window.innerWidth >= 640) return 12;
  return 8;
}

function subscribeToViewport(onStoreChange: () => void) {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
}

function getRecentBrandSnapshot() {
  if (typeof window === "undefined") return EMPTY_RECENTS;

  const raw = window.localStorage.getItem(RECENT_BRANDS_KEY);
  if (raw === cachedRecentRaw) return cachedRecents;

  cachedRecentRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cachedRecents = Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string").slice(0, 5)
      : EMPTY_RECENTS;
  } catch {
    cachedRecents = EMPTY_RECENTS;
  }
  return cachedRecents;
}

function subscribeToRecentBrands(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(RECENT_BRANDS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(RECENT_BRANDS_EVENT, onStoreChange);
  };
}

function rememberBrand(brandSlug: string) {
  const recents = getRecentBrandSnapshot().filter((slug) => slug !== brandSlug);
  window.localStorage.setItem(
    RECENT_BRANDS_KEY,
    JSON.stringify([brandSlug, ...recents].slice(0, 5)),
  );
  cachedRecentRaw = null;
  window.dispatchEvent(new Event(RECENT_BRANDS_EVENT));
}

function sortBrands(brands: VehicleBrand[], sort: SortMode) {
  return [...brands].sort((first, second) => {
    if (sort === "za") return second.name.localeCompare(first.name);
    if (sort === "most-models") return second.models.length - first.models.length;
    if (sort === "fewest-models") return first.models.length - second.models.length;
    return first.name.localeCompare(second.name);
  });
}

function BrandLogo({ brand, compact = false }: { brand: VehicleBrand; compact?: boolean }) {
  const logoPath = getBrandLogoPath(brand.name);
  const initials = brand.name
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  return (
    <span className={compact ? "flex size-8 shrink-0 items-center justify-center" : "flex h-11 w-20 items-center justify-center"}>
      {logoPath ? (
        <Image
          src={logoPath}
          alt=""
          width={96}
          height={52}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="text-sm font-semibold text-primary" aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  );
}

const QUICK_ACTIONS = [
  { label: "View all car listings", href: "/cars/listings", icon: CarFrontIcon },
  { label: "View all part listings", href: "/parts/listings", icon: WrenchIcon },
];

export function VehicleCatalog({ catalog }: { catalog: VehicleCatalogData }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("az");
  const [requestedPage, setRequestedPage] = useState(1);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const pageSize = useSyncExternalStore(
    subscribeToViewport,
    getCatalogPageSize,
    () => 20,
  );
  const recentSlugs = useSyncExternalStore(
    subscribeToRecentBrands,
    getRecentBrandSnapshot,
    () => EMPTY_RECENTS,
  );

  const matchingBrands = catalog.brands.filter((brand) =>
    !deferredQuery ||
    brand.name.toLowerCase().includes(deferredQuery) ||
    brand.models.some((model) => model.name.toLowerCase().includes(deferredQuery)),
  );
  const visibleBrands = sortBrands(matchingBrands, sort);
  const pageCount = Math.max(1, Math.ceil(visibleBrands.length / pageSize));
  const activePage = Math.min(requestedPage, pageCount);
  const firstVisibleIndex = (activePage - 1) * pageSize;
  const paginatedBrands = visibleBrands.slice(firstVisibleIndex, firstVisibleIndex + pageSize);
  const brandsBySlug = new Map(catalog.brands.map((brand) => [toSlug(brand.name), brand]));
  const recentBrands = recentSlugs
    .map((slug) => ({ slug, brand: brandsBySlug.get(slug) }))
    .filter((entry): entry is { slug: string; brand: VehicleBrand } => Boolean(entry.brand));

  return (
    <CatalogGate catalog={catalog} noun="vehicle brands">
      <div className="grid items-start gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_280px]">
        <header className="max-w-3xl lg:col-start-1">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
            Garage &amp; Parts
          </p>
          <h1 className="mt-2 text-[30px] leading-tight font-semibold tracking-[-0.025em] text-foreground sm:text-[34px]">
            Vehicle Catalog
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Browse vehicle brands and models to manage car listings and compatible parts.
          </p>
        </header>

        <section className="min-w-0 lg:col-start-1 lg:row-start-2" aria-label="Vehicle brands">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setRequestedPage(1);
                }}
                placeholder="Search brands or models..."
                aria-label="Search vehicle brands or models"
                className="h-10 bg-card pl-10"
              />
            </div>
            <p className="shrink-0 text-xs font-medium text-muted-foreground" aria-live="polite">
              {visibleBrands.length === catalog.brands.length
                ? `${catalog.brands.length} brands`
                : `${visibleBrands.length} of ${catalog.brands.length} brands`}
            </p>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as SortMode);
                setRequestedPage(1);
              }}
            >
              <SelectTrigger className="h-10 w-full bg-card sm:w-40" aria-label="Sort vehicle brands">
                <SelectValue>{SORT_LABELS[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="az">A-Z</SelectItem>
                <SelectItem value="za">Z-A</SelectItem>
                <SelectItem value="most-models">Most Models</SelectItem>
                <SelectItem value="fewest-models">Fewest Models</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibleBrands.length > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              {paginatedBrands.map((brand) => {
                const brandSlug = toSlug(brand.name);
                return (
                  <Link
                    key={brand.name}
                    href={catalogModelsPath(brandSlug)}
                    onClick={() => rememberBrand(brandSlug)}
                    className="group flex h-28 flex-col items-center justify-center rounded-[10px] border border-border bg-card px-3 py-3 text-center outline-none transition-[border-color,background-color,box-shadow] hover:border-primary/35 hover:bg-white hover:shadow-[0_5px_16px_rgba(41,39,36,0.07)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
                  >
                    <BrandLogo brand={brand} />
                    <span className="mt-1.5 max-w-full truncate text-[13px] font-semibold text-foreground">
                      {brand.name}
                    </span>
                    <span className="mt-0.5 text-[11px] text-muted-foreground">
                      {brand.models.length} {brand.models.length === 1 ? "model" : "models"}
                    </span>
                  </Link>
                );
              })}
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Showing {firstVisibleIndex + 1}-{Math.min(firstVisibleIndex + pageSize, visibleBrands.length)} of {visibleBrands.length} brands
                </p>
                <nav className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" aria-label="Brand catalog pagination">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRequestedPage(activePage - 1)}
                    disabled={activePage === 1}
                    aria-label="Previous brand page"
                  >
                    <ChevronLeftIcon />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  {getPageItems(pageCount, activePage).map((page, index) =>
                    page === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-xs text-muted-foreground"
                        aria-hidden="true"
                      >
                        &hellip;
                      </span>
                    ) : (
                      <Button
                        key={page}
                        type="button"
                        variant={page === activePage ? "default" : "outline"}
                        size="icon-sm"
                        onClick={() => setRequestedPage(page)}
                        aria-label={`Go to brand page ${page}`}
                        aria-current={page === activePage ? "page" : undefined}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRequestedPage(activePage + 1)}
                    disabled={activePage === pageCount}
                    aria-label="Next brand page"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRightIcon />
                  </Button>
                </nav>
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[10px] border border-dashed border-border bg-card px-6 py-12 text-center">
              <SearchIcon className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-medium">No brands or models match</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different brand or model name.</p>
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:col-start-2 lg:row-start-2" aria-label="Catalog shortcuts">
          <section className="overflow-hidden rounded-[10px] border border-border bg-card">
            <div className="flex gap-3 px-4 py-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LibraryBigIcon className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Quick Actions</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Jump to common tasks.</p>
              </div>
            </div>
            <div className="border-t border-border px-2">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex h-12 items-center gap-3 border-b border-border px-2 text-[13px] font-medium last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <Icon className="size-4 text-muted-foreground group-hover:text-primary" />
                  <span className="flex-1">{label}</span>
                  <ArrowRightIcon className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-[10px] border border-border bg-card">
            <div className="flex gap-3 px-4 py-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock3Icon className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Recent Brands</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Your recently viewed brands.</p>
              </div>
            </div>
            <div className="border-t border-border px-2">
              {recentBrands.length > 0 ? (
                recentBrands.map(({ slug, brand }) => (
                  <Link
                    key={slug}
                    href={catalogModelsPath(slug)}
                    onClick={() => rememberBrand(slug)}
                    className="group flex h-11 items-center gap-3 border-b border-border px-2 last:border-b-0 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <BrandLogo brand={brand} compact />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{brand.name}</span>
                    <ArrowRightIcon className="size-3.5 text-muted-foreground group-hover:text-primary" />
                  </Link>
                ))
              ) : (
                <p className="px-2 py-5 text-xs leading-5 text-muted-foreground">
                  Brands you open will appear here for quick access.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </CatalogGate>
  );
}
