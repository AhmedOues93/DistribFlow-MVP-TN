import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { switchCompany } from "@/lib/services/auth";

export async function POST(request: NextRequest) { try { const body = await request.json(); return NextResponse.json(await switchCompany((await cookies()).get("distribflow_session")?.value, body.tenantId)); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
