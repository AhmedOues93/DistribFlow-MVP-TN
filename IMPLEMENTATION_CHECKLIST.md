# Checklist de mise en œuvre

| Domaine | État | Détails |
|---|---|---|
| Interface tableau de bord | Terminé | KPIs, commandes récentes, stock et états de chargement/erreur alimentés par les données PostgreSQL du tenant. |
| Authentification et tenant | Terminé | Onboarding propriétaire, bootstrap idempotent, mots de passe scrypt, sessions multi-entreprises, invitations et acceptation sécurisées. |
| Clients, catalogue, stock | Terminé | Clients, catalogue, entrepôts, opérations et historiques de stock tenant-scoped; imports CSV clients/produits avec aperçu, succès partiel, rapport sûr et idempotence par contraintes. |
| Commandes | Terminé | Création, édition complète des lignes, duplication, recherche/filtrage/pagination URL-backed, résumé imprimable et actions contrôlées par rôle. |
| Livraisons, chauffeur offline | Manquant | — |
| Encaissements, ledger | Partiel | Modèle ledger, flux à construire |
| Retours, rapports, admin | Manquant | — |
| Phase 4 — application terrain/PWA | À venir | Écrans mobiles par rôle, hors-ligne et synchronisation sécurisée à concevoir. |
| Phase 3 — commandes et préparation | Terminé | Commandes tenant-scoped, numérotation atomique, totaux Decimal, snapshots, réservations, préparation, audit, source manuelle/WhatsApp, UI responsive, tests ciblés et migrations additives. |
| Phase 5 — tournées, POD, encaissements et retours | À venir | Non démarrée. |
| Équipe et employés | Terminé | `/equipe`, invitations Resend, acceptation, statuts membership, rôles, règles dernier OWNER, audit et redirection vers le portail worker dédié. |
| Portail employé et communication | Terminé | `/travailleur/*`, profil/avatar/mot de passe, réglages entreprise, notifications dédupliquées, conversations tenant-scoped, polling, pièces jointes validées et tests/smoke PostgreSQL. |
| Correctif onboarding et identité visuelle | Terminé | Origine d’invitation sécurisée, lien local cliquable, recherche globale tenant-scoped, stockage de marque local/S3, réglages entreprise, shell graphite/ivoire/cuivre, responsive et QA manuel documentés. |

## Phase livrée — gestion d’équipe

Cette phase a couvert explicitement :

- page de gestion d’équipe `/equipe` ;
- invitation et activation des employés ;
- cycle de vie des comptes employés ;
- attribution des rôles et permissions ;
- connexion partagée pour le propriétaire et les employés ;
- redirection post-connexion selon le rôle ;
- interfaces mobiles/PWA par rôle pour les employés.

## Phase livrée — portail employé et communication

Cette phase couvre le portail worker séparé, les redirections par rôle, le profil personnel, les paramètres d’entreprise, l’envoi d’invitations Resend, les notifications et la messagerie interne. Elle ne démarre pas la livraison, le routage, les véhicules, les paiements ou la synchronisation hors ligne.

## Prochaine phase — application terrain/PWA

Les interfaces mobiles/PWA opérationnelles par rôle, le mode hors ligne, les tournées, la preuve de livraison et les encaissements restent à construire.
