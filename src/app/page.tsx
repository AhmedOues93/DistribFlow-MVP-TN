"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";

type OrderStatus = "À préparer" | "En livraison" | "Livrée" | "Brouillon";
type Order = { number: string; customer: string; time: string; amount: number; status: OrderStatus; initials: string };

const initialOrders: Order[] = [
  { number: "CMD-1048", customer: "Épicerie El Amen", time: "09:30", amount: 468.500, status: "À préparer", initials: "EA" },
  { number: "CMD-1047", customer: "Marché Central", time: "10:00", amount: 1_246.000, status: "En livraison", initials: "MC" },
  { number: "CMD-1046", customer: "Superette La Rose", time: "Hier", amount: 328.750, status: "Livrée", initials: "LR" },
  { number: "CMD-1045", customer: "Café du Port", time: "Hier", amount: 195.000, status: "Livrée", initials: "CP" }
];

const navItems = ["Tableau de bord", "Commandes", "Clients", "Produits & Stock", "Livraisons", "Encaissements", "Rapports"];

export default function Dashboard() {
  const [active, setActive] = useState("Tableau de bord");
  const [orders, setOrders] = useState(initialOrders);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const visibleOrders = useMemo(() => orders.filter((order) => `${order.number} ${order.customer}`.toLowerCase().includes(query.toLowerCase())), [orders, query]);

  function createOrder() {
    setOrders((current) => [{ number: `CMD-${1049 + current.length - initialOrders.length}`, customer: "Nouveau client", time: "À confirmer", amount: 0, status: "Brouillon", initials: "NC" }, ...current]);
    setNotice("Brouillon créé — ajoutez les articles pour finaliser la commande.");
  }

  return <main className="shell">
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="brand"><span className="brand-mark">D</span><span>Distrib<span>Flow</span></span></div>
      <div className="tenant"><div className="avatar teal">NA</div><div><strong>Nour Alimentation</strong><small>Entreprise</small></div><span className="chevron">⌄</span></div>
      <nav>{navItems.map((item, index) => <button key={item} onClick={() => { setActive(item); setMenuOpen(false); }} className={active === item ? "nav-active" : ""}><span className="nav-icon">{["⌂", "▣", "♙", "▦", "▱", "◒", "▥"][index]}</span>{item}{item === "Commandes" && <b>12</b>}</button>)}</nav>
      <div className="sidebar-bottom"><button><span className="nav-icon">⚙</span>Paramètres</button><button><span className="nav-icon">?</span>Aide & support</button><div className="user"><div className="avatar purple">SK</div><div><strong>Sami Khelifi</strong><small>Administrateur</small></div><span>⋮</span></div></div>
    </aside>
    <section className="workspace">
      <header><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button><div className="crumb"><span>Vue d&apos;ensemble</span><small>Bienvenue, Sami. Voici ce qui se passe aujourd&apos;hui.</small></div><div className="header-actions"><button className="icon-button" aria-label="Notifications">♧<i /></button><button className="top-avatar">SK</button></div></header>
      <div className="content">
        <div className="title-row"><div><h1>{active}</h1><p>Samedi 13 septembre 2026</p></div><button className="primary" onClick={createOrder}><span>＋</span>Nouvelle commande</button></div>
        {notice && <div className="toast" role="status">✓ {notice}<button onClick={() => setNotice("")}>×</button></div>}
        <section className="stats">
          <Stat icon="↗" iconClass="mint" label="Ventes aujourd’hui" value={money(4218.750)} trend="+12,5 %" note="vs. hier" />
          <Stat icon="▣" iconClass="lavender" label="Commandes à traiter" value="12" trend="3" note="à préparer" />
          <Stat icon="▱" iconClass="blue" label="En livraison" value="8" trend="2" note="livraisons en retard" warning />
          <Stat icon="◒" iconClass="orange" label="Encaissements du jour" value={money(2860)} trend="68 %" note="des ventes" />
        </section>
        <section className="middle-grid"><div className="panel performance"><div className="panel-title"><div><h2>Performance des ventes</h2><p>Cette semaine</p></div><button className="select">Cette semaine⌄</button></div><div className="chart-wrap"><div className="y-axis"><span>6 000</span><span>4 500</span><span>3 000</span><span>1 500</span><span>0</span></div><div className="chart"><div className="grid-lines" />{[28, 54, 42, 70, 60, 85, 73].map((height, index) => <div key={index} className="bar-column"><div className={`bar ${index === 5 ? "highlight" : ""}`} style={{height: `${height}%`}}>{index === 5 && <span>5 820 TND</span>}</div><small>{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][index]}</small></div>)}</div></div><div className="chart-footer"><span><i className="dot primary-dot"/>Ventes</span><span>Objectif: <strong>28 000 TND</strong><b>78%</b></span></div></div>
          <div className="panel alerts"><div className="panel-title"><div><h2>Alertes</h2><p>À votre attention</p></div><button className="more">•••</button></div><Alert color="red" title="Stock faible" description="Eau minérale 1,5L" meta="12 unités restantes" /><Alert color="amber" title="Crédit dépassé" description="Épicerie Ben Ali" meta="Solde : 2 450 TND" /><Alert color="blue" title="Livraison en retard" description="Marché Central" meta="Depuis 45 min" /><button className="all-alerts">Voir toutes les alertes <span>→</span></button></div></section>
        <section className="panel orders"><div className="panel-title orders-head"><div><h2>Commandes récentes</h2><p>Suivez vos dernières commandes</p></div><div className="orders-controls"><label>⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher..." /></label><button className="outline">Voir tout <span>→</span></button></div></div><div className="table-scroll"><table><thead><tr><th>Commande</th><th>Client</th><th>Livraison</th><th>Montant</th><th>Statut</th><th /></tr></thead><tbody>{visibleOrders.map((order) => <tr key={order.number}><td><strong>{order.number}</strong></td><td><div className="customer"><div className="avatar yellow">{order.initials}</div>{order.customer}</div></td><td>{order.time}</td><td><strong>{money(order.amount)}</strong></td><td><span className={`badge ${order.status.replaceAll(" ", "-").toLowerCase()}`}><i />{order.status}</span></td><td><button className="more">•••</button></td></tr>)}</tbody></table></div></section>
      </div>
    </section>
  </main>;
}

function Stat({ icon, iconClass, label, value, trend, note, warning }: {icon: string; iconClass: string; label: string; value: string; trend: string; note: string; warning?: boolean}) { return <article className="stat"><div className={`stat-icon ${iconClass}`}>{icon}</div><div><p>{label}</p><h2>{value}</h2><small className={warning ? "warning" : "positive"}>{warning ? "⚠" : "↗"} {trend}</small><span className="stat-note"> {note}</span></div></article>; }
function Alert({ color, title, description, meta }: {color: string; title: string; description: string; meta: string}) { return <div className="alert"><span className={`alert-dot ${color}`} /><div><strong>{title}</strong><p>{description}</p><small>{meta}</small></div><button className="more">•••</button></div>; }
