import { NextRequest, NextResponse } from "next/server";
import { createCustomer, listCustomers } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";

function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : "Erreur inattendue"; const status = message === "Authentification requise" ? 401 : message === "Action non autorisée" ? 403 : 400; return NextResponse.json({ error: message }, { status }); }
function assertSameOrigin(request: NextRequest) { const origin=request.headers.get("origin"); if(origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée"); }
export async function GET(request: NextRequest) { try { const { searchParams } = request.nextUrl; const active=searchParams.get("active"); return NextResponse.json(await listCustomers(await requireRequestContext(request), {query:searchParams.get("q") ?? "",page:Number(searchParams.get("page") ?? 1),pageSize:Number(searchParams.get("pageSize") ?? 25),active:active === null || active === "all" ? undefined : active === "true",sort:searchParams.get("sort") === "createdAt" ? "createdAt" : "name"})); } catch (error) { return errorResponse(error); } }
export async function POST(request: NextRequest) { try { assertSameOrigin(request); return NextResponse.json(await createCustomer(await request.json(), await requireRequestContext(request)), { status: 201 }); } catch (error) { return errorResponse(error); } }
