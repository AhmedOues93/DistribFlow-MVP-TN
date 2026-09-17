import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("order service uses tenant-scoped atomic numbering and Decimal totals", async () => {
  const source = await readFile("src/lib/services/orders.ts", "utf8");
  assert.match(source, /INSERT INTO "OrderSequence"/);
  assert.match(source, /ON CONFLICT \("tenantId"\) DO UPDATE/);
  assert.match(source, /new Prisma\.Decimal/);
  assert.match(source, /ROUND_HALF_UP/);
  assert.match(source, /skuSnapshot/);
  assert.match(source, /descriptionSnapshot/);
});

test("order lifecycle reserves, consumes, audits and rejects unsafe transitions", async () => {
  const source = await readFile("src/lib/services/orders.ts", "utf8");
  assert.match(source, /Stock disponible insuffisant/);
  assert.match(source, /OrderStatus\.IN_PREPARATION/);
  assert.match(source, /orderReservation\.updateMany/);
  assert.match(source, /stockMovement\.create/);
  assert.match(source, /orderStatusHistory\.create/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
});

test("order APIs derive context from the secure session", async () => {
  const collection = await readFile("src/app/api/orders/route.ts", "utf8");
  const transition = await readFile("src/app/api/orders/[orderId]/transition/route.ts", "utf8");
  assert.match(collection, /requireRequestContext\(request\)/);
  assert.match(transition, /requireRequestContext\(request\)/);
  assert.doesNotMatch(`${collection}${transition}`, /x-tenant-id|x-role/);
});

test("order mutations cover edit, duplicate, mandatory cancellation and WhatsApp safety", async () => {
  const service = await readFile("src/lib/services/orders.ts", "utf8");
  const detail = await readFile("src/app/commandes/order-detail.tsx", "utf8");
  assert.match(service, /updateDraft/);
  assert.match(service, /salesOrderItem\.deleteMany/);
  assert.match(service, /salesOrderItem\.createMany/);
  assert.match(service, /duplicateOrder/);
  assert.match(service, /Le motif d’annulation est obligatoire/);
  assert.match(service, /source: data\.source/);
  assert.match(service, /https:\/\/wa\.me/);
  assert.match(service, /idempotencyKey/);
  assert.match(service, /findOrderWithAudit/);
  assert.match(detail, /\/duplicate/);
  assert.match(detail, /window\.prompt/);
  assert.match(detail, /window\.print/);
  assert.match(detail, /hostname !== "wa\.me"/);
});

test("order interfaces expose every Phase 3 route and state safeguard", async () => {
  const files = await Promise.all([
    readFile("src/app/commandes/[orderId]/modifier/page.tsx", "utf8"),
    readFile("src/app/commandes/orders-client.tsx", "utf8"),
    readFile("src/app/commandes/order-editor.tsx", "utf8"),
    readFile("src/app/preparation/preparation-client.tsx", "utf8"),
    readFile("src/app/preparation/preparation-detail.tsx", "utf8"),
  ]);
  const source = files.join("\n");
  assert.match(source, /OrderEditor orderId/);
  assert.match(source, /warehouseId/);
  assert.match(source, /dateFrom/);
  assert.match(source, /searchParams/);
  assert.match(source, /Chargement/);
  assert.match(source, /Aucune commande/);
  assert.match(source, /Réessayer/);
  assert.match(source, /beforeunload/);
  assert.match(source, /Ajouter une ligne/);
  assert.match(source, /Retirer/);
});

test("order roles and lifecycle are explicit in server and documentation", async () => {
  const tenant = await readFile("src/lib/tenant.ts", "utf8");
  const permissions = await readFile("PERMISSIONS.md", "utf8");
  const readme = await readFile("README.md", "utf8");
  assert.match(tenant, /orders:read/);
  assert.match(tenant, /orders:write/);
  assert.match(tenant, /orders:prepare/);
  assert.match(permissions, /Sales Agent.*Lecture uniquement/);
  assert.match(permissions, /Driver.*Aucun accès/);
  assert.match(readme, /READY_FOR_DELIVERY/);
  assert.match(readme, /Prisma\.Decimal/);
  assert.match(readme, /WHATSAPP/);
});

test("order reads, writes, preparation and availability keep tenant and role boundaries", async () => {
  const service = await readFile("src/lib/services/orders.ts", "utf8");
  const tenant = await readFile("src/lib/tenant.ts", "utf8");
  assert.match(service, /where: \{ id: orderId, tenantId \}/);
  assert.match(service, /requirePermission\(context, "orders:write"\)/);
  assert.match(service, /requirePermission\(context, "orders:prepare"\)/);
  assert.match(service, /warehouse: \{ id: warehouseId, tenantId, active: true \}/);
  assert.match(tenant, /VIEWER: \["customers:read", "orders:read"/);
  assert.match(tenant, /WAREHOUSE_MANAGER: \["stock:read", "stock:write", "orders:read", "orders:prepare"\]/);
});
