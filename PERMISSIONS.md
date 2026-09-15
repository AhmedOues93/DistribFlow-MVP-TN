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
