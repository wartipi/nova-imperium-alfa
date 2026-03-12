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