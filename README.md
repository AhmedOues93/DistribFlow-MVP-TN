# DistribFlow

Plateforme multi-tenant de gestion commerciale pour grossistes tunisiens. L'interface est en français, les montants sont en TND et les règles métier gardent le tenant comme frontière de sécurité.

## Démarrage local

1. Copiez `.env.example` vers `.env`.
2. Lancez `docker compose up -d db`, attendez que PostgreSQL écoute sur le port `5432`, puis exécutez `npx prisma migrate deploy`.
3. Lancez `npm run dev`.

Les services applicatifs effectuent les contrôles de rôle, de tenant et de validation Zod côté serveur. Les requêtes métier utilisent le cookie de session HttpOnly et récupèrent le tenant depuis le membership serveur : l'API n'accepte pas de tenant ou rôle transmis par le client.

## Parcours clients

Après inscription ou connexion, ouvrez `/clients` pour rechercher, créer, modifier, archiver ou restaurer les clients de votre entreprise. Les montants de limite de crédit sont stockés avec une précision décimale et les téléphones ainsi que matricules fiscaux sont uniques par entreprise.

## Base de données

Les migrations versionnées sont la seule procédure de création ou d'évolution du schéma. Sur une nouvelle base, exécutez `npx prisma migrate deploy`, `npx prisma generate`, puis `npm run db:seed`. Vérifiez ensuite l'état avec `npx prisma migrate status`.
