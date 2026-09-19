import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { startSession } from "@/lib/services/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/api-response";
export async function POST(request: NextRequest) { try { const session = await startSession(await parseJson(request)); (await cookies()).set("distribflow_session", session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 1209600 }); return jsonOk({ tenantId: session.tenantId, role: session.role, redirectTo: session.redirectTo, companies: session.companies }); } catch (error) { return jsonError(error, 401, "Identifiants invalides"); } }
