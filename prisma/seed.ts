import { MovementType, OrderStatus, PrismaClient } from "@prisma/client";
import { installStarterData } from "../src/lib/services/bootstrap";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({ where: { taxIdentifier: "TN-DF-DEMO" }, update: {}, create: { name: "Nour Alimentation", taxIdentifier: "TN-DF-DEMO" } });
  await installStarterData(prisma, tenant.id);
  const [tunis, ariana] = await Promise.all([
    prisma.warehouse.upsert({ where: { id: "demo-warehouse" }, update: { active: true }, create: { id: "demo-warehouse", tenantId: tenant.id, code: "TUN-01", name: "Dépôt Tunis" } }),
    prisma.warehouse.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: "ARI-01" } }, update: { active: true }, create: { tenantId: tenant.id, code: "ARI-01", name: "Dépôt Ariana" } }),
  ]);
  const [boissons, epicerie, piece] = await Promise.all([
    prisma.productCategory.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: "Boissons" } }, update: { active: true }, create: { tenantId: tenant.id, name: "Boissons" } }),
    prisma.productCategory.upsert({ where: { tenantId_name: { tenantId: tenant.id, name: "Épicerie" } }, update: { active: true }, create: { tenantId: tenant.id, name: "Épicerie" } }),
    prisma.unit.upsert({ where: { tenantId_symbol: { tenantId: tenant.id, symbol: "PCE" } }, update: { active: true }, create: { tenantId: tenant.id, name: "Pièce", symbol: "PCE" } }),
  ]);
  void epicerie; void piece;
  const [water, juice] = await Promise.all([
    prisma.product.upsert({ where: { tenantId_sku: { tenantId: tenant.id, sku: "EAU-15" } }, update: { active: true, categoryId: boissons.id }, create: { tenantId: tenant.id, sku: "EAU-15", name: "Eau minérale 1,5 L", unit: "PCE", sellingPrice: 1.2, purchasePrice: 0.7, categoryId: boissons.id, minimumStock: 24 } }),
    prisma.product.upsert({ where: { tenantId_sku: { tenantId: tenant.id, sku: "JUS-1L" } }, update: { active: true, categoryId: boissons.id }, create: { tenantId: tenant.id, sku: "JUS-1L", name: "Jus orange 1 L", unit: "PCE", sellingPrice: 3.5, purchasePrice: 2.1, categoryId: boissons.id, minimumStock: 12 } }),
  ]);
  const [amen, salem] = await Promise.all([
    prisma.customer.upsert({ where: { tenantId_phone: { tenantId: tenant.id, phone: "20123456" } }, update: { active: true }, create: { tenantId: tenant.id, name: "Épicerie El Amen", phone: "20123456", addresses: { create: { label: "Principal", address: "Ariana", isDefault: true } } } }),
    prisma.customer.upsert({ where: { tenantId_phone: { tenantId: tenant.id, phone: "22334455" } }, update: { active: true }, create: { tenantId: tenant.id, name: "Marché Salem", phone: "22334455", addresses: { create: { label: "Principal", address: "Tunis", isDefault: true } } } }),
  ]);
  await Promise.all([
    prisma.stockLevel.upsert({ where: { productId_warehouseId: { productId: water.id, warehouseId: tunis.id } }, update: { quantity: 180 }, create: { productId: water.id, warehouseId: tunis.id, quantity: 180 } }),
    prisma.stockLevel.upsert({ where: { productId_warehouseId: { productId: juice.id, warehouseId: tunis.id } }, update: { quantity: 96 }, create: { productId: juice.id, warehouseId: tunis.id, quantity: 96 } }),
    prisma.stockLevel.upsert({ where: { productId_warehouseId: { productId: water.id, warehouseId: ariana.id } }, update: { quantity: 48 }, create: { productId: water.id, warehouseId: ariana.id, quantity: 48 } }),
  ]);
  await prisma.stockMovement.upsert({ where: { id: "demo-opening" }, update: {}, create: { id: "demo-opening", warehouseId: tunis.id, productId: water.id, type: MovementType.PURCHASE_RECEIPT, quantity: 180, createdById: "seed", reference: "STOCK-INITIAL" } });

  const orderData = [
    { number: "CMD-DEMO-000001", customerId: amen.id, warehouseId: tunis.id, status: OrderStatus.DRAFT, product: water, quantity: 12, prepared: 0 },
    { number: "CMD-DEMO-000002", customerId: salem.id, warehouseId: tunis.id, status: OrderStatus.CONFIRMED, product: juice, quantity: 8, prepared: 0 },
    { number: "CMD-DEMO-000003", customerId: amen.id, warehouseId: tunis.id, status: OrderStatus.IN_PREPARATION, product: water, quantity: 20, prepared: 6 },
    { number: "CMD-DEMO-000004", customerId: salem.id, warehouseId: ariana.id, status: OrderStatus.PREPARED, product: water, quantity: 10, prepared: 10 },
  ];
  for (const data of orderData) {
    const subtotal = data.product.sellingPrice.mul(data.quantity); const tax = subtotal.mul(data.product.taxRate).div(100); const total = subtotal.plus(tax);
    await prisma.salesOrder.upsert({
      where: { tenantId_number: { tenantId: tenant.id, number: data.number } }, update: {},
      create: { tenantId: tenant.id, customerId: data.customerId, warehouseId: data.warehouseId, number: data.number, status: data.status, createdById: "seed", confirmedById: data.status !== OrderStatus.DRAFT ? "seed" : undefined, confirmedAt: data.status !== OrderStatus.DRAFT ? new Date() : undefined, preparedById: data.status === OrderStatus.PREPARED ? "seed" : undefined, preparedAt: data.status === OrderStatus.PREPARED ? new Date() : undefined, subtotal, discount: 0, tax, total, items: { create: { productId: data.product.id, descriptionSnapshot: data.product.name, skuSnapshot: data.product.sku, unitSnapshot: data.product.unit, quantity: data.quantity, preparedQuantity: data.prepared, unitPrice: data.product.sellingPrice, discount: 0, taxRate: data.product.taxRate, lineSubtotal: subtotal, lineTotal: total } }, statusHistory: { create: { toStatus: data.status, actorId: "seed", note: "Donnée de démonstration" } } },
    });
  }
  console.log("🌱 Données Phase 3 prêtes.");
}

main().finally(() => prisma.$disconnect());
