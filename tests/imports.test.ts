import assert from "node:assert/strict";
import test from "node:test";
import { CSV_MAX_BYTES, CSV_MAX_ROWS, csvTemplate, errorReport, importHeaders, parseImportCsv } from "../src/lib/services/imports";

const customerHeader = importHeaders.customers.join(";");
const productHeader = importHeaders.products.join(";");

test("CSV templates are UTF-8 BOM French headers", () => {
  assert.equal(csvTemplate("customers"), `\uFEFF${customerHeader}\n`);
  assert.equal(csvTemplate("products"), `\uFEFF${productHeader}\n`);
});

test("CSV parser accepts BOM, semicolons, commas, LF, CRLF and quoted French values", () => {
  const customers = parseImportCsv("customers", `\uFEFF${customerHeader}\r\n"Épicerie, du Centre";"+216 11 222 333";;;0;30\r\n`);
  assert.deepEqual(customers[0], { row: 2, data: { nom: "Épicerie, du Centre", telephone: "+216 11 222 333", whatsapp: "", matricule_fiscal: "", limite_credit: "0", delai_paiement: "30" } });
  const products = parseImportCsv("products", `${productHeader.replaceAll(";", ",")}\nSKU-01,"123,45","Thé ""vert""",,Boissons,kg,1.2,2.5,19,0\n`);
  assert.equal(products[0].data.nom, 'Thé "vert"');
  assert.equal(products[0].data.categorie, "Boissons");
});

test("CSV parser rejects malformed, missing, duplicated and unexpected headers", () => {
  assert.throws(() => parseImportCsv("customers", "nom;telephone\nA;1\n"), /En-têtes obligatoires manquants/);
  assert.throws(() => parseImportCsv("customers", `${customerHeader};nom\nA;;;;;;\n`), /En-tête dupliqué/);
  assert.throws(() => parseImportCsv("customers", `${customerHeader};email\nA;;;;;;x\n`), /En-tête CSV inattendu/);
  assert.throws(() => parseImportCsv("customers", `${customerHeader}\n"texte non fermé\n`), /CSV mal formé/);
});

test("CSV parser enforces byte and row limits", () => {
  assert.throws(() => parseImportCsv("customers", "x".repeat(CSV_MAX_BYTES + 1)), /512 Ko/);
  const rows = Array.from({ length: CSV_MAX_ROWS + 1 }, () => "Client;;;;0;0").join("\n");
  assert.throws(() => parseImportCsv("customers", `${customerHeader}\n${rows}`), /1 000 lignes/);
});

test("error report quotes CSV and neutralises spreadsheet formulas", () => {
  const report = errorReport([{ row: 2, field: "nom", value: '=HYPERLINK("https://example.test")', message: "+Formule refusée" }]);
  assert.match(report, /^\uFEFFligne;champ;valeur;message/m);
  assert.match(report, /"'=HYPERLINK\(""https:\/\/example\.test""\)"/);
  assert.match(report, /"'\+Formule refusée"/);
});

test("import services keep session-derived tenant and role checks", async () => {
  const source = await (await import("node:fs/promises")).readFile("src/lib/services/imports.ts", "utf8");
  assert.match(source, /kind === "customers" \? "customers:write" : "stock:write"/);
  assert.match(source, /where: \{ tenantId,/);
  assert.match(source, /tenantId, active: true/);
  assert.match(source, /created \+= 1/);
});
