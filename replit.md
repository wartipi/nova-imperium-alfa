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

### Complete Code Cleanup (January 20, 2025)
- **Assets Cleanup**: Removed 66 unused files from attached_assets/ (8.9M → 0MB)
- **UI Components Optimization**: Removed 20+ unused shadcn/ui components (256K → ~180K)
- **Code Quality**: Cleaned up TODO comments and optimized imports
- **Dependencies**: Identified unused packages but kept for stability
- **Project Status**: Fully functional with optimized codebase

### MapViewer Collision System Issue (January 19, 2025)
- **Persistent Collision Detection Problem**: Two bottom hexagonal tiles in MapViewer not responding to mouse hover
- **Multiple Algorithm Attempts**: Tested radial distance, hexagonal geometry, and point-in-polygon methods  
- **Issue Status**: UNRESOLVED - requires alternative approach or complete system redesign
- **Current State**: Basic collision detection works for most tiles, bottom tiles remain unresponsive

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the main application
- **Vite** for development and build tooling
- **Tailwind CSS** with shadcn/ui components for styling
- **Zustand** for state management
- **React Query** for server state management
- **Canvas-based game engine** for hex map rendering and game visualization