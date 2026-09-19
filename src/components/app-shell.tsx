"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Boxes, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, MessageCircle, Package, Search, Settings, UserRound, Users, Warehouse, X } from "lucide-react";
import { createContext, KeyboardEvent, useContext, useEffect, useMemo, useState } from "react";

type NavigationItem = { href: string; label: string; icon: typeof LayoutDashboard; roles?: string[] };
type NavigationGroup = { label: string; items: NavigationItem[] };
type SearchResult = { kind: "customer" | "product" | "order"; id: string; title: string; subtitle: string; href: string };
type SearchPayload = { results: { customers: SearchResult[]; products: SearchResult[]; orders: SearchResult[] }; total: number };

const readRoles = ["PLATFORM_ADMIN", "OWNER", "ADMIN", "SALES", "WAREHOUSE", "SALES_AGENT", "WAREHOUSE_MANAGER", "ACCOUNTANT", "VIEWER", "READ_ONLY"];
const catalogueRoles = ["PLATFORM_ADMIN", "OWNER", "ADMIN", "WAREHOUSE", "WAREHOUSE_MANAGER", "VIEWER", "READ_ONLY"];
const stockRoles = ["PLATFORM_ADMIN", "OWNER", "ADMIN", "WAREHOUSE", "WAREHOUSE_MANAGER", "VIEWER", "READ_ONLY"];

const navigation: NavigationGroup[] = [
  { label: "Pilotage", items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: readRoles }] },
  { label: "Ventes", items: [
    { href: "/clients", label: "Clients", icon: Users, roles: ["PLATFORM_ADMIN", "OWNER", "ADMIN", "SALES", "SALES_AGENT", "ACCOUNTANT", "VIEWER", "READ_ONLY"] },
    { href: "/commandes", label: "Commandes", icon: ClipboardList, roles: readRoles },
    { href: "/preparation", label: "Préparation", icon: ClipboardList, roles: readRoles },
  ] },
  { label: "Organisation", items: [{ href: "/equipe", label: "Équipe", icon: Users, roles: ["PLATFORM_ADMIN", "OWNER", "ADMIN"] }] },
  { label: "Communication", items: [{ href: "/messages", label: "Messages", icon: MessageCircle, roles: readRoles }, { href: "/notifications", label: "Notifications", icon: Bell, roles: readRoles }] },
  { label: "Référentiels", items: [
    { href: "/catalogue/produits", label: "Produits", icon: Package, roles: catalogueRoles },
    { href: "/catalogue/categories", label: "Catégories", icon: Boxes, roles: catalogueRoles },
    { href: "/catalogue/unites", label: "Unités", icon: Boxes, roles: catalogueRoles },
  ] },
  { label: "Logistique", items: [
    { href: "/entrepots", label: "Entrepôts", icon: Warehouse, roles: stockRoles },
    { href: "/stock", label: "Opérations de stock", icon: Boxes, roles: stockRoles },
    { href: "/stock/mouvements", label: "Mouvements", icon: ClipboardList, roles: stockRoles },
    { href: "/stock/alertes", label: "Alertes", icon: Boxes, roles: stockRoles },
    { href: "/stock/transferts", label: "Transferts", icon: Warehouse, roles: stockRoles },
  ] },
];

const roleLabels: Record<string, string> = {
  PLATFORM_ADMIN: "Administrateur plateforme",
  OWNER: "Propriétaire",
  SALES_AGENT: "Commercial",
  ADMIN: "Administrateur",
  SALES: "Commercial",
  WAREHOUSE: "Responsable entrepôt",
  WAREHOUSE_MANAGER: "Responsable entrepôt",
  DRIVER: "Livreur",
  ACCOUNTANT: "Comptable",
  VIEWER: "Lecteur",
  READ_ONLY: "Lecture seule",
};

export const RoleContext = createContext("VIEWER");
export function useRole() { return useContext(RoleContext); }

export function AppShell({ children, session }: { children: React.ReactNode; session: { userName: string; tenantName: string; tenantLogoUrl?: string; role: string; companies?: { tenantId: string; tenantName: string; role: string }[] } }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchPayload | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searchIndex, setSearchIndex] = useState(-1);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setSearchResults(null); setSearchError(""); setSearching(false); setSearchIndex(-1); return; }
    const timer = window.setTimeout(() => { setSearching(true); setSearchError(""); fetch(`/api/search?q=${encodeURIComponent(value)}`, { cache: "no-store" }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Recherche indisponible"); setSearchResults(payload); setSearchIndex(-1); }).catch((requestError) => { setSearchResults(null); setSearchError(requestError instanceof Error ? requestError.message : "Recherche indisponible"); }).finally(() => setSearching(false)); }, 240);
    return () => window.clearTimeout(timer);
  }, [query]);
  const visibleGroups = navigation.map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(session.role) || session.role === "PLATFORM_ADMIN" || session.role === "OWNER") })).filter((group) => group.items.length);
  const activeHref = visibleGroups.flatMap((group) => group.items).filter((item) => path === item.href || (item.href !== "/dashboard" && path.startsWith(`${item.href}/`))).sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const initials = session.userName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/connexion"); router.refresh(); };
  const switchCompany = async (tenantId: string) => { setSwitching(true); const response = await fetch("/api/auth/switch-company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId }) }); const payload = await response.json(); if (response.ok) { setMenu(false); router.replace(payload.redirectTo); router.refresh(); } setSwitching(false); };
  const searchGroups = useMemo(() => [{ label: "Clients", items: searchResults?.results.customers ?? [] }, { label: "Produits", items: searchResults?.results.products ?? [] }, { label: "Commandes", items: searchResults?.results.orders ?? [] }].filter((group) => group.items.length), [searchResults]);
  const flattenedResults = searchGroups.flatMap((group) => group.items);
  const openSearchResult = (result: SearchResult) => { router.push(result.href); setQuery(""); setSearchResults(null); setOpen(false); };
  const handleSearchKey = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Escape") { setQuery(""); setSearchResults(null); setSearchError(""); setSearchIndex(-1); return; } if (event.key === "ArrowDown") { event.preventDefault(); setSearchIndex((current) => Math.min(current + 1, flattenedResults.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setSearchIndex((current) => Math.max(current - 1, 0)); } if (event.key === "Enter" && searchIndex >= 0 && flattenedResults[searchIndex]) { event.preventDefault(); openSearchResult(flattenedResults[searchIndex]); } };

  return <RoleContext.Provider value={session.role}><div className={`shell app-shell${collapsed ? " shell-collapsed" : ""}`}>
    <button className={open ? "mobile-nav-backdrop visible" : "mobile-nav-backdrop"} aria-label="Fermer le menu" onClick={() => setOpen(false)} />
    <aside className={open ? "sidebar open" : "sidebar"}>
      <div className="sidebar-top">
        <Link className="brand" href="/dashboard" onClick={() => setOpen(false)}><span className="brand-mark">D</span><span>Distrib<span>Flow</span></span></Link>
        <div className="tenant">{session.tenantLogoUrl ? <img className="tenant-logo" src={session.tenantLogoUrl} alt="" /> : <div className="avatar tenant-avatar">{session.tenantName.slice(0, 2).toUpperCase()}</div>}<div><strong>{session.tenantName}</strong><small>Espace entreprise</small></div></div>
        <button className="sidebar-collapse" aria-label={collapsed ? "Développer la navigation" : "Réduire la navigation"} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Réduire</>}</button>
      </div>
      <nav aria-label="Navigation principale">{visibleGroups.map((group) => <div className="nav-group" key={group.label}><p className="nav-group-label">{group.label}</p>{group.items.map(({ href, label, icon: Icon }) => <Link onClick={() => setOpen(false)} className={activeHref === href ? "nav-active" : ""} key={href} href={href}><Icon size={18} strokeWidth={1.9} /><span>{label}</span></Link>)}</div>)}</nav>
      <div className="sidebar-footer"><span className="status-dot" /><span>Données sécurisées par entreprise</span></div>
    </aside>
    <section className="workspace">
      <header className="topbar">
        <button className="mobile-menu" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
        <div className="topbar-context"><span className="topbar-kicker">Espace opérationnel</span><strong>{session.tenantName}</strong></div>
        <div className="global-search-wrap"><form className="global-search" onSubmit={(event) => event.preventDefault()}><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleSearchKey} placeholder="Rechercher clients, produits, commandes" aria-label="Rechercher clients, produits, commandes" aria-controls="global-search-results" aria-expanded={Boolean(query.trim().length >= 2)} autoComplete="off" /></form>{query.trim().length >= 2 && <div className="search-results" id="global-search-results" role="listbox">{searching ? <div className="search-state">Recherche en cours…</div> : searchError ? <div className="search-state search-error" role="alert">{searchError}</div> : searchResults?.total ? searchGroups.map((group) => <div className="search-group" key={group.label}><span>{group.label}</span>{group.items.map((result) => { const index = flattenedResults.indexOf(result); return <button className={index === searchIndex ? "search-result active" : "search-result"} key={`${result.kind}-${result.id}`} role="option" aria-selected={index === searchIndex} onMouseDown={(event) => event.preventDefault()} onClick={() => openSearchResult(result)}><strong>{result.title}</strong><small>{result.subtitle}</small></button>; })}</div>) : <div className="search-state">Aucun résultat pour cette recherche.</div>}</div>}</div>
        <div className="topbar-actions"><div className="user-menu"><button className="user" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(!menu)}><div className="avatar user-avatar">{initials || "DF"}</div><div className="user-copy"><strong>{session.userName}</strong><small>{roleLabels[session.role] ?? session.role}</small></div><ChevronDown size={16} /></button>{menu && <div className="user-dropdown" role="menu"><div className="dropdown-intro"><strong>{session.userName}</strong><span>{roleLabels[session.role] ?? session.role} · {session.tenantName}</span></div>{(session.companies?.length ?? 0) > 1 && <div className="company-switcher"><span>Changer d’entreprise</span>{session.companies?.map((company) => <button type="button" key={company.tenantId} disabled={switching || company.tenantName === session.tenantName} onClick={() => void switchCompany(company.tenantId)}>{company.tenantName}<small>{roleLabels[company.role] ?? company.role}</small></button>)}</div>}<Link href="/parametres/profil" role="menuitem" onClick={() => setMenu(false)}><UserRound size={16} />Profil</Link><Link href="/parametres/entreprise" role="menuitem" onClick={() => setMenu(false)}><Settings size={16} />Entreprise</Link><Link href="/parametres/profil#preferences" role="menuitem" onClick={() => setMenu(false)}><Settings size={16} />Paramètres</Link><button className="logout" role="menuitem" onClick={logout}><LogOut size={16} />Se déconnecter</button></div>}</div></div>
      </header>
      {children}
    </section>
  </div></RoleContext.Provider>;
}
