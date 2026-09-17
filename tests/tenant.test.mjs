import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("order service scopes customer and products to the tenant", async () => {
  const source = await readFile("src/lib/services/orders.ts", "utf8");
  assert.match(source, /customer\.findFirst\(\{ where: \{ id: data\.customerId, tenantId, active: true \} \}\)/);
  assert.match(source, /product\.findMany\(\{ where: \{ tenantId, active: true/);
});
