export type Role = "PLATFORM_ADMIN" | "OWNER" | "ADMIN" | "SALES" | "WAREHOUSE" | "DRIVER" | "READ_ONLY" | "SALES_AGENT" | "WAREHOUSE_MANAGER" | "ACCOUNTANT" | "VIEWER";

const permissions: Record<Role, readonly string[]> = {
  PLATFORM_ADMIN: ["*", "members:read", "members:write"], OWNER: ["*", "members:read", "members:write"], ADMIN: ["*", "members:read", "members:write"], SALES: ["customers:read", "customers:write", "orders:read", "orders:write"],
  WAREHOUSE: ["stock:read", "stock:write", "orders:read", "orders:prepare"], DRIVER: ["deliveries:read", "deliveries:write"], READ_ONLY: ["customers:read", "orders:read", "stock:read", "ledger:read"],
  SALES_AGENT: ["customers:read", "customers:write", "orders:read", "orders:write"], WAREHOUSE_MANAGER: ["stock:read", "stock:write", "orders:read", "orders:prepare"],
  ACCOUNTANT: ["customers:read", "ledger:read", "ledger:write", "orders:read"], VIEWER: ["customers:read", "orders:read", "stock:read", "ledger:read"]
};

export function can(role: Role, permission: string) { return permissions[role].includes("*") || permissions[role].includes(permission); }
export const employeeRoles: readonly Role[] = ["ADMIN", "SALES", "WAREHOUSE", "DRIVER", "READ_ONLY"];
export function canonicalRole(role: Role): Role { return role === "SALES_AGENT" ? "SALES" : role === "WAREHOUSE_MANAGER" ? "WAREHOUSE" : role === "VIEWER" ? "READ_ONLY" : role; }
export function isTeamManager(role: Role) { return role === "OWNER" || role === "ADMIN" || role === "PLATFORM_ADMIN"; }
export function roleRedirect(role: Role) { switch (canonicalRole(role)) { case "SALES": return "/travailleur/commandes"; case "WAREHOUSE": return "/travailleur/preparation"; case "DRIVER": return "/travailleur/livraisons"; case "READ_ONLY": return "/travailleur"; default: return "/dashboard"; } }
export function assertTenant(tenantId: string | undefined): string { if (!tenantId) throw new Error("Contexte entreprise manquant"); return tenantId; }
