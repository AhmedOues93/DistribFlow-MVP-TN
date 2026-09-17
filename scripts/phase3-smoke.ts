import { OrderStatus, PrismaClient } from "@prisma/client";
import { createDraft, duplicateOrder, getOrder, recordPreparedQuantities, transitionOrder, updateDraft } from "../src/lib/services/orders";

const prisma = new PrismaClient();
const context = { tenantId: "", role: "OWNER" as const, userId: "phase3-smoke" };

function check(condition: unknown, message: string) { if (!condition) throw new Error(`Smoke check failed: ${message}`); }

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { taxIdentifier: "TN-DF-DEMO" } });
  const customer = await prisma.customer.findFirstOrThrow({ where: { tenantId: tenant.id, active: true } });
  const products = await prisma.product.findMany({ where: { tenantId: tenant.id, active: true, sku: { in: ["EAU-15", "JUS-1L"] } }, orderBy: { sku: "asc" } });
  check(products.length === 2, "seed provides two active products");
  const warehouse = await prisma.warehouse.findFirstOrThrow({ where: { tenantId: tenant.id, active: true, stockLevels: { some: { productId: products[0].id, quantity: { gt: 0 } } } } });
  context.tenantId = tenant.id;
  const initialLevel = await prisma.stockLevel.findUniqueOrThrow({ where: { productId_warehouseId: { productId: products[0].id, warehouseId: warehouse.id } } });
  const draft = await createDraft({ customerId: customer.id, warehouseId: warehouse.id, customerReference: "PHASE3-SMOKE", lines: [{ productId: products[0].id, quantity: "1", discount: "0" }] }, context);
  check(draft.status === OrderStatus.DRAFT && draft.number.startsWith("CMD-"), "draft and tenant-scoped number");
  const edited = await updateDraft(draft.id, { customerId: customer.id, warehouseId: warehouse.id, version: draft.version, customerReference: "PHASE3-SMOKE", lines: [{ productId: products[0].id, quantity: "2", discount: "0" }, { productId: products[1].id, quantity: "1", discount: "0" }] }, context);
  check(edited.items.length === 2, "line add and update");
  const trimmed = await updateDraft(edited.id, { customerId: customer.id, warehouseId: warehouse.id, version: edited.version, customerReference: "PHASE3-SMOKE", lines: [{ productId: products[0].id, quantity: "1", discount: "0" }] }, context);
  check(trimmed.items.length === 1 && trimmed.items[0].quantity.eq(1), "line removal");
  const confirmed = await transitionOrder(trimmed.id, OrderStatus.CONFIRMED, { version: trimmed.version, idempotencyKey: "phase3-smoke-confirm" }, context);
  const repeated = await transitionOrder(trimmed.id, OrderStatus.CONFIRMED, { version: trimmed.version, idempotencyKey: "phase3-smoke-confirm" }, context);
  check(confirmed.status === OrderStatus.CONFIRMED && repeated.status === OrderStatus.CONFIRMED, "confirmation and idempotent retry");
  const preparing = await transitionOrder(trimmed.id, OrderStatus.IN_PREPARATION, { version: confirmed.version, idempotencyKey: "phase3-smoke-start" }, context);
  const prepared = await recordPreparedQuantities(trimmed.id, { version: preparing.version, lines: preparing.items.map((item) => ({ itemId: item.id, preparedQuantity: item.quantity.toString() })) }, context);
  const validated = await transitionOrder(trimmed.id, OrderStatus.PREPARED, { version: prepared.version, idempotencyKey: "phase3-smoke-prepared" }, context);
  const ready = await transitionOrder(trimmed.id, OrderStatus.READY_FOR_DELIVERY, { version: validated.version, idempotencyKey: "phase3-smoke-ready" }, context);
  check(ready.status === OrderStatus.READY_FOR_DELIVERY, "preparation lifecycle reaches ready for delivery");
  const duplicate = await duplicateOrder(trimmed.id, context);
  check(duplicate.status === OrderStatus.DRAFT && duplicate.id !== trimmed.id, "duplicate creates independent draft");
  const cancellable = await createDraft({ customerId: customer.id, warehouseId: warehouse.id, customerReference: "PHASE3-SMOKE-CANCEL", lines: [{ productId: products[0].id, quantity: "1", discount: "0" }] }, context);
  const cancelled = await transitionOrder(cancellable.id, OrderStatus.CANCELLED, { version: cancellable.version, note: "Test smoke", idempotencyKey: "phase3-smoke-cancel" }, context);
  const final = await prisma.salesOrder.findUniqueOrThrow({ where: { id: trimmed.id }, include: { reservations: true, statusHistory: true } });
  const auditCount = await prisma.auditEvent.count({ where: { tenantId: tenant.id, entity: "SalesOrder", entityId: trimmed.id } });
  const finalLevel = await prisma.stockLevel.findUniqueOrThrow({ where: { productId_warehouseId: { productId: products[0].id, warehouseId: warehouse.id } } });
  check(cancelled.status === OrderStatus.CANCELLED && cancelled.cancelReason === "Test smoke", "mandatory cancellation reason");
  check(final.reservations.some((reservation) => reservation.consumedQuantity.eq(reservation.quantity)), "reservation consumed");
  check(final.statusHistory.some((entry) => entry.toStatus === OrderStatus.READY_FOR_DELIVERY), "status history recorded");
  check(auditCount >= 6, "audit events recorded");
  check(initialLevel.quantity.minus(finalLevel.quantity).eq(1), "physical stock consumed exactly once");
  const isolatedTenant = await prisma.tenant.create({ data: { name: "Phase 3 smoke isolation" } });
  try {
    let crossTenantRejected = false;
    try { await getOrder(trimmed.id, { tenantId: isolatedTenant.id, role: "OWNER", userId: "phase3-smoke-other" }); } catch (error) { crossTenantRejected = error instanceof Error && error.message === "Commande introuvable"; }
    check(crossTenantRejected, "cross-tenant order read rejected");
  } finally { await prisma.tenant.delete({ where: { id: isolatedTenant.id } }); }
  let viewerRejected = false;
  try { await transitionOrder(trimmed.id, OrderStatus.CONFIRMED, { version: ready.version, idempotencyKey: "phase3-smoke-viewer" }, { tenantId: tenant.id, role: "VIEWER", userId: "phase3-smoke-viewer" }); } catch (error) { viewerRejected = error instanceof Error && error.message === "Action non autorisée"; }
  check(viewerRejected, "viewer transition rejected");
  console.log(`Phase 3 PostgreSQL smoke passed: ${trimmed.number}, duplicate ${duplicate.number}, cancelled ${cancellable.number}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
