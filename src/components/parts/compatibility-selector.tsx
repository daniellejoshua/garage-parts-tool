"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CarFrontIcon,
  CheckIcon,
  ChevronRightIcon,
  LockIcon,
  RotateCcwIcon,
  SearchIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrandLogoPath } from "@/lib/brand-logos";
import type {
  VehicleBrandSummary,
  VehicleModelRef,
  SelectedModelRef,
} from "@/lib/server/catalog-queries";

export interface CompatibilitySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  allBrands: VehicleBrandSummary[];
  initialSelected: SelectedModelRef[];
  navigatedModelId: string;
  placeholder?: string;
  disabled?: boolean;
  vehicleLabel?: string;
}

const DEBOUNCE_MS = 150;
const MIN_SEARCH_LENGTH = 2;

interface KnownModel {
  label: string;
  brandName: string;
}

type LoadStatus = "idle" | "loading" | "ready" | "error";

export function CompatibilitySelector({
  value,
  onChange,
  allBrands,
  initialSelected,
  navigatedModelId,
  placeholder = "Select compatible vehicle models",
  disabled,
  vehicleLabel,
}: CompatibilitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState<string[]>(value);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchRetry, setSearchRetry] = useState(0);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [brandModels, setBrandModels] = useState<VehicleModelRef[]>([]);
  const [brandStatus, setBrandStatus] = useState<LoadStatus>("idle");
  const [searchResult, setSearchResult] = useState<{ query: string; models: VehicleModelRef[] } | null>(null);
  const [searchFailQuery, setSearchFailQuery] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const modelsCache = useRef(new Map<string, VehicleModelRef[]>());
  const brandSeq = useRef(0);
  const searchSeq = useRef(0);

  const [known, setKnown] = useState<Record<string, KnownModel>>(
    () =>
      Object.fromEntries(
        initialSelected.map((item) => [
          item.id,
          { label: item.label, brandName: item.brandName },
        ]),
      ),
  );

  const mergeKnown = useCallback((models: VehicleModelRef[]) => {
    setKnown((prev) => {
      const next = { ...prev };
      for (const model of models) {
        if (!next[model.id]) {
          next[model.id] = {
            label: `${model.brandName} ${model.name}`,
            brandName: model.brandName,
          };
        }
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const query = debouncedSearch.trim();
    if (query.length < MIN_SEARCH_LENGTH) {
      searchSeq.current += 1;
      return;
    }

    const seq = ++searchSeq.current;
    const controller = new AbortController();

    fetch(`/api/catalog/models?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json();
        if (seq !== searchSeq.current) return;
        if (!response.ok || !json.ok) throw new Error("Search failed");
        const models: VehicleModelRef[] = json.models ?? [];
        mergeKnown(models);
        setSearchFailQuery(null);
        setSearchResult({ query, models });
      })
      .catch((error) => {
        if (seq !== searchSeq.current) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSearchFailQuery(query);
      });

    return () => controller.abort();
  }, [debouncedSearch, searchRetry, mergeKnown]);

  const loadBrand = useCallback(
    async (brandId: string) => {
      const seq = ++brandSeq.current;
      setActiveBrandId(brandId);
      const cached = modelsCache.current.get(brandId);
      if (cached) {
        setBrandModels(cached);
        setBrandStatus("ready");
        return;
      }
      setBrandModels([]);
      setBrandStatus("loading");
      try {
        const response = await fetch(
          `/api/catalog/models?brandId=${encodeURIComponent(brandId)}`,
        );
        const json = await response.json();
        if (seq !== brandSeq.current) return;
        if (!response.ok || !json.ok) throw new Error("Load failed");
        const models: VehicleModelRef[] = json.models ?? [];
        modelsCache.current.set(brandId, models);
        setBrandModels(models);
        setBrandStatus("ready");
        mergeKnown(models);
      } catch {
        if (seq !== brandSeq.current) return;
        setBrandStatus("error");
      }
    },
    [mergeKnown],
  );

  const selectBrand = useCallback(
    (brandId: string) => {
      setSearch("");
      setDebouncedSearch("");
      searchSeq.current += 1;
      loadBrand(brandId);
    },
    [loadBrand],
  );

  const openDialog = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    searchSeq.current += 1;
    setDialogValue(Array.from(new Set([navigatedModelId, ...value])));
    setOpen(true);
  }, [value, navigatedModelId]);

  const closeDialog = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setDialogValue(Array.from(new Set([navigatedModelId, ...value])));
      }
      setOpen(nextOpen);
    },
    [value, navigatedModelId],
  );

  const handleApply = useCallback(() => {
    onChange(Array.from(new Set([navigatedModelId, ...dialogValue])));
    setOpen(false);
  }, [dialogValue, navigatedModelId, onChange]);

  const handleToggle = useCallback(
    (id: string) => {
      if (id === navigatedModelId) return;
      setDialogValue((prev) =>
        prev.includes(id)
          ? prev.filter((existing) => existing !== id)
          : [...prev, id],
      );
    },
    [navigatedModelId],
  );

  const searchQuery = debouncedSearch.trim();
  const searching = searchQuery.length >= MIN_SEARCH_LENGTH;
  const searchReady = searchResult !== null && searchResult.query === searchQuery;
  const searchFailed = searchFailQuery === searchQuery;
  const searchModels = searchReady ? searchResult.models : [];
  const searchStatus: LoadStatus = !searching
    ? "idle"
    : searchReady
      ? "ready"
      : searchFailed
        ? "error"
        : "loading";
  const activeModels = searching ? searchModels : brandModels;
  const activeStatus = searching ? searchStatus : brandStatus;
  const visibleSelected = activeModels.filter((model) =>
    dialogValue.includes(model.id),
  ).length;
  const totalSelected = dialogValue.length;
  const additionalSelected = Math.max(totalSelected - 1, 0);

  const handleSelectAllVisible = useCallback(() => {
    setDialogValue((prev) => {
      const next = new Set(prev);
      for (const model of activeModels) {
        next.add(model.id);
      }
      return Array.from(next);
    });
  }, [activeModels]);

  const handleDeselectAllVisible = useCallback(() => {
    const ids = new Set(activeModels.map((model) => model.id));
    setDialogValue((prev) =>
      prev.filter((id) => !ids.has(id) || id === navigatedModelId),
    );
  }, [activeModels, navigatedModelId]);

  const regionGroups = useMemo(() => {
    const regions: Array<{ region: string; brands: VehicleBrandSummary[] }> = [];
    for (const brand of allBrands) {
      const group = regions.find((entry) => entry.region === brand.region);
      if (group) {
        group.brands.push(brand);
      } else {
        regions.push({ region: brand.region, brands: [brand] });
      }
    }
    return regions;
  }, [allBrands]);

  const activeBrand = activeBrandId
    ? allBrands.find((brand) => brand.id === activeBrandId) ?? null
    : null;

  const chipGroups = useMemo(() => {
    const groups = new Map<string, Array<{ id: string; label: string }>>();
    for (const id of value) {
      const model = known[id];
      if (!model) continue;
      const list = groups.get(model.brandName) ?? [];
      list.push({ id, label: model.label });
      groups.set(model.brandName, list);
    }
    return Array.from(groups.entries());
  }, [value, known]);

  const summaryItems = useMemo(
    () =>
      dialogValue
        .map((id) => ({
          id,
          label: id === navigatedModelId ? vehicleLabel ?? id : known[id]?.label ?? id,
          brandName: known[id]?.brandName,
          isNavigated: id === navigatedModelId,
        }))
        .sort((a, b) => {
          if (a.isNavigated !== b.isNavigated) return a.isNavigated ? -1 : 1;
          return a.label.localeCompare(b.label);
        }),
    [dialogValue, known, navigatedModelId, vehicleLabel],
  );

  const renderCard = (model: VehicleModelRef) => (
    <ModelCard
      key={model.id}
      model={model}
      selected={dialogValue.includes(model.id)}
      isNavigated={model.id === navigatedModelId}
      disabled={disabled}
      secondary={searching ? model.region : undefined}
      onToggle={() => handleToggle(model.id)}
    />
  );

  const renderListBody = () => {
    if (activeStatus === "loading") {
      return (
        <div className="grid gap-2.5 md:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-[4.25rem] w-full rounded-xl" />
          ))}
        </div>
      );
    }
    if (activeStatus === "error") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {searching
              ? "Could not search the vehicle catalog."
              : "Could not load this brand's models."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (searching) {
                setSearchRetry((retry) => retry + 1);
              } else if (activeBrandId) {
                loadBrand(activeBrandId);
              }
            }}
          >
            <RotateCcwIcon /> Retry
          </Button>
        </div>
      );
    }
    if (activeModels.length === 0) {
      return (
        <div className="grid h-full min-h-[12rem] place-items-center px-4 text-center">
          <div>
            <WrenchIcon className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {searching ? "No models match your search" : "Select a brand to browse models"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searching
                ? "Try a different model or brand name."
                : "Brands on the left list every model available in the catalog."}
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="grid gap-2.5 md:grid-cols-2">
        {activeModels.map(renderCard)}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-2">
        {chipGroups.length > 0 ? (
          chipGroups.map(([brandName, chips]) => (
            <Fragment key={brandName}>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {brandName}
              </span>
              {chips.map((chip) => {
                const isNavigated = chip.id === navigatedModelId;
                return (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold"
                  >
                    {chip.label}
                    {isNavigated ? (
                      <span
                        aria-hidden="true"
                        className="text-gold/60"
                        title="Included automatically"
                      >
                        <LockIcon className="size-3" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onChange(value.filter((existing) => existing !== chip.id))
                        }
                        className="ml-1 rounded-full p-0.5 hover:bg-gold/20"
                        aria-label={`Remove ${chip.label}`}
                      >
                        <XIcon className="size-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </Fragment>
          ))
        ) : (
          <span className="px-1 text-sm text-muted-foreground">{placeholder}</span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {value.length} model{value.length !== 1 ? "s" : ""} selected
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openDialog}
          disabled={disabled}
        >
          Manage Compatibility
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[88vh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-3xl md:max-w-5xl md:overflow-hidden">
          <DialogHeader className="flex-row items-center gap-3 border-b border-border px-5 pt-5 pb-4 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
              <CarFrontIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg">Select Compatible Vehicles</DialogTitle>
              <DialogDescription>
                Choose the vehicle models this part is compatible with.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 border-b border-border px-5 py-3.5 sm:px-6">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search brands or vehicle models..."
                className="h-10 pl-10 text-sm"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-gold/[0.08] px-3 py-1 font-medium text-gold">
                <LockIcon className="size-3" />
                {vehicleLabel}
              </span>
              <span className="text-muted-foreground">Automatically included</span>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
            <aside className="min-h-0 min-w-0 md:min-h-0 md:border-r md:border-border md:bg-muted/20">
              <div className="flex gap-1.5 overflow-x-auto p-2.5 md:max-h-full md:flex-col md:gap-0 md:overflow-y-auto md:overflow-x-hidden md:p-2">
                {regionGroups.map((group) => (
                  <div key={group.region} className="flex shrink-0 flex-col md:shrink">
                    <span className="flex items-center gap-2 px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      <span className="h-3 w-0.5 rounded-full bg-gold/70" />
                      {group.region}
                    </span>
                    {group.brands.map((brand) => {
                      const active = brand.id === activeBrandId;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => selectBrand(brand.id)}
                          className={cn(
                            "relative flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors md:w-full",
                            active
                              ? "bg-gold/[0.08] font-semibold text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold"
                            />
                          )}
                          <BrandMark name={brand.name} />
                          <span className="truncate">{brand.name}</span>
                          <span className="ml-auto pl-2 text-xs tabular-nums text-muted-foreground">
                            {brand.modelCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-muted/30 px-4 py-3">
                {searching ? null : activeBrand ? <BrandMark name={activeBrand.name} /> : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {searching ? "Search results" : activeBrand ? activeBrand.name : "Brand models"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {searching
                      ? `${searchModels.length} matching model${searchModels.length !== 1 ? "s" : ""} across the catalog`
                      : activeBrand
                        ? `${activeBrand.modelCount} model${activeBrand.modelCount !== 1 ? "s" : ""} available`
                        : "Pick a brand to see its models"}
                  </p>
                </div>
                {activeModels.length > 0 && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {visibleSelected} of {activeModels.length} selected
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={
                        visibleSelected === activeModels.length
                          ? handleDeselectAllVisible
                          : handleSelectAllVisible
                      }
                    >
                      {visibleSelected === activeModels.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                {renderListBody()}
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse items-center gap-2 border-t border-border bg-muted/40 px-5 py-2.5 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-center sm:justify-start sm:text-left">
              <button
                type="button"
                onClick={() => setSummaryOpen(true)}
                className="group inline-flex items-center gap-1 rounded text-xs font-medium text-foreground transition-colors hover:text-gold focus-visible:outline-none"
              >
                {additionalSelected} additional model{additionalSelected !== 1 ? "s" : ""} selected
                <ChevronRightIcon className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
              </button>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <LockIcon className="size-3 text-gold" />
                {vehicleLabel} is automatically included
              </p>
            </div>
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApply}
                className="bg-gold text-white shadow-sm hover:bg-gold/85"
              >
                Add Selected
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="z-[60] max-w-lg">
          <DialogHeader>
            <DialogTitle>Selected Vehicles</DialogTitle>
            <DialogDescription>
              {summaryItems.length} model{summaryItems.length !== 1 ? "s" : ""} selected — including
              the automatically included vehicle.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[40vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {summaryItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/[0.05] px-2.5 py-2"
              >
                <span className="grid size-4 shrink-0 place-items-center rounded border border-gold bg-gold text-white">
                  <CheckIcon className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">
                    {item.label}
                  </span>
                  {item.brandName ? (
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {item.brandName}
                    </span>
                  ) : null}
                </span>
                {item.isNavigated ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[9px] font-medium text-gold">
                    <LockIcon className="size-2.5" />
                    Auto
                  </span>
                ) : (
                  <CheckIcon className="size-3.5 shrink-0 text-gold/70" />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setSummaryOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandMark({ name }: { name: string }) {
  const logoPath = getBrandLogoPath(name);
  return (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">
      {logoPath ? (
        <Image
          src={logoPath}
          alt=""
          width={32}
          height={32}
          className="h-7 w-7 object-contain"
        />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-gold/10 text-xs font-semibold text-gold">
          {name.charAt(0)}
        </span>
      )}
    </span>
  );
}

function ModelCard({
  model,
  selected,
  isNavigated,
  disabled,
  secondary,
  onToggle,
}: {
  model: VehicleModelRef;
  selected: boolean;
  isNavigated: boolean;
  disabled?: boolean;
  secondary?: string;
  onToggle: () => void;
}) {
  const locked = disabled || isNavigated;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      aria-pressed={selected}
      className={cn(
        "group flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl border bg-card px-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
        selected
          ? "border-gold/60 bg-gold/[0.06] shadow-[0_0_0_1px_rgba(169,104,18,0.1)]"
          : "border-border hover:border-gold/35 hover:bg-muted/25",
        locked && "cursor-default",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-md border transition-colors duration-150",
          selected
            ? "border-gold bg-gold text-white"
            : "border-input bg-background group-hover:border-gold/40",
        )}
      >
        <CheckIcon
          className={cn(
            "size-3.5 transition-opacity duration-150",
            selected ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">
          {model.brandName} {model.name}
        </span>
        {secondary ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {secondary}
          </span>
        ) : null}
      </span>
      {isNavigated ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
          <LockIcon className="size-3" />
          Auto
        </span>
      ) : selected ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold">
          <CheckIcon className="size-3" />
          Selected
        </span>
      ) : null}
    </button>
  );
}