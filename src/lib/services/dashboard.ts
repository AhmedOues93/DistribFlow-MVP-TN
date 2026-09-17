import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTenant, can, type Role } from "@/lib/tenant";

type Context = { tenantId?: string; role: Role };

const orderStatusOrder = [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.IN_PREPARATION, OrderStatus.PREPARED, OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED, OrderStatus.PARTIALLY_DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED];

export async function getDashboardOverview(context: Context) {
  const tenantId = assertTenant(context.tenantId);
  const canReadCustomers = can(context.role, "customers:read");
  const canReadStock = can(context.role, "stock:read");
  const [customers, products, stockLevels, statusGroups, recentOrders] = await Promise.all([
    canReadCustomers ? prisma.customer.count({ where: { tenantId, active: true } }) : Promise.resolve(null),
    canReadStock ? prisma.product.count({ where: { tenantId, active: true } }) : Promise.resolve(null),
    canReadStock ? prisma.stockLevel.findMany({ where: { warehouse: { tenantId, active: true }, product: { tenantId, active: true } }, include: { product: true, warehouse: true } }) : Promise.resolve([]),
    can(context.role, "orders:read") ? prisma.salesOrder.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }) : Promise.resolve([]),
    can(context.role, "orders:read") ? prisma.salesOrder.findMany({ where: { tenantId }, include: { customer: true, warehouse: true }, orderBy: { orderDate: "desc" }, take: 6 }) : Promise.resolve([]),
  ]);
  const statusCounts = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const activeStatuses = [OrderStatus.CONFIRMED, OrderStatus.IN_PREPARATION, OrderStatus.PREPARED, OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PARTIALLY_DELIVERED];
  const preparationStatuses = [OrderStatus.CONFIRMED, OrderStatus.IN_PREPARATION];
  return {
    metrics: {
      customers,
      products,
      lowStock: canReadStock ? stockLevels.filter((level) => level.quantity.lte(level.product.minimumStock)).length : null,
      activeOrders: activeStatuses.reduce((total, status) => total + (statusCounts.get(status) ?? 0), 0),
      preparation: preparationStatuses.reduce((total, status) => total + (statusCounts.get(status) ?? 0), 0),
    },
    statusSummary: orderStatusOrder.map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
    recentOrders: recentOrders.map((order) => ({ id: order.id, number: order.number, customer: order.customer.name, warehouse: order.warehouse?.name ?? null, status: order.status, total: order.total.toString(), orderDate: order.orderDate.toISOString() })),
    stockSummary: canReadStock ? stockLevels.slice().sort((left, right) => Number(left.quantity) - Number(right.quantity)).slice(0, 5).map((level) => ({ product: level.product.name, warehouse: level.warehouse.name, quantity: level.quantity.toString(), minimumStock: level.product.minimumStock.toString(), low: level.quantity.lte(level.product.minimumStock) })) : [],
  };
}
