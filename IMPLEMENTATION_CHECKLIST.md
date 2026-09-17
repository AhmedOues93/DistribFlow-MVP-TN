# Checklist de mise en œuvre

| Domaine | État | Détails |
|---|---|---|
| Interface tableau de bord | Partiel | Interface responsive, données de démonstration uniquement |
| Authentification et tenant | Partiel | Onboarding, mots de passe scrypt, sessions et invitations persistés; écrans et acceptation d'invitation à ajouter |
| Clients, catalogue, stock | Terminé | Clients, catalogue, entrepôts, opérations et historiques de stock tenant-scoped; imports CSV clients/produits avec aperçu, succès partiel, rapport sûr et idempotence par contraintes. |
| Commandes | Terminé | Création, édition complète des lignes, duplication, recherche/filtrage/pagination URL-backed, résumé imprimable et actions contrôlées par rôle. |
| Livraisons, chauffeur offline | Manquant | — |
| Encaissements, ledger | Partiel | Modèle ledger, flux à construire |
| Retours, rapports, admin | Manquant | — |
| Phase 4 — application terrain/PWA | À venir | Écrans mobiles par rôle, hors-ligne et synchronisation sécurisée à concevoir. |
| Phase 3 — commandes et préparation | Terminé | Commandes tenant-scoped, numérotation atomique, totaux Decimal, snapshots, réservations, préparation, audit, source manuelle/WhatsApp, UI responsive, tests ciblés et migrations additives. |
| Phase 5 — tournées, POD, encaissements et retours | À venir | Non démarrée. |
