# QA manuel — Clients

1. Inscrire une entreprise, puis vérifier la redirection vers `/clients`.
2. Créer un client avec deux adresses et sélectionner une adresse par défaut.
3. Rechercher le client par nom, téléphone et matricule fiscal.
4. Modifier ses conditions de paiement, puis actualiser la page pour confirmer la persistance.
5. Archiver puis restaurer le client en activant le filtre des archivés.
6. Avec un compte Viewer ou Accountant, vérifier que les contrôles de modification sont absents et que les routes refusent les mutations.
7. Avec une seconde entreprise, vérifier que le premier tenant ne peut ni afficher ni modifier le client du second tenant.
8. Créer deux entrepôts, enregistrer une entrée puis un transfert et confirmer que les quantités ne deviennent jamais négatives.
9. Télécharger un modèle CSV, prévisualiser un fichier avec une ligne invalide, puis confirmer un fichier valide.
