"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { MultiSelectOption } from "@/components/ui/multi-select";

export interface CompatibilitySelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  allModels: MultiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  vehicleLabel?: string;
}

const DEBOUNCE_MS = 150;

export function CompatibilitySelector({
  value,
  onChange,
  allModels,
  placeholder = "Select compatible vehicle models",
  disabled,
  vehicleLabel,
}: CompatibilitySelectorProps) {
  const [open, setOpen] = useState(false);
  const [dialogValue, setDialogValue] = useState<string[]>(value);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    for (const model of allModels) {
      if (model.group) {
        brandSet.add(model.group);
      }
    }
    return Array.from(brandSet).sort();
  }, [allModels]);

  const modelsForBrand = useMemo(() => {
    if (!selectedBrand) return allModels;
    return allModels.filter((m) => m.group === selectedBrand);
  }, [allModels, selectedBrand]);

  const filteredModels = useMemo(() => {
    if (!debouncedSearch) return modelsForBrand;
    const lower = debouncedSearch.toLowerCase();
    return modelsForBrand.filter((m) =>
      m.label.toLowerCase().includes(lower.toLowerCase())
    );
  }, [modelsForBrand, debouncedSearch]);

  const totalSelected = dialogValue.length;
  const visibleSelected = filteredModels.filter((m) => dialogValue.includes(m.value)).length;

  const handleToggle = useCallback((optValue: string) => {
    setDialogValue((prev) =>
      prev.includes(optValue)
        ? prev.filter((v) => v !== optValue)
        : [...prev, optValue]
    );
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    setDialogValue((prev) => {
      const newSet = new Set(prev);
      for (const model of filteredModels) {
        newSet.add(model.value);
      }
      return Array.from(newSet);
    });
  }, [filteredModels]);

  const handleDeselectAllVisible = useCallback(() => {
    setDialogValue((prev) => {
      const newSet = new Set(prev);
      for (const model of filteredModels) {
        newSet.delete(model.value);
      }
      return Array.from(newSet);
    });
  }, [filteredModels]);

  const handleApply = useCallback(() => {
    onChange(dialogValue);
    setOpen(false);
  }, [dialogValue, onChange]);

  const handleCancel = useCallback(() => {
    setDialogValue(value);
    setOpen(false);
  }, [value]);

  const selectedChips = value.map((v) => {
    const model = allModels.find((m) => m.value === v);
    return model ? (
      <span
        key={model.value}
        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
      >
        {model.label}
        <button
          type="button"
          onClick={() => onChange(value.filter((id) => id !== model.value))}
          className="ml-1 p-0.5 hover:bg-primary/20 rounded-full"
          aria-label={`Remove ${model.label}`}
        >
          <XIcon className="size-3" />
        </button>
      </span>
    ) : null;
  });

  return (
    <div className="w-full">
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Compatible vehicle models <span className="text-destructive">*</span>
        </label>
        <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-border rounded-lg bg-background">
          {selectedChips.length > 0 ? (
            selectedChips
          ) : (
            <span className="text-sm text-muted-foreground self-center">{placeholder}</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {value.length} model{value.length !== 1 ? "s" : ""} selected
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          Manage Compatibility
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent key={value.join(",")} className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Select Compatible Vehicles</DialogTitle>
            <DialogDescription>
              Choose the vehicle models this part is compatible with. The navigated model ({vehicleLabel}) 
              is included automatically. Select additional verified compatible models.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models..."
                  className="pl-10 h-10 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Brand:</label>
                <select
                  value={selectedBrand ?? ""}
                  onChange={(e) => setSelectedBrand(e.target.value || null)}
                  className="flex h-10 w-[180px] items-center px-3 text-sm border border-input bg-background rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                >
                  <option value="">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredModels.length} model{filteredModels.length !== 1 ? "s" : ""} 
                {selectedBrand ? `in ${selectedBrand}` : ""}
              </span>
              {filteredModels.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {visibleSelected} of {filteredModels.length} selected
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={visibleSelected === filteredModels.length ? handleDeselectAllVisible : handleSelectAllVisible}
                    disabled={filteredModels.length === 0}
                  >
                    {visibleSelected === filteredModels.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="max-h-[400px]">
              {filteredModels.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No matching models
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredModels.map((model) => (
                    <Label
                      key={model.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={dialogValue.includes(model.value)}
                        onCheckedChange={() => handleToggle(model.value)}
                        disabled={disabled}
                        className="size-4"
                      />
                      <span className="text-sm truncate flex-1">{model.label}</span>
                      {model.group && (
                        <span className="ml-auto text-xs text-muted-foreground">{model.group}</span>
                      )}
                    </Label>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">
                {totalSelected} model{totalSelected !== 1 ? "s" : ""} selected total
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApply} disabled={totalSelected === 0}>
              Apply Selection ({totalSelected})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}