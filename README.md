# DistribFlow

Plateforme multi-tenant de gestion commerciale pour grossistes tunisiens. L'interface est en français, les montants sont en TND et les règles métier gardent le tenant comme frontière de sécurité.

## Démarrage local

1. Copiez `.env.example` vers `.env`.
2. Lancez `docker compose up -d db`, attendez que PostgreSQL écoute sur le port `5432`, puis exécutez `npx prisma migrate deploy`.
3. Lancez `npm run dev`.

Les services applicatifs effectuent les contrôles de rôle, de tenant et de validation Zod côté serveur. Les requêtes métier utilisent le cookie de session HttpOnly et récupèrent le tenant depuis le membership serveur : l'API n'accepte pas de tenant ou rôle transmis par le client.

## Routes Phase 2

Après inscription ou connexion, l’application utilise le shell authentifié. Les routes disponibles sont `/dashboard`, `/clients`, `/catalogue/produits`, `/catalogue/categories`, `/catalogue/unites`, `/entrepots`, `/stock`, `/stock/mouvements`, `/stock/transferts`, `/stock/alertes` et `/parametres/profil`.

Les clients, catégories, unités, produits et entrepôts sont recherchables, archivables et restaurables dans leur entreprise. Les produits, mouvements et niveaux de stock sont exclusivement lus depuis PostgreSQL.

## Imports CSV

Les imports clients et produits se font depuis `/clients` et `/catalogue/produits` : téléchargez le modèle, sélectionnez un fichier CSV UTF-8, contrôlez l’aperçu puis confirmez. L’aperçu n’écrit aucune donnée. Les fichiers acceptent les séparateurs `;` et `,`, les fins de lignes LF/CRLF et les valeurs entre guillemets. La limite est de 512 Ko et 1 000 lignes.

- Clients : `nom;telephone;whatsapp;matricule_fiscal;limite_credit;delai_paiement`
- Produits : `sku;code_barres;nom;description;categorie;unite;prix_achat;prix_vente;tva;stock_minimum`

Chaque ligne est validée, les doublons du fichier et de l’entreprise sont refusés, et les produits résolvent catégorie et unité actives uniquement dans le tenant connecté. L’import est à succès partiel : les lignes valides sont créées et les autres sont signalées sans écrasement. Une confirmation répétée ne recrée pas les lignes grâce aux contraintes d’unicité. Le rapport d’erreurs CSV neutralise les formules tableur.

## Base de données

Les migrations versionnées sont la seule procédure de création ou d'évolution du schéma. Sur une nouvelle base, exécutez `npx prisma migrate deploy`, `npx prisma generate`, puis `npm run db:seed`. Vérifiez ensuite l'état avec `npx prisma migrate status`.

## Feuille de route

La Phase 3 couvrira les commandes et la préparation en entrepôt. La Phase 4 couvrira une application web/PWA terrain, mobile-first et hors-ligne pour commerciaux, magasiniers et livreurs, avec écrans par rôle, synchronisation sécurisée et le même backend tenant-safe.
