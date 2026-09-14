import { NextRequest, NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";
const fail=(error:unknown)=>{const message=error instanceof Error?error.message:"Erreur";return NextResponse.json({error:message},{status:message==="Authentification requise"?401:message==="Action non autorisée"?403:400})};
export async function GET(request:NextRequest){try{const p=request.nextUrl.searchParams,a=p.get("active");return NextResponse.json(await listProducts(await requireRequestContext(request),{query:p.get("q")??"",page:Number(p.get("page")??1),active:a===null||a==="all"?undefined:a==="true"}))}catch(error){return fail(error)}}
export async function POST(request:NextRequest){try{if(request.headers.get("origin")&&request.headers.get("origin")!==request.nextUrl.origin)throw new Error("Requête non autorisée");return NextResponse.json(await createProduct(await request.json(),await requireRequestContext(request)),{status:201})}catch(error){return fail(error)}}
