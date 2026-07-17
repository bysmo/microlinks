# MicroLinks

> Plateforme de centralisation et de gestion des opérations inter-microfinances et bancaires.

MicroLinks est une architecture microservices conçue pour orchestrer, tracer et facturer les opérations échangées entre institutions de microfinance (IMF) et banques. Elle fournit un point d'entrée unique pour les agents, superviseurs et administrateurs, avec une authentification fédérée (Keycloak), un bus d'événements (RabbitMQ) et des rapports consolidés en temps réel.

---

## Sommaire

- [Vision & objectifs](#vision--objectifs)
- [Fonctionnalités clés](#fonctionnalités-clés)
- [Architecture](#architecture)
  - [Vue d'ensemble](#vue-densemble)
  - [Microservices backend](#microservices-backend)
  - [Infrastructure](#infrastructure)
  - [Frontend](#frontend)
- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [Documentation API](#documentation-api)
- [Modèles de données](#modèles-de-données)
- [Sécurité & authentification](#sécurité--authentification)
- [Observabilité](#observabilité)
- [Structure du dépôt](#structure-du-dépôt)
- [Développement](#développement)
- [Tests](#tests)
- [Roadmap](#roadmap)
- [Licence](#licence)

---

## Vision & objectifs

Dans les pays où coexistent de nombreuses microfinances et plusieurs banques, les opérations inter-institutionnelles (transferts, compensations, remboursements, paiements de fournisseurs) sont historiquement traitées par des canaux hétérogènes (SFTP, e-mail, fichiers plats), sans traçabilité unifiée ni facturation consolidée.

**MicroLinks répond à trois enjeux :**

1. **Centraliser** la saisie et le suivi des opérations multi-parties à travers une API et un portail uniques.
2. **Standardiser** le cycle de vie d'une opération : création → validation → complétion / rejet, avec un journal d'événements immuable.
3. **Facturer** automatiquement les services utilisés par chaque institution, sur la base de tarifs configurables.

L'objectif à terme est de devenir le « SWIFT des microfinances » en Afrique de l'Ouest et au-delà, en s'appuyant sur des protocoles ouverts (REST, OpenID Connect, AMQP).

---

## Fonctionnalités clés

### Pour les institutions
- **Enrôlement KYC** : création d'institutions, agences, comptes et rattachement à une zone monétaire.
- **Gestion des opérations** : saisie, validation à plusieurs niveaux, consultation de l'historique, détail complet d'une opération.
- **Opérations du jour** : tableau de bord temps réel des opérations en cours de traitement.
- **Mon établissement** : fiche institutionnelle, paramètres, utilisateurs rattachés.
- **Mes factures** : suivi de la facturation propre à l'institution.

### Pour les administrateurs
- **Catalogue d'institutions** : supervision globale, activation/désactivation, recherche multicritère.
- **Facturation centrale** : gestion des tarifs, facturation groupée, exports comptables.
- **Rapports & exports** : génération de rapports consolidés, exports CSV/Excel/PDF.
- **Administration** : gestion des utilisateurs, rôles, permissions et paramètres transverses.

### Transverses
- Authentification unique via **Keycloak** (OpenID Connect, JWT).
- Notifications multi-canal (e-mail + WebSocket temps réel) à chaque étape du cycle de vie.
- Mécanismes de résilience : **Circuit Breaker** (Resilience4j) par service côté gateway.
- Cache applicatif via **Redis**.
- Configuration centralisée (Spring Cloud Config Server) — un seul endroit pour faire évoluer les paramètres de tous les services.

---

## Architecture

### Vue d'ensemble

```
                                  ┌──────────────────────┐
                                  │   Frontend (React)   │
                                  │   Nginx + Vite (3000)│
                                  └──────────┬───────────┘
                                             │ HTTPS
                                  ┌──────────▼───────────┐
                                  │   API Gateway (8080) │
                                  │  Spring Cloud GW     │
                                  │  • Routing           │
                                  │  • JWT validation    │
                                  │  • Circuit Breaker   │
                                  │  • CORS              │
                                  └──────────┬───────────┘
                                             │
        ┌──────────────┬──────────────┬──────┴───────┬────────────────┐
        │              │              │              │                │
   ┌────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐  ┌──────▼──────┐
   │institution│  │ operation │  │ rapport   │  │notification│  │  billing    │
   │  (8082)   │  │  (8083)   │  │  (8084)   │  │  (8085)    │  │   (8086)    │
   └────┬──────┘  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘  └──────┬──────┘
        │               │              │              │                │
        └───────────────┴──────┬───────┴──────────────┴────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼─────┐         ┌──────▼──────┐        ┌──────▼──────┐
   │ Postgres │         │  RabbitMQ   │        │   Redis     │
   │  (×5 DB) │         │  events bus │        │   cache     │
   └──────────┘         └─────────────┘        └─────────────┘

   ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐
   │ discovery-service│  │ config-service │  │    Keycloak      │
   │   Eureka 8761    │  │   Config 8888  │  │   OAuth2/OIDC    │
   └──────────────────┘  └────────────────┘  └──────────────────┘
```

### Microservices backend

| Service              | Port | Base de données        | Rôle                                                                                  |
|----------------------|------|------------------------|---------------------------------------------------------------------------------------|
| `institution-service`| 8082 | `institution_db`       | Référentiel des institutions, agences, comptes, zones monétaires, KYC.               |
| `operation-service`  | 8083 | `operation_db`         | Cœur métier : cycle de vie des opérations inter-institutionnelles, publication d'événements AMQP. |
| `rapport-service`    | 8084 | `rapport_db`           | Génération de rapports consolidés et exports (CSV/Excel/PDF).                        |
| `notification-service` | 8085 | `notification_db`   | Notifications (e-mail + WebSocket STOMP) à partir des événements RabbitMQ.            |
| `billing-service`    | 8086 | `billing_db`           | Tarification, facturation périodique, service-to-service auth (client_credentials).   |

### Infrastructure

| Service              | Port | Rôle                                                                                  |
|----------------------|------|---------------------------------------------------------------------------------------|
| `discovery-service`  | 8761 | Eureka — annuaire de services, health checks.                                        |
| `config-service`     | 8888 | Spring Cloud Config (profil `native`) — centralise `application.yml` de chaque service.|
| `api-gateway`        | 8080 | Point d'entrée unique, validation JWT, routing, CORS, Circuit Breaker.                |
| `keycloak`           | 8443 | Fournisseur d'identité (OAuth2/OIDC), realm `microlinks`, importé au démarrage.      |
| `postgres`           | 5432 | 5 instances PostgreSQL 16, une par service métier.                                    |
| `redis`              | 6379 | Cache et sessions éphémères.                                                          |
| `rabbitmq`           | 5672 / 15672 | Bus d'événements asynchrone + UI d'administration.                          |
| `adminer`            | 8089 | Interface web d'administration des bases PostgreSQL (dev).                            |

### Frontend

SPA React 18 servie par Nginx :

- **Vite 5** + **React Router 6** + **TailwindCSS 3**
- **Keycloak JS** pour l'authentification OIDC (PKCE)
- **Axios** pour les appels API (intercepteurs JWT)
- **Recharts** pour les tableaux de bord
- **STOMP/SockJS** pour les notifications temps réel
- **React Hook Form** pour les formulaires
- **React Hot Toast** pour les notifications UI

Pages principales :
- `/dashboard` — vue d'ensemble
- `/operations` — liste filtrable de toutes les opérations
- `/operations/:id` — détail d'une opération
- `/operations/du-jour` — opérations du jour (temps réel)
- `/institutions` — catalogue (admin)
- `/mon-etablissement` — fiche de l'institution courante
- `/facturation` — administration des tarifs et factures
- `/mes-factures` — factures de l'institution connectée
- `/rapports` — rapports & exports
- `/administration` — administration transverse

---

## Stack technique

**Backend**
- Java 17, Spring Boot 3.x
- Spring Cloud (Gateway, Config, Netflix Eureka, OpenFeign, LoadBalancer)
- Spring Security + OAuth2 Resource Server (JWT)
- Spring Data JPA / Hibernate, Liquibase
- Spring AMQP (RabbitMQ), Spring Data Redis
- SpringDoc OpenAPI (Swagger UI)
- Resilience4j (Circuit Breaker)
- Lombok, MapStruct

**Frontend**
- React 18, Vite 5, JavaScript (JSX)
- TailwindCSS 3, Lucide Icons
- Keycloak JS, Axios, Recharts, STOMP/SockJS

**Infrastructure**
- PostgreSQL 16, Redis 7, RabbitMQ 3.13
- Keycloak 24
- Docker, Docker Compose
- Nginx (reverse proxy front + load balancing)

---

## Prérequis

- **Docker** 24+ et **Docker Compose** v2
- **Java 17+** et **Maven 3.9+** (uniquement pour build hors Docker)
- **Node.js 20+** et **npm 10+** (uniquement pour dev front hors Docker)
- Au moins **8 Go de RAM** disponibles (5 instances Postgres + services Java)
- Ports libres : `3000`, `8080`, `8089`, `8443`, `8761`, `8888`, `15672`

---

## Démarrage rapide

```bash
# 1. Cloner le dépôt
git clone <url-du-repo> microlinks
cd microlinks

# 2. Préparer l'environnement
cp .env.example .env
# Éditer .env pour ajuster les secrets (surtout en production)

# 3. Lancer la stack complète
docker compose up -d --build

# 4. Suivre le démarrage
docker compose logs -f discovery-service config-service api-gateway
```

Une fois tous les services `healthy` :

| Accès                       | URL                                       |
|----------------------------|-------------------------------------------|
| Frontend                   | http://localhost:3000                     |
| API Gateway (Swagger hub) | http://localhost:8080                     |
| Eureka (services status)  | http://localhost:8761                     |
| Config Server             | http://localhost:8888                     |
| Keycloak Admin Console     | http://localhost:8443 (admin / `KEYCLOAK_ADMIN_PASSWORD`) |
| RabbitMQ UI                | http://localhost:15672 (`RABBITMQ_USER` / `RABBITMQ_PASSWORD`) |
| Adminer (BDD)              | http://localhost:8089                     |

**Comptes par défaut (realm `microlinks`)** — à changer impérativement en production :
- `admin` / `admin` (administrateur global)
- D'autres comptes de démonstration sont définis dans `infrastructure/keycloak/realm-microlinks.json`

> ⏱️ Le premier démarrage prend 5–10 minutes : téléchargement des images Maven, build des 5 services Spring Boot, initialisation des 5 bases PostgreSQL et import du realm Keycloak.

---

## Configuration

Toute la configuration passe par des variables d'environnement (cf. `.env.example`).

**Catégories :**
- `POSTGRES_*` — identifiants des 5 bases PostgreSQL
- `KEYCLOAK_*` — URL, realm, client, secret admin
- `REDIS_*` — hôte, port, mot de passe
- `RABBITMQ_*` — hôte, port, identifiants
- `MAIL_*` — configuration SMTP pour les notifications e-mail
- `VITE_*` — variables exposées au frontend lors du build Docker
- `BILLING_SA_*` — client_credentials utilisé par `billing-service` pour appeler Keycloak

Les fichiers `infrastructure/config-service/src/main/resources/config/*.yml` contiennent la configuration applicative par service (ports, pool Hikari, exchange RabbitMQ, Eureka, etc.).

---

## Documentation API

Chaque service expose sa documentation OpenAPI :

- Aggregated via Gateway : http://localhost:8080 (chaque service derrière `/api/v1/...`)
- Swagger UI par service (en local, port direct) :
  - http://localhost:8082/swagger-ui (institution)
  - http://localhost:8083/swagger-ui (operation)
  - http://localhost:8084/swagger-ui (rapport)
  - http://localhost:8085/swagger-ui (notification)
  - http://localhost:8086/swagger-ui (billing)

**Routes principales côté gateway :**

| Path                                                | Service cible         |
|-----------------------------------------------------|------------------------|
| `/api/v1/institutions/**`, `/agences/**`, `/comptes/**`, `/zones-monetaires/**` | institution-service   |
| `/api/v1/operations/**`, `/clients/**`              | operation-service     |
| `/api/v1/rapports/**`, `/exports/**`                | rapport-service       |
| `/api/v1/factures/**`, `/tarifs/**`, `/billing-settings/**`, `/institution-billing/**` | billing-service |
| `/api/v1/notifications/**`                          | notification-service  |
| `/ws/**`                                            | notification-service (WebSocket STOMP) |

---

## Modèles de données

Chaque microservice possède sa **propre base PostgreSQL** (Database-per-Service pattern) et son **propre changelog Liquibase** (`src/main/resources/db/changelog/`).

Entités cœur :

- **institution-service** : `Institution`, `Agence`, `Compte`, `ZoneMonetaire`, `UtilisateurInstitution`
- **operation-service** : `Operation`, `Client`, `Evenement` (journal d'événements immuable), `OperationTrace`
- **rapport-service** : `Rapport`, `ExportJob`, `ModeleRapport`
- **notification-service** : `Notification`, `PreferenceNotification`, `Template`
- **billing-service** : `Tarif`, `Facture`, `LigneFacture`, `Reglement`, `BillingSettings`

L'échange de données entre services ne se fait **jamais** par accès direct à la base : il passe par API REST (Feign) ou événements RabbitMQ.

**Événements RabbitMQ publiés par `operation-service` :**

- `operation.created`
- `operation.validated`
- `operation.rejected`
- `operation.completed`

Exchange : `microlinks.operations.exchange` (topic).

---

## Sécurité & authentification

- **OIDC / OAuth2** : le frontend s'authentifie auprès de Keycloak (Authorization Code + PKCE), récupère un JWT, le transmet à l'API Gateway.
- **Ressource serveur** : l'API Gateway et chaque microservice valident le JWT via la `jwk-set-uri` du realm `microlinks`.
- **Rôles et permissions** : définis dans `infrastructure/keycloak/realm-microlinks.json` (realm, clients, rôles, mappings).
- **Service-to-service** : `billing-service` utilise un client `client_credentials` dédié (`BILLING_SA_CLIENT_ID`).
- **CORS** : configuré finement dans l'API Gateway (origines, méthodes, credentials).
- **Secrets** : tous les mots de passe sont externalisés dans `.env` (jamais versionnés).

> 🔒 **Avant la mise en production** : changer **tous** les mots de passe par défaut (Postgres, Redis, RabbitMQ, Keycloak, JWT secrets), activer HTTPS, restreindre les `allowedOriginPatterns` CORS.

---

## Observabilité

- **Health checks** : endpoint `/actuator/health` exposé par chaque service et par l'API Gateway (`show-details: always`).
- **Métriques** : `/actuator/metrics` activé sur la gateway.
- **Logs** : stdout JSON-like, récupérables via `docker compose logs <service>`.
- **Eureka dashboard** : http://localhost:8761 pour voir l'état d'enregistrement de chaque instance.
- **Résilience** : Circuit Breakers Resilience4j sur les 4 routes principales de la gateway, fallback `/fallback`.

Pour aller plus loin (Prometheus, Grafana, Loki, tracing OpenTelemetry) — voir la [Roadmap](#roadmap).

---

## Structure du dépôt

```
microlinks/
├── docker-compose.yml           # Stack complète (infra + 5 services + front)
├── .env.example                 # Variables d'environnement documentées
├── README.md
│
├── infrastructure/
│   ├── discovery-service/       # Eureka (8761)
│   ├── config-service/          # Spring Cloud Config (8888)
│   │   └── src/main/resources/config/   # YAML par service
│   ├── api-gateway/             # Spring Cloud Gateway (8080)
│   ├── keycloak/
│   │   ├── realm-microlinks.json
│   │   └── themes/              # Thèmes custom Keycloak
│   └── nginx/                   # (reverse proxy externe optionnel)
│
├── backend/
│   ├── institution-service/     # 8082
│   ├── operation-service/       # 8083
│   ├── rapport-service/         # 8084
│   ├── notification-service/    # 8085
│   └── billing-service/         # 8086
│   # chacun contient :
│   #   pom.xml
│   #   Dockerfile (build multi-stage Maven → JRE)
│   #   src/main/java/com/microlinks/...
│   #   src/main/resources/
│   #     ├── application.yml
│   #     └── db/changelog/       # Liquibase
│
└── frontend/                    # React 18 + Vite
    ├── Dockerfile               # build Vite → Nginx
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── keycloak.js
        ├── context/             # AuthContext, etc.
        ├── components/          # UI + layout
        ├── pages/               # Administration, Billing, Dashboard, Institutions, Operations
        ├── services/            # api.js (Axios), ws.js (STOMP)
        └── hooks/
```

---

## Développement

### Lancer un seul service en local (hors Docker)

```bash
# Backend
cd backend/operation-service
mvn spring-boot:run \
  -Dspring-boot.run.profiles=local \
  -Dspring-boot.run.jvmArguments="-Xms256m -Xmx512m"

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Créer un `application-local.yml` (ignoré par `.gitignore`) pour pointer vers `localhost` au lieu des noms DNS Docker.

### Rebuild après modification

```bash
# Rebuild un service
docker compose up -d --build operation-service

# Voir les logs
docker compose logs -f operation-service

# Reconstruire toute la stack
docker compose up -d --build
```

### Conventions de code
- **Backend** : Java 17, packages `com.microlinks.<service>`, Lombok, builder pattern, exceptions métier typées.
- **Frontend** : composants fonctionnels, hooks, pas de class components. ESLint activé.
- **Commits** : messages en français (cf. historique), Conventional Commits encouragé.
- **Branches** : `main` (production), `feature/<nom>`, `fix/<nom>`.

---

## Tests

```bash
# Tests unitaires + intégration d'un service backend
cd backend/operation-service
mvn test

# Lint frontend
cd frontend
npm run lint
```

> Les tests d'intégration bout-en-bout (Postman/Newman, Testcontainers, Cypress) sont à enrichir — voir [Roadmap](#roadmap).

---

## Roadmap

- [ ] Messagerie SWIFT MT/MX pour intégration bancaire (en cours — `operation generee en swift mt et mx`)
- [ ] Traçabilité bout-en-bout (correlation ID, distributed tracing OpenTelemetry/Jaeger)
- [ ] Métriques Prometheus + dashboards Grafana
- [ ] Pipeline CI/CD (GitHub Actions : build, tests, push images, déploiement)
- [ ] Tests E2E Cypress sur le frontend
- [ ] Internationalisation (i18n) FR/EN
- [ ] Module de réconciliation bancaire
- [ ] Module de reporting réglementaire (BCEAO, etc.)
- [ ] Mode SaaS multi-tenant durci

---

## Licence

Propriétaire — © MicroLinks. Tous droits réservés.

Pour toute question : ouvrir une issue sur le dépôt interne ou contacter l'équipe d'architecture.
