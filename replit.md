# Overview

This is a Civilization-style strategy game built with React, TypeScript, and Express. The application features a hexagonal tile-based map, turn-based gameplay, multiple civilizations, and classic 4X game mechanics (explore, expand, exploit, exterminate). The game includes city management, unit control, technology research, and basic diplomacy systems.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Character System (January 17, 2025)
- Removed character stat bonuses - characters are now purely cosmetic avatars
- Added 9 different character options with medieval themes
- Shield in HUD now displays selected character image and is clickable
- Character selector opens when clicking the shield
- Player name is editable directly in the player info panel
- Removed end turn button - game will use time-based turns (12 turns per year, one per month)
- Updated date display to show month/year format (e.g., "Jan 1000") instead of turn numbers
- Fixed character selection confirm button by replacing UI library buttons with native HTML elements
- Fully functional character selection system with proper event handling

### Treasury System Enhancement (January 17, 2025)
- Implemented comprehensive treasury panel with complete financial overview
- Current stockpile display for all resources (gold, food, production, science, culture)
- Income calculation from cities, population, and building bonuses
- Expense tracking for building maintenance and unit upkeep
- Net income calculations with color-coded display (green for positive, red for negative)
- Detailed city-by-city breakdown showing production and buildings
- Building economic data system with maintenance costs and yield bonuses
- Fixed civilization data access issues in Zustand store
- Color-coded sections: amber for stockpile, green for income, red for expenses, blue for net totals

### Competence Tree System (January 17, 2025)
- Implemented complete competence tree system based on user prototype
- Five competence categories: Political, Military, Economic, Strategic, and Occult
- Point-based learning system with starting allocation of 50 points
- Prerequisites and unlocking system for advanced competences
- Interactive modal interface accessible via player info panel (🎯 button)
- Detailed competence descriptions matching prototype specifications
- Visual feedback system showing learned competences and available points
- Persistent competence tracking through Zustand player store
- Fixed modal click-through issues and proper event handling

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the main application
- **Vite** for development and build tooling
- **Tailwind CSS** with shadcn/ui components for styling
- **Zustand** for state management
- **React Query** for server state management
- **React Three Fiber** for 3D rendering capabilities (with drei and postprocessing)
- **Canvas-based game engine** for hex map rendering and game visualization

### Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** structure with middleware for logging and error handling
- **In-memory storage** for game state (with interface for future database integration)
- **Development-only Vite integration** for hot reloading

### Database Strategy
- **Drizzle ORM** configured for PostgreSQL with Neon Database
- **Schema-first approach** with Zod validation
- **Migration system** ready for deployment
- Currently using in-memory storage for development

## Key Components

### Game Engine
- **GameEngine class** handles canvas rendering, camera controls, and hex coordinate conversion
- **MapGenerator** creates procedural hex-based maps with realistic terrain distribution
- **Combat system** with unit-to-unit fighting and experience
- **AI system** for computer-controlled civilizations

### State Management
- **useGameState** - manages game phases, turns, and core game loop
- **useMap** - handles hex map data and selection
- **useCivilizations** - manages multiple civilizations, units, cities, and diplomacy
- **useAudio** - controls background music and sound effects

### UI Components
- **GameCanvas** - main game viewport with click handling
- **GameUI** - overlay interface with panels and controls
- **Specialized panels** for cities, units, technology, and diplomacy
- **Responsive design** with mobile support

## Data Flow

1. **Game Initialization**: Map generation → Civilization setup → Game state initialization
2. **Turn Processing**: Player actions → AI turns → Resource calculation → Victory checks
3. **User Interaction**: Canvas clicks → State updates → UI re-renders → Server sync
4. **Real-time Updates**: State changes → Canvas re-rendering → UI updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless** - PostgreSQL database connection
- **@radix-ui/** - Comprehensive UI component library
- **@react-three/** - 3D rendering ecosystem
- **@tanstack/react-query** - Server state management
- **drizzle-orm** - Type-safe database ORM
- **zod** - Schema validation

### Development Tools
- **Vite** - Fast development server and build tool
- **TypeScript** - Type safety and development experience
- **Tailwind CSS** - Utility-first styling
- **PostCSS** - CSS processing

## Deployment Strategy

### Build Process
1. **Client build** - Vite builds React app to `dist/public`
2. **Server build** - esbuild bundles Express server to `dist/index.js`
3. **Database migrations** - Drizzle pushes schema changes

### Environment Setup
- **DATABASE_URL** required for PostgreSQL connection
- **Development mode** includes Vite middleware for hot reloading
- **Production mode** serves static files from dist directory

### Scaling Considerations
- **Stateless server design** allows for horizontal scaling
- **Database-backed persistence** replaces in-memory storage
- **Session management** for multiplayer support
- **WebSocket integration** for real-time multiplayer gameplay

The application is structured as a full-stack TypeScript application with clear separation between game logic, state management, and presentation layers. The modular architecture supports future enhancements like multiplayer functionality, advanced AI, and additional game features.