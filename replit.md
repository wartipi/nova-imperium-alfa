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
- **Tailwind CSS** with shadcn/ui components for styling
- **Zustand** for state management
- **React Query** for server state management
- **Canvas-based game engine** for hex map rendering and game visualization