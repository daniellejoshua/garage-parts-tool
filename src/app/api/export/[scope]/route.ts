import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { createExportArchive } from "@/lib/server/export-service";
import { parseExportSourceIds } from "@/lib/server/export-request";
import type { ExportScope } from "@/lib/server/transfer-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isExportScope(value: string): value is ExportScope {
  return value === "car" || value === "part";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scope: string }> },
) {
  const { scope } = await params;
  if (!isExportScope(scope)) {
    return NextResponse.json({ ok: false, error: "Unsupported export scope." }, { status: 404 });
  }

  const selection = parseExportSourceIds(request);
  if (!selection.ok) {
    return NextResponse.json({ ok: false, error: selection.error }, { status: 400 });
  }

  const result = await createExportArchive(scope, selection.sourceIds);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "Export blocked by preflight validation.", report: result.report },
      { status: 422 },
    );
  }

  return new Response(
    Readable.toWeb(result.stream) as unknown as ReadableStream,
    {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
