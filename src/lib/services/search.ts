import { prisma } from "@/lib/prisma";
import { assertTenant, can, type Role } from "@/lib/tenant";

export type SearchResult = { kind: "customer" | "product" | "order"; id: string; title: string; subtitle: string; href: string };

export async function globalSearch(query: string, context: { tenantId?: string; role: Role }) {
  const tenantId = assertTenant(context.tenantId);
  const value = query.trim().slice(0, 80);
  if (value.length < 2) return { query: value, results: { customers: [], products: [], orders: [] }, total: 0 };
  const [customers, products, orders] = await Promise.all([
    can(context.role, "customers:read") ? prisma.customer.findMany({ where: { tenantId, active: true, OR: [{ name: { contains: value, mode: "insensitive" } }, { phone: { contains: value, mode: "insensitive" } }, { taxIdentifier: { contains: value, mode: "insensitive" } }] }, select: { id: true, name: true, phone: true }, take: 5, orderBy: { name: "asc" } }) : [],
    can(context.role, "stock:read") ? prisma.product.findMany({ where: { tenantId, active: true, OR: [{ name: { contains: value, mode: "insensitive" } }, { sku: { contains: value, mode: "insensitive" } }, { barcode: { contains: value, mode: "insensitive" } }] }, select: { id: true, name: true, sku: true, unit: true }, take: 5, orderBy: { name: "asc" } }) : [],
    can(context.role, "orders:read") ? prisma.salesOrder.findMany({ where: { tenantId, OR: [{ number: { contains: value, mode: "insensitive" } }, { customerReference: { contains: value, mode: "insensitive" } }, { customer: { name: { contains: value, mode: "insensitive" } } }] }, select: { id: true, number: true, status: true, customer: { select: { name: true } } }, take: 5, orderBy: { orderDate: "desc" } }) : [],
  ]);
  return {
    query: value,
    results: {
      customers: customers.map((item): SearchResult => ({ kind: "customer", id: item.id, title: item.name, subtitle: item.phone ?? "Client", href: `/clients?q=${encodeURIComponent(item.name)}` })),
      products: products.map((item): SearchResult => ({ kind: "product", id: item.id, title: item.name, subtitle: `${item.sku} · ${item.unit}`, href: `/catalogue/produits?q=${encodeURIComponent(item.sku)}` })),
      orders: orders.map((item): SearchResult => ({ kind: "order", id: item.id, title: item.number, subtitle: `${item.customer.name} · ${item.status}`, href: `/commandes/${item.id}` })),
    },
    total: customers.length + products.length + orders.length,
  };
}
