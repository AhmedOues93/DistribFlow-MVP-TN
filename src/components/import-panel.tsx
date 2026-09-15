"use client";

import { ChangeEvent, DragEvent, useId, useState } from "react";

type CsvError = { row: number; field: string; value: string; message: string };
type ImportResult = { total: number; valid?: number; invalid?: number; duplicates?: number; created?: number; skipped?: number; failed?: number; errors: CsvError[] };
type ImportKind = "customers" | "products";
const maximumFileSize = 512 * 1024;

function displayFileSize(size: number) {
  return `${(size / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Ko`;
}

export function ImportPanel({ kind, onComplete }: { kind: ImportKind; onComplete: () => void }) {
  const inputId = useId();
  const [raw, setRaw] = useState("");
  const [fileName, setFileName] = useState("");
  const [size, setSize] = useState(0);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setRaw(""); setFileName(""); setSize(0); setPreview(null); setResult(null); setError("");
  }

  function accept(file: File | undefined) {
    if (!file) return;
    const allowedMime = !file.type || ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"].includes(file.type);
    if (!/\.csv$/i.test(file.name) || !allowedMime || file.size > maximumFileSize) {
      setError("Choisissez un fichier CSV de 512 Ko maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError("Impossible de lire ce fichier.");
    reader.onload = () => {
      setRaw(String(reader.result ?? "")); setFileName(file.name); setSize(file.size); setPreview(null); setResult(null); setError("");
    };
    reader.readAsText(file, "utf-8");
  }

  function select(event: ChangeEvent<HTMLInputElement>) {
    accept(event.target.files?.[0]);
    event.target.value = "";
  }

  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    accept(event.dataTransfer.files?.[0]);
  }

  async function send(confirm: boolean) {
    if (!raw) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/imports/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: raw, confirm }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import impossible");
      if (confirm) { setResult(data); onComplete(); } else { setPreview(data); setResult(null); }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Import impossible");
    } finally { setBusy(false); }
  }

  async function downloadReport(errors: CsvError[]) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/imports/${kind}/error-report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ errors }) });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Rapport indisponible");
      }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `erreurs-import-${kind}.csv`; anchor.click(); URL.revokeObjectURL(url);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Rapport indisponible");
    } finally { setBusy(false); }
  }

  const state = result ?? preview;
  const isPreview = Boolean(preview && !result);
  return <section className="panel import-panel" aria-labelledby={`${inputId}-title`}>
    <div className="section-heading"><div><h2 id={`${inputId}-title`}>Importer un fichier CSV</h2><p>Téléchargez le modèle, prévisualisez les lignes puis confirmez. L’aperçu n’écrit aucune donnée.</p></div><a className="outline" href={`/api/imports/${kind}`}>Télécharger le modèle français</a></div>
    <label className="catalog-file" htmlFor={inputId} onDragOver={(event) => event.preventDefault()} onDrop={drop}><strong>Sélectionnez ou déposez un fichier CSV</strong><span>UTF-8, virgule ou point-virgule, 512 Ko et 1 000 lignes maximum.</span><input id={inputId} type="file" accept=".csv,text/csv" onChange={select} /></label>
    {fileName && <p className="subline"><strong>{fileName}</strong> · {displayFileSize(size)}</p>}
    {error && <div className="form-error" role="alert">{error}</div>}
    {raw && !state && <div className="dialog-actions"><button type="button" className="primary" disabled={busy} onClick={() => void send(false)}>{busy ? "Analyse…" : "Prévisualiser"}</button><button type="button" className="outline" onClick={reset}>Annuler</button></div>}
    {state && <div className="import-result" aria-live="polite">
      {isPreview ? <p><strong>Aperçu :</strong> {state.total} lignes · {state.valid ?? 0} valides · {state.invalid ?? 0} invalides · {state.duplicates ?? 0} doublons</p> : <p><strong>Import terminé :</strong> {state.created ?? 0} créées · {state.skipped ?? 0} ignorées · {state.failed ?? 0} en erreur</p>}
      {state.errors.length > 0 && <div className="form-error"><strong>Erreurs par ligne</strong>{state.errors.slice(0, 20).map((item) => <p key={`${item.row}-${item.field}-${item.message}`}>Ligne {item.row} — {item.field} : {item.message}</p>)}{state.errors.length > 20 && <p>Les {state.errors.length - 20} autres erreurs figurent dans le rapport.</p>}</div>}
      <div className="dialog-actions">{state.errors.length > 0 && <button type="button" className="outline" disabled={busy} onClick={() => void downloadReport(state.errors)}>Télécharger le rapport d’erreurs</button>}{isPreview && <button type="button" className="primary" disabled={busy || (preview?.valid ?? 0) === 0} onClick={() => void send(true)}>{busy ? "Import…" : "Confirmer l’import"}</button>}<button type="button" className="outline" disabled={busy} onClick={reset}>{result ? "Importer un autre fichier" : "Annuler"}</button></div>
    </div>}
  </section>;
}
