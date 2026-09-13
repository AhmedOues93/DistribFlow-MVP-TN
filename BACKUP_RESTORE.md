# Sauvegarde et restauration

Effectuer une sauvegarde PostgreSQL régulière avec `pg_dump`, chiffrée et stockée hors de l'environnement de production. Tester la restauration dans une base isolée avec `pg_restore`, exécuter `npx prisma migrate deploy`, puis vérifier une connexion et la liste des clients d'un tenant de test.

Documenter l'heure de la dernière sauvegarde, la rétention et la personne responsable dans l'exploitation avant l'ouverture aux clients.
