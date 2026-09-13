import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/services/orders";

export async function POST(request: NextRequest) {
  try {
    // Auth middleware will provide these server-only claims in production.
    const tenantId = request.headers.get("x-tenant-id") ?? undefined;
    const role = (request.headers.get("x-role") ?? "VIEWER") as Parameters<typeof createOrder>[1]["role"];
    const order = await createOrder(await request.json(), { tenantId, role });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inattendue";
    return NextResponse.json({ error: message }, { status: message.includes("autor") ? 403 : 400 });
  }
}
