import { NextResponse } from "next/server";
import { getModelsByBrandId, searchVehicleModels } from "@/lib/server/catalog-queries";
import { partIdToBigInt } from "@/lib/server/part-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_SEARCH_LENGTH = 2;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brandId = url.searchParams.get("brandId");
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (brandId) {
    if (partIdToBigInt(brandId) === null) {
      return NextResponse.json({ ok: false, error: "Invalid brand id." }, { status: 400 });
    }
    const models = await getModelsByBrandId(brandId);
    return NextResponse.json({ ok: true, models });
  }

  if (query.length >= MIN_SEARCH_LENGTH) {
    const models = await searchVehicleModels(query);
    return NextResponse.json({ ok: true, models });
  }

  return NextResponse.json(
    { ok: false, error: "Provide a brandId or a search query of at least 2 characters." },
    { status: 400 },
  );
}