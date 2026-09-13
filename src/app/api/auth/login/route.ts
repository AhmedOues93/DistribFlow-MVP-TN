import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { startSession } from "@/lib/services/auth";
export async function POST(request: NextRequest) { try { const session = await startSession(await request.json()); (await cookies()).set("distribflow_session", session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 1209600 }); return NextResponse.json({ tenantId: session.tenantId, role: session.role }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur" }, { status: 401 }); } }
