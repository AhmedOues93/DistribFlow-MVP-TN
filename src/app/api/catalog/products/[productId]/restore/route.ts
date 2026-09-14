import { NextRequest, NextResponse } from "next/server";
import { setProductActive } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";
export async function POST(request:NextRequest,{params}:{params:Promise<{productId:string}>}){try{return NextResponse.json(await setProductActive((await params).productId,true,await requireRequestContext(request)))}catch(error){const message=error instanceof Error?error.message:"Erreur";return NextResponse.json({error:message},{status:message==="Authentification requise"?401:message==="Action non autorisée"?403:400})}}
