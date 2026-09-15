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
