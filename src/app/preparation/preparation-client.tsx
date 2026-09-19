"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

async function readResponse(response: Response) { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Erreur serveur"); return result; }

export default function PreparationClient({ basePath = "/preparation" }: { basePath?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [warehouseId, setWarehouseId] = useState(searchParams.get("warehouseId") ?? "");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  useEffect(() => { setWarehouseId(searchParams.get("warehouseId") ?? ""); }, [searchParams]);
  useEffect(() => { fetch("/api/inventory/warehouses?active=true", { cache: "no-store" }).then(readResponse).then((result) => setWarehouses(result.items ?? result)).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Impossible de charger les entrepôts")); }, []);
  useEffect(() => { setLoading(true); setError(""); const query = new URLSearchParams({ page: String(page) }); if (warehouseId) query.set("warehouseId", warehouseId); fetch(`/api/preparation?${query}`, { cache: "no-store" }).then(readResponse).then(setData).catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Impossible de charger la file")).finally(() => setLoading(false)); }, [warehouseId, page]);
  const changeWarehouse = (value: string) => { setWarehouseId(value); const query = new URLSearchParams(); if (value) query.set("warehouseId", value); router.replace(`${pathname}${query.toString() ? `?${query}` : ""}`, { scroll: false }); };
  const changePage = (nextPage: number) => { const query = new URLSearchParams({ page: String(nextPage) }); if (warehouseId) query.set("warehouseId", warehouseId); router.replace(`${pathname}?${query}`, { scroll: false }); };
  return <main className="content"><div className="page-heading"><div><p className="eyebrow">Entrepôt</p><h1>Préparation</h1><p>File de picking des commandes confirmées et en cours.</p></div><label>Entrepôt<select value={warehouseId} onChange={(event) => changeWarehouse(event.target.value)}><option value="">Tous les entrepôts</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label></div>{error && <div className="form-error" role="alert">{error}<button className="text-button" onClick={() => router.refresh()}>Réessayer</button></div>}<section className="prep-grid">{loading ? <div className="empty-state panel">Chargement de la file…</div> : data?.items?.length ? data.items.map((order: any) => <Link className="panel prep-card" key={order.id} href={`${basePath}/${order.id}`}><span className="badge à-préparer">{order.status === "CONFIRMED" ? "À démarrer" : "En préparation"}</span><h2>{order.number}</h2><p>{order.customer.name}</p><strong>{order.warehouse?.name}</strong><small>{order.requestedDate ? `Livraison ${new Date(order.requestedDate).toLocaleDateString("fr-TN")}` : "Date non demandée"}</small></Link>) : <div className="empty-state panel"><strong>Aucune commande à préparer</strong><p>Les commandes confirmées apparaîtront ici.</p></div>}</section>{data?.pagination?.totalPages > 1 && <div className="pagination"><button className="outline" disabled={page === 1} onClick={() => changePage(page - 1)}>Précédent</button><span>Page {page} sur {data.pagination.totalPages}</span><button className="outline" disabled={page === data.pagination.totalPages} onClick={() => changePage(page + 1)}>Suivant</button></div>}</main>;
}
