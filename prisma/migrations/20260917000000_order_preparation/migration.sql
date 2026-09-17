ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_PREPARATION' AFTER 'CONFIRMED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY' AFTER 'PREPARED';

ALTER TABLE "SalesOrder"
  ADD COLUMN "warehouseId" TEXT,
  ADD COLUMN "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "customerReference" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "tax" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "confirmedById" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "preparedById" TEXT,
  ADD COLUMN "preparedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelReason" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "SalesOrderItem"
  ADD COLUMN "descriptionSnapshot" TEXT,
  ADD COLUMN "skuSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "unitSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "preparedQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "lineSubtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "lineTotal" DECIMAL(65,30) NOT NULL DEFAULT 0;

CREATE TABLE "OrderSequence" (
  "tenantId" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("tenantId")
);

CREATE TABLE "OrderStatusHistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "actorId" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderReservation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "quantity" DECIMAL(65,30) NOT NULL,
  "consumedQuantity" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "releasedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderPreparation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "startedById" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderPreparation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderStatusHistory_orderId_idempotencyKey_key" ON "OrderStatusHistory"("orderId", "idempotencyKey");
CREATE UNIQUE INDEX "OrderReservation_orderId_productId_warehouseId_key" ON "OrderReservation"("orderId", "productId", "warehouseId");
CREATE UNIQUE INDEX "OrderPreparation_orderId_key" ON "OrderPreparation"("orderId");
CREATE INDEX "SalesOrder_tenantId_status_orderDate_idx" ON "SalesOrder"("tenantId", "status", "orderDate");
CREATE INDEX "SalesOrder_tenantId_warehouseId_requestedDate_idx" ON "SalesOrder"("tenantId", "warehouseId", "requestedDate");
CREATE INDEX "SalesOrderItem_orderId_idx" ON "SalesOrderItem"("orderId");
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
CREATE INDEX "OrderReservation_tenantId_warehouseId_productId_releasedAt_consumedAt_idx" ON "OrderReservation"("tenantId", "warehouseId", "productId", "releasedAt", "consumedAt");

ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderSequence" ADD CONSTRAINT "OrderSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderReservation" ADD CONSTRAINT "OrderReservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderReservation" ADD CONSTRAINT "OrderReservation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderReservation" ADD CONSTRAINT "OrderReservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderReservation" ADD CONSTRAINT "OrderReservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderPreparation" ADD CONSTRAINT "OrderPreparation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
