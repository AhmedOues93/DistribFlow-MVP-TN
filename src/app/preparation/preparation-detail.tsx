"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/components/app-shell";

const preparationRoles = ["PLATFORM_ADMIN", "OWNER", "ADMIN", "WAREHOUSE", "WAREHOUSE_MANAGER"];
async function readResponse(response: Response) { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Erreur serveur"); return result; }

export default function PreparationDetail({ orderId, basePath = "/preparation" }: { orderId: string; basePath?: string }) {
  const router = useRouter();
  const role = useRole();
  const [order, setOrder] = useState<any>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const canPrepare = preparationRoles.includes(role);
  const load = async () => { setLoading(true); setError(""); try { const result = await readResponse(await fetch(`/api/orders/${orderId}`, { cache: "no-store" })); setOrder(result); setQuantities(Object.fromEntries(result.items.map((item: any) => [item.id, item.preparedQuantity.toString()]))); setDirty(false); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Commande inaccessible"); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [orderId]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  const transition = async (status: string) => { if (!order || !window.confirm("Confirmer cette action ?")) return; setBusy(true); setError(""); try { setOrder(await readResponse(await fetch(`/api/orders/${orderId}/transition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, version: order.version, idempotencyKey: crypto.randomUUID() }) }))); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Action impossible"); } finally { setBusy(false); } };
  const save = async () => { if (!order || !window.confirm("Enregistrer les quantités préparées ?")) return; setBusy(true); setError(""); try { setOrder(await readResponse(await fetch(`/api/orders/${orderId}/preparation`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: order.version, lines: order.items.map((item: any) => ({ itemId: item.id, preparedQuantity: quantities[item.id] })) }) }))); setDirty(false); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Préparation impossible"); } finally { setBusy(false); } };
  const leave = () => { if (!dirty || window.confirm("Des quantités ne sont pas enregistrées. Quitter cette page ?")) router.push(basePath); };
  if (loading) return <main className="content"><div className="empty-state">Chargement de la commande…</div></main>;
  if (!order) return <main className="content"><div className="form-error" role="alert">{error || "Commande inaccessible"}<button className="text-button" onClick={() => void load()}>Réessayer</button></div></main>;
  return <main className="content"><div className="page-heading"><div><p className="eyebrow">Poste de picking</p><h1>{order.number}</h1><p>{order.customer.name} · {order.warehouse?.name}</p></div></div>{error && <div className="form-error" role="alert">{error}<button className="text-button" onClick={() => void load()}>Réessayer</button></div>}<section className="panel"><div className="prep-lines">{order.items.map((item: any) => <div className="prep-line" key={item.id}><div><strong>{item.skuSnapshot} — {item.descriptionSnapshot}</strong><small>Commandé : {item.quantity.toString()} {item.unitSnapshot}</small></div><label>Préparé<input disabled={!canPrepare || order.status !== "IN_PREPARATION"} type="number" min="0" max={item.quantity.toString()} step="0.001" value={quantities[item.id] ?? "0"} onChange={(event) => { setDirty(true); setQuantities((current) => ({ ...current, [item.id]: event.target.value })); }} /></label><span>Reste : {Number(item.quantity) - Number(quantities[item.id] ?? 0)}</span></div>)}</div><div className="dialog-actions">{canPrepare && order.status === "CONFIRMED" && <button className="primary" disabled={busy} onClick={() => void transition("IN_PREPARATION")}>Démarrer</button>}{canPrepare && order.status === "IN_PREPARATION" && <><button className="outline" disabled={busy} onClick={() => void save()}>Enregistrer les quantités</button><button className="primary" disabled={busy || dirty} onClick={() => void transition("PREPARED")}>Marquer préparée</button></>}{canPrepare && order.status === "PREPARED" && <button className="primary" disabled={busy} onClick={() => void transition("READY_FOR_DELIVERY")}>Prête à livrer</button>}<button className="outline" onClick={leave}>Retour</button></div></section></main>;
}
