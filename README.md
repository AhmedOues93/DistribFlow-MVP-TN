# DistribFlow

Plateforme multi-tenant de gestion commerciale pour grossistes tunisiens. L'interface est en français, les montants sont en TND et les règles métier gardent le tenant comme frontière de sécurité.

## Démarrage local

1. Copiez `.env.example` vers `.env`.
2. Lancez `docker compose up -d db`, attendez que PostgreSQL écoute sur le port `5432`, puis exécutez `npx prisma migrate deploy`.
3. Lancez `npm run dev`.

Les services applicatifs effectuent les contrôles de rôle, de tenant et de validation Zod côté serveur. Les requêtes métier utilisent le cookie de session HttpOnly et récupèrent le tenant depuis le membership serveur : l'API n'accepte pas de tenant ou rôle transmis par le client.

## Routes applicatives

Après inscription ou connexion, l’application utilise le shell authentifié. Les routes disponibles sont `/dashboard`, `/clients`, `/catalogue/produits`, `/catalogue/categories`, `/catalogue/unites`, `/entrepots`, `/stock`, `/stock/mouvements`, `/stock/transferts`, `/stock/alertes`, `/parametres/profil`, `/equipe`, `/equipe/invitations`, `/equipe/[membershipId]` et `/espace-employe`. Les invitations sont acceptées sur `/invitation/[token]`.

Les clients, catégories, unités, produits et entrepôts sont recherchables, archivables et restaurables dans leur entreprise. Les produits, mouvements et niveaux de stock sont exclusivement lus depuis PostgreSQL.

## Imports CSV

Les imports clients et produits se font depuis `/clients` et `/catalogue/produits` : téléchargez le modèle, sélectionnez un fichier CSV UTF-8, contrôlez l’aperçu puis confirmez. L’aperçu n’écrit aucune donnée. Les fichiers acceptent les séparateurs `;` et `,`, les fins de lignes LF/CRLF et les valeurs entre guillemets. La limite est de 512 Ko et 1 000 lignes.

- Clients : `nom;telephone;whatsapp;matricule_fiscal;limite_credit;delai_paiement`
- Produits : `sku;code_barres;nom;description;categorie;unite;prix_achat;prix_vente;tva;stock_minimum`

Chaque ligne est validée, les doublons du fichier et de l’entreprise sont refusés, et les produits résolvent catégorie et unité actives uniquement dans le tenant connecté. L’import est à succès partiel : les lignes valides sont créées et les autres sont signalées sans écrasement. Une confirmation répétée ne recrée pas les lignes grâce aux contraintes d’unicité. Le rapport d’erreurs CSV neutralise les formules tableur.

## Base de données

Les migrations versionnées sont la seule procédure de création ou d'évolution du schéma. Sur une nouvelle base, exécutez `npx prisma migrate deploy`, `npx prisma generate`, puis `npm run db:seed`. Vérifiez ensuite l'état avec `npx prisma migrate status`.

Pour vérifier le flux Phase 3 contre PostgreSQL : `npm run db:smoke`. Le smoke crée des commandes de test dans le tenant de démonstration et vérifie les lignes, la numérotation, l’idempotence, les réservations, la consommation physique, l’audit, la duplication et l’annulation.

## Feuille de route

## Commandes et préparation

La Phase 3 ajoute `/commandes`, `/commandes/nouvelle`, `/commandes/[orderId]`, `/commandes/[orderId]/modifier`, `/preparation` et `/preparation/[orderId]`. Le cycle géré est `DRAFT` (Brouillon) → `CONFIRMED` (Confirmée) → `IN_PREPARATION` (En préparation) → `PREPARED` (Préparée) → `READY_FOR_DELIVERY` (Prête à livrer). `READY_FOR_DELIVERY` est l’état de sortie du poste de préparation ; les états livraison/retour du modèle restent réservés à une phase ultérieure. L’annulation est autorisée depuis brouillon ou confirmation, exige un motif et libère les réservations.

Les numéros sont générés côté serveur au format `CMD-AAAA-000001` au moyen d’un compteur atomique par tenant et transaction. Les montants sont calculés avec `Prisma.Decimal` (jamais avec des flottants JavaScript) et arrondis au millième TND avec l’arrondi demi supérieur côté serveur. Les prix, taxes, SKU, unité et description sont figés dans les lignes ; modifier un produit ne modifie donc pas une commande existante.

La source est `MANUAL` (Manuelle) ou `WHATSAPP` (WhatsApp). La confirmation réserve le stock physique disponible de l’entrepôt sélectionné ; les brouillons ne réservent rien. L’écran de saisie affiche physique, réservé et disponible. La préparation consomme progressivement les réservations à travers des mouvements `SALE` immuables, uniquement pour le delta préparé. Les sorties de stock ordinaires ne peuvent pas utiliser une quantité réservée. Les modifications concurrentes utilisent `version` et les transitions acceptent une clé d’idempotence.

La liste des commandes conserve recherche, statut, entrepôt, dates et page dans l’URL. Le détail expose le cycle de vie et les événements d’audit avec acteur et date, propose une impression du résumé, une duplication vers un nouveau brouillon et un lien `https://wa.me` validé après confirmation explicite. Les motifs d’annulation sont obligatoires ; les changements non enregistrés sont signalés avant fermeture ou navigation interne.

## Système d’interface et contrôle manuel

Le shell authentifié, les écrans métier, les formulaires, tables, dialogues, états vides et erreurs partagent le système de tokens centralisé dans `src/app/globals.css`. La palette de production est bleu nuit, bleu royal, bleu électrique et cyan discret, avec des panneaux bleu-gris, des ombres légères et une navigation mobile accessible. La connexion et l’inscription utilisent l’illustration logistique `public/distribflow-logistics.png` sans modifier le mécanisme de session.

Le contrôle manuel couvre chaque route métier aux largeurs mobile (390 px), tablette et bureau : navigation, recherche, filtres, pagination, formulaires, confirmations, impression, chargements, résultats vides et erreurs serveur. Les données du tableau de bord proviennent exclusivement de PostgreSQL et restent filtrées par tenant et permissions ; aucune statistique métier n’est simulée. Les transitions respectent `prefers-reduced-motion` et les actions principales gardent une cible tactile d’au moins 44 px.

## Équipe et configuration de démarrage

Les routes `/equipe`, `/equipe/invitations`, `/equipe/[membershipId]`, `/invitation/[token]` et `/espace-employe` couvrent les statuts `INVITED`, `ACTIVE`, `SUSPENDED`, `ARCHIVED`. Les rôles employés sont `ADMIN`, `SALES`, `WAREHOUSE`, `DRIVER` et `READ_ONLY`; les anciens rôles restent compatibles pour les tenants existants. Le dernier propriétaire actif ne peut pas être suspendu, archivé ou rétrogradé.

Une invitation utilise un token aléatoire à usage unique dont seul le hash SHA-256 est conservé, avec expiration, révocation, audit et prévention des doublons. En développement sans `EMAIL_WEBHOOK_URL`, l’interface affiche le lien à titre de contrôle ; en production, il est transmis uniquement à l’adaptateur email configuré. `/inscription` reste exclusivement l’inscription du propriétaire et les employés utilisent ensuite `/connexion`.

Chaque nouvelle entreprise reçoit dans la transaction d’inscription les unités `PCE`, `CTN`, `PACK`, `KG`, `G`, `L`, `ML`, `M`, `PAL`, les catégories tunisiennes standard et `Dépôt principal`. Le bouton propriétaire des paramètres installe seulement les éléments manquants. Cette installation est idempotente et ne crée aucun client, produit, stock ou commande fictif. Le jeu de démonstration est limité à `npm run db:seed`.

## Feuille de route

La Phase 4 couvrira une application web/PWA terrain, mobile-first et hors-ligne pour commerciaux, magasiniers et livreurs, avec écrans par rôle et synchronisation sécurisée. La Phase 5 couvrira la synchronisation hors-ligne, les tournées, preuves de livraison, encaissements et retours.
