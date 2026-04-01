# Overview

Nova Imperium is a strategic role-playing game built with React, TypeScript, and Express, evolving from a Civilization-style foundation into a dynamic world shaped by player choices, alliances, and betrayals. Key features include a hexagonal tile-based map, faction-based gameplay, a dynamic reputation system, and immersive world-building mechanics. The game encompasses territory management, character progression, faction creation, and a complex honor/dishonor system overseen by the Guilde de Pandem. The vision is to create an immersive experience where players start humbly but can rise or fall based on real consequences for their actions, promises, and betrayals, within an evolving world.

# User Preferences

Preferred communication style: Simple, everyday language.

**Important:** Always ask for confirmation before making deletions or significant modifications. Provide detailed explanations of planned changes to avoid unnecessary costs.

**Development Process:** Always ask the user for confirmation before implementing any solution or code change. Present the proposed approach first and wait for approval before proceeding with the implementation.

# System Architecture

## Frontend Architecture
- **React 18** with TypeScript
- **Vite** for development and build tooling
- **Tailwind CSS** with shadcn/ui components for styling
- **Zustand** for global state management (e.g., Resources, MapState, Units, Buildings, GameManager)
- **React Query** for server state management
- **Canvas-based game engine** for hexagonal map rendering and visualization, ensuring precise tile detection and visual consistency.

## Core Architectural Decisions & Design Patterns
- **Centralized Game State**: `GameContext` centralizes all global game states and actions.
- **Modular State Management**: Utilizes specialized Zustand stores for distinct game entities, orchestrated by a `GameManager` for synchronization.
- **Separation of Business Logic**: Dedicated hooks for combat, resources, construction, and exploration.
- **Turn-based Effects System**: Automates resolution of end-of-turn effects (production, maintenance, events).
- **Advanced Pathfinding**: Hexagonal A* algorithm for optimal pathfinding with terrain cost management and animated unit movement.
- **Multi-Level Exploration**: A 5-level exploration system that progressively reveals resources and reduces movement costs based on competence level.
- **Hybrid Public Marketplace**: Supports both direct sales (fixed price) and auctions (variable price) with a comprehensive backend service and real-time notifications.
- **Resource Marketplace (Phase 11.1)**: DB-backed order book with manual fill, escrow via `player_bank`, commission with 24h pending delay, ownership derived from `colonies` canonical chain. Tables: `market_guilds`, `market_orders`, `market_trades`. Gate: `guilde_des_marchands` building required on all routes.
- **Unified City Foundation**: Streamlined process for founding colonies using user-defined display names.
- **Security Measures**: Coordinated masking for unique map items in the marketplace, visible only to the owner.
- **Icon Unification**: Shared icon system across the main game and map viewer for visual consistency.
- **Activity Logging**: Centralized `ActivityLogs` store with Zustand to capture and display all player actions in real-time.
- **Optimized Performance**: Extensive use of `React.memo`, `useCallback`, `useMemo`, and memoized selectors to minimize re-renders and optimize performance for large-scale operations (e.g., 1000+ players).
- **Strict TypeScript**: Enforced strict typing for improved code quality and error prevention.
- **Code Organization**: Clean architecture with dedicated folders for optimized components and clear separation of concerns.

## UI/UX Decisions
- **Consistent Color Scheme**: Utilizes the platform's amber color scheme throughout for visual branding.
- **Unified Iconography**: Shared `ResourceIcons.ts` for consistent icons, colors, and styles across all UI components.
- **Optimized Avatar Size**: Reduced avatar size on the map for better visibility.
- **Streamlined Market Interface**: Global scrollbar for the "Sell" tab, clear indicators for items already listed, and informative empty state messages.
- **Intuitive Navigation**: Reorganized HUD menu for better accessibility to key features like Territory Management, Factions, and Public Market.
- **Dynamic HUD Elements**: Integration of faction crests directly into the HUD banner.

# External Dependencies

- **Express**: Backend framework for API endpoints and server-side logic.
- **Jest** and **React Testing Library**: For comprehensive unit testing.

# Carte Monde Segmentée — Persistance PostgreSQL

## Structure de la carte

- Un **segment** = 50 colonnes × 30 lignes = 1500 tuiles
- Le prototype utilise un **bloc de 9 segments** (grille 3×3 centrée sur (0,0))
- Total prototype : 9 segments × 1500 tuiles = **13 500 tuiles**
- Étendue monde : X de -50 à 99 (150 cols) · Y de -30 à 59 (90 lignes)

## Convention de coordonnées

- `world_x = segment_x × 50 + local_x`
- `world_y = segment_y × 30 + local_y`
- Fichier de référence : `shared/mapCoordinates.ts`

## Tables PostgreSQL ajoutées

| Table | Description |
|---|---|
| `map_segments` | Segments de carte avec contrainte unique sur (segment_x, segment_y) |
| `map_tiles` | Tuiles avec contraintes uniques sur (segment_id, local_x, local_y) et (world_x, world_y) |

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `shared/mapCoordinates.ts` | Constantes et fonctions de conversion de coordonnées |
| `shared/schema.ts` | Tables `mapSegments` et `mapTiles` Drizzle ORM |
| `server/mapSegmentService.ts` | Service d'accès aux segments (CRUD + getNineSegmentBlock) |
| `server/routes/map.ts` | Routes API carte (`/api/map/segment`, `/api/map/block`, `/api/map/stats`) |
| `server/seeds/mapSeed.ts` | Seed idempotent des 9 segments de départ |
| `client/src/lib/api/mapApi.ts` | Fonctions fetch côté client |
| `client/src/lib/game/mapAdapter.ts` | Convertisseur DB tiles → HexTile[][] |

## Endpoints API disponibles

- `GET /api/map/stats` — nombre de segments et tuiles en base
- `GET /api/map/segment/:x/:y` — un segment par coordonnées
- `GET /api/map/segment/:x/:y/tiles` — 1500 tuiles d'un segment
- `GET /api/map/segment/:x/:y/full` — segment + tuiles en un appel
- `GET /api/map/block/:x/:y` — bloc 3×3 (9 segments + tuiles)

## Chargement depuis le client

```typescript
const { loadBlockFromDB } = useMap();
await loadBlockFromDB(0, 0); // charge le bloc centré sur (0,0)
```
Le store `useMap` garde `generateMap()` (génération procédurale) comme fallback automatique.

## Commandes utiles

```bash
npx tsx server/seeds/mapSeed.ts   # Seed des 9 segments (idempotent)
npm run db:push                   # Synchroniser le schéma Drizzle
```

---

# Persistance de la Position Joueur

## Fonctionnement

- La position du joueur est sauvegardée en PostgreSQL dans la table `player_positions`
- Au démarrage, le jeu charge la position persistée et charge automatiquement le bon bloc de carte
- Si aucune position n'existe, la position par défaut `worldX=3, worldY=3` est créée (segment 0,0)

## Table PostgreSQL

| Colonne | Type | Description |
|---|---|---|
| `player_id` | TEXT PK | Identifiant utilisateur |
| `world_x` | INTEGER | Coordonnée monde X |
| `world_y` | INTEGER | Coordonnée monde Y |
| `segment_x` | INTEGER | Segment courant X |
| `segment_y` | INTEGER | Segment courant Y |
| `updated_at` | TIMESTAMP | Dernière mise à jour |

## Convention de coordonnées

- Position persistée = coordonnées **monde** (`worldX`, `worldY`)
- Jamais les coordonnées locales (`hexX`, `hexY`) qui dépendent de l'origine du bloc affiché
- Conversion : `hexX = worldX - originWorldX`

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `server/playerPositionService.ts` | Service CRUD position joueur |
| `server/routes/player.ts` | Routes API `GET/POST /api/player/position` |
| `client/src/lib/api/playerApi.ts` | Client API position joueur |

## Politique de sauvegarde

- **Principale** : à chaque `moveAvatarToHex()`, si `isLoadingFromDB === false`
- **Secondaire** : au changement de segment détecté dans `ensurePlayerSegmentLoaded`, avant le chargement du nouveau bloc
- **Protégée** : aucune sauvegarde pendant un chargement de bloc (origine instable)

## Flux de démarrage

1. `fetchPlayerPosition()` — récupère ou crée la position
2. `loadBlockFromDB(segmentX, segmentY)` — charge le bon bloc
3. `hexX = worldX - originWorldX` — conversion monde → local
4. `moveAvatarToHex(hexX, hexY)` — placement exact

## Terrain types supportés (15)

`plains`, `wasteland`, `forest`, `mountains`, `fertile_land`, `hills`, `shallow_water`, `deep_water`, `swamp`, `desert`, `sacred_plains`, `caves`, `ancient_ruins`, `volcano`, `enchanted_meadow`

---

# Persistance de l'État Joueur (Progression)

## Fonctionnement

- Level, XP, PA, compétences sauvegardés en PostgreSQL dans `player_state`
- Chargés au démarrage et appliqués au store Zustand (`usePlayer`)
- `experienceToNextLevel` est une valeur dérivée — jamais persistée
- `exploredHexes` exclu (sprint suivant)

## Table PostgreSQL

| Colonne | Type | Défaut |
|---|---|---|
| `player_id` | TEXT PK | — |
| `level` | INTEGER | `1` |
| `experience` | INTEGER | `0` |
| `total_experience` | INTEGER | `0` |
| `action_points` | INTEGER | `25` |
| `max_action_points` | INTEGER | `100` |
| `competence_points` | INTEGER | `3` |
| `competences` | JSONB | `[]` |
| `updated_at` | TIMESTAMP | `now()` |

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `shared/schema.ts` | Table `playerState` Drizzle ORM |
| `server/playerStateService.ts` | Service CRUD (get, save, ensurePlayerState) |
| `server/routes/playerState.ts` | Routes `GET/POST /api/player/state` |
| `client/src/lib/api/playerStateApi.ts` | Client API (fetchPlayerState, savePlayerState) |

## Flux de démarrage (App.tsx)

1. `fetchPlayerPosition()` — position persistée
2. `fetchPlayerState()` — état joueur persisté (ou création par défaut)
3. `loadBlockFromDB(segmentX, segmentY)` — bloc de carte
4. `usePlayer.setState(...)` — application au store, `experienceToNextLevel` recalculé
5. `moveAvatarToHex(hexX, hexY)` — placement avatar

## Politique de sauvegarde automatique

**Centralisée dans `usePlayer.tsx`** — un seul point, aucun appel dispersé :

- `schedulePlayerStateSave()` — fonction interne unique avec timer debounce 3s
- `usePlayer.subscribe(listener)` — déclenché par tout changement dans `level`, `experience`, `totalExperience`, `actionPoints`, `maxActionPoints`, `competencePoints`, `competences`
- Garde contre les sauvegardes non authentifiées (`localStorage.getItem("nova_imperium_auth")`)

---

# Système de Traités (Phase 4 — Persisté)

## Architecture

- **3 tables DB** : `treaties` (traité principal), `treaty_factions` (parties contractantes), `treaty_signatures` (signatures per faction)
- **Auth Bearer** obligatoire sur toutes les mutations (create, sign, break)
- **Activation automatique** : `status` passe à `active` quand `COUNT(signatures) >= COUNT(treaty_factions)`
- **Types actifs** : définis dans `server/treatyTypes.ts` — source unique de vérité

## Tables DB

| Table | Colonnes clés |
|---|---|
| `treaties` | `id` TEXT PK, `title`, `type`, `terms`, `status`, `created_by`, `created_by_faction_id`, `properties` jsonb |
| `treaty_factions` | `treaty_id`, `faction_id` — unique par paire |
| `treaty_signatures` | `treaty_id`, `faction_id`, `signed_by`, `signed_at` — unique par paire |

## Types de Traités

| Type | Coût | Description |
|---|---|---|
| `alliance_militaire` | 25 PA | Défense mutuelle, renseignements, opérations conjointes |
| `accord_commercial` | 15 PA | Routes commerciales, réduction des tarifs |
| `pacte_non_agression` | 10 PA | Zones neutres, cessez-le-feu |
| `defense_mutuelle` | 20 PA | Soutien défensif, territoires partagés |

## Routes

| Méthode | URL | Auth | Rôle |
|---|---|---|---|
| GET | `/api/treaties/types` | public | 4 types disponibles |
| GET | `/api/treaties` | Bearer + admin | Liste tous les traités (admin only) |
| GET | `/api/treaties/me` | Bearer | Traités de la faction du joueur |
| POST | `/api/treaties` | Bearer | Créer un traité (avec `targetFactionIds[]`) |
| POST | `/api/treaties/:id/sign` | Bearer | Signer (faction déduite du token) |
| POST | `/api/treaties/:id/break` | Bearer | Rompre un traité actif |

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `shared/schema.ts` | Tables Drizzle ORM |
| `server/treatyTypes.ts` | `ACTIVE_TREATY_TYPES` + type `TreatyType` |
| `server/treatyService.ts` | CRUD Drizzle — `createTreaty`, `signTreaty`, `breakTreaty`, etc. |
| `server/routes/treaties.ts` | Router Express — 6 routes |
| `client/src/lib/api/treatiesApi.ts` | Helpers fetch côté client |
| `client/src/components/game/TreatiesPanel.tsx` | UI — 4 onglets |

## Membres de factions (auth)

| Utilisateur | Faction | Rôle faction |
|---|---|---|
| `joueur1` | Ordre du Fer (id=2) | leader |
| `maitre` | Guilde de Pandem (id=1) | leader |
| `admin` | aucune | admin MJ sans faction |
---

## Phase "Banque Joueur / Récolte Physique" (Phase 9.3)

### Nouvelles tables DB

| Table | Rôle |
|---|---|
| `player_bank` | Or/nourriture accumulé(e) via villes avec banque |
| `city_pending_harvest` | Or/nourriture en attente de collecte physique (villes sans banque) |
| `city_inventory` | Stock finalisé après action `collect_harvest` |

### Logique économique

- `applyProductionTickPerCity(playerId, factionId, currentTurn)` :
  - Ville avec bâtiment `bank` → crédit direct dans `player_bank`
  - Ville sans banque → accumulation dans `city_pending_harvest`
  - Garde d'idempotence via `player_bank.lastProductionTurn`
- `completeAction` (type `collect_harvest`) → transfère `city_pending_harvest → city_inventory` via `completeHarvestTransfer`
- `createCollectHarvestAction` : durée = max(5, 5+ceil((gold+food)/10)) min — 0 min en mode admin

### Nouvelles routes

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/economy/player-bank/me` | Banque personnelle du joueur |
| POST | `/api/economy/production-tick` | Tick production par-ville (body: `{currentTurn}`) |
| GET | `/api/cities/:cityId/harvest` | Pending + inventory + hasBank |
| POST | `/api/cities/:cityId/collect-harvest` | Lancer action de collecte physique |

### Nouveau composant UI

- `HarvestPanel.tsx` : panneau "🌾 RÉCOLTE DES VILLES" dans le menu HUD
  - Affiche la banque personnelle du joueur
  - Liste chaque ville avec pending/inventory
  - Bouton "Collecter" pour les villes sans banque
  - Mode admin : collecte instantanée

### Ordre fin de tour (`handleEndTurn`)

1. `postEconomyTick(currentTurn)` — faction gold global
2. `postProductionTick(currentTurn)` — production par-ville (bank / pending)
3. `processTurn()` — production locale
4. `endTurn()` — incrément du tour

## Harmonisation Phase 12 (NI-10.3)

### Bugs corrigés
- **colonies.faction_id NOT NULL** → `ALTER TABLE DROP NOT NULL` + `shared/schema.ts`
- **ColonyDTO ownerType/ownerPlayerId/ownerFactionId** exposés dans `server/territoryService.ts`
- **PublicMarketplace legacy tabs** : onglets 'buy'/'sell' masqués (code préservé, non accessibles) — seul `marche_ressources` visible dans le parcours joueur actif
- **foundColony sans territoire** → `else`-branch converti en 403 — un joueur doit revendiquer avant de fonder
- **TileInfoPanel ownership** : affiche désormais `ownerType` canonique (Joueur / Faction + nom `ownerPlayerName`/`ownerFactionName`) avec fallback legacy
- **tickCityProduction** (cityService.ts) : suppression du `if (!factionId) return { applied: false }` — villes `ownerType='player'` progressent même sans faction

### Bug satellite connu (hors LOT 5)
- `applyProductionTickPerCity` (economyService.ts L329) utilise encore `eq(colonies.factionId, factionId)` legacy → les colonies `ownerType='player'` ne génèrent pas de ressources économiques (or/nourriture/wood etc.) via `POST /api/economy/production-tick` pour les joueurs sans faction. À traiter dans une passe ultérieure d'harmonisation.

## Fog of War / Découverte persistante (NI-10.3)

### Vue d'ensemble
Système de brouillard de guerre complet avec persistance base de données. Les tuiles découvertes survivent aux rechargements de page.

### Table DB
`player_discovered_tiles(id, player_id, world_x, world_y, discovered_at)` — contrainte UNIQUE sur `(player_id, world_x, world_y)`. Coordonnées MONDE (invariantes entre segments).

### Routes API
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/player/discovered-tiles` | Toutes les tuiles découvertes du joueur |
| POST | `/api/player/discovered-tiles` | Batch insert nouvelles tuiles (`{tiles:[{worldX,worldY}]}`) |

### Rendu 3 couches (GameEngine.ts)
1. **Vision directe** — couleurs normales (rayon 1–3 selon compétence exploration)
2. **Anneau de brouillard** (fog ring) — terrain révélé à 70 % de luminosité + voile bleuté semi-transparent (rayon+1, hexagones à la périphérie)
3. **Mémoire explorée** — 40 % de luminosité + overlay foncé (tuiles visitées hors vision)
4. **Inconnu total** — `#1a1a1a` (noir quasi-complet)

### Flux de synchronisation
- **Chargement** : `loadDiscoveredTiles()` appelé à chaque changement de `mapData`. Convertit coords monde → locales via `originWorldX/Y`.
- **Écriture** : `updateVision()` calcule le delta (nouvelles tuiles) et appelle `syncDiscoveredTiles()` en background. Les tuiles de l'anneau de brouillard ne sont PAS persistées — seule la vision directe est découverte.
- **Changement de segment** : mapData change → hydratation automatique depuis le serveur avec recalcul des coordonnées locales.

### Gardes fog-of-war
- **Client** (`handleMovementConfirm`, GameCanvas.tsx) : vérifie `isHexExplored(x,y)` avant `requestMove`. Bypass pour admin.
- **Serveur** (`POST /api/player/actions/move`, playerActions.ts) : charge les tiles découvertes dans la bounding box, vérifie destination et chemin complet. Retourne `403 DESTINATION_NOT_DISCOVERED` ou `PATH_NOT_DISCOVERED`. Bypass pour admin.

### Fichiers clés
- `shared/schema.ts` — table `playerDiscoveredTiles`
- `server/routes/discoveredTiles.ts` — routes GET/POST
- `client/src/lib/api/discoveredTilesApi.ts` — `fetchDiscoveredTiles`, `syncDiscoveredTiles`
- `client/src/lib/systems/VisionSystem.ts` — `calculateFogRing`, `isHexInFogRing`
- `client/src/lib/stores/usePlayer.tsx` — `fogRing`, `loadDiscoveredTiles`, `isHexInFogRing`, `updateVision` (sync delta)
- `client/src/lib/game/GameEngine.ts` — `isHexInFogRing` callback, `applyLightFog`, rendu 3 couches
- `client/src/components/game/GameCanvas.tsx` — passage callbacks, garde client, hydratation au chargement
