import { NextRequest, NextResponse } from "next/server";
import { stockAvailability } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";
export async function GET(request:NextRequest){try{const warehouseId=request.nextUrl.searchParams.get("warehouseId");if(!warehouseId)throw new Error("Entrepôt requis");return NextResponse.json(await stockAvailability(await requireRequestContext(request),warehouseId,request.nextUrl.searchParams.get("productId")??undefined))}catch(error){return orderErrorResponse(error)}}
