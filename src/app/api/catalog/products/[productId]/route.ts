import { NextRequest, NextResponse } from "next/server";
import { setProductActive, updateProduct } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";
const fail=(error:unknown)=>{const message=error instanceof Error?error.message:"Erreur";return NextResponse.json({error:message},{status:message==="Authentification requise"?401:message==="Action non autorisée"?403:400})};
export async function PATCH(request:NextRequest,{params}:{params:Promise<{productId:string}>}){try{return NextResponse.json(await updateProduct((await params).productId,await request.json(),await requireRequestContext(request)))}catch(error){return fail(error)}}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{productId:string}>}){try{return NextResponse.json(await setProductActive((await params).productId,false,await requireRequestContext(request)))}catch(error){return fail(error)}}
