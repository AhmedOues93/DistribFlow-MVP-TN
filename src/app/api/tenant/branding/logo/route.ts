import { NextRequest, NextResponse } from "next/server";
import { requireRequestContext } from "@/lib/services/auth";
import { readLogo } from "@/lib/services/branding";

export async function GET(request: NextRequest) { try { const logo = await readLogo(await requireRequestContext(request)); if (!logo) return new NextResponse(null, { status: 404 }); return new NextResponse(logo.body as BodyInit, { headers: { "Content-Type": logo.contentType, "Cache-Control": "private, max-age=300" } }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Logo indisponible" }, { status: 404 }); } }
