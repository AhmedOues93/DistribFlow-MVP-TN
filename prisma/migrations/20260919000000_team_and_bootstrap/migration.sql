-- Additive employee lifecycle and invitation fields.
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'SALES';
ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'WAREHOUSE';
ALTER TYPE "MembershipRole" ADD VALUE IF NOT EXISTS 'READ_ONLY';

ALTER TABLE "User" ADD COLUMN "passwordSet" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Membership" ADD COLUMN "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Membership" ADD COLUMN "invitedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN "activeTenantId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Invitation" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN "createdById" TEXT;

CREATE INDEX "Membership_tenantId_status_role_idx" ON "Membership"("tenantId", "status", "role");
CREATE INDEX "Invitation_tenantId_acceptedAt_revokedAt_expiresAt_idx" ON "Invitation"("tenantId", "acceptedAt", "revokedAt", "expiresAt");
