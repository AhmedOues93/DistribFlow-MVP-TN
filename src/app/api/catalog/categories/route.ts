import { NextRequest, NextResponse } from "next/server";
import { createCategory, listCategories } from "@/lib/services/catalog";
import { requireRequestContext } from "@/lib/services/auth";
export async function GET(request:NextRequest){try{return NextResponse.json(await listCategories(await requireRequestContext(request),request.nextUrl.searchParams.get("active")==="all"?undefined:true,request.nextUrl.searchParams.get("q")??""))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur"},{status:400})}}
export async function POST(request:NextRequest){try{return NextResponse.json(await createCategory(await request.json(),await requireRequestContext(request)),{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erreur"},{status:400})}}
