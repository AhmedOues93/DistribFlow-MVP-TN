import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api-response";
import { requireRequestContext } from "@/lib/services/auth";
import { unreadCount } from "@/lib/services/notifications";
import { prisma } from "@/lib/prisma";
import { canonicalRole } from "@/lib/tenant";
import { OrderStatus } from "@prisma/client";
export async function GET(request: NextRequest) { try { const context = await requireRequestContext(request); const role = canonicalRole(context.role); const orders = ["SALES", "WAREHOUSE", "DRIVER", "READ_ONLY"].includes(role) ? await prisma.salesOrder.count({ where: { tenantId: context.tenantId, ...(role === "DRIVER" ? { status: { in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY] } } : {}) } }) : null; const preparation = role === "WAREHOUSE" ? await prisma.salesOrder.count({ where: { tenantId: context.tenantId, status: { in: [OrderStatus.CONFIRMED, OrderStatus.IN_PREPARATION] } } }) : null; return jsonOk({ role, metrics: { orders, preparation, unread: await unreadCount(context) } }); } catch (error) { return jsonError(error, 401); } }
