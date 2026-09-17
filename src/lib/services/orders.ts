import { MovementType, OrderSource, OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertTenant, can, type Role } from "@/lib/tenant";

type Context = { tenantId?: string; role: Role; userId?: string };
type Transaction = Prisma.TransactionClient;
const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
const quantity = z.coerce.number().finite().positive("La quantité doit être positive");
const lineSchema = z.object({ productId: z.string().min(1), quantity, discount: z.coerce.number().finite().min(0).default(0) });
const draftSchema = z.object({ customerId: z.string().min(1), warehouseId: z.string().min(1), source: z.nativeEnum(OrderSource).default(OrderSource.MANUAL), requestedDate: z.coerce.date().optional(), customerReference: z.string().trim().max(100).optional(), notes: z.string().trim().max(2_000).optional(), lines: z.array(lineSchema).min(1).max(100) });
const preparationSchema = z.object({ lines: z.array(z.object({ itemId: z.string().min(1), preparedQuantity: z.coerce.number().finite().min(0) })).min(1), version: z.coerce.number().int().min(0).optional() });
const transitionInputSchema = z.object({ idempotencyKey: z.string().trim().min(12).max(120).optional(), note: z.string().trim().max(2_000).optional(), version: z.coerce.number().int().min(0).optional() });

function requirePermission(context: Context, permission: "orders:read" | "orders:write" | "orders:prepare") {
  if (!can(context.role, permission)) throw new Error("Action non autorisée");
  return assertTenant(context.tenantId);
}

function actor(context: Context) { return context.userId ?? "system"; }
async function audit(transaction: Transaction, tenantId: string, context: Context, action: string, orderId: string, metadata?: Prisma.InputJsonValue) {
  await transaction.auditEvent.create({ data: { tenantId, actorId: actor(context), action, entity: "SalesOrder", entityId: orderId, metadata } });
}

async function findOrderWithAudit(transaction: Transaction, tenantId: string, orderId: string) {
  const order = await transaction.salesOrder.findFirstOrThrow({ where: { id: orderId, tenantId }, include: orderInclude });
  const auditEvents = await transaction.auditEvent.findMany({ where: { tenantId, entity: "SalesOrder", entityId: orderId }, orderBy: { createdAt: "asc" } });
  return { ...order, auditEvents };
}

const orderInclude = {
  customer: true,
  warehouse: true,
  items: { include: { product: true }, orderBy: { id: "asc" as const } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  preparation: true,
};

async function nextNumber(transaction: Transaction, tenantId: string, orderDate: Date) {
  const rows = await transaction.$queryRaw<Array<{ nextNumber: number }>>(Prisma.sql`
    INSERT INTO "OrderSequence" ("tenantId", "nextNumber", "updatedAt") VALUES (${tenantId}, 2, CURRENT_TIMESTAMP)
    ON CONFLICT ("tenantId") DO UPDATE SET "nextNumber" = "OrderSequence"."nextNumber" + 1, "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "nextNumber"
  `);
  const sequence = Number(rows[0]?.nextNumber) - 1;
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Numérotation de commande indisponible");
  return `CMD-${orderDate.getUTCFullYear()}-${String(sequence).padStart(6, "0")}`;
}

async function assertDraftReferences(transaction: Transaction, tenantId: string, data: z.infer<typeof draftSchema>) {
  const [customer, warehouse, products] = await Promise.all([
    transaction.customer.findFirst({ where: { id: data.customerId, tenantId, active: true } }),
    transaction.warehouse.findFirst({ where: { id: data.warehouseId, tenantId, active: true } }),
    transaction.product.findMany({ where: { tenantId, active: true, id: { in: data.lines.map((line) => line.productId) } } }),
  ]);
  if (!customer) throw new Error("Client introuvable ou archivé");
  if (!warehouse) throw new Error("Entrepôt introuvable ou archivé");
  if (products.length !== data.lines.length || new Set(data.lines.map((line) => line.productId)).size !== data.lines.length) throw new Error("Chaque ligne doit référencer un produit actif distinct");
  return { customer, warehouse, products: new Map(products.map((product) => [product.id, product])) };
}

function calculateLines(lines: z.infer<typeof lineSchema>[], products: Map<string, { sku: string; name: string; description: string | null; unit: string; sellingPrice: Prisma.Decimal; taxRate: Prisma.Decimal }>) {
  let subtotal = new Prisma.Decimal(0);
  let discount = new Prisma.Decimal(0);
  let tax = new Prisma.Decimal(0);
  const items = lines.map((line) => {
    const product = products.get(line.productId);
    if (!product) throw new Error("Produit introuvable ou archivé");
    const orderedQuantity = new Prisma.Decimal(line.quantity);
    const lineSubtotal = money(product.sellingPrice.mul(orderedQuantity));
    const lineDiscount = money(line.discount);
    if (lineDiscount.gt(lineSubtotal)) throw new Error("La remise ne peut pas dépasser le sous-total de ligne");
    const taxable = lineSubtotal.minus(lineDiscount);
    const lineTax = money(taxable.mul(product.taxRate).div(100));
    const lineTotal = money(taxable.plus(lineTax));
    subtotal = subtotal.plus(lineSubtotal); discount = discount.plus(lineDiscount); tax = tax.plus(lineTax);
    return { productId: line.productId, descriptionSnapshot: product.description ?? product.name, skuSnapshot: product.sku, unitSnapshot: product.unit, quantity: orderedQuantity, unitPrice: product.sellingPrice, discount: lineDiscount, taxRate: product.taxRate, lineSubtotal, lineTotal };
  });
  return { items, subtotal: money(subtotal), discount: money(discount), tax: money(tax), total: money(subtotal.minus(discount).plus(tax)) };
}

export async function createDraft(input: unknown, context: Context) {
  const tenantId = requirePermission(context, "orders:write");
  const data = draftSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const references = await assertDraftReferences(transaction, tenantId, data);
    const totals = calculateLines(data.lines, references.products);
    const orderDate = new Date();
    const order = await transaction.salesOrder.create({
      data: {
        tenantId, customerId: references.customer.id, warehouseId: references.warehouse.id, number: await nextNumber(transaction, tenantId, orderDate), source: data.source, orderDate,
        requestedDate: data.requestedDate, customerReference: data.customerReference || undefined, notes: data.notes || undefined, createdById: actor(context),
        subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total,
        items: { create: totals.items }, statusHistory: { create: { toStatus: OrderStatus.DRAFT, actorId: actor(context), note: "Brouillon créé" } },
      }, include: orderInclude,
    });
    await audit(transaction, tenantId, context, "order.created", order.id, { number: order.number });
    return order;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createOrder(input: unknown, context: Context) { return createDraft(input, context); }

export async function getOrder(orderId: string, context: Context) {
  const tenantId = requirePermission(context, "orders:read");
  const order = await prisma.salesOrder.findFirst({ where: { id: orderId, tenantId }, include: orderInclude });
  if (!order) throw new Error("Commande introuvable");
  const auditEvents = await prisma.auditEvent.findMany({ where: { tenantId, entity: "SalesOrder", entityId: orderId }, orderBy: { createdAt: "asc" } });
  return { ...order, auditEvents };
}

export async function listOrders(context: Context, options: { query?: string; status?: OrderStatus; warehouseId?: string; customerId?: string; dateFrom?: Date; dateTo?: Date; page?: number } = {}) {
  const tenantId = requirePermission(context, "orders:read");
  const page = Math.max(1, options.page ?? 1); const pageSize = 25; const query = options.query?.trim() ?? "";
  const where = { tenantId, ...(options.status ? { status: options.status } : {}), ...(options.warehouseId ? { warehouseId: options.warehouseId } : {}), ...(options.customerId ? { customerId: options.customerId } : {}), ...(options.dateFrom || options.dateTo ? { orderDate: { ...(options.dateFrom ? { gte: options.dateFrom } : {}), ...(options.dateTo ? { lte: options.dateTo } : {}) } } : {}), ...(query ? { OR: [{ number: { contains: query, mode: "insensitive" as const } }, { customerReference: { contains: query, mode: "insensitive" as const } }, { customer: { name: { contains: query, mode: "insensitive" as const } } }] } : {}) };
  const [items, total] = await prisma.$transaction([prisma.salesOrder.findMany({ where, include: { customer: true, warehouse: true }, orderBy: { orderDate: "desc" }, take: pageSize, skip: (page - 1) * pageSize }), prisma.salesOrder.count({ where })]);
  return { items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function updateDraft(orderId: string, input: unknown, context: Context) {
  const tenantId = requirePermission(context, "orders:write");
  const data = draftSchema.extend({ version: z.coerce.number().int().min(0) }).parse(input);
  return prisma.$transaction(async (transaction) => {
    const current = await transaction.salesOrder.findFirst({ where: { id: orderId, tenantId } });
    if (!current) throw new Error("Commande introuvable");
    if (current.status !== OrderStatus.DRAFT) throw new Error("Seul un brouillon peut être modifié");
    if (current.version !== data.version) throw new Error("La commande a été modifiée par un autre utilisateur");
    const references = await assertDraftReferences(transaction, tenantId, data);
    const totals = calculateLines(data.lines, references.products);
    const result = await transaction.salesOrder.updateMany({ where: { id: orderId, tenantId, status: OrderStatus.DRAFT, version: data.version }, data: { customerId: references.customer.id, warehouseId: references.warehouse.id, source: data.source, requestedDate: data.requestedDate, customerReference: data.customerReference || undefined, notes: data.notes || undefined, subtotal: totals.subtotal, discount: totals.discount, tax: totals.tax, total: totals.total, version: { increment: 1 } } });
    if (!result.count) throw new Error("La commande a été modifiée par un autre utilisateur");
    await transaction.salesOrderItem.deleteMany({ where: { orderId } });
    await transaction.salesOrderItem.createMany({ data: totals.items.map((item) => ({ ...item, orderId })) });
    await audit(transaction, tenantId, context, "order.updated", orderId);
    return transaction.salesOrder.findFirstOrThrow({ where: { id: orderId, tenantId }, include: orderInclude });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function duplicateOrder(orderId: string, context: Context) {
  const tenantId = requirePermission(context, "orders:write");
  const order = await prisma.salesOrder.findFirst({ where: { id: orderId, tenantId }, include: { items: true } });
  if (!order || !order.warehouseId) throw new Error("Commande introuvable");
  return createDraft({ customerId: order.customerId, warehouseId: order.warehouseId, source: order.source, requestedDate: order.requestedDate ?? undefined, customerReference: order.customerReference ?? undefined, notes: order.notes ?? undefined, lines: order.items.map((item) => ({ productId: item.productId, quantity: item.quantity.toString(), discount: item.discount.toString() })) }, context);
}

export async function whatsappConfirmationUrl(orderId: string, context: Context) {
  const tenantId = requirePermission(context, "orders:read");
  const order = await prisma.salesOrder.findFirst({ where: { id: orderId, tenantId }, include: { customer: true, items: true } });
  if (!order) throw new Error("Commande introuvable");
  if (order.status === OrderStatus.DRAFT || order.status === OrderStatus.CANCELLED) throw new Error("La commande doit être confirmée pour envoyer un message WhatsApp");
  const phone = (order.customer.whatsapp || order.customer.phone || "").replace(/[^\d]/g, "");
  if (phone.length < 8 || phone.length > 15) throw new Error("Ce client ne possède pas de numéro WhatsApp valide");
  const body = [`Bonjour ${order.customer.name},`, `Votre commande ${order.number} est confirmée.`, `Total : ${order.total.toFixed(3)} TND.`, "Merci pour votre confiance."];
  return { url: `https://wa.me/${phone}?text=${encodeURIComponent(body.join("\n"))}` };
}

async function activeReserved(transaction: Transaction, tenantId: string, warehouseId: string, productId: string) {
  const aggregate = await transaction.orderReservation.aggregate({ where: { tenantId, warehouseId, productId, releasedAt: null }, _sum: { quantity: true, consumedQuantity: true } });
  return new Prisma.Decimal(aggregate._sum.quantity ?? 0).minus(aggregate._sum.consumedQuantity ?? 0);
}

async function reserveOrder(transaction: Transaction, order: { id: string; tenantId: string; warehouseId: string | null; items: Array<{ productId: string; quantity: Prisma.Decimal }> }, context: Context) {
  if (!order.warehouseId) throw new Error("Entrepôt manquant pour la commande");
  for (const item of order.items) {
    const levels = await transaction.$queryRaw<Array<{ quantity: Prisma.Decimal }>>(Prisma.sql`SELECT "quantity" FROM "StockLevel" WHERE "productId" = ${item.productId} AND "warehouseId" = ${order.warehouseId} FOR UPDATE`);
    const physical = new Prisma.Decimal(levels[0]?.quantity ?? 0);
    const reserved = await activeReserved(transaction, order.tenantId, order.warehouseId, item.productId);
    if (physical.minus(reserved).lt(item.quantity)) throw new Error("Stock disponible insuffisant pour confirmer cette commande");
    await transaction.orderReservation.create({ data: { tenantId: order.tenantId, orderId: order.id, productId: item.productId, warehouseId: order.warehouseId, quantity: item.quantity } });
  }
  await audit(transaction, order.tenantId, context, "order.reserved", order.id);
}

const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
  [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.IN_PREPARATION, OrderStatus.CANCELLED],
  [OrderStatus.IN_PREPARATION]: [OrderStatus.PREPARED],
  [OrderStatus.PREPARED]: [OrderStatus.READY_FOR_DELIVERY],
};

function transitionPermission(target: OrderStatus) { return target === OrderStatus.CONFIRMED || target === OrderStatus.CANCELLED ? "orders:write" as const : "orders:prepare" as const; }

export async function transitionOrder(orderId: string, target: OrderStatus, input: { idempotencyKey?: string; note?: string; version?: number } | undefined, context: Context) {
  const tenantId = requirePermission(context, transitionPermission(target));
  const data = transitionInputSchema.parse(input ?? {});
  if (target === OrderStatus.CANCELLED && (!data.note || data.note.trim().length < 3)) throw new Error("Le motif d’annulation est obligatoire");
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.salesOrder.findFirst({ where: { id: orderId, tenantId }, include: { items: true, reservations: true } });
    if (!order) throw new Error("Commande introuvable");
    if (data.idempotencyKey) {
      const previous = await transaction.orderStatusHistory.findFirst({ where: { orderId, idempotencyKey: data.idempotencyKey } });
      if (previous) return findOrderWithAudit(transaction, tenantId, orderId);
    }
    if (order.status === target) return findOrderWithAudit(transaction, tenantId, orderId);
    if (data.version !== undefined && order.version !== data.version) throw new Error("La commande a été modifiée par un autre utilisateur");
    if (!transitions[order.status]?.includes(target)) throw new Error("Transition de statut invalide");
    if (target === OrderStatus.CONFIRMED) await reserveOrder(transaction, order, context);
    if (target === OrderStatus.CANCELLED) {
      await transaction.orderReservation.updateMany({ where: { orderId, releasedAt: null }, data: { releasedAt: new Date() } });
    }
    if (target === OrderStatus.IN_PREPARATION) await transaction.orderPreparation.upsert({ where: { orderId }, update: {}, create: { orderId, startedById: actor(context) } });
    if (target === OrderStatus.PREPARED) {
      const incomplete = order.items.some((item) => item.preparedQuantity.lt(item.quantity));
      if (incomplete) throw new Error("Toutes les lignes doivent être préparées avant validation");
      await transaction.orderReservation.updateMany({ where: { orderId, releasedAt: null }, data: { consumedAt: new Date() } });
    }
    const timestamp = new Date();
    await transaction.salesOrder.update({ where: { id: orderId }, data: { status: target, version: { increment: 1 }, ...(target === OrderStatus.CONFIRMED ? { confirmedAt: timestamp, confirmedById: actor(context) } : {}), ...(target === OrderStatus.PREPARED ? { preparedAt: timestamp, preparedById: actor(context) } : {}), ...(target === OrderStatus.CANCELLED ? { cancelledAt: timestamp, cancelledById: actor(context), cancelReason: data.note || undefined } : {}) } });
    await transaction.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: target, actorId: actor(context), idempotencyKey: data.idempotencyKey, note: data.note } });
    await audit(transaction, tenantId, context, `order.${target.toLowerCase()}`, orderId);
    return findOrderWithAudit(transaction, tenantId, orderId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordPreparedQuantities(orderId: string, input: unknown, context: Context) {
  const tenantId = requirePermission(context, "orders:prepare");
  const data = preparationSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.salesOrder.findFirst({ where: { id: orderId, tenantId }, include: { items: true, reservations: true } });
    if (!order) throw new Error("Commande introuvable");
    if (order.status !== OrderStatus.IN_PREPARATION) throw new Error("La commande n’est pas en préparation");
    if (data.version !== undefined && order.version !== data.version) throw new Error("La commande a été modifiée par un autre utilisateur");
    if (!order.warehouseId) throw new Error("Entrepôt manquant pour la commande");
    for (const change of data.lines) {
      const item = order.items.find((line) => line.id === change.itemId);
      if (!item) throw new Error("Ligne de commande introuvable");
      const requested = new Prisma.Decimal(change.preparedQuantity);
      if (requested.lt(item.preparedQuantity) || requested.gt(item.quantity)) throw new Error("La quantité préparée est invalide");
      const delta = requested.minus(item.preparedQuantity);
      if (delta.isZero()) continue;
      const reservation = order.reservations.find((entry) => entry.productId === item.productId && entry.warehouseId === order.warehouseId && !entry.releasedAt);
      if (!reservation || reservation.consumedQuantity.plus(delta).gt(reservation.quantity)) throw new Error("Réservation insuffisante pour cette préparation");
      const level = await transaction.stockLevel.findUnique({ where: { productId_warehouseId: { productId: item.productId, warehouseId: order.warehouseId } } });
      if (!level || level.quantity.lt(delta)) throw new Error("Stock physique insuffisant pendant la préparation");
      await transaction.stockLevel.update({ where: { id: level.id }, data: { quantity: { decrement: delta } } });
      await transaction.stockMovement.create({ data: { warehouseId: order.warehouseId, productId: item.productId, type: MovementType.SALE, quantity: delta.negated(), createdById: actor(context), reference: order.number, notes: "Préparation de commande" } });
      await transaction.orderReservation.update({ where: { id: reservation.id }, data: { consumedQuantity: { increment: delta } } });
      await transaction.salesOrderItem.update({ where: { id: item.id }, data: { preparedQuantity: requested } });
    }
    await transaction.salesOrder.update({ where: { id: orderId }, data: { version: { increment: 1 } } });
    await audit(transaction, tenantId, context, "order.preparation.updated", orderId);
    return findOrderWithAudit(transaction, tenantId, orderId);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listPreparationOrders(context: Context, warehouseId?: string, page = 1) {
  const tenantId = requirePermission(context, "orders:read");
  const normalizedPage = Math.max(1, Number.isInteger(page) ? page : 1);
  const where = { tenantId, status: { in: [OrderStatus.CONFIRMED, OrderStatus.IN_PREPARATION] }, ...(warehouseId ? { warehouseId } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.salesOrder.findMany({ where, include: { customer: true, warehouse: true }, orderBy: [{ requestedDate: "asc" }, { orderDate: "asc" }], take: 25, skip: (normalizedPage - 1) * 25 }),
    prisma.salesOrder.count({ where }),
  ]);
  return { items, pagination: { page: normalizedPage, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) } };
}

export async function stockAvailability(context: Context, warehouseId: string, productId?: string) {
  const tenantId = requirePermission(context, "orders:read");
  const levels = await prisma.stockLevel.findMany({ where: { warehouse: { id: warehouseId, tenantId, active: true }, ...(productId ? { productId } : {}) }, include: { product: true } });
  return Promise.all(levels.map(async (level) => {
    const reserved = await activeReserved(prisma, tenantId, warehouseId, level.productId);
    return { productId: level.productId, product: level.product, physical: level.quantity, reserved, available: level.quantity.minus(reserved) };
  }));
}
