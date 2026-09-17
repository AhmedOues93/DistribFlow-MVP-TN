import { NextRequest, NextResponse } from "next/server";
import { recordPreparedQuantities } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";
export async function PATCH(request:NextRequest,{params}:{params:Promise<{orderId:string}>}){try{const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)throw new Error("Requête non autorisée");return NextResponse.json(await recordPreparedQuantities((await params).orderId,await request.json(),await requireRequestContext(request)))}catch(error){return orderErrorResponse(error)}}
