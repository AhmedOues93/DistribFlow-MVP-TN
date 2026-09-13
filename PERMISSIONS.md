# Permissions

| Rôle | Clients |
|---|---|
| Owner | Lecture, création, modification, archivage et restauration |
| Sales Agent | Lecture, création, modification, archivage et restauration |
| Accountant | Lecture seule |
| Viewer | Lecture seule |
| Warehouse Manager | Aucun accès |
| Driver | Aucun accès |

Les contrôles sont appliqués dans le service et non uniquement dans l'interface. Le tenant est déduit de la session serveur; un client ne fournit jamais son propre `tenantId`.
