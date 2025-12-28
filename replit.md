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

# Database Architecture

## Phase 1 Optimizations (December 2025)
- **JWT Authentication**: Full JWT-based authentication with `requireAuth`, `optionalAuth`, and `requireOwnership` middleware. Token generation and verification with configurable secret via `JWT_SECRET` environment variable
- **SQL Query Optimization**: All services now use efficient SQL queries with WHERE clauses, JSONB filtering (@> operator), and bounding box filtering instead of in-memory filtering
- **Distance Calculations in SQL**: PublicEventsService and CartographyService now use SQL SQRT/POWER for distance calculations directly in queries
- **Transaction Wrapping**: All multi-write operations wrapped in db.transaction() for atomic operations:
  - ExchangeService: `acceptOffer` (exchange + status update), `executeExchange`
  - MarshalService: `acceptContract`, `joinCampaign`, `resolveBattleConsequences`, `createBattleEvent` (battle + armies), `initializePlayerSkills`
  - CartographyService: `progressProject` (project update + map creation)
  - MarketplaceService: `resolveAuctions` (all auction resolutions in single transaction)
- **Database Indexes**: 
  - GIN indexes on JSONB columns: `trade_rooms.participants`, `campaigns.participating_armies`, `public_events.participants`, `treaties.parties`
  - B-tree indexes on frequently queried columns: `map_regions.center_x/y`, `armies.owner_id`, `marshal_contracts.army_id/status`, `exchange_offers.status/from_player/to_player`, `unique_items.owner_id`, `player_resources.player_id`, `cartography_projects.player_id`, `map_documents.cartographer`, `public_events.turn/type`, `battle_events.campaign_id`, `player_skills.player_id`
  - Phase 2 indexes: `messages.to_player/from_player/timestamp`, `marketplace_items.status/seller_id/sale_type/created_at`, `treaties.status/created_by`
- **Player Skills Table**: `playerSkills` table stores player competencies (leadership, tactics, strategy, logistics, treaty_knowledge) with levels and experience
- **Exchange Service Tables**: 
  - `tradeRooms` for multi-player trading sessions
  - `exchangeOffers` for resource and item exchanges with expiration
  - `uniqueItems` for tradeable unique items with ownership tracking
  - `playerResources` for persistent resource tracking and transfers
- **Comprehensive Zod Validation**: All POST/PATCH routes validate input with Zod schemas:
  - Exchange: `createTradeRoom`, `createExchangeOffer`, `acceptOffer`, `rejectOffer`
  - Cartography: `discoverRegion`, `startCartographyProject`, `progressProject`, `cartographyTransfer`
  - Messages: `createMessage`
  - Treaties: `createTreaty`, `signTreaty`
  - Unique Items: `createUniqueItem`
  - Marshal: `createArmy`, `createContract`, `acceptContract`, `createCampaign`, `joinCampaign`, `createBattleEvent`, `updateBattle`
  - Marketplace: `marketplaceSell`, `marketplaceAuction`, `marketplaceBid`, `marketplaceBuy`, `resolveAuctions`
- **Async Database Operations**: All service methods use async/await for database operations
- **Automatic Cleanup**: Expired offers are cleaned up automatically every 60 seconds

## Tables
- `users`, `armies`, `marshalContracts`, `campaigns`, `battleEvents`
- `publicEvents`, `mapRegions`, `mapDocuments`, `cartographyProjects`
- `playerSkills`, `tradeRooms`, `exchangeOffers`, `uniqueItems`, `playerResources`
- `treaties`, `messages`, `marketplaceItems` (Phase 2 - migrated from in-memory to PostgreSQL)

## Phase 2 Migrations (December 2025)
- **TreatyService**: Migrated from in-memory Map to PostgreSQL with JSONB @> operator for party membership queries
- **MessageService**: Migrated from in-memory array to PostgreSQL with indexed queries on fromPlayer/toPlayer
- **MarketplaceService**: Migrated from in-memory Map to PostgreSQL with full persistence for items, auctions, and bids

## Modular SQL Utilities (December 2025)
- **JSONB Utilities**: `server/utils/jsonbQueries.ts` provides reusable JSONB query functions
  - `jsonbContainsArray(column, value)`: JSONB @> operator for array membership
  - `jsonbContainsObject(column, obj)`: JSONB @> operator for object containment
  - `jsonbExtractText/Number`: Extract values from JSONB columns
- **Geospatial Utilities**: `server/utils/geospatial.ts` provides reusable SQL-based geospatial functions
  - `createBoundingBoxCondition`: Efficient bounding box filtering using B-tree indexes
  - `createDistanceCondition`: SQL SQRT/POWER distance calculations
  - `orderByDistanceSQL`: Distance-based ordering
- **API Documentation**: `server/docs/API_DOCUMENTATION.md` - Complete backend documentation
  - All database tables with columns and types
  - All API endpoints with authentication requirements
  - Middleware documentation (requireAuth, requireRole, requireOwnership)
  - Index strategy and validation schemas
- **New Endpoints**:
  - `GET /api/cartography/regions/nearby` - Find regions within radius (query params: x, y, radius, limit)
  - `GET /api/cartography/regions/area` - Find regions in rectangular area
  - `GET /api/public-events/nearby` - Find events within radius (query params: x, y, radius, limit)
  - `GET /api/marshal/armies/nearby` - Find armies within radius (query params: x, y, radius, limit)
- **Optimized Methods**:
  - `MarshalService.getActiveCampaigns()`: SQL-filtered instead of in-memory filter
  - `MarshalService.getBattleEventsForCampaign(campaignId)`: SQL-filtered instead of in-memory filter
  - `MarshalService.findNearbyArmies(x, y, radius)`: Geospatial search with JSONB position field
- **Performance**: Uses bounding box pre-filtering + distance calculation for O(log n) instead of O(n) queries

## Authentication & Authorization (Extended - December 2025)
All sensitive routes now require JWT authentication via middleware stack:

**Middlewares disponibles** (`server/middleware/auth.ts`):
- `requireAuth`: Vérifie le token JWT et extrait l'identité utilisateur
- `requireRole(...roles)`: Vérifie que l'utilisateur a un des rôles spécifiés
- `requireSelfOrAdmin(paramName)`: Vérifie que l'utilisateur accède à ses propres données ou est admin/gm
- `requireOwnership(getOwnerId)`: Vérifie la propriété d'une ressource

**Routes protégées par type**:
- **Messages**: GET /api/messages/:playerId - requireAuth + requireSelfOrAdmin
- **Treaties**: GET /api/treaties/player/:playerId - requireAuth + requireSelfOrAdmin
- **Exchange**: GET /api/exchange/rooms/:playerId, /offers/:playerId - requireAuth + requireSelfOrAdmin
- **Cartography**: GET /api/cartography/regions/:playerId, /maps/:playerId, /projects/:playerId, /stats/:playerId - requireAuth + requireSelfOrAdmin
- **Unique Items**: GET /api/unique-items/:playerId - requireAuth + requireSelfOrAdmin
- **Marketplace Admin**: POST /api/marketplace/resolve-auctions - requireAuth + requireRole('admin', 'gm')
- **Public Events Admin**: POST (alliance, campaign, war-declaration, peace-treaty, city-foundation, resource-discovery, faction-creation, init-demo) - requireAuth + requireRole('admin', 'gm')
- **Public Events Admin**: PATCH /:eventId/visibility, DELETE /:eventId - requireAuth + requireRole('admin', 'gm')
- **Marshal routes**: Toutes protégées avec requireAuth et vérification de propriété

Authentication workflow:
1. POST `/api/auth/login` with username/password returns JWT token
2. Include `Authorization: Bearer <token>` header on subsequent requests
3. Routes extract user identity from token via `req.user.id`

Development users: `admin` (admin role), `joueur1` (player), `maitre` (gm)

# External Dependencies

- **Express**: Backend framework for API endpoints and server-side logic.
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Neon Database**: Serverless PostgreSQL with WebSocket support
- **Jest** and **React Testing Library**: For comprehensive unit testing.