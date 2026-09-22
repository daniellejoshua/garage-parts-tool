"use client";

import { useState } from "react";
import { ClipboardListIcon, FileTextIcon } from "lucide-react";
import { cn } from "cn";

interface SpecGroup {
  title: string;
  items: Array<{ label: string; value: string }>;
}

export function VehicleDetailTabs({
  description,
  groups,
}: {
  description: string | null;
  groups: SpecGroup[];
}) {
  const [tab, setTab] = useState<"description" | "specifications">("description");

  return (
    <section className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex border-b border-border px-2">
        <button
          type="button"
          onClick={() => setTab("description")}
          className={cn(
            "flex min-h-10 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition",
            tab === "description" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <FileTextIcon className="size-4" />
          Description
        </button>
        <button
          type="button"
          onClick={() => setTab("specifications")}
          className={cn(
            "flex min-h-10 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition",
            tab === "specifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <ClipboardListIcon className="size-4" />
          Specifications
        </button>
      </div>

      <div className="p-4">
        {tab === "description" ? (
          <div>
            <h2 className="text-base font-semibold">Description</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-foreground/90">
              {description?.trim() ? description : "No description provided."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                <dl className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <div key={`${group.title}-${item.label}`} className="flex items-start justify-between gap-4 border-b border-border/70 pb-2 last:border-b-0">
                      <dt className="text-sm text-muted-foreground">{item.label}</dt>
                      <dd className="text-right text-sm font-medium text-foreground">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
