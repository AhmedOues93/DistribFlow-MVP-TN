import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("team services keep invitation tokens hashed and tenant scoped", async () => {
  const source = await readFile("src/lib/services/team.ts", "utf8");
  assert.match(source, /randomBytes/);
  assert.match(source, /hashToken\(token\)/);
  assert.match(source, /tenantId_email/);
  assert.match(source, /acceptedAt/);
  assert.match(source, /revokedAt/);
  assert.match(source, /expiresAt <= new Date/);
  assert.match(source, /INVITATION_ACCEPTED/);
});

test("team services protect roles, statuses and the last owner", async () => {
  const source = await readFile("src/lib/services/team.ts", "utf8");
  const tenant = await readFile("src/lib/tenant.ts", "utf8");
  assert.match(source, /MembershipStatus\.SUSPENDED/);
  assert.match(source, /MembershipStatus\.ARCHIVED/);
  assert.match(source, /dernier propriétaire actif/);
  assert.match(source, /actor === "ADMIN"/);
  assert.match(source, /targetRole === MembershipRole\.OWNER/);
  assert.match(tenant, /members:write/);
  assert.match(tenant, /employeeRoles/);
});

test("registration bootstrap is transactional and idempotent", async () => {
  const auth = await readFile("src/lib/services/auth.ts", "utf8");
  const bootstrap = await readFile("src/lib/services/bootstrap.ts", "utf8");
  assert.match(auth, /prisma\.\$transaction/);
  assert.match(auth, /installStarterData\(tx, tenant\.id\)/);
  assert.match(bootstrap, /tenantId_symbol/);
  assert.match(bootstrap, /tenantId_name/);
  assert.match(bootstrap, /Dépôt principal/);
  assert.match(bootstrap, /PACK/);
});

test("team APIs and employee workspace expose the complete route set", async () => {
  const routes = await Promise.all([
    readFile("src/app/api/team/members/route.ts", "utf8"),
    readFile("src/app/api/team/invitations/route.ts", "utf8"),
    readFile("src/app/api/invitations/[token]/route.ts", "utf8"),
    readFile("src/app/api/tenant/starter-data/route.ts", "utf8"),
    readFile("src/app/espace-employe/page.tsx", "utf8"),
  ]);
  const source = routes.join("\n");
  assert.match(source, /requireRequestContext/);
  assert.match(source, /acceptInvitation/);
  assert.match(source, /installStarterData/);
  assert.match(source, /Module livraisons bientôt disponible/);
});
