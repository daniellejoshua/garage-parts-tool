"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadBlob, downloadJson } from "@/lib/json-export";
import type { ExportScope, TransferValidationResult } from "@/lib/server/transfer-service";

interface BlockedExportResponse {
  error?: string;
  report?: TransferValidationResult;
}

export function ExportButton({
  scope,
  disabled = false,
  sourceIds,
}: {
  scope: ExportScope;
  disabled?: boolean;
  sourceIds?: string[];
}) {
  const [pending, setPending] = useState(false);

  async function handleExport() {
    setPending(true);
    try {
      const query = sourceIds?.length ? `?ids=${sourceIds.join(",")}` : "";
      const response = await fetch(`/api/export/${scope}${query}`);
      if (!response.ok) {
        const result = (await response.json()) as BlockedExportResponse;
        if (result.report) {
          downloadJson(`${scope}-preflight-report.json`, result.report);
          toast.error(
            `Export blocked by ${result.report.errors.length} preflight error${result.report.errors.length === 1 ? "" : "s"}. Report downloaded.`,
          );
        } else {
          toast.error(result.error ?? "Export could not be created.");
        }
        return;
      }

      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1]
        ?? `gap-${scope}-export.zip`;
      downloadBlob(filename, await response.blob());
      toast.success(`${scope === "car" ? "Car" : "Part"} export downloaded`);
    } catch {
      toast.error("Export could not be created. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || pending}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
      Export
    </Button>
  );
}
