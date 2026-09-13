import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée");
    const order = await createOrder(await request.json(), await requireRequestContext(request));
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue";
    const status = message === "Authentification requise" ? 401 : message.includes("autor") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
