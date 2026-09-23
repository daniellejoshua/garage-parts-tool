"use client";

import { useEffect } from "react";

const RECENT_BRANDS_KEY = "gap-admin-recent-brands";
const RECENT_BRANDS_EVENT = "gap-admin-recent-brands-change";

export function RecentBrandTracker({ brandSlug }: { brandSlug: string }) {
  useEffect(() => {
    let stored: unknown = [];
    try {
      stored = JSON.parse(window.localStorage.getItem(RECENT_BRANDS_KEY) ?? "[]");
    } catch {
      stored = [];
    }

    const recents = Array.isArray(stored)
      ? stored.filter((value): value is string => typeof value === "string")
      : [];
    const next = [brandSlug, ...recents.filter((slug) => slug !== brandSlug)].slice(0, 5);
    window.localStorage.setItem(RECENT_BRANDS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_BRANDS_EVENT));
  }, [brandSlug]);

  return null;
}
