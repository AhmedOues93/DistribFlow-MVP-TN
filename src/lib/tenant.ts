export type Role = "PLATFORM_ADMIN" | "OWNER" | "SALES_AGENT" | "WAREHOUSE_MANAGER" | "DRIVER" | "ACCOUNTANT" | "VIEWER";

const permissions: Record<Role, readonly string[]> = {
  PLATFORM_ADMIN: ["*"], OWNER: ["*"], SALES_AGENT: ["customers:read", "customers:write", "orders:read", "orders:write"],
  WAREHOUSE_MANAGER: ["stock:read", "stock:write", "orders:read", "orders:prepare"], DRIVER: ["deliveries:read", "deliveries:write"],
  ACCOUNTANT: ["customers:read", "ledger:read", "ledger:write", "orders:read"], VIEWER: ["customers:read", "orders:read", "stock:read", "ledger:read"]
};

export function can(role: Role, permission: string) { return permissions[role].includes("*") || permissions[role].includes(permission); }
export function assertTenant(tenantId: string | undefined): string { if (!tenantId) throw new Error("Contexte entreprise manquant"); return tenantId; }
