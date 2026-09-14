import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

test("versioned migrations include a baseline before customer lifecycle changes", async () => {
  const migrations = (await readdir("prisma/migrations")).sort();
  assert.deepEqual(migrations.slice(0, 2), ["20260501000000_initial_schema", "20260913000000_customer_lifecycle"]);
  const baseline = await readFile(`prisma/migrations/${migrations[0]}/migration.sql`, "utf8");
  const lifecycle = await readFile(`prisma/migrations/${migrations[1]}/migration.sql`, "utf8");
  assert.match(baseline, /CREATE TABLE "Customer"/);
  assert.match(lifecycle, /ADD COLUMN IF NOT EXISTS "active"/);
});
