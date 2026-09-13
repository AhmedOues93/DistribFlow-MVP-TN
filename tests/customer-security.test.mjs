import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("customer service scopes every customer operation to the authenticated tenant", async () => {
  const source = await readFile("src/lib/services/catalog.ts", "utf8");
  assert.match(source, /where:\{id,tenantId\}/);
  assert.match(source, /where:\{id,tenantId\},data:\{active\}/);
  assert.match(source, /const tenantId=ctx\(context,"customers:read"\)/);
});

test("customer API derives tenant context from the session cookie", async () => {
  const collectionRoute = await readFile("src/app/api/catalog/customers/route.ts", "utf8");
  const itemRoute = await readFile("src/app/api/catalog/customers/[customerId]/route.ts", "utf8");
  assert.match(collectionRoute, /requireRequestContext\(request\)/);
  assert.match(itemRoute, /requireRequestContext\(request\)/);
  assert.doesNotMatch(collectionRoute, /x-tenant-id|x-role/);
});

test("order API also rejects client-supplied tenant and role headers", async () => {
  const source = await readFile("src/app/api/orders/route.ts", "utf8");
  assert.match(source, /requireRequestContext\(request\)/);
  assert.doesNotMatch(source, /x-tenant-id|x-role/);
});
