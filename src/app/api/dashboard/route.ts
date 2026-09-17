import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { getDashboardOverview } from "@/lib/services/dashboard";

export async function GET(request: NextRequest) {
  try { return NextResponse.json(await getDashboardOverview(await requireRequestContext(request))); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); }
}
