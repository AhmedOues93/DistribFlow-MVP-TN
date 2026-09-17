import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { transitionOrder } from "@/lib/services/orders";
import { requireRequestContext } from "@/lib/services/auth";
import { orderErrorResponse } from "@/lib/order-http";
export async function POST(request:NextRequest,{params}:{params:Promise<{orderId:string}>}){try{const origin=request.headers.get("origin");if(origin&&origin!==request.nextUrl.origin)throw new Error("Requête non autorisée");const body=await request.json();if(!body||typeof body.status!=="string"||!Object.values(OrderStatus).includes(body.status as OrderStatus))throw new Error("Statut invalide");return NextResponse.json(await transitionOrder((await params).orderId,body.status as OrderStatus,{idempotencyKey:body.idempotencyKey,note:body.note,version:body.version},await requireRequestContext(request)))}catch(error){return orderErrorResponse(error)}}
