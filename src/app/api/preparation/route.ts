import { NextRequest, NextResponse } from "next/server";
import { listPreparationOrders } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";
export async function GET(request:NextRequest){try{const p=request.nextUrl.searchParams;const page=Number(p.get("page")??1);if(!Number.isInteger(page)||page<1)throw new Error("Page invalide");return NextResponse.json(await listPreparationOrders(await requireRequestContext(request),p.get("warehouseId")??undefined,page))}catch(error){return orderErrorResponse(error)}}
