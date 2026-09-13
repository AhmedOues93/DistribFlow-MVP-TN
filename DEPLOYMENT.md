# Déploiement

1. Définir `DATABASE_URL` et `NEXT_PUBLIC_APP_URL` dans l'environnement de production.
2. Exécuter `npx prisma migrate deploy` pendant le déploiement.
3. Construire avec `npm run build`, puis démarrer avec `npm run start`.
4. Utiliser HTTPS afin que le cookie de session soit envoyé avec l'attribut `Secure`.

Ne pas lancer `prisma db push` en production : les migrations SQL versionnées dans `prisma/migrations` constituent la procédure de schéma.
