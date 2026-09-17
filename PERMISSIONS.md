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
