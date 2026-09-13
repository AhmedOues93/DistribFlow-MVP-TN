# Déploiement

1. Définir `DATABASE_URL` et `NEXT_PUBLIC_APP_URL` dans l'environnement de production.
2. Vérifier que PostgreSQL est disponible à l'hôte et port indiqués par `DATABASE_URL`, puis exécuter `npx prisma migrate deploy` pendant le déploiement.
3. Contrôler le résultat avec `npx prisma migrate status`, construire avec `npm run build`, puis démarrer avec `npm run start`.
4. Utiliser HTTPS afin que le cookie de session soit envoyé avec l'attribut `Secure`.

Ne pas lancer `prisma db push` en production : les migrations SQL versionnées dans `prisma/migrations` constituent la procédure de schéma.
