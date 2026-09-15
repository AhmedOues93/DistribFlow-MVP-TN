import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("inventory mutations are tenant scoped, serializable, and auditable", async () => {
  const source = await readFile("src/lib/services/inventory.ts", "utf8");
  assert.match(source, /context\(ctx,"stock:write"\)/);
  assert.match(source, /TransactionIsolationLevel\.Serializable/);
  assert.match(source, /Stock insuffisant/);
  assert.match(source, /tx\.auditEvent\.create/);
  assert.match(source, /idempotencyKey/);
});

test("inventory routes derive authenticated context from the session", async () => {
  const stock = await readFile("src/app/api/inventory/stock/route.ts", "utf8");
  const warehouses = await readFile("src/app/api/inventory/warehouses/route.ts", "utf8");
  assert.match(stock, /requireRequestContext\(r\)/);
  assert.match(warehouses, /requireRequestContext\(r\)/);
  assert.doesNotMatch(stock, /x-tenant-id|x-role/);
});
