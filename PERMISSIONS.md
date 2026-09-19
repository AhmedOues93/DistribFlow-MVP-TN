# Permissions

| Rôle | Clients / import clients | Catalogue / import produits | Entrepôts et stock |
|---|---|---|---|
| Owner | Lecture et écriture | Lecture et écriture | Lecture et écriture |
| Sales Agent | Lecture et écriture | Aucun accès | Aucun accès |
| Warehouse Manager | Aucun accès | Lecture et écriture | Lecture et écriture |
| Accountant | Lecture seule | Aucun accès | Aucun accès |
| Viewer | Lecture seule | Lecture seule | Lecture seule |
| Driver | Aucun accès | Aucun accès | Aucun accès |

Les contrôles sont appliqués dans le service et non uniquement dans l'interface. Le tenant, le rôle et l'utilisateur sont déduits de la session serveur ; aucun client ne fournit son `tenantId`, son rôle ou son `userId`.

| Rôle | Commandes | Préparation |
|---|---|---|
| Owner / Platform Admin | Lecture, création/édition de brouillons, confirmation, annulation, duplication, message WhatsApp | Lecture, démarrage, quantités, préparation et disponibilité |
| Sales Agent | Lecture, création/édition de brouillons, confirmation, annulation, duplication, message WhatsApp | Lecture uniquement |
| Warehouse Manager | Lecture uniquement | Lecture, démarrage, quantités, préparation et disponibilité |
| Accountant / Viewer | Lecture uniquement | Lecture uniquement |
| Driver | Aucun accès | Aucun accès |

Les contrôles d’interface masquent les mutations incompatibles, mais chaque service les réévalue côté serveur. Les routes de lecture de la file de préparation restent tenant-scoped ; les routes de démarrage et d’enregistrement exigent `orders:prepare`.

La recherche globale est disponible uniquement pour les ressources lisibles par le rôle courant : clients, produits et commandes sont interrogés séparément avec le tenant actif. Les résultats clients et produits renvoient vers leurs listes filtrées par `q`; les commandes ouvrent leur détail tenant-scoped.

## Équipe

| Rôle | Gestion de l’équipe | Accès opérationnel |
|---|---|---|
| Owner | Inviter, renvoyer, révoquer, modifier, suspendre, réactiver, archiver | Accès complet |
| Admin | Inviter, renvoyer, révoquer, modifier les employés, suspendre, réactiver, archiver | Accès opérationnel selon permissions |

## Portail employé et communication

| Fonction | Contrôle serveur |
|---|---|
| Connexion worker | Membership `ACTIVE`, entreprise active et rôle opérationnel; OWNER/ADMIN restent sur le shell administrateur |
| Profil personnel | L’utilisateur ne peut modifier que son propre profil, avatar, mot de passe et sessions |
| Entreprise | OWNER/ADMIN/PLATFORM_ADMIN uniquement; toutes les données sont limitées au tenant actif |
| Conversations | Participant actif du même tenant; aucun accès par simple identifiant de conversation |
| Pièces jointes | Participant actif, clé de stockage validée, MIME détecté par octets et limite 10 Mo |
| Notifications | Destinataire exact et tenant exact; lecture idempotente et déduplication serveur |
| Sales | Aucun accès équipe | Clients et commandes |
| Warehouse | Aucun accès équipe | Stock et préparation |
| Driver | Aucun accès équipe | Aucun module livraison jusqu’à la phase dédiée |
| Read only | Aucun accès équipe | Lectures autorisées uniquement |

ADMIN ne peut pas modifier un OWNER ni promouvoir un membre au rôle OWNER. Le dernier OWNER actif ne peut pas être suspendu, archivé ou rétrogradé. Les anciens rôles `SALES_AGENT`, `WAREHOUSE_MANAGER`, `VIEWER` et `ACCOUNTANT` restent compatibles avec les permissions historiques.

La configuration d’entreprise (`/parametres/entreprise`) est réservée à OWNER et ADMIN. La lecture de logo est contrôlée par session et son écriture, remplacement ou retrait est refusé aux autres rôles.
