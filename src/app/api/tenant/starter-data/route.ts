import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRequestContext } from "@/lib/services/auth";
import { getStarterDataPreview, installStarterData } from "@/lib/services/bootstrap";
import { assertTenant, type Role } from "@/lib/tenant";

function owner(context: { tenantId?: string; role: Role }) { if (context.role !== "OWNER" && context.role !== "PLATFORM_ADMIN") throw new Error("Action réservée au propriétaire"); return assertTenant(context.tenantId); }
export async function GET(request: NextRequest) { try { const context = await requireRequestContext(request); return NextResponse.json(await getStarterDataPreview(prisma, owner(context))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
export async function POST(request: NextRequest) { try { const context = await requireRequestContext(request); const tenantId = owner(context); return NextResponse.json(await prisma.$transaction((tx) => installStarterData(tx, tenantId))); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 400 }); } }
