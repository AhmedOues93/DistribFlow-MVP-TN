# Architecture

DistribFlow utilise Next.js App Router avec Prisma et PostgreSQL. Les routes HTTP délèguent les règles métier à `src/lib/services`; ces services valident leurs entrées avec Zod et appliquent systématiquement le tenant et les permissions reçus du contexte de session.

## Gestion des clients

Les données de clients sont rattachées à `Customer.tenantId`. Les adresses sont des enfants du client et ne sont atteintes qu'après une recherche tenant-scoped du client. Les opérations de modification des adresses et du client sont réalisées dans une transaction Prisma. L'archivage est réversible (`active = false`) afin de conserver l'historique commercial.

## Inventaire

Les opérations d’inventaire passent par `src/lib/services/inventory.ts`. Chaque mouvement est immuable, met à jour `StockLevel` dans une transaction sérialisable et génère un événement d’audit. Les clés d’idempotence empêchent qu’une requête répétée ne duplique une entrée ou un transfert.
