# QA manuel — Phase 2

1. Inscrire une entreprise, puis vérifier la redirection vers `/clients`.
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
