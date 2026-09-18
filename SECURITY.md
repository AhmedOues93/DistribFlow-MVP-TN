# Sécurité

Les routes de clients utilisent le cookie de session HttpOnly pour retrouver l'utilisateur, son membership actif et son tenant. Les entêtes HTTP `x-tenant-id` et `x-role` ne sont pas utilisés. Toutes les lectures et mutations recherchent le client avec son `tenantId`.

Les mutations contrôlent l'origine lorsqu'elle est fournie par le navigateur. Les entrées sont validées avec Zod, les montants sont convertis en `Prisma.Decimal`, et la création ou modification des clients gère les contraintes d'unicité téléphone/matricule fiscal par tenant.

Les mutations d’entrepôt, de stock et d’import dérivent également tenant, rôle et utilisateur de la session serveur. Les mouvements utilisent une transaction Prisma sérialisable, vérifient le stock avant une sortie et conservent une clé d’idempotence.

Les téléchargements de modèles et de rapports CSV nécessitent aussi une session et la permission d’écriture de la ressource concernée. Les écritures d’import contrôlent l’origine lorsqu’elle est présente, limitent le fichier à 512 Ko / 1 000 lignes, ne journalisent pas le contenu CSV et ne font aucune confiance à un aperçu fourni par le navigateur : elles reparsent et revalident le contenu lors de la confirmation. Les catégories, unités, SKU, codes-barres et identifiants client sont recherchés dans le tenant de session uniquement. Les rapports CSV encadrent les valeurs et préfixent les caractères de formule (`=`, `+`, `-`, `@`, tabulation et retour chariot).

Les routes de commandes et de préparation dérivent également tenant, rôle et acteur de la session. Elles contrôlent l'origine des mutations, utilisent un verrou de version pour les brouillons/préparations et des transactions sérialisables pour les numéros, réservations et transitions. Les erreurs de concurrence et de stock réservé sont retournées comme conflits français sans détail interne.

Les memberships actifs sont la seule source d’autorisation d’une session. Les memberships invités, suspendus ou archivés ne peuvent pas accéder au tenant ; le service d’équipe protège le dernier propriétaire actif contre toute suspension, archivage ou rétrogradation. OWNER et ADMIN peuvent gérer l’équipe, mais ADMIN ne peut pas modifier un OWNER ni attribuer le rôle OWNER.

Les invitations utilisent `randomBytes`, ne stockent que le hash SHA-256, expirent après sept jours, sont à usage unique et peuvent être révoquées. Les endpoints ne renvoient jamais de hash ; le lien brut est renvoyé uniquement en développement sans adaptateur email. L’acceptation et les événements invitation/membership sont transactionnels et tenant-scoped. Le changement d’entreprise met à jour uniquement une session dont le membership actif est vérifié.

La recherche globale applique les permissions de lecture et le `tenantId` dans chaque requête Prisma ; elle ne fait jamais confiance à un identifiant ou rôle envoyé par le navigateur. Les invitations construites par `src/lib/services/email.ts` utilisent `APP_URL` validé (HTTPS obligatoire en production) ou l’origine de la requête en développement, afin de ne pas exposer un port local incorrect.

Les logos sont contrôlés par contenu et limités à 2 Mo. SVG est refusé faute de sanitisation sûre. Les fichiers ne sont jamais écrits dans Git ou dans PostgreSQL : seul l’identifiant d’objet non contrôlable par l’utilisateur est stocké en base, puis résolu par l’adaptateur local ou S3-compatible après vérification du tenant et du rôle.
