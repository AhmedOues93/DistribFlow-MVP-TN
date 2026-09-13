# DistribFlow

Plateforme multi-tenant de gestion commerciale pour grossistes tunisiens. L'interface est en français, les montants sont en TND et les règles métier gardent le tenant comme frontière de sécurité.

## Démarrage local

1. Copiez `.env.example` vers `.env`.
2. Lancez `docker compose up -d db` puis `npx prisma db push`.
3. Lancez `npm run dev`.

Les services applicatifs effectuent les contrôles de rôle, de tenant et de validation Zod côté serveur. Les entêtes de l'API sont temporaires en attendant l'intégration Auth.js : elles ne doivent pas être exposées comme mécanisme d'authentification de production.
