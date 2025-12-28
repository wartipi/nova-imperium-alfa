# Nova Imperium - Documentation API Backend

## Vue d'ensemble

Cette documentation décrit l'architecture backend de Nova Imperium, incluant les tables de base de données, les endpoints API, et les middlewares d'authentification.

---

## Architecture

### Structure des fichiers

```
server/
├── db/
│   └── indexes.ts              # Création des index de base de données
├── docs/
│   └── API_DOCUMENTATION.md    # Cette documentation
├── middleware/
│   └── auth.ts                 # Middlewares d'authentification JWT
├── routes/
│   ├── marshal.ts              # Routes du système de maréchaux
│   └── publicEvents.ts         # Routes des événements publics
├── utils/
│   ├── geospatial.ts           # Utilitaires pour requêtes géospatiales
│   └── jsonbQueries.ts         # Utilitaires pour requêtes JSONB
├── cartographyService.ts       # Service de cartographie
├── exchangeService.ts          # Service d'échange de ressources/objets
├── marketplaceService.ts       # Service du marché public
├── marshalService.ts           # Service de gestion des armées
├── messageService.ts           # Service de messagerie
├── publicEventsService.ts      # Service du journal du monde
├── treatyService.ts            # Service des traités diplomatiques
├── routes.ts                   # Configuration principale des routes
└── storage.ts                  # Interface de stockage

shared/
└── exchangeValidation.ts       # Schémas Zod pour validation des entrées
```

---

## Authentification (JWT)

### Middleware disponibles

| Middleware | Description | Usage |
|------------|-------------|-------|
| `requireAuth` | Vérifie qu'un token JWT valide est présent | Routes protégées obligatoires |
| `optionalAuth` | Extrait l'utilisateur si un token est présent | Routes avec fonctionnalités optionnelles |
| `requireRole(...roles)` | Vérifie le rôle de l'utilisateur | Routes admin/gm uniquement |
| `requireOwnership(fn)` | Vérifie que l'utilisateur possède la ressource | Modification de ressources |

### Authentification

**POST** `/api/auth/login`

```json
// Request
{
  "username": "string",
  "password": "string"
}

// Response
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "string",
    "username": "string",
    "role": "admin|player|gm"
  },
  "expiresIn": "24h"
}
```

### Utilisateurs de développement

| Username | Password | Rôle |
|----------|----------|------|
| admin | nova2025 | admin |
| joueur1 | imperium123 | player |
| maitre | pandem456 | gm |

---

## Tables de Base de Données

### Schéma principal (`shared/schema.ts`)

#### users
| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Clé primaire |
| username | TEXT | Nom d'utilisateur unique |
| password | TEXT | Mot de passe hashé |

#### armies
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| name | TEXT | Nom de l'armée |
| ownerId | TEXT | ID du propriétaire |
| units | JSONB | Array d'IDs d'unités |
| marshalId | TEXT | ID du maréchal (nullable) |
| marshalName | TEXT | Nom du maréchal |
| status | TEXT | 'idle', 'training', 'marching', 'in_battle', 'returning' |
| composition | JSONB | { infantry, cavalry, archers, siege } |
| totalStrength | INTEGER | Force totale |
| morale | REAL | Moral (0-100) |
| experience | INTEGER | Expérience accumulée |
| position | JSONB | { x, y } |
| createdAt | TIMESTAMP | Date de création |
| lastActivity | TIMESTAMP | Dernière activité |

#### marshalContracts
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| employerId | TEXT | ID de l'employeur |
| employerName | TEXT | Nom de l'employeur |
| marshalId | TEXT | ID du maréchal |
| marshalName | TEXT | Nom du maréchal |
| armyId | TEXT | ID de l'armée |
| armyName | TEXT | Nom de l'armée |
| terms | JSONB | { payment, duration, riskLevel, consequences, bonusOnVictory } |
| status | TEXT | 'proposed', 'active', 'completed', 'breached', 'cancelled' |
| createdAt | TIMESTAMP | Date de création |
| acceptedAt | TIMESTAMP | Date d'acceptation |
| expiresAt | TIMESTAMP | Date d'expiration |
| proposalMessage | TEXT | Message de proposition |

#### campaigns
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| name | TEXT | Nom de la campagne |
| organizerId | TEXT | ID de l'organisateur |
| participatingArmies | JSONB | Array d'IDs d'armées |
| status | TEXT | 'planning', 'active', 'completed', 'cancelled' |
| startDate | TIMESTAMP | Date de début |
| endDate | TIMESTAMP | Date de fin |
| rules | JSONB | Règles de la campagne |
| createdAt | TIMESTAMP | Date de création |

#### battleEvents
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| campaignId | TEXT | ID de la campagne |
| armyIds | JSONB | Array d'IDs d'armées |
| status | TEXT | 'scheduled', 'active', 'completed' |
| phase | TEXT | 'preparation', 'engagement', 'resolution' |
| result | JSONB | Résultat de la bataille |
| timestamp | TIMESTAMP | Horodatage |
| description | TEXT | Description |
| realTimeUpdates | JSONB | Mises à jour temps réel |

#### publicEvents (Journal du Monde)
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| type | TEXT | Type d'événement |
| title | TEXT | Titre |
| description | TEXT | Description |
| participants | JSONB | Array de noms |
| location | JSONB | { x, y, regionName } |
| priority | TEXT | 'low', 'medium', 'high', 'critical' |
| turn | INTEGER | Tour de jeu |
| timestamp | TIMESTAMP | Horodatage |
| isVisible | BOOLEAN | Visibilité |
| icon | TEXT | Icône |
| consequences | JSONB | Conséquences |
| relatedEvents | JSONB | Événements liés |
| metadata | JSONB | Métadonnées |

#### mapRegions
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| name | TEXT | Nom de la région |
| centerX | INTEGER | Coordonnée X du centre |
| centerY | INTEGER | Coordonnée Y du centre |
| radius | INTEGER | Rayon |
| tiles | JSONB | Array de tuiles |
| exploredBy | TEXT | ID de l'explorateur |
| explorationLevel | INTEGER | Niveau d'exploration (0-100) |
| createdAt | TIMESTAMP | Date de création |

#### mapDocuments
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| name | TEXT | Nom du document |
| regionId | TEXT | ID de la région |
| cartographer | TEXT | ID du cartographe |
| quality | TEXT | 'rough', 'detailed', 'masterwork' |
| accuracy | INTEGER | Précision (0-100) |
| hiddenSecrets | JSONB | Secrets cachés |
| tradingValue | INTEGER | Valeur marchande |
| uniqueFeatures | JSONB | Caractéristiques uniques |
| createdAt | TIMESTAMP | Date de création |
| lastUpdated | TIMESTAMP | Dernière mise à jour |
| isUnique | BOOLEAN | Unicité du document |

#### cartographyProjects
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| playerId | TEXT | ID du joueur |
| regionId | TEXT | ID de la région |
| progress | INTEGER | Progression (0-100) |
| requiredActionPoints | INTEGER | PA requis |
| spentActionPoints | INTEGER | PA dépensés |
| startedAt | TIMESTAMP | Date de début |
| estimatedCompletion | TIMESTAMP | Estimation de fin |
| tools | JSONB | Outils utilisés |
| assistants | JSONB | Assistants |

#### playerSkills
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| playerId | TEXT | ID du joueur |
| skillName | TEXT | 'leadership', 'tactics', 'strategy', 'logistics', 'treaty_knowledge' |
| level | INTEGER | Niveau (0+) |
| experience | INTEGER | Expérience |
| updatedAt | TIMESTAMP | Dernière mise à jour |

#### tradeRooms
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| participants | JSONB | Array d'IDs de joueurs |
| treatyId | TEXT | ID du traité associé |
| isActive | BOOLEAN | Statut actif |
| createdAt | TIMESTAMP | Date de création |

#### exchangeOffers
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| roomId | TEXT | ID de la salle de troc |
| fromPlayer | TEXT | ID de l'expéditeur |
| toPlayer | TEXT | ID du destinataire |
| resourcesOffered | JSONB | Ressources offertes |
| resourcesRequested | JSONB | Ressources demandées |
| itemsOffered | JSONB | Objets offerts |
| itemsRequested | JSONB | Objets demandés |
| status | TEXT | 'pending', 'accepted', 'rejected', 'expired' |
| offerType | TEXT | 'resources', 'unique_items', 'mixed' |
| message | TEXT | Message |
| createdAt | TIMESTAMP | Date de création |
| expiresAt | TIMESTAMP | Date d'expiration |

#### uniqueItems
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| name | TEXT | Nom de l'objet |
| type | TEXT | 'carte', 'objet_magique', 'artefact', 'relique', 'document', 'equipement_legendaire' |
| rarity | TEXT | 'commun', 'rare', 'epique', 'legendaire', 'mythique' |
| description | TEXT | Description |
| effects | JSONB | Effets |
| requirements | JSONB | Prérequis |
| value | INTEGER | Valeur |
| tradeable | BOOLEAN | Échangeable |
| ownerId | TEXT | ID du propriétaire |
| metadata | JSONB | Métadonnées |
| createdAt | TIMESTAMP | Date de création |

#### playerResources
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| playerId | TEXT | ID du joueur |
| resourceType | TEXT | Type de ressource |
| quantity | INTEGER | Quantité |
| updatedAt | TIMESTAMP | Dernière mise à jour |

#### treaties
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| title | TEXT | Titre du traité |
| type | TEXT | Type de traité |
| parties | JSONB | Array d'IDs de joueurs |
| terms | TEXT | Termes du traité |
| status | TEXT | 'draft', 'proposed', 'active', 'expired', 'broken' |
| createdBy | TEXT | ID du créateur |
| createdAt | TIMESTAMP | Date de création |
| expiresAt | TIMESTAMP | Date d'expiration |
| signatures | JSONB | Signatures |
| properties | JSONB | Propriétés |
| actionPointsCost | INTEGER | Coût en PA |

#### messages
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| fromPlayer | TEXT | ID de l'expéditeur |
| toPlayer | TEXT | ID du destinataire |
| content | TEXT | Contenu |
| type | TEXT | 'private', 'system', 'treaty', 'trade' |
| isRead | BOOLEAN | Lu/Non lu |
| timestamp | TIMESTAMP | Horodatage |

#### marketplaceItems
| Colonne | Type | Description |
|---------|------|-------------|
| id | TEXT | Clé primaire |
| sellerId | TEXT | ID du vendeur |
| sellerName | TEXT | Nom du vendeur |
| itemType | TEXT | 'resource', 'unique_item', 'map', 'service' |
| saleType | TEXT | 'direct_sale', 'auction' |
| status | TEXT | 'active', 'sold', 'cancelled', 'expired' |
| fixedPrice | INTEGER | Prix fixe |
| startingBid | INTEGER | Enchère de départ |
| currentBid | INTEGER | Enchère actuelle |
| highestBidderId | TEXT | ID du meilleur enchérisseur |
| highestBidderName | TEXT | Nom du meilleur enchérisseur |
| minBidIncrement | INTEGER | Incrément minimum |
| bids | JSONB | Historique des enchères |
| endTurn | INTEGER | Tour de fin d'enchère |
| resourceType | TEXT | Type de ressource |
| quantity | INTEGER | Quantité |
| uniqueItemId | TEXT | ID de l'objet unique |
| uniqueItem | JSONB | Données de l'objet unique |
| description | TEXT | Description |
| tags | JSONB | Tags |
| createdAt | TIMESTAMP | Date de création |
| soldAt | TIMESTAMP | Date de vente |
| buyerId | TEXT | ID de l'acheteur |
| buyerName | TEXT | Nom de l'acheteur |

---

## Index de Base de Données

### Index GIN (JSONB)
- `idx_trade_rooms_participants` - Recherche de salles par participant
- `idx_campaigns_participating_armies` - Recherche de campagnes par armée
- `idx_public_events_participants` - Recherche d'événements par participant
- `idx_treaties_parties` - Recherche de traités par partie

### Index B-tree
- `idx_map_regions_center_x/y` - Recherche géospatiale
- `idx_armies_owner_id` - Recherche d'armées par propriétaire
- `idx_marshal_contracts_army_id/status` - Recherche de contrats
- `idx_exchange_offers_status/from_player/to_player` - Recherche d'offres
- `idx_unique_items_owner_id` - Recherche d'objets par propriétaire
- `idx_player_resources_player_id` - Recherche de ressources par joueur
- `idx_cartography_projects_player_id` - Recherche de projets par joueur
- `idx_map_documents_cartographer` - Recherche de documents par cartographe
- `idx_public_events_turn/type` - Recherche d'événements par tour/type
- `idx_battle_events_campaign_id` - Recherche de batailles par campagne
- `idx_player_skills_player_id` - Recherche de compétences par joueur
- `idx_messages_to_player/from_player/timestamp` - Recherche de messages
- `idx_marketplace_items_status/seller_id/sale_type/created_at` - Recherche dans le marketplace
- `idx_treaties_status/created_by` - Recherche de traités

---

## Endpoints API

### Routes protégées par `requireSelfOrAdmin`

Ces routes nécessitent que l'utilisateur soit authentifié ET accède à ses propres données (ou soit admin/gm) :

| Endpoint | Description |
|----------|-------------|
| `GET /api/messages/:playerId` | Messages d'un joueur |
| `GET /api/messages/:playerId/stats` | Statistiques des messages |
| `GET /api/treaties/player/:playerId` | Traités d'un joueur |
| `GET /api/treaties/:playerId/stats` | Statistiques des traités |
| `GET /api/exchange/rooms/:playerId` | Salles de troc d'un joueur |
| `GET /api/exchange/offers/:playerId` | Offres d'échange d'un joueur |
| `GET /api/cartography/regions/:playerId` | Régions explorées par un joueur |
| `GET /api/cartography/maps/:playerId` | Documents cartographiques d'un joueur |
| `GET /api/cartography/projects/:playerId` | Projets de cartographie d'un joueur |
| `GET /api/cartography/stats/:playerId` | Statistiques de cartographie |
| `GET /api/unique-items/:playerId` | Objets uniques d'un joueur |

### Routes admin/gm uniquement (`requireRole`)

| Endpoint | Rôles | Description |
|----------|-------|-------------|
| `POST /api/marketplace/resolve-auctions` | admin, gm | Résout les enchères terminées |
| `POST /api/public-events/*` (création) | admin, gm | Création d'événements |
| `PATCH /api/public-events/:id/visibility` | admin, gm | Visibilité des événements |
| `DELETE /api/public-events/:id` | admin, gm | Suppression d'événements |

### Messages

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/messages/:playerId` | Oui* | Récupère les messages d'un joueur |
| POST | `/api/messages` | Oui | Envoie un message |
| PATCH | `/api/messages/:messageId/read` | Oui | Marque un message comme lu |
| GET | `/api/messages/:playerId/stats` | Oui* | Statistiques des messages |

*Requiert `requireSelfOrAdmin` - l'utilisateur doit accéder à ses propres données

### Traités

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/treaties/player/:playerId` | Oui* | Traités d'un joueur |
| GET | `/api/treaties/:playerId/stats` | Oui* | Statistiques des traités |
| GET | `/api/treaties/types` | Non | Types de traités disponibles |
| POST | `/api/treaties` | Oui | Crée un traité |
| PATCH | `/api/treaties/:treatyId/sign` | Oui | Signe un traité |
| PATCH | `/api/treaties/:treatyId/break` | Oui | Rompt un traité |

### Échanges

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/exchange/rooms/:playerId` | Oui* | Salles de troc d'un joueur |
| GET | `/api/exchange/offers/:playerId` | Oui* | Offres d'échange d'un joueur |
| POST | `/api/exchange/room` | Oui | Crée une salle de troc |
| DELETE | `/api/exchange/room/:roomId` | Oui | Supprime une salle de troc |
| POST | `/api/exchange/offer` | Oui | Crée une offre d'échange |
| POST | `/api/exchange/offer/unique` | Oui | Crée une offre d'objets uniques |
| POST | `/api/exchange/offer/:offerId/accept` | Oui | Accepte une offre |
| POST | `/api/exchange/offer/:offerId/reject` | Oui | Rejette une offre |
| GET | `/api/exchange/items/:playerId` | Non | Objets uniques d'un joueur |
| POST | `/api/exchange/items` | Oui | Crée un objet unique |
| GET | `/api/exchange/resources/:playerId` | Non | Ressources d'un joueur |

*Requiert `requireSelfOrAdmin`

### Objets Uniques

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/unique-items/:playerId` | Oui* | Objets uniques d'un joueur |

*Requiert `requireSelfOrAdmin`

### Cartographie

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/cartography/regions/:playerId` | Oui* | Régions explorées par un joueur |
| GET | `/api/cartography/regions/nearby` | Non | Régions proches (query: x, y, radius, limit) |
| GET | `/api/cartography/regions/area` | Non | Régions dans une zone (query: minX, maxX, minY, maxY) |
| POST | `/api/cartography/discover` | Oui | Découvre une région |
| GET | `/api/cartography/maps/:playerId` | Oui* | Documents cartographiques d'un joueur |
| GET | `/api/cartography/maps/tradable` | Non | Documents échangeables |
| GET | `/api/cartography/map/:mapId` | Non | Détails d'un document |
| GET | `/api/cartography/projects/:playerId` | Oui* | Projets d'un joueur |
| GET | `/api/cartography/stats/:playerId` | Oui* | Statistiques de cartographie |
| POST | `/api/cartography/project` | Oui | Démarre un projet |
| POST | `/api/cartography/project/:projectId/progress` | Oui | Avance un projet |
| POST | `/api/cartography/transfer` | Oui | Transfère un document |

*Requiert `requireSelfOrAdmin`

### Marketplace

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/marketplace` | Non | Liste des articles |
| GET | `/api/marketplace/:itemId` | Non | Détails d'un article |
| GET | `/api/marketplace/seller/:sellerId` | Non | Articles d'un vendeur |
| POST | `/api/marketplace/sell` | Oui | Met en vente (prix fixe) |
| POST | `/api/marketplace/auction` | Oui | Met en vente aux enchères |
| POST | `/api/marketplace/:itemId/bid` | Oui | Place une enchère |
| POST | `/api/marketplace/:itemId/buy` | Oui | Achète directement |
| DELETE | `/api/marketplace/:itemId` | Oui | Annule une vente |
| POST | `/api/marketplace/resolve-auctions` | Oui | Résout les enchères terminées |

### Système de Maréchaux

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/marshal/armies/:playerId` | Non | Armées d'un joueur |
| GET | `/api/marshal/armies/nearby` | Non | Armées proches (query: x, y, radius, limit?) |
| POST | `/api/marshal/armies` | Oui | Crée une armée |
| PUT | `/api/marshal/armies/:armyId` | Oui | Met à jour une armée |
| GET | `/api/marshal/contracts/:playerId` | Non | Contrats d'un joueur |
| POST | `/api/marshal/contracts` | Oui | Crée un contrat |
| PATCH | `/api/marshal/contracts/:contractId/accept` | Oui | Accepte un contrat |
| PATCH | `/api/marshal/contracts/:contractId/reject` | Oui | Rejette un contrat |
| GET | `/api/marshal/campaigns` | Non | Liste des campagnes actives |
| GET | `/api/marshal/battles/:campaignId` | Non | Batailles d'une campagne |
| POST | `/api/marshal/campaigns` | Oui | Crée une campagne |
| POST | `/api/marshal/campaigns/:campaignId/join` | Oui | Rejoint une campagne |
| POST | `/api/marshal/battles` | Oui | Crée une bataille |
| PATCH | `/api/marshal/battles/:battleId` | Oui | Met à jour une bataille |

### Événements Publics

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/public-events` | Non | Liste des événements |
| GET | `/api/public-events/turn/:turn` | Non | Événements d'un tour |
| GET | `/api/public-events/type/:type` | Non | Événements par type |
| GET | `/api/public-events/nearby/:x/:y/:radius` | Non | Événements proches |
| POST | `/api/public-events` | Oui | Crée un événement |
| PATCH | `/api/public-events/:eventId/visibility` | Oui | Change la visibilité |

---

## Validation des Données (Zod)

Tous les endpoints POST/PATCH utilisent des schémas Zod pour valider les données entrantes. Fichier source : `shared/exchangeValidation.ts`

### Échanges et Commerce
| Schéma | Description | Route |
|--------|-------------|-------|
| `createTradeRoomSchema` | Création de salle de troc | POST /api/exchange/room |
| `createExchangeOfferSchema` | Création d'offre d'échange | POST /api/exchange/offer |
| `uniqueItemOfferSchema` | Offre d'objets uniques | POST /api/exchange/offer/unique |
| `acceptRejectOfferSchema` | Acceptation/rejet d'offre | POST /api/exchange/offer/:offerId/accept ou /reject |

### Cartographie
| Schéma | Description | Route |
|--------|-------------|-------|
| `discoverRegionSchema` | Découverte de région | POST /api/cartography/discover |
| `startCartographyProjectSchema` | Démarrage de projet | POST /api/cartography/project |
| `progressProjectSchema` | Progression de projet | POST /api/cartography/project/:id/progress |
| `cartographyTransferSchema` | Transfert de document | POST /api/cartography/transfer |

### Messages et Traités
| Schéma | Description | Champs requis |
|--------|-------------|---------------|
| `createMessageSchema` | Envoi de message | toPlayer, content, type? |
| `createTreatySchema` | Création de traité | title, type, parties, terms |
| `signTreatySchema` | Signature de traité | treatyId |

### Objets Uniques
| Schéma | Description | Champs requis |
|--------|-------------|---------------|
| `createUniqueItemSchema` | Création d'objet unique | name, type, rarity, description |

### Marketplace
| Schéma | Description | Champs requis |
|--------|-------------|---------------|
| `marketplaceSellSchema` | Mise en vente (prix fixe) | itemType, price, resourceType/uniqueItemId |
| `marketplaceAuctionSchema` | Mise aux enchères | itemType, startingBid, minBidIncrement, endTurn |
| `marketplaceBidSchema` | Placement d'enchère | bidAmount |
| `marketplaceBuySchema` | Achat direct | - |
| `mapSellSchema` | Mise en vente de carte | itemId, price |
| `mapBuySchema` | Achat de carte | offerId |
| `resolveAuctionsSchema` | Résolution des enchères | currentTurn |

### Maréchaux (dans `server/routes/marshal.ts`)
| Schéma | Description | Champs requis |
|--------|-------------|---------------|
| `createArmySchema` | Création d'armée | name, composition |
| `createContractSchema` | Création de contrat | armyId, terms |
| `assignMarshalSchema` | Assignation de maréchal | marshalId, armyId |
| `createCampaignSchema` | Création de campagne | name, rules |
| `joinCampaignSchema` | Participation campagne | armyId |
| `createBattleEventSchema` | Création de bataille | armyIds, description |
| `updateBattleSchema` | Mise à jour bataille | phase?, status?, result? |

---

## Utilitaires

### Requêtes JSONB (`server/utils/jsonbQueries.ts`)

Fonctions réutilisables pour les requêtes sur colonnes JSONB avec l'opérateur `@>` :

```typescript
// Vérification de contenance générique
jsonbContains(column, value)                    // column @> value

// Vérification qu'un array contient un élément
jsonbContainsArray(column, arrayItem)           // column @> [item]

// Vérification qu'un objet contient des propriétés
jsonbContainsObject(column, obj)                // column @> {key: value}

// Vérification multi-valeurs (OR)
jsonbArrayHasAny(column, values)                // Retourne array de conditions

// Extraction de valeurs
jsonbExtractText(column, key)                   // column->>'key' (texte)
jsonbExtractNumber(column, key)                 // (column->>'key')::float
```

**Exemples d'utilisation :**
```typescript
// Trouver les campagnes avec une armée spécifique
const condition = jsonbContainsArray(campaigns.participatingArmies, armyId);

// Trouver les traités impliquant un joueur
const condition = jsonbContainsArray(treaties.parties, playerId);
```

### Requêtes Géospatiales (`server/utils/geospatial.ts`)

Fonctions réutilisables pour les recherches basées sur la distance avec optimisation via bounding box :

```typescript
// Condition de bounding box (pré-filtrage efficace avec index B-tree)
createBoundingBoxCondition(xColumn, yColumn, centerX, centerY, radius)

// Condition de distance exacte (Euclidienne)
createDistanceCondition(xColumn, yColumn, targetX, targetY, maxDistance)

// Condition pour colonnes JSONB avec location {x, y}
createJsonbLocationDistanceCondition(locationColumn, targetX, targetY, maxDistance)

// Requête spatiale optimisée combinée (bounding box + distance)
createOptimizedSpatialQuery(options: GeospatialQueryOptions)

// Tri par distance croissante
orderByDistanceSQL(xColumn, yColumn, targetX, targetY)

// Calcul de distance en mémoire (utilitaire)
calculateDistance(x1, y1, x2, y2)
```

**Stratégie d'optimisation :**
1. Le bounding box utilise les index B-tree pour un filtrage O(log n)
2. La condition de distance affine le résultat pour les cas circulaires
3. Combinaison des deux pour performance optimale

**Exemple d'utilisation :**
```typescript
// Trouver les régions dans un rayon de 50 unités
const results = await db.select()
  .from(mapRegions)
  .where(and(
    ...createBoundingBoxCondition(mapRegions.centerX, mapRegions.centerY, x, y, 50),
    createDistanceCondition(mapRegions.centerX, mapRegions.centerY, x, y, 50)
  ))
  .orderBy(orderByDistanceSQL(mapRegions.centerX, mapRegions.centerY, x, y));
```

### Index de Base de Données (`server/db/indexes.ts`)

```typescript
// Crée tous les index au démarrage
createDatabaseIndexes()

// Supprime tous les index (maintenance)
dropAllIndexes()
```

---

## Transactions

Les opérations suivantes utilisent des transactions atomiques :

- `executeExchange` - Transfert de ressources/objets
- `resolveBattleConsequences` - Résolution des batailles
- `progressProject` - Progression de projets de cartographie
- `acceptContract` - Acceptation de contrats de maréchal
- `joinCampaign` - Participation à une campagne

---

## Sécurité

### Bonnes pratiques implémentées

1. **JWT Authentication** - Tokens signés avec expiration de 24h
2. **Validation Zod** - Validation stricte de toutes les entrées
3. **Ownership Verification** - Vérification de propriété des ressources
4. **SQL Paramétré** - Protection contre les injections SQL
5. **Transactions** - Intégrité des données pour les opérations critiques
6. **JSONB Filtering** - Filtrage SQL natif avec opérateur `@>`

### Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `JWT_SECRET` | Secret pour signer les JWT | Oui (production) |
| `DATABASE_URL` | URL de connexion PostgreSQL | Oui |

---

## Maintenance

### Commandes utiles

```bash
# Push du schéma vers la base
npm run db:push

# Push forcé (si warning de perte de données)
npm run db:push --force

# Démarrer le serveur de développement
npm run dev
```

### Nettoyage automatique

- Les offres expirées sont nettoyées toutes les 60 secondes
- Les enchères terminées sont résolues via l'endpoint dédié
