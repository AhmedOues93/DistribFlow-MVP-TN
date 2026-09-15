# Sécurité

Les routes de clients utilisent le cookie de session HttpOnly pour retrouver l'utilisateur, son membership actif et son tenant. Les entêtes HTTP `x-tenant-id` et `x-role` ne sont pas utilisés. Toutes les lectures et mutations recherchent le client avec son `tenantId`.

Les mutations contrôlent l'origine lorsqu'elle est fournie par le navigateur. Les entrées sont validées avec Zod, les montants sont convertis en `Prisma.Decimal`, et la création ou modification des clients gère les contraintes d'unicité téléphone/matricule fiscal par tenant.

Les mutations d’entrepôt, de stock et d’import dérivent également tenant, rôle et utilisateur de la session serveur. Les mouvements utilisent une transaction Prisma sérialisable, vérifient le stock avant une sortie et conservent une clé d’idempotence.
