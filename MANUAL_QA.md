# QA manuel — opérations et équipe

1. Inscrire une entreprise, puis vérifier la redirection vers `/dashboard` et la présence des unités, catégories et de `Dépôt principal`.
2. Créer un client avec deux adresses et sélectionner une adresse par défaut.
3. Rechercher le client par nom, téléphone et matricule fiscal.
4. Modifier ses conditions de paiement, puis actualiser la page pour confirmer la persistance.
5. Archiver puis restaurer le client en activant le filtre des archivés.
6. Avec un compte Viewer ou Accountant, vérifier que les contrôles de modification sont absents et que les routes refusent les mutations.
7. Avec une seconde entreprise, vérifier que le premier tenant ne peut ni afficher ni modifier le client du second tenant.
8. Créer deux entrepôts, enregistrer une entrée puis un transfert et confirmer que les quantités ne deviennent jamais négatives.
9. Dans `/clients`, télécharger le modèle CSV, déposer un fichier UTF-8 avec une ligne invalide, vérifier l’aperçu, télécharger le rapport puis confirmer les seules lignes valides. Reconfirmer le même fichier : aucune ligne ne doit être dupliquée.
10. Dans `/catalogue/categories` et `/catalogue/unites`, créer les références actives. Dans `/catalogue/produits`, importer un produit qui les utilise, confirmer qu’elles sont visibles dans la liste, puis vérifier qu’une catégorie ou unité référencée ne peut pas être archivée.
11. Créer une entrée, sortie, correction et transfert dans `/stock`; vérifier les confirmations, l’historique, les alertes de seuil et le refus d’un stock négatif.
12. Se déconnecter, vérifier que les routes protégées redirigent vers `/connexion`, puis se reconnecter et vérifier la persistance.
13. Dans `/commandes/nouvelle`, créer un brouillon avec un client, un entrepôt et plusieurs produits. Vérifier que les prix et totaux affichés au détail sont calculés côté serveur.
14. Confirmer la commande, vérifier la diminution du stock disponible mais pas du stock physique, puis annuler une autre commande confirmée et vérifier la libération.
15. Dans `/preparation`, démarrer une commande, enregistrer une préparation partielle, puis compléter les quantités. Vérifier les mouvements, l’historique et le refus d’une sur-préparation.
16. Marquer la commande préparée puis prête à livrer. Vérifier que les actions non compatibles disparaissent et que les rôles Sales/Viewer ne peuvent pas préparer.
17. Modifier un brouillon via `/commandes/[orderId]/modifier` : ajouter, modifier puis retirer une ligne, vérifier le recalcul serveur et l’avertissement en quittant avec des changements non enregistrés.
18. Dupliquer une commande confirmée, vérifier qu’un nouveau numéro tenant-scoped et un brouillon indépendant sont créés. Vérifier qu’une annulation sans motif est refusée puis qu’un motif est conservé dans le détail et l’audit.
19. Utiliser recherche, statut, entrepôt, dates et pagination de `/commandes`; actualiser puis partager l’URL et vérifier que les filtres sont restaurés. Imprimer le détail et vérifier le résumé sans shell ni actions.
20. Créer une commande avec la source WhatsApp, confirmer puis utiliser « Message WhatsApp » : vérifier les deux confirmations et l’ouverture d’un lien `wa.me` encodé, sans possibilité de fournir une URL arbitraire.
21. Vérifier les états de chargement, liste vide, références absentes, validation de quantité/remise, conflit de version, stock insuffisant et erreur serveur sur les écrans commandes et préparation.

## Équipe et onboarding

22. Inscrire une nouvelle entreprise : vérifier les unités, catégories et `Dépôt principal`, puis confirmer qu’aucun client, produit, stock ou commande n’est créé automatiquement.
23. Dans `/parametres/profil`, prévisualiser puis installer les données de démarrage. Répéter l’action et vérifier qu’aucun doublon ni écrasement n’apparaît.
24. Comme OWNER, inviter un employé dans `/equipe`, vérifier le lien de développement, l’acceptation à usage unique et la redirection de connexion selon `SALES`, `WAREHOUSE`, `DRIVER` ou `READ_ONLY`.
25. Vérifier dans `/equipe/invitations` le renvoi et la révocation. Vérifier qu’un email déjà membre ou une invitation active est refusé.
26. Avec deux propriétaires, suspendre ou rétrograder l’un ; avec un seul propriétaire, vérifier le refus de suspendre, archiver ou rétrograder le dernier.
27. Comme ADMIN, vérifier la gestion des employés mais le refus de modifier un OWNER ou d’attribuer OWNER. Vérifier qu’un membre suspendu ou archivé ne peut plus ouvrir le tenant.
28. Vérifier le sélecteur d’entreprise pour un utilisateur multi-tenant et l’absence d’accès aux données de l’entreprise non sélectionnée.

## Recherche, identité et responsive

29. Depuis le shell authentifié, rechercher au moins un client, produit et numéro de commande : vérifier le debounce, les groupes, les flèches, Entrée, Échap, le message vide et l’erreur sans fuite de tenant. Vérifier qu’un résultat client ou produit restaure le filtre `q` dans son URL.
30. Dans `/parametres/entreprise`, modifier le nom, importer un PNG/JPEG/WebP de moins de 2 Mo, vérifier l’aperçu, le logo du shell et le résumé imprimable. Vérifier le refus d’un SVG, d’un contenu dont l’extension ment et d’un fichier trop volumineux ; retirer ensuite le logo et confirmer le fallback par initiales.
31. Sur `/connexion`, `/dashboard`, `/clients`, `/catalogue/produits`, `/commandes`, `/equipe`, `/parametres/entreprise`, `/invitation/[token]` et `/espace-employe`, inspecter 1440 px, 1024 px et 390 px : drawer mobile, navigation complète scrollable, focus clavier, aucune coupure ni débordement horizontal.
32. Dans un navigateur sur le port réel de développement, inviter un employé, vérifier que le lien est un ancre cliquable sur la même origine et que « Ouvrir le lien » et « Copier le lien » donnent un retour de succès. Ouvrir le lien dans une fenêtre privée, accepter l’invitation puis se connecter avec la redirection du rôle.

## Portail employé et communication

33. Vérifier `/travailleur/connexion` avec un compte `SALES`, `WAREHOUSE`, `DRIVER` et `READ_ONLY`; confirmer le shell séparé, la redirection propre au rôle et le refus des routes administrateur.
34. Depuis `/travailleur/profil`, modifier prénom, nom, téléphone, langue, avatar et mot de passe; vérifier l’état de chargement, l’erreur serveur, le garde-fou de navigation non enregistrée et la fermeture des autres sessions.
35. Depuis `/parametres/entreprise`, modifier les champs d’identité, importer/supprimer un logo et vérifier que les rôles non autorisés voient un état lecture seule.
36. Depuis `/travailleur/messages`, créer une conversation directe, envoyer un texte et une pièce jointe autorisée, vérifier le polling, la notification destinataire, la lecture et le refus d’un fichier non autorisé.
37. Depuis `/notifications`, ouvrir une notification, tout marquer comme lu, vérifier le compteur et les états vide/chargement/erreur. Inspecter ces écrans à 390 px, 768 px et 1440 px sans débordement horizontal.
