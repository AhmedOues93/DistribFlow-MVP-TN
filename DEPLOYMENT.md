# Déploiement

1. Définir `DATABASE_URL`, `APP_URL` (URL publique HTTPS complète), `EMAIL_FROM`, `RESEND_API_KEY` et le stockage objet dans l'environnement de production.
2. Vérifier que PostgreSQL est disponible à l'hôte et port indiqués par `DATABASE_URL`, puis exécuter `npx prisma migrate deploy` pendant le déploiement.
3. Contrôler le résultat avec `npx prisma migrate status`, construire avec `npm run build`, puis démarrer avec `npm run start`.
4. Utiliser HTTPS afin que le cookie de session soit envoyé avec l'attribut `Secure`.

## Marque et stockage objet

Les logos sont validés par contenu (PNG, JPEG ou WebP, 2 Mo maximum), puis enregistrés par clé uniquement dans PostgreSQL. En local, utiliser `STORAGE_DRIVER=local` et éventuellement `LOCAL_STORAGE_DIR` ; les objets sont conservés hors du dépôt dans `.local-storage/`. En production, utiliser `STORAGE_DRIVER=s3` avec `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` et `S3_SECRET_ACCESS_KEY` pour un stockage S3-compatible tel que Cloudflare R2, AWS S3 ou Supabase Storage. Ne jamais committer ces secrets. SVG est volontairement refusé faute de sanitisation sûre.

Ne pas lancer `prisma db push` en production : les migrations SQL versionnées dans `prisma/migrations` constituent la procédure de schéma.

## Email et portail employé

`RESEND_API_KEY` est requis pour envoyer les invitations en production; si le fournisseur échoue, l’invitation reste conservée avec un statut `FAILED` et les responsables reçoivent une notification interne. Les URLs d’invitation utilisent `APP_URL` et HTTPS en production. Le stockage des avatars et des pièces jointes utilise le même driver objet que les logos; il doit donc être configuré avant d’activer ces uploads.
