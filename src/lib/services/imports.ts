import { parse } from "csv-parse/sync";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createCustomer, createProduct } from "@/lib/services/catalog";
import { assertTenant, can, type Role } from "@/lib/tenant";

export type ImportKind = "customers" | "products";
export type CsvError = { row: number; field: string; value: string; message: string };
type Context = { tenantId?: string; role: Role; userId?: string };
type Row = { row: number; data: Record<string, string> };

export const CSV_MAX_BYTES = 512 * 1024;
export const CSV_MAX_ROWS = 1_000;
export const importHeaders = {
  customers: ["nom", "telephone", "whatsapp", "matricule_fiscal", "limite_credit", "delai_paiement"],
  products: ["sku", "code_barres", "nom", "description", "categorie", "unite", "prix_achat", "prix_vente", "tva", "stock_minimum"],
} as const;

const blankToUndefined = (value: unknown) => typeof value === "string" && !value.trim() ? undefined : value;
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(blankToUndefined, schema.optional());
const customerRowSchema = z.object({
  nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(160),
  telephone: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  whatsapp: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  matricule_fiscal: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  limite_credit: optionalNumber(z.coerce.number().finite("La limite de crédit est invalide").min(0, "La limite de crédit ne peut pas être négative").max(10_000_000)),
  delai_paiement: optionalNumber(z.coerce.number().int("Le délai doit être un nombre entier").min(0, "Le délai ne peut pas être négatif").max(365, "Le délai ne peut pas dépasser 365 jours")),
});
const productRowSchema = z.object({
  sku: z.string().trim().min(2, "La référence doit contenir au moins 2 caractères").max(80),
  code_barres: z.preprocess(blankToUndefined, z.string().trim().max(80).optional()),
  nom: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(200),
  description: z.preprocess(blankToUndefined, z.string().trim().max(2_000).optional()),
  categorie: z.preprocess(blankToUndefined, z.string().trim().max(160).optional()),
  unite: z.string().trim().min(1, "L’unité est obligatoire").max(30),
  prix_achat: z.coerce.number().finite("Le prix d’achat est invalide").min(0, "Le prix d’achat ne peut pas être négatif"),
  prix_vente: z.coerce.number().finite("Le prix de vente est invalide").min(0, "Le prix de vente ne peut pas être négatif"),
  tva: z.coerce.number().finite("La TVA est invalide").min(0, "La TVA ne peut pas être négative").max(100, "La TVA ne peut pas dépasser 100 %"),
  stock_minimum: z.coerce.number().finite("Le stock minimum est invalide").min(0, "Le stock minimum ne peut pas être négatif"),
});

export function assertImportPermission(kind: ImportKind, context: Context) {
  const permission = kind === "customers" ? "customers:write" : "stock:write";
  if (!can(context.role, permission)) throw new Error("Action non autorisée");
  return assertTenant(context.tenantId);
}

function normaliseHeader(value: string) {
  return value.trim().toLocaleLowerCase("fr-FR");
}

function detectDelimiter(raw: string) {
  const header = raw.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/, 1)[0] ?? "";
  let quote = false;
  let commas = 0;
  let semicolons = 0;
  for (let index = 0; index < header.length; index += 1) {
    if (header[index] === '"') {
      if (quote && header[index + 1] === '"') index += 1;
      else quote = !quote;
    } else if (!quote && header[index] === ",") commas += 1;
    else if (!quote && header[index] === ";") semicolons += 1;
  }
  return semicolons >= commas ? ";" : ",";
}

function normalisePhone(value?: string) {
  return value?.replace(/[^+\d]/g, "") || undefined;
}

function normaliseTaxIdentifier(value?: string) {
  return value?.replace(/\s+/g, "").toUpperCase() || undefined;
}

function normaliseBarcode(value?: string) {
  return value?.replace(/\s+/g, "") || undefined;
}

function errorFor(row: number, field: string, value: unknown, message: string): CsvError {
  return { row, field, value: String(value ?? ""), message };
}

export function csvTemplate(kind: ImportKind) {
  return `\uFEFF${importHeaders[kind].join(";")}\n`;
}

export function parseImportCsv(kind: ImportKind, raw: string): Row[] {
  if (typeof raw !== "string") throw new Error("Le contenu CSV est invalide");
  if (Buffer.byteLength(raw, "utf8") > CSV_MAX_BYTES) throw new Error("Le fichier dépasse la limite de 512 Ko");

  let matrix: string[][];
  try {
    matrix = parse(raw, {
      bom: true,
      delimiter: detectDelimiter(raw),
      relax_quotes: false,
      skip_empty_lines: true,
      trim: true,
    });
  } catch {
    throw new Error("CSV mal formé");
  }

  if (!matrix.length) throw new Error("Le fichier est vide");
  if (matrix.length - 1 > CSV_MAX_ROWS) throw new Error("Le fichier dépasse la limite de 1 000 lignes");

  const actual = matrix[0].map(normaliseHeader);
  const duplicate = actual.find((header, index) => actual.indexOf(header) !== index);
  if (duplicate) throw new Error(`En-tête dupliqué : ${duplicate}`);

  const expected = importHeaders[kind] as readonly string[];
  const missing = expected.filter((header) => !actual.includes(header));
  if (missing.length) throw new Error(`En-têtes obligatoires manquants : ${missing.join(", ")}`);
  if (actual.length !== expected.length || actual.some((header) => !expected.includes(header))) throw new Error("En-tête CSV inattendu");

  return matrix.slice(1).map((values, index) => ({
    row: index + 2,
    data: Object.fromEntries(actual.map((header, column) => [header, values[column] ?? ""])),
  }));
}

async function existingCustomerErrors(tenantId: string, rows: Row[], errors: CsvError[]) {
  const phones = new Set<string>();
  const taxIdentifiers = new Set<string>();
  for (const item of rows) {
    const parsed = customerRowSchema.safeParse(item.data);
    if (!parsed.success) continue;
    const phone = normalisePhone(parsed.data.telephone);
    const taxIdentifier = normaliseTaxIdentifier(parsed.data.matricule_fiscal);
    if (phone) phones.add(phone);
    if (taxIdentifier) taxIdentifiers.add(taxIdentifier);
  }
  if (!phones.size && !taxIdentifiers.size) return;
  const existing = await prisma.customer.findMany({
    where: { tenantId, OR: [{ phone: { in: [...phones] } }, { taxIdentifier: { in: [...taxIdentifiers] } }] },
    select: { phone: true, taxIdentifier: true },
  });
  const existingPhones = new Set(existing.map((item) => item.phone).filter(Boolean));
  const existingTaxIdentifiers = new Set(existing.map((item) => item.taxIdentifier).filter(Boolean));
  for (const item of rows) {
    const parsed = customerRowSchema.safeParse(item.data);
    if (!parsed.success) continue;
    const phone = normalisePhone(parsed.data.telephone);
    const taxIdentifier = normaliseTaxIdentifier(parsed.data.matricule_fiscal);
    if (phone && existingPhones.has(phone)) errors.push(errorFor(item.row, "telephone", item.data.telephone, "Ce téléphone existe déjà dans votre entreprise"));
    if (taxIdentifier && existingTaxIdentifiers.has(taxIdentifier)) errors.push(errorFor(item.row, "matricule_fiscal", item.data.matricule_fiscal, "Ce matricule fiscal existe déjà dans votre entreprise"));
  }
}

async function existingProductErrors(tenantId: string, rows: Row[], errors: CsvError[]) {
  const skus = new Set<string>();
  const barcodes = new Set<string>();
  const categoryNames = new Set<string>();
  const unitValues = new Set<string>();
  for (const item of rows) {
    const parsed = productRowSchema.safeParse(item.data);
    if (!parsed.success) continue;
    skus.add(parsed.data.sku.toUpperCase());
    const barcode = normaliseBarcode(parsed.data.code_barres);
    if (barcode) barcodes.add(barcode);
    if (parsed.data.categorie) categoryNames.add(parsed.data.categorie);
    unitValues.add(parsed.data.unite);
  }
  const [products, categories, units] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, OR: [{ sku: { in: [...skus] } }, { barcode: { in: [...barcodes] } }] }, select: { sku: true, barcode: true } }),
    prisma.productCategory.findMany({ where: { tenantId, name: { in: [...categoryNames], mode: "insensitive" } }, select: { name: true, active: true } }),
    prisma.unit.findMany({ where: { tenantId, OR: [{ name: { in: [...unitValues], mode: "insensitive" } }, { symbol: { in: [...unitValues], mode: "insensitive" } }] }, select: { name: true, symbol: true, active: true } }),
  ]);
  const existingSkus = new Set(products.map((item) => item.sku));
  const existingBarcodes = new Set(products.map((item) => item.barcode).filter(Boolean));
  const categoriesByName = new Map(categories.map((item) => [item.name.toLocaleLowerCase("fr-FR"), item]));
  const unitsByValue = new Map(units.flatMap((item) => [[item.name.toLocaleLowerCase("fr-FR"), item], [item.symbol.toLocaleLowerCase("fr-FR"), item]]));
  for (const item of rows) {
    const parsed = productRowSchema.safeParse(item.data);
    if (!parsed.success) continue;
    if (existingSkus.has(parsed.data.sku.toUpperCase())) errors.push(errorFor(item.row, "sku", item.data.sku, "Cette référence existe déjà dans votre entreprise"));
    const barcode = normaliseBarcode(parsed.data.code_barres);
    if (barcode && existingBarcodes.has(barcode)) errors.push(errorFor(item.row, "code_barres", item.data.code_barres, "Ce code-barres existe déjà dans votre entreprise"));
    if (parsed.data.categorie) {
      const category = categoriesByName.get(parsed.data.categorie.toLocaleLowerCase("fr-FR"));
      if (!category) errors.push(errorFor(item.row, "categorie", item.data.categorie, "Catégorie introuvable dans votre entreprise"));
      else if (!category.active) errors.push(errorFor(item.row, "categorie", item.data.categorie, "La catégorie est archivée"));
    }
    const unit = unitsByValue.get(parsed.data.unite.toLocaleLowerCase("fr-FR"));
    if (!unit) errors.push(errorFor(item.row, "unite", item.data.unite, "Unité introuvable dans votre entreprise"));
    else if (!unit.active) errors.push(errorFor(item.row, "unite", item.data.unite, "L’unité est archivée"));
  }
}

function internalDuplicateErrors(kind: ImportKind, rows: Row[], errors: CsvError[]) {
  const seen = new Map<string, number>();
  for (const item of rows) {
    if (kind === "customers") {
      const parsed = customerRowSchema.safeParse(item.data);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) errors.push(errorFor(item.row, String(issue.path[0]), item.data[String(issue.path[0])] ?? "", issue.message));
        continue;
      }
      for (const key of [normalisePhone(parsed.data.telephone), normaliseTaxIdentifier(parsed.data.matricule_fiscal)].filter(Boolean).map((value) => `customer:${value}`)) {
        if (seen.has(key)) errors.push(errorFor(item.row, "ligne", key, `Doublon dans le fichier (ligne ${seen.get(key)})`));
        else seen.set(key, item.row);
      }
      continue;
    }
    const parsed = productRowSchema.safeParse(item.data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push(errorFor(item.row, String(issue.path[0]), item.data[String(issue.path[0])] ?? "", issue.message));
      continue;
    }
    const keys = [parsed.data.sku.toUpperCase(), normaliseBarcode(parsed.data.code_barres)].filter(Boolean).map((value) => `product:${value}`);
    for (const key of keys) {
      if (seen.has(key)) errors.push(errorFor(item.row, "ligne", key, `Doublon dans le fichier (ligne ${seen.get(key)})`));
      else seen.set(key, item.row);
    }
  }
}

function summary(rows: Row[], errors: CsvError[]) {
  const invalidRows = new Set(errors.map((error) => error.row));
  return { total: rows.length, valid: rows.length - invalidRows.size, invalid: invalidRows.size, duplicates: errors.filter((error) => error.message.includes("Doublon") || error.message.includes("existe déjà")).length, errors };
}

export async function previewImport(kind: ImportKind, raw: string, context: Context) {
  const tenantId = assertImportPermission(kind, context);
  const rows = parseImportCsv(kind, raw);
  const errors: CsvError[] = [];
  internalDuplicateErrors(kind, rows, errors);
  if (kind === "customers") await existingCustomerErrors(tenantId, rows, errors);
  else await existingProductErrors(tenantId, rows, errors);
  return { ...summary(rows, errors), canConfirm: true };
}

async function resolveProductReferences(tenantId: string, categoryName: string | undefined, unitValue: string) {
  const [category, unit] = await Promise.all([
    categoryName ? prisma.productCategory.findFirst({ where: { tenantId, name: { equals: categoryName, mode: "insensitive" }, active: true } }) : null,
    prisma.unit.findFirst({ where: { tenantId, active: true, OR: [{ name: { equals: unitValue, mode: "insensitive" } }, { symbol: { equals: unitValue, mode: "insensitive" } }] } }),
  ]);
  if (categoryName && !category) throw new Error("Catégorie introuvable ou archivée dans votre entreprise");
  if (!unit) throw new Error("Unité introuvable ou archivée dans votre entreprise");
  return { categoryId: category?.id, unit: unit.symbol };
}

export async function confirmImport(kind: ImportKind, raw: string, context: Context) {
  const tenantId = assertImportPermission(kind, context);
  const rows = parseImportCsv(kind, raw);
  const preview = await previewImport(kind, raw, context);
  const errors = [...preview.errors];
  const invalidRows = new Set(errors.map((error) => error.row));
  let created = 0;

  for (const item of rows) {
    if (invalidRows.has(item.row)) continue;
    try {
      if (kind === "customers") {
        await createCustomer({
          name: item.data.nom,
          phone: item.data.telephone || undefined,
          whatsapp: item.data.whatsapp || undefined,
          taxIdentifier: item.data.matricule_fiscal || undefined,
          creditLimit: item.data.limite_credit || 0,
          paymentTermsDays: item.data.delai_paiement || 0,
        }, context);
      } else {
        const references = await resolveProductReferences(tenantId, item.data.categorie || undefined, item.data.unite);
        await createProduct({
          sku: item.data.sku,
          barcode: item.data.code_barres || undefined,
          name: item.data.nom,
          description: item.data.description || undefined,
          ...references,
          purchasePrice: item.data.prix_achat,
          sellingPrice: item.data.prix_vente,
          taxRate: item.data.tva,
          minimumStock: item.data.stock_minimum,
        }, context);
      }
      created += 1;
    } catch (error) {
      errors.push(errorFor(item.row, "ligne", "", error instanceof Error ? error.message : "Erreur d’import"));
    }
  }

  await prisma.importBatch.create({ data: { tenantId, kind, createdById: context.userId ?? "system" } });
  const failedRows = new Set(errors.map((error) => error.row));
  return { total: rows.length, created, skipped: rows.length - created, failed: failedRows.size, duplicates: errors.filter((error) => error.message.includes("Doublon") || error.message.includes("existe déjà")).length, errors };
}

function csvSafe(value: unknown) {
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function quote(value: unknown) {
  return `"${csvSafe(value).replaceAll('"', '""')}"`;
}

export function errorReport(errors: CsvError[]) {
  return `\uFEFFligne;champ;valeur;message\n${errors.map((error) => [error.row, error.field, error.value, error.message].map(quote).join(";")).join("\n")}\n`;
}
