import { NextRequest, NextResponse } from "next/server";
import { setCustomerActive } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ customerId: string }> }) { try { const origin=request.headers.get("origin"); if(origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée"); return NextResponse.json(await setCustomerActive((await params).customerId, true, await requireRequestContext(request))); } catch (error) { const message=error instanceof Error ? error.message : "Erreur inattendue"; return NextResponse.json({error:message},{status:message === "Authentification requise" ? 401 : message === "Action non autorisée" ? 403 : message === "Client introuvable" ? 404 : 400}); } }
