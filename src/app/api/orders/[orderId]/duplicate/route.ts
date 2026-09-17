import { NextRequest, NextResponse } from "next/server";
import { duplicateOrder } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";
export async function POST(request:NextRequest,{params}:{params:Promise<{orderId:string}>}){try{const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)throw new Error("Requête non autorisée");return NextResponse.json(await duplicateOrder((await params).orderId,await requireRequestContext(request)),{status:201})}catch(error){return orderErrorResponse(error)}}
