"use client";

import { useEffect, useState } from "react";
import { getPresignedUrlAction } from "@/lib/server/media-actions";
import type { MediaRow } from "@/lib/server/media-queries";

export function usePresignedMediaUrls(
  parentType: "car" | "part",
  media: MediaRow[],
) {
  const [urls, setUrls] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadUrls() {
      const results = await Promise.all(
        media.map(async (item) => {
          const result = await getPresignedUrlAction(parentType, item.id);
          return [
            item.id,
            result.ok && "presignedUrl" in result ? result.presignedUrl : null,
          ] as const;
        }),
      );

      if (!cancelled) {
        setUrls(Object.fromEntries(results));
      }
    }

    void loadUrls();
    return () => {
      cancelled = true;
    };
  }, [media, parentType]);

  return urls;
}
