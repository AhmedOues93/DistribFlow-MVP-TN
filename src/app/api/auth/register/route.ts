import { NextRequest, NextResponse } from "next/server";
import { onboard } from "@/lib/services/auth";
export async function POST(request: NextRequest) { try { return NextResponse.json(await onboard(await request.json()), { status: 201 }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur" }, { status: 400 }); } }
