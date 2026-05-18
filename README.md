# Portail Client B2B - Documentation

Portail client B2B construit avec Next.js 16, React 19, Tailwind CSS v4, Shadcn/UI, NextAuth v5, Prisma 6 et l'API REST Dolibarr v17+.

## Architecture

```text
Navigateur client
  |
  |  Session NextAuth + React Query + Zustand panier
  v
Next.js App Router
  |
  |-- src/app/(portal)              Pages privees B2B
  |-- src/app/api/dolibarr/**       BFF securise, session obligatoire
  |-- src/lib/dolibarr/**           Client Axios serveur uniquement
  |-- src/lib/prisma.ts             Prisma PostgreSQL
  |
  |  DOLAPIKEY injectee cote serveur
  v
Dolibarr REST API v17+

PostgreSQL
  |-- User / Session
  |-- ProductCache
  |-- OrderCache
```

Regle de securite principale: aucun appel Dolibarr ne part du navigateur. Les composants client appellent uniquement `/api/dolibarr/**`.

## Prerequis

- Node.js 20+
- PostgreSQL 15+
- Dolibarr v17+ avec module API active
- Une cle API Dolibarr valide

## Installation rapide

```bash
npm install
cp .env.example .env.local
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Puis ouvrir `http://localhost:3000`.

## Configuration Dolibarr

### Activer l'API REST

Dans Dolibarr, activer le module `Web services / API REST`, puis verifier que l'URL API ressemble a:

```text
https://votre-erp.com/api/index.php
```

### Creer et stocker le jeton API

Votre instance expose l'obtention de jeton via:

```text
https://azure-seahorse-800739.hostingersite.com/api/index.php/login?login=auserlogin&password=thepassword[&reset=1]
```

Le portail fournit une route serveur interne pour faire cet echange et enregistrer le jeton sur l'utilisateur connecte:

```http
POST /api/dolibarr/token
Content-Type: application/json

{
  "login": "auserlogin",
  "password": "thepassword",
  "reset": false
}
```

Le jeton recu est stocke dans `User.dolibarrApiKey`. Ensuite toutes les routes `/api/dolibarr/**` relisent ce jeton en base et l'envoient dans le header `DOLAPIKEY`.

Explorateur Dolibarr:

```text
https://azure-seahorse-800739.hostingersite.com/api/index.php/explorer
```

Swagger:

```text
https://azure-seahorse-800739.hostingersite.com/api/index.php/explorer/swagger.json?DOLAPIKEY=youruserapikey
```

### Configurer les thirdparty_id clients

Chaque utilisateur portail a un champ `thirdpartyId`. Il doit correspondre a l'identifiant du tiers Dolibarr (`socid`). Les comptes crees depuis `/register` sont initialises avec `thirdpartyId = 0`; un administrateur doit les rattacher avant acces complet aux commandes/factures.

## Variables d'environnement

| Variable | Cote | Description |
| --- | --- | --- |
| `DOLIBARR_API_URL` | Serveur | URL racine API Dolibarr, ex. `https://azure-seahorse-800739.hostingersite.com/api/index.php` |
| `DOLIBARR_API_KEY` | Serveur | Optionnel. Cle fallback serveur/admin. Les appels clients utilisent d'abord `User.dolibarrApiKey` |
| `NEXTAUTH_SECRET` | Serveur | Secret NextAuth de 32 caracteres minimum |
| `NEXTAUTH_URL` | Serveur | URL publique de l'app, ex. `http://localhost:3000` |
| `DATABASE_URL` | Serveur | Connexion PostgreSQL Prisma |
| `NEXT_PUBLIC_APP_URL` | Client | URL publique de l'app |
| `NEXT_PUBLIC_APP_NAME` | Client | Nom affiche dans l'interface |
| `NEXT_PUBLIC_ACCOUNTING_EMAIL` | Client | Email comptabilite pour les relances |

## Structure des dossiers

```text
prisma/
  schema.prisma                 Schema User, Session, ProductCache, OrderCache
  migrations/                   Migration SQL initiale

src/app/
  (auth)/login                  Connexion NextAuth credentials
  (auth)/register               Inscription portail
  (portal)/layout.tsx           Layout prive sidebar/header/panier
  (portal)/dashboard            Tableau de bord
  (portal)/store                Catalogue QuickOrder
  (portal)/orders               Commandes
  (portal)/invoices             Factures et PDF
  (portal)/reminders            Relances impayees
  (portal)/history              Historique et reachat
  api/dolibarr/**               Proxy BFF securise vers Dolibarr

src/components/
  cart/                         CartButton et CartDrawer
  dashboard/                    UI dashboard
  invoices/                     Table et badges factures
  store/                        Catalogue, filtres, cartes produits
  shared/                       Badges, prix, skeletons, headers

src/lib/
  auth.ts                       NextAuth v5
  dolibarr/                     Client Axios + modules produits/commandes/factures
  store/cart.ts                 Store panier Zustand persistant
  invoices/reminders.ts         Calculs de retard
  i18n/fr.ts                    Chaines FR centralisees
```

## Ajouter un nouveau module

1. Ajouter les fonctions Dolibarr serveur dans `src/lib/dolibarr/<module>.ts`.
2. Exposer uniquement le necessaire via `src/app/api/dolibarr/<module>/route.ts`.
3. Ajouter un hook React Query dans `src/hooks`.
4. Creer les composants metier dans `src/components/<module>`.
5. Ajouter la route dans `src/app/(portal)` et l'entree sidebar dans `src/config/portal-nav.ts`.

## Tests

```bash
npm run test
```

Tests inclus:

- `src/lib/dolibarr/products.test.ts`: fonctions produits avec client Axios mocke
- `src/lib/store/cart.test.ts`: panier Zustand
- `src/lib/invoices/reminders.test.ts`: calcul de retard facture

## Depannage

| Probleme | Cause probable | Solution |
| --- | --- | --- |
| `DOLIBARR_CONFIG_ERROR` | URL Dolibarr absente | Verifier `DOLIBARR_API_URL` |
| Redirection permanente vers `/login` | Session absente ou cookie invalide | Verifier `NEXTAUTH_SECRET` et `NEXTAUTH_URL` |
| `THIRDPARTY_NOT_LINKED` | Utilisateur non rattache a Dolibarr | Renseigner `thirdpartyId` dans PostgreSQL |
| PDF facture refuse | Facture d'un autre tiers | Verifier `socid` Dolibarr et `thirdpartyId` utilisateur |
| `prisma migrate dev` echoue | PostgreSQL inaccessible | Verifier `DATABASE_URL` et que la base existe |
| Images produit vides | Document produit absent dans Dolibarr | Ajouter une image/document produit dans Dolibarr |
| `DOLIBARR_TOKEN_MISSING` | Aucun jeton stocke pour l'utilisateur | Appeler `POST /api/dolibarr/token` ou renseigner `User.dolibarrApiKey` |

## Commandes utiles

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run lint
npm run test
npm run build
```
