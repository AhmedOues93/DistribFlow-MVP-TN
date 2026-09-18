import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { globalSearch } from "@/lib/services/search";

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await globalSearch(request.nextUrl.searchParams.get("q") ?? "", await requireRequestContext(request))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Recherche indisponible" }, { status: 400 }); }
}
