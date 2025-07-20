# Overview

This is Nova Imperium, a strategic role-playing game built with React, TypeScript, and Express. Initially developed as a Civilization-style foundation, the game is evolving toward a dynamic world where player choices, alliances, and betrayals shape destiny. The application features a hexagonal tile-based map, faction-based gameplay, reputation systems, and immersive world-building mechanics. The game includes territory management, character progression, faction creation, and a complex honor/dishonor system overseen by the Guilde de Pandem.

## Nova Imperium Vision
- Dynamic reputation system affecting available actions and alliances
- Player-created factions that emerge from actions, not preset kingdoms
- The Guilde de Pandem as the omnipresent overseeing faction
- Real consequences for choices, promises, and betrayals
- Evolving world where characters start humble but can rise or fall
- Immersive experience combining strategy, roleplay, and world-building

## User Preferences

Preferred communication style: Simple, everyday language.

**Important:** Always ask for confirmation before making deletions or significant modifications. Provide detailed explanations of planned changes to avoid unnecessary costs.

## Recent Changes

### Advanced Code Architecture Improvements (January 20, 2025)
- **Status**: COMPLETED - Implementation of professional React/TypeScript architecture patterns
- **New Modular Hooks System**:
  - `useRessources.ts` - Centralized resource management with validation and production logic
  - `useCarte.ts` - Map operations, tile queries, and spatial logic abstraction
  - `useTour.ts` - Turn management, game flow control, and state transitions
- **Centralized State Management**:
  - `GameContext.tsx` - React Context eliminating props drilling across components
  - Unified access to game state without performance bottlenecks
- **Styled Components Implementation**:
  - `StyledGameComponents.tsx` - Encapsulated styling preventing CSS conflicts
  - Medieval-themed reusable components with animations and theming
  - Professional component library approach
- **Interactive MapViewer Enhancement**:
  - `InteractiveMapViewer.tsx` - Replaced static map with fully interactive version
  - Direct integration of game mechanics (movement, exploration, actions)
  - Precise coordinate mapping eliminating approximation issues

### Code Modularization - Complete System Redesign (January 20, 2025)
- **Status**: COMPLETED - Major modularization following French development best practices
- **New Architecture**: Centralized game state with specialized modules for better maintainability
- **Core Modules Created**:
  - `useCentralizedGameState.tsx` - Unified state management combining all game systems
  - `ResourceManager.tsx` - Intelligent resource calculations and management
  - `TurnManager.tsx` - Advanced turn processing with events and statistics
  - `GameStateAdapter.tsx` - Progressive migration adapter maintaining compatibility
  - `EnhancedTurnPanel.tsx` - Rich interface for the new turn system
- **Legacy Cleanup**: Removed old, incomplete turn systems and simplified AI delegation
- **Backward Compatibility**: Hybrid system allows gradual migration without breaking existing features
- **Validation**: System logs show successful initialization and 4/5 game systems operational

### Hexagonal Detection System - Collision Method (January 20, 2025)
- **Status**: COMPLETED - Remplacement par méthode de collision circulaire simple
- **Ancienne méthode supprimée**: `isPointInHexagon` avec calculs géométriques trigonométriques
- **Nouvelle méthode**: `isPointInCollisionZone` utilisant distance euclidienne simple
- **Performance**: Détection plus rapide avec `Math.sqrt(dx² + dy²)` et rayon ajusté (0.9x)
- **Simplicité**: Abandon des calculs de bords inclinés au profit d'une zone circulaire
- **Tests validés**: La nouvelle méthode de collision détecte correctement les clics sur les hexagones

### Migration Replit Agent → Replit Standard (January 20, 2025)
- **Migration Status**: COMPLETED - Project successfully migrated from Replit Agent to standard Replit environment
- **Architecture**: Confirmed proper client-server separation with security best practices
- **Server**: Running correctly on port 5000 with Express backend
- **Client**: React/TypeScript frontend with Vite development server
- **All Systems**: Game loads properly, hexagonal map generation working, all game systems validated

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the main application
- **Vite** for development and build tooling
- **Tailwind CSS** with shadcn/ui components + **Styled Components** for encapsulated styling
- **Zustand** for state management + **React Context** for centralized state access
- **React Query** for server state management
- **Canvas-based game engine** for hex map rendering and game visualization
- **Custom Hooks System** for business logic separation:
  - Resource management (`useRessources`)
  - Map operations (`useCarte`) 
  - Turn management (`useTour`)
- **Component Library** with medieval theming and animations
- **Interactive Map System** with real-time game mechanics integration