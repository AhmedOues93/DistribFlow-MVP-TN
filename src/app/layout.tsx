import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DistribFlow — Pilotage de distribution", description: "Le cockpit opérationnel des entreprises de distribution." };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="fr"><body>{children}</body></html>; }
