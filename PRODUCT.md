# Product

## Register

product

## Platform

web

## Users

Les utilisateurs principaux sont les agents et superviseurs des institutions de microfinance et des banques rattachées à la plateforme : ils saisissent les opérations inter-institutionnelles, les valident à plusieurs niveaux (avec code PIN), consultent l'historique et suivent la facturation de leur établissement au quotidien. C'est l'usage le plus fréquent de l'interface.

Un public secondaire clair existe : les administrateurs centraux, qui supervisent l'ensemble des institutions (catalogue, activation/désactivation), gèrent la facturation groupée, les rapports consolidés et l'administration transverse (utilisateurs, rôles, permissions). Leurs écrans ont une vocation de supervision globale plutôt que de saisie quotidienne, et méritent une densité d'information différente (vues agrégées, filtres multicritères, exports).

## Product Purpose

MicroLinks centralise, standardise et facture les opérations échangées entre institutions de microfinance et banques, historiquement traitées par des canaux hétérogènes (SFTP, e-mail, fichiers plats) sans traçabilité unifiée. La plateforme fournit un point d'entrée unique pour saisir, valider et suivre le cycle de vie complet d'une opération, avec un journal d'événements immuable et une facturation automatique basée sur des tarifs configurables. Le succès se mesure à la confiance que les institutions accordent au système pour tracer chaque opération sans ambiguïté, du dépôt initial jusqu'à la facturation.

## Positioning

Le SWIFT des microfinances : un point d'entrée unique, tracé et fiable pour les opérations inter-institutionnelles en Afrique de l'Ouest et au-delà, reposant sur des protocoles ouverts (REST, OpenID Connect, AMQP).

## Brand Personality

Rigoureux, sobre, digne de confiance. Le ton doit rappeler les outils bancaires professionnels (proche d'un core-banking ou d'un dashboard Stripe) : dense, précis, sans fioriture. La confiance se construit par la clarté et la cohérence, pas par la décoration — chaque écran doit rassurer un utilisateur qui manipule des opérations financières sensibles.

## Anti-references

Éviter tout ce qui évoque un « SaaS startup coloré » générique : gradients décoratifs, glassmorphism gratuit, cartes identiques empilées, badges et icônes surdimensionnés. La sécurité (2FA, PIN, chiffrement, traçabilité blockchain) doit se lire dans la rigueur de l'interface elle-même, jamais comme un argument marketing plaqué dessus.

## Design Principles

- La confiance se gagne par la rigueur visible : hiérarchie claire, données lisibles, aucun raccourci esthétique qui masquerait une information financière.
- Deux publics, deux densités : les écrans agents (saisie/validation quotidienne) restent orientés tâche ; les écrans administrateurs (supervision, facturation centrale) assument une densité d'information plus élevée.
- La sécurité fait partie du parcours, pas un obstacle : les étapes de validation PIN et 2FA doivent être intégrées avec le même soin que le reste du flux, sans friction inutile.
- Cohérence stricte des composants sur tous les écrans (tables, modales, badges de statut, formulaires) : un agent qui change de module ne doit jamais réapprendre l'interface.
- Chaque écran renforce la promesse de traçabilité : statuts d'opération, horodatage, chaîne de hachage doivent toujours être visibles et compréhensibles, jamais enfouis.

## Accessibility & Inclusion

Conformité WCAG 2.1 niveau AA : contrastes de texte suffisants (y compris sur les badges de statut et texte placeholder), navigation clavier complète sur les tableaux et modales, support des lecteurs d'écran sur les formulaires multi-étapes et les notifications toast.
