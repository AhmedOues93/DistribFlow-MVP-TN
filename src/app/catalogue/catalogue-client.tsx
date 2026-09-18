"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ImportPanel } from "@/components/import-panel";

type Kind = "products" | "categories" | "units";
type Item = Record<string, any>;

export default function CatalogueClient({ kind, title }: { kind: Kind; title: string }) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Item[]>([]);
  const [units, setUnits] = useState<Item[]>([]);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [all, setAll] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/catalog/${kind}?q=${encodeURIComponent(query)}&active=${all ? "all" : "true"}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Impossible de charger le catalogue");
    else setItems(payload.items ?? payload);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [query, all]);
  useEffect(() => {
    if (kind !== "products") return;
    void Promise.all([
      fetch("/api/catalog/categories?active=true", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/catalog/units?active=true", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([nextCategories, nextUnits]) => {
      setCategories(nextCategories.items ?? nextCategories);
      setUnits(nextUnits.items ?? nextUnits);
    }).catch(() => setError("Impossible de charger les catégories et unités"));
  }, [kind]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const body = kind === "products"
      ? { sku: values.get("sku"), barcode: values.get("barcode") || undefined, name: values.get("name"), description: values.get("description") || undefined, categoryId: values.get("categoryId") || undefined, unit: values.get("unit"), purchasePrice: values.get("purchasePrice"), sellingPrice: values.get("sellingPrice"), taxRate: values.get("taxRate"), minimumStock: values.get("minimumStock") }
      : kind === "units" ? { name: values.get("name"), symbol: values.get("symbol") } : { name: values.get("name") };
    const url = editing ? `/api/catalog/${kind}/${editing.id}` : `/api/catalog/${kind}`;
    const response = await fetch(url, { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Enregistrement impossible");
    else { setNotice(editing ? "Modification enregistrée." : "Création enregistrée."); setEditing(null); form.reset(); void load(); }
  };

  const lifecycle = async (item: Item) => {
    if (!confirm(`${item.active ? "Archiver" : "Restaurer"} ${item.name} ?`)) return;
    const response = await fetch(item.active ? `/api/catalog/${kind}/${item.id}` : `/api/catalog/${kind}/${item.id}/restore`, { method: item.active ? "DELETE" : "POST" });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Action impossible");
    else { setNotice(item.active ? "Élément archivé." : "Élément restauré."); void load(); }
  };

  const field = (name: string, label: string, type = "text", required = false, defaultValue?: any) => <label>{label}<input required={required} type={type} step={type === "number" ? "0.001" : undefined} name={name} defaultValue={editing?.[name] ?? defaultValue ?? ""} /></label>;

  return <main className="content"><div className="page-heading"><div><p className="eyebrow">Catalogue</p><h1>{title}</h1><p>Référentiel sécurisé de votre entreprise.</p></div></div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="toast" role="status">{notice}</div>}{kind === "products" && <ImportPanel kind="products" onComplete={load} />}<section className="panel"><form className="catalog-form" key={editing?.id ?? "new"} onSubmit={submit}>{kind === "products" ? <>{field("sku", "SKU *", "text", true)}{field("barcode", "Code-barres")}{field("name", "Nom *", "text", true)}{field("description", "Description")}<label>Catégorie<select name="categoryId" defaultValue={editing?.categoryId ?? ""}><option value="">Sans catégorie</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Unité *<select required name="unit" defaultValue={editing?.unit ?? ""}><option value="">Sélectionnez une unité</option>{units.map((unit) => <option key={unit.id} value={unit.symbol}>{unit.name} ({unit.symbol})</option>)}</select></label>{field("purchasePrice", "Prix achat", "number", true, 0)}{field("sellingPrice", "Prix vente", "number", true)}{field("taxRate", "TVA (%)", "number", true, 19)}{field("minimumStock", "Seuil minimum", "number", true, 0)}</> : <>{field("name", "Nom *", "text", true)}{kind === "units" && field("symbol", "Symbole *", "text", true)}</>}<button className="primary">{editing ? "Enregistrer" : "Créer"}</button>{editing && <button type="button" className="outline" onClick={() => setEditing(null)}>Annuler</button>}</form></section><section className="panel customer-panel"><div className="customer-toolbar"><label className="search-field">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" /></label><label className="check-label"><input type="checkbox" checked={all} onChange={(event) => setAll(event.target.checked)} />Afficher les archivés</label></div>{loading ? <div className="empty-state">Chargement…</div> : <div className="table-scroll"><table><thead><tr><th>Nom</th>{kind === "products" && <><th>SKU</th><th>Catégorie</th><th>Unité</th><th>Prix vente</th></>}{kind === "units" && <th>Symbole</th>}<th>Statut</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td>{kind === "products" && <><td>{item.sku}</td><td>{item.category?.name ?? "—"}</td><td>{item.unit}</td><td>{Number(item.sellingPrice).toFixed(3)} TND</td></>}{kind === "units" && <td>{item.symbol}</td>}<td>{item.active ? "Actif" : "Archivé"}</td><td><button className="text-button" onClick={() => setEditing(item)}>Modifier</button><button className="text-button danger" onClick={() => void lifecycle(item)}>{item.active ? "Archiver" : "Restaurer"}</button></td></tr>)}</tbody></table></div>}{!loading && !items.length && <div className="empty-state"><strong>Aucun élément</strong><p>Aucun résultat pour ce filtre.</p></div>}</section></main>;
}
