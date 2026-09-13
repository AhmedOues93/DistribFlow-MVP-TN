import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("order service scopes customer and products to the tenant", async () => {
  const source = await readFile("src/lib/services/orders.ts", "utf8");
  assert.match(source, /findFirst\(\{ where: \{ id: data\.customerId, tenantId \} \}\)/);
  assert.match(source, /where: \{ tenantId, id:/);
});
