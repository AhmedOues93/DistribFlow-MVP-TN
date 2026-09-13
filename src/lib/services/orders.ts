import { z } from "zod";
import { OrderStatus, Prisma } from "@prisma/client";
import { assertTenant, can, type Role } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  requestedDate: z.coerce.date().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.coerce.number().positive(), unitPrice: z.coerce.number().nonnegative(), taxRate: z.coerce.number().min(0).max(100) })).min(1)
});

export async function createOrder(input: unknown, context: { tenantId?: string; role: Role }) {
  if (!can(context.role, "orders:write")) throw new Error("Action non autorisée");
  const tenantId = assertTenant(context.tenantId);
  const data = createOrderSchema.parse(input);
  const customer = await prisma.customer.findFirst({ where: { id: data.customerId, tenantId } });
  if (!customer) throw new Error("Client introuvable");
  const products = await prisma.product.findMany({ where: { tenantId, id: { in: data.items.map((item) => item.productId) }, active: true } });
  if (products.length !== data.items.length) throw new Error("Un ou plusieurs produits sont indisponibles");
  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice * (1 + item.taxRate / 100), 0);
  const count = await prisma.salesOrder.count({ where: { tenantId } });
  return prisma.salesOrder.create({ data: { tenantId, customerId: customer.id, number: `CMD-${String(count + 1).padStart(5, "0")}`, requestedDate: data.requestedDate, total: new Prisma.Decimal(total), status: OrderStatus.DRAFT, items: { create: data.items.map((item) => ({ ...item, quantity: new Prisma.Decimal(item.quantity), unitPrice: new Prisma.Decimal(item.unitPrice), taxRate: new Prisma.Decimal(item.taxRate) })) } }, include: { items: true } });
}
