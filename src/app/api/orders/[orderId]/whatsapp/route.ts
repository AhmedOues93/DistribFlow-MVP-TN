import { NextRequest, NextResponse } from "next/server";
import { whatsappConfirmationUrl } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";
export async function GET(request:NextRequest,{params}:{params:Promise<{orderId:string}>}){try{return NextResponse.json(await whatsappConfirmationUrl((await params).orderId,await requireRequestContext(request)))}catch(error){return orderErrorResponse(error)}}
