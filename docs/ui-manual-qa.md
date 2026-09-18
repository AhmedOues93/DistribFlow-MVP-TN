# Contrôle UI/UX Phase 3

## Périmètre

Le shell, l’authentification, le tableau de bord et les écrans métier utilisent les mêmes tokens et composants visuels. Le contrôle manuel ne remplace pas les tests automatisés et n’ajoute pas d’infrastructure E2E.

## Matrice de contrôle

Tester les routes suivantes sur 390 px, 768 px et une largeur bureau :

- `/connexion`, `/inscription`, `/dashboard`
- `/clients`, `/catalogue/produits`, `/catalogue/categories`, `/catalogue/unites`
- `/entrepots`, `/stock`, `/stock/mouvements`, `/stock/alertes`, `/stock/transferts`
- `/commandes`, `/commandes/nouvelle`, `/commandes/[orderId]`, `/commandes/[orderId]/modifier`
- `/preparation`, `/preparation/[orderId]`, `/parametres/profil` et la page 404
- `/equipe`, `/equipe/invitations`, `/equipe/[membershipId]`, `/invitation/[token]`, `/espace-employe`

Vérifier pour chaque écran :

- navigation mobile ouvrable/fermable, focus visible et absence de débordement horizontal ;
- actions principales accessibles au clavier et zones tactiles d’au moins 44 px ;
- chargement, résultat vide, validation et erreur serveur lisibles en français ;
- recherche, filtres et pagination conservés dans l’URL quand la route le prévoit ;
- dialogues de confirmation, avertissement des modifications non enregistrées et impression du résumé de commande ;
- visibilité des actions conforme au rôle et aux données du tenant connecté.

Pour l’équipe, vérifier l’invitation, l’activation, le renvoi, la révocation, les changements de rôle, la suspension, la réactivation, l’archivage, la règle du dernier propriétaire et le sélecteur multi-entreprises. Les pages publiques d’invitation doivent afficher un état de chargement, une erreur d’invitation invalide/expirée et une confirmation d’activation.

## Cycle de vie affiché

`DRAFT` → `CONFIRMED` → `IN_PREPARATION` → `PREPARED` → `READY_FOR_DELIVERY`.

L’interface présente `READY_FOR_DELIVERY` comme « Prête à livrer », c’est la sortie du poste de préparation. Les états livraison et retour présents dans le modèle sont réservés au périmètre ultérieur et ne sont pas présentés comme des actions Phase 3.
