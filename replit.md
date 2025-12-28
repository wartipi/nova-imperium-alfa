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
- **SQL Query Optimization**: All services now use efficient SQL queries with WHERE clauses and bounding box filtering instead of in-memory filtering
- **Player Skills Table**: `playerSkills` table stores player competencies (leadership, tactics, strategy, logistics, treaty_knowledge) with levels and experience
- **Exchange Service Tables**: 
  - `tradeRooms` for multi-player trading sessions
  - `exchangeOffers` for resource and item exchanges with expiration
  - `uniqueItems` for tradeable unique items with ownership tracking
- **Async Database Operations**: All service methods use async/await for database operations
- **Automatic Cleanup**: Expired offers are cleaned up automatically every 60 seconds

## Tables
- `users`, `armies`, `marshalContracts`, `campaigns`, `battleEvents`
- `publicEvents`, `mapRegions`, `mapDocuments`, `cartographyProjects`
- `playerSkills`, `tradeRooms`, `exchangeOffers`, `uniqueItems`, `playerResources`

## Future Phase: Authentication & Authorization
The following routes require authentication implementation:
- **Marshal routes**: Verify army ownership before contract creation
- **Exchange routes**: Validate player identity before accepting/rejecting offers
- **Cartography routes**: Ensure only map owners can transfer/sell maps
- **Marketplace routes**: Authenticate buyers/sellers for transactions
- **Resource routes**: Secure resource transfers with player verification

Recommended approach: JWT tokens with session management, middleware validation on protected routes.

# External Dependencies

- **Express**: Backend framework for API endpoints and server-side logic.
- **Drizzle ORM**: Type-safe database operations with PostgreSQL
- **Neon Database**: Serverless PostgreSQL with WebSocket support
- **Jest** and **React Testing Library**: For comprehensive unit testing.