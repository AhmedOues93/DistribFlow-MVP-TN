import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { createOrder, listOrders } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;
    const rawStatus = search.get("status");
    if (rawStatus && !Object.values(OrderStatus).includes(rawStatus as OrderStatus)) throw new Error("Statut invalide");
    const page = Number(search.get("page") ?? 1);
    if (!Number.isInteger(page) || page < 1) throw new Error("Page invalide");
    const dateFrom = search.get("dateFrom") ? new Date(search.get("dateFrom")!) : undefined;
    const dateTo = search.get("dateTo") ? new Date(search.get("dateTo")!) : undefined;
    if (dateTo && /^\d{4}-\d{2}-\d{2}$/.test(search.get("dateTo")!)) dateTo.setUTCHours(23, 59, 59, 999);
    if (dateFrom && Number.isNaN(dateFrom.valueOf()) || dateTo && Number.isNaN(dateTo.valueOf())) throw new Error("Date invalide");
    return NextResponse.json(await listOrders(await requireRequestContext(request), { query: search.get("q") ?? "", status: rawStatus as OrderStatus | undefined, warehouseId: search.get("warehouseId") ?? undefined, customerId: search.get("customerId") ?? undefined, dateFrom, dateTo, page }));
  } catch (error) { return orderErrorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) throw new Error("Requête non autorisée");
    const order = await createOrder(await request.json(), await requireRequestContext(request));
    return NextResponse.json(order, { status: 201 });
  } catch (error) { return orderErrorResponse(error); }
}
