import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("invitation links use request origin and never reset a synthetic event", async () => {
  const email = await readFile("src/lib/services/email.ts", "utf8");
  const team = await readFile("src/lib/services/team.ts", "utf8");
  const client = await readFile("src/app/equipe/team-client.tsx", "utf8");
  assert.match(email, /requestOrigin/);
  assert.match(email, /APP_URL/);
  assert.match(email, /HTTPS/);
  assert.doesNotMatch(email, /localhost:3000/);
  assert.match(team, /context\.requestOrigin/);
  assert.doesNotMatch(client, /currentTarget\.reset/);
  assert.match(client, /Ouvrir le lien/);
  assert.match(client, /Copier le lien/);
});

test("global search is tenant scoped and permission aware", async () => {
  const service = await readFile("src/lib/services/search.ts", "utf8");
  const route = await readFile("src/app/api/search/route.ts", "utf8");
  assert.match(service, /assertTenant/);
  assert.match(service, /tenantId/);
  assert.match(service, /customers:read/);
  assert.match(service, /stock:read/);
  assert.match(service, /orders:read/);
  assert.match(route, /requireRequestContext/);
});

test("branding validates binary image content and isolates object keys", async () => {
  const service = await readFile("src/lib/services/branding.ts", "utf8");
  const storage = await readFile("src/lib/storage.ts", "utf8");
  const migration = await readFile("prisma/migrations/20260920000000_branding/migration.sql", "utf8");
  assert.match(service, /PNG, JPEG ou WebP/);
  assert.match(service, /SVG est désactivé/);
  assert.match(service, /branding\/\$\{tenantId\}/);
  assert.match(storage, /STORAGE_DRIVER/);
  assert.match(storage, /S3_SECRET_ACCESS_KEY/);
  assert.match(storage, /LOCAL_STORAGE_DIR/);
  assert.match(migration, /logoObjectKey/);
});
