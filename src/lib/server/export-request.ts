import "server-only";

export type ParsedExportSourceIds =
  | { ok: true; sourceIds?: bigint[] }
  | { ok: false; error: string };

export function parseExportSourceIds(request: Request): ParsedExportSourceIds {
  const raw = new URL(request.url).searchParams.get("ids");
  if (raw === null) return { ok: true };

  const values = raw.split(",").map((value) => value.trim());
  if (values.length === 0 || values.some((value) => !/^\d+$/.test(value))) {
    return { ok: false, error: "ids must be a comma-separated list of BIGINT identifiers." };
  }

  const sourceIds = [...new Set(values)].map((value) => BigInt(value));
  if (sourceIds.length === 0) {
    return { ok: false, error: "Select at least one source listing id." };
  }
  return { ok: true, sourceIds };
}
