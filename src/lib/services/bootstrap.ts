import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const starterUnits = [
  { name: "Pièce", symbol: "PCE" }, { name: "Carton", symbol: "CTN" }, { name: "Pack", symbol: "PACK" },
  { name: "Kilogramme", symbol: "KG" }, { name: "Gramme", symbol: "G" }, { name: "Litre", symbol: "L" },
  { name: "Millilitre", symbol: "ML" }, { name: "Mètre", symbol: "M" }, { name: "Palette", symbol: "PAL" },
] as const;
export const starterCategories = ["Boissons", "Produits alimentaires", "Hygiène et entretien", "Emballages", "Fournitures", "Divers"] as const;
export const starterWarehouse = { code: "DEPOT-01", name: "Dépôt principal" } as const;

type Database = PrismaClient | Prisma.TransactionClient;

export async function getStarterDataPreview(database: Database, tenantId: string) {
  const [units, categories, warehouse] = await Promise.all([
    database.unit.count({ where: { tenantId, symbol: { in: starterUnits.map((unit) => unit.symbol) } } }),
    database.productCategory.count({ where: { tenantId, name: { in: [...starterCategories] } } }),
    database.warehouse.count({ where: { tenantId, code: starterWarehouse.code } }),
  ]);
  return { units: { total: starterUnits.length, existing: units, toAdd: starterUnits.length - units }, categories: { total: starterCategories.length, existing: categories, toAdd: starterCategories.length - categories }, warehouse: { total: 1, existing: warehouse, toAdd: warehouse ? 0 : 1 } };
}

export async function installStarterData(database: Database, tenantId: string) {
  for (const unit of starterUnits) await database.unit.upsert({ where: { tenantId_symbol: { tenantId, symbol: unit.symbol } }, update: {}, create: { tenantId, ...unit } });
  for (const name of starterCategories) await database.productCategory.upsert({ where: { tenantId_name: { tenantId, name } }, update: {}, create: { tenantId, name } });
  await database.warehouse.upsert({ where: { tenantId_code: { tenantId, code: starterWarehouse.code } }, update: {}, create: { tenantId, ...starterWarehouse } });
  return getStarterDataPreview(database, tenantId);
}
