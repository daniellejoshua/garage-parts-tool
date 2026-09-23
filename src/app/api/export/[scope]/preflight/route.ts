import { NextResponse } from "next/server";
import {
  validateTransferReadiness,
  type ExportScope,
} from "@/lib/server/transfer-service";
import { parseExportSourceIds } from "@/lib/server/export-request";

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

  const report = await validateTransferReadiness(scope, selection.sourceIds);
  return NextResponse.json({ ok: report.success, report }, { status: report.success ? 200 : 422 });
}
