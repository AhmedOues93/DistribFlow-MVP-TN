ALTER TABLE "Product" ADD COLUMN "description" TEXT;
CREATE UNIQUE INDEX "Product_tenantId_barcode_key" ON "Product"("tenantId", "barcode");
