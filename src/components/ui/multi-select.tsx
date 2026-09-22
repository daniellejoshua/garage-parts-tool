"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { cn } from "cn";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button, buttonVariants } from "@/components/ui/button";

export interface MultiSelectOption {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

function groupedOptions(options: MultiSelectOption[]): Map<string, MultiSelectOption[]> {
  const groups = new Map<string, MultiSelectOption[]>();
  for (const option of options) {
    const key = option.group ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(option);
  }
  return groups;
}

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 12;
const DEBOUNCE_MS = 150;

interface FlatOption {
  option: MultiSelectOption;
  group: string;
  index: number;
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select options",
  label,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback((optValue: string) => {
    onChange(value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue]);
  }, [value, onChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredOptions = useMemo(() => {
    if (!debouncedSearch) return options;
    const lower = debouncedSearch.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lower) ||
      (opt.group && opt.group.toLowerCase().includes(lower))
    );
  }, [options, debouncedSearch]);

  const filteredGroups = useMemo(() => groupedOptions(filteredOptions), [filteredOptions]);

  const flatOptions = useMemo<FlatOption[]>(() => {
    const result: FlatOption[] = [];
    let flatIndex = 0;
    for (const [group, opts] of filteredGroups) {
      result.push({ option: { value: "", label: group, group: "" }, group, index: -1 });
      for (const option of opts) {
        result.push({ option, group, index: flatIndex++ });
      }
    }
    return result;
  }, [filteredGroups]);

  const totalFilteredOptions = flatOptions.filter((o) => o.index >= 0).length;
  const totalItems = flatOptions.length;
  const listHeight = totalItems * ITEM_HEIGHT;

  const [scrollTop, setScrollTop] = useState(0);
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
  const endIndex = Math.min(totalItems, startIndex + VISIBLE_ITEMS + 4);
  const visibleOptions = flatOptions.slice(startIndex, endIndex);
  const offsetY = startIndex * ITEM_HEIGHT;

  const displayValue = value.length === 0
    ? placeholder
    : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? value[0]
      : `${value.length} selected`;

  return (
    <div className="w-full">
      {label && (
        <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-between text-left",
            value.length > 0 ? "text-foreground" : "text-muted-foreground",
          )}
          disabled={disabled}
        >
          <span className="truncate pr-8">{displayValue}</span>
          <ChevronDownIcon className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", open && "rotate-180")} />
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0 max-h-[400px]">
          <div className="flex flex-col">
            <div className="p-2 border-b">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models..."
                  className="pl-8 h-8 text-sm"
                  autoFocus
                />
              </div>
            </div>
            <Separator />
            <ScrollArea
              ref={scrollAreaRef}
              className="flex-1 p-2"
              onScroll={handleScroll}
              style={{ maxHeight: `${VISIBLE_ITEMS * ITEM_HEIGHT + 4}px` }}
            >
              <div style={{ height: `${listHeight}px` }} className="relative">
                <div
                  style={{ transform: `translateY(${offsetY}px)` }}
                  className="absolute left-0 right-0"
                >
                  {visibleOptions.map(({ option, group, index }, i) => {
                    const isGroupHeader = index === -1;
                    return isGroupHeader ? (
                      <div
                        key={`group-${group}-${i}`}
                        className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        {group}
                      </div>
                    ) : (
                      <Label
                        key={option.value}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={value.includes(option.value)}
                          onCheckedChange={() => handleToggle(option.value)}
                          disabled={disabled}
                          className="size-4"
                        />
                        <span className="text-sm truncate">{option.label}</span>
                        {option.group && (
                          <span className="ml-auto text-xs text-muted-foreground">{option.group}</span>
                        )}
                      </Label>
                    );
                  })}
                </div>
                {totalFilteredOptions === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4" style={{ top: '50%', transform: 'translateY(-50%)', position: 'absolute', left: 0, right: 0 }}>
                    No matching models
                  </div>
                )}
              </div>
            </ScrollArea>
            {value.length > 0 && (
              <div className="flex items-center justify-between px-2 py-2 border-t">
                <span className="text-sm text-muted-foreground">
                  {value.length} model{value.length > 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange([])}
                  className="h-8"
                >
                  <XIcon className="size-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}