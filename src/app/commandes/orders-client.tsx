"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRole } from "@/components/app-shell";

const labels: Record<string, string> = { DRAFT: "Brouillon", CONFIRMED: "Confirmée", IN_PREPARATION: "En préparation", PREPARED: "Préparée", READY_FOR_DELIVERY: "Prête à livrer", OUT_FOR_DELIVERY: "En livraison", DELIVERED: "Livrée", PARTIALLY_DELIVERED: "Partiellement livrée", CANCELLED: "Annulée", RETURNED: "Retournée" };
const readableRoles = ["PLATFORM_ADMIN", "OWNER", "SALES_AGENT", "WAREHOUSE_MANAGER", "ACCOUNTANT", "VIEWER"];

function queryFromFilters(filters: Record<string, string>, page: number) {
  const query = new URLSearchParams({ page: String(page) });
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  return query;
}

export default function OrdersClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useRole();
  const [filters, setFilters] = useState({ q: searchParams.get("q") ?? "", status: searchParams.get("status") ?? "", warehouseId: searchParams.get("warehouseId") ?? "", dateFrom: searchParams.get("dateFrom") ?? "", dateTo: searchParams.get("dateTo") ?? "" });
  const [page, setPage] = useState(Number(searchParams.get("page") ?? 1) || 1);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { setFilters({ q: searchParams.get("q") ?? "", status: searchParams.get("status") ?? "", warehouseId: searchParams.get("warehouseId") ?? "", dateFrom: searchParams.get("dateFrom") ?? "", dateTo: searchParams.get("dateTo") ?? "" }); setPage(Math.max(1, Number(searchParams.get("page") ?? 1) || 1)); }, [searchParams]);
  useEffect(() => { fetch("/api/inventory/warehouses?active=true", { cache: "no-store" }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setWarehouses(result.items ?? result); }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Impossible de charger les entrepôts")); }, []);
  const load = async () => { setLoading(true); setError(""); try { const response = await fetch(`/api/orders?${queryFromFilters(filters, page)}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setData(result); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Impossible de charger les commandes"); } finally { setLoading(false); } };
  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [filters, page]);
  const changeFilter = (key: keyof typeof filters, value: string) => { const next = { ...filters, [key]: value }; setFilters(next); setPage(1); router.replace(`${pathname}?${queryFromFilters(next, 1)}`, { scroll: false }); };
  const changePage = (nextPage: number) => { setPage(nextPage); router.replace(`${pathname}?${queryFromFilters(filters, nextPage)}`, { scroll: false }); };
  const canCreate = role === "PLATFORM_ADMIN" || role === "OWNER" || role === "SALES_AGENT";
  if (!readableRoles.includes(role)) return <main className="content"><div className="empty-state panel"><strong>Accès non autorisé</strong><p>Votre rôle ne permet pas de consulter les commandes.</p></div></main>;
  return <main className="content"><div className="page-heading"><div><p className="eyebrow">Ventes</p><h1>Commandes</h1><p>Suivez les brouillons, réservations et préparations de votre entreprise.</p></div>{canCreate && <Link className="primary" href="/commandes/nouvelle">Nouvelle commande</Link>}</div>{error && <div className="form-error" role="alert">{error}<button className="text-button" onClick={() => void load()}>Réessayer</button></div>}<section className="panel customer-panel"><div className="customer-toolbar"><label className="search-field">⌕<input value={filters.q} onChange={(event) => changeFilter("q", event.target.value)} placeholder="N° de commande, client ou référence" /></label><label>Statut<select value={filters.status} onChange={(event) => changeFilter("status", event.target.value)}><option value="">Tous</option>{Object.entries(labels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><label>Entrepôt<select value={filters.warehouseId} onChange={(event) => changeFilter("warehouseId", event.target.value)}><option value="">Tous</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label><label>Du<input type="date" value={filters.dateFrom} onChange={(event) => changeFilter("dateFrom", event.target.value)} /></label><label>Au<input type="date" value={filters.dateTo} onChange={(event) => changeFilter("dateTo", event.target.value)} /></label></div>{loading ? <div className="empty-state">Chargement des commandes…</div> : data?.items?.length ? <div className="table-scroll"><table><thead><tr><th>Commande</th><th>Client</th><th>Entrepôt</th><th>Source</th><th>Statut</th><th>Livraison demandée</th><th>Total</th></tr></thead><tbody>{data.items.map((order: any) => <tr key={order.id}><td><Link href={`/commandes/${order.id}`}><strong>{order.number}</strong></Link><small className="subline">{new Date(order.orderDate).toLocaleDateString("fr-TN")}</small></td><td>{order.customer.name}</td><td>{order.warehouse?.name ?? "—"}</td><td>{order.source === "WHATSAPP" ? "WhatsApp" : "Manuelle"}</td><td><span className="badge brouillon">{labels[order.status] ?? order.status}</span></td><td>{order.requestedDate ? new Date(order.requestedDate).toLocaleDateString("fr-TN") : "—"}</td><td>{Number(order.total).toFixed(3)} TND</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>Aucune commande</strong><p>{filters.q || filters.status || filters.warehouseId || filters.dateFrom || filters.dateTo ? "Aucun résultat pour ces filtres." : "Créez votre première commande pour démarrer le flux de préparation."}</p>{canCreate && <Link className="outline" href="/commandes/nouvelle">Créer une commande</Link>}</div>}{data?.pagination?.totalPages > 1 && <div className="pagination"><button className="outline" disabled={data.pagination.page === 1} onClick={() => changePage(data.pagination.page - 1)}>Précédent</button><span>Page {data.pagination.page} sur {data.pagination.totalPages}</span><button className="outline" disabled={data.pagination.page === data.pagination.totalPages} onClick={() => changePage(data.pagination.page + 1)}>Suivant</button></div>}</section></main>;
}
