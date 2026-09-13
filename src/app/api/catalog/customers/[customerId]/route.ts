import { NextRequest, NextResponse } from "next/server";
import { getCustomer, setCustomerActive, updateCustomer } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";

type RouteContext = { params: Promise<{ customerId: string }> };
function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : "Erreur inattendue"; const status = message === "Authentification requise" ? 401 : message === "Action non autorisée" ? 403 : message === "Client introuvable" ? 404 : 400; return NextResponse.json({ error: message }, { status }); }
function assertSameOrigin(request: NextRequest) { const origin=request.headers.get("origin"); if(origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée"); }
export async function GET(request: NextRequest, { params }: RouteContext) { try { return NextResponse.json(await getCustomer((await params).customerId, await requireRequestContext(request))); } catch (error) { return errorResponse(error); } }
export async function PATCH(request: NextRequest, { params }: RouteContext) { try { assertSameOrigin(request); return NextResponse.json(await updateCustomer((await params).customerId, await request.json(), await requireRequestContext(request))); } catch (error) { return errorResponse(error); } }
export async function DELETE(request: NextRequest, { params }: RouteContext) { try { assertSameOrigin(request); return NextResponse.json(await setCustomerActive((await params).customerId, false, await requireRequestContext(request))); } catch (error) { return errorResponse(error); } }
