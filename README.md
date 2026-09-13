# DistribFlow

Plateforme multi-tenant de gestion commerciale pour grossistes tunisiens. L'interface est en français, les montants sont en TND et les règles métier gardent le tenant comme frontière de sécurité.

## Démarrage local

1. Copiez `.env.example` vers `.env`.
2. Lancez `docker compose up -d db` puis `npx prisma db push`.
3. Lancez `npm run dev`.

Les services applicatifs effectuent les contrôles de rôle, de tenant et de validation Zod côté serveur. Les requêtes métier utilisent le cookie de session HttpOnly et récupèrent le tenant depuis le membership serveur : l'API n'accepte pas de tenant ou rôle transmis par le client.

## Parcours clients

Après inscription ou connexion, ouvrez `/clients` pour rechercher, créer, modifier, archiver ou restaurer les clients de votre entreprise. Les montants de limite de crédit sont stockés avec une précision décimale et les téléphones ainsi que matricules fiscaux sont uniques par entreprise.
