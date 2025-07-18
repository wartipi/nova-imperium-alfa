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

## Recent Changes

### Nova Imperium Code Renaming (January 17, 2025)
- Completed comprehensive renaming of all "civilization" references to "Nova Imperium" throughout codebase
- Updated main types.ts: Civilization interface renamed to NovaImperium
- Created new useNovaImperium store to replace useCivilizations store
- Updated all component imports and references: ConstructionPanel, RecruitmentPanel, TreasuryPanel, TileInfoPanel, MedievalHUD
- Updated App.tsx to use initializeNovaImperiums instead of initializeCivilizations
- Modified AI.ts to work with NovaImperium types instead of Civilization types
- Updated all variable names: currentCivilization → currentNovaImperium, civilizations → novaImperiums
- Fixed all store state management to maintain consistency between arrays and current selection
- Game now fully uses Nova Imperium terminology with French empire names: "Empire du Joueur", "Empire Rival"
- All panels and UI components now properly display data from the new Nova Imperium structure
- Cleaned up legacy useCivilizations.tsx file
- User confirmed all panels working correctly (construction, recruitment, events tested)

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

### Camera Movement from Minimap (January 17, 2025)
- Implemented clickable minimap for camera navigation
- Created GameEngine context to share game engine instance between components
- Added click handling to minimap canvas with proper coordinate conversion
- Minimap clicks now move the main camera to the clicked location
- Added visual feedback with crosshair cursor on minimap hover
- Seamless integration with existing camera controls (drag, keyboard, zoom)

### Tile Information Panel (January 17, 2025)
- Comprehensive tile information display when clicking on any tile
- Shows coordinates, terrain type with color coding, and resources
- Displays city details including population, buildings, and civilization
- Shows all units on tile with combat stats (attack/defense, health, movement, experience)
- Production values display (food, production, commerce, science)
- Special features like rivers are highlighted
- Positioned under player info window to avoid UI overlap
- Includes close button to dismiss the panel
- Enhanced tile data structure with commerce values for complete economic information

### Nova Imperium Evolution (January 17, 2025)
- Project direction clarified: evolving from Civilization clone to Nova Imperium
- Civilization mechanics serve as foundation for faction-based gameplay
- Competence tree system aligns with character progression in Nova Imperium
- Hex-based map and territory control provide strategic foundation
- Current systems (cities, units, resources) will adapt to support reputation and faction mechanics
- Preparing for implementation of Guilde de Pandem oversight system

### Nova Imperium Core Systems (January 17, 2025)
- Implemented comprehensive reputation system with 6 levels from "Banni" to "Saint"
- Reputation system integrated into player info box with colored indicator and clickable details
- Created Guilde de Pandem as omnipresent overseeing faction with eternal authority
- Player faction creation system requiring "Honorable" reputation (200+ honor points)
- Dynamic quest system with reputation-based requirements and rewards
- Action system allowing players to make choices that affect reputation permanently
- Faction management panel with overview, faction list, and available quests
- Real consequences for actions: promises, betrayals, donations, and defiance tracked
- Nova Imperium vision realized: choices shape destiny through persistent reputation system

### Archipelago World Generation (January 17, 2025)
- Updated map generator to create archipelago planet with scattered small islands
- Implemented 14 custom terrain types based on user specifications
- Added terrain color system matching user's hex tile designs
- Created small island generation (1-3 tile radius) scattered across deep water
- Islands surrounded by shallow water for realistic coastal areas
- Terrain distribution includes special types: sacred plains, ancient ruins, volcanoes, enchanted meadows
- Resource system updated for archipelago world with water-based and island-specific resources

### Comprehensive Resource System Implementation (January 17, 2025)
- Implemented complete resource system with 6 basic resources: food, action_points, gold, science, culture
- Added 3 strategic resources: iron, stone, wood for crafting and construction
- Added 3 magical resources for Nova Imperium: mana, crystals, ancient_knowledge
- Updated all 14 terrain types with balanced yields for all resource types
- Enhanced terrain yield system with proper resource distribution per terrain
- Updated NovaImperium interface to use comprehensive Resources type
- Enhanced TreasuryPanel to display all resources with categorized sections
- Updated TileInfoPanel to show complete resource yields from terrain
- MapGenerator now generates proper multi-resource yields for all terrain types
- Resource system now aligned with Nova Imperium's magical and strategic gameplay vision

### Real-time Messaging System (January 17, 2025)
- Implemented comprehensive real-time messaging system for player communication
- Created CourriersPanel with message composition, type selection, and cost system
- Added 4 message types: message, alliance, commerce, warning with distinct icons and colors
- Cost system: 3 Action Points per message with validation
- Backend messageService for persistent storage and real-time updates
- Automatic message refresh every 5 seconds for real-time communication
- Read/unread status tracking with click-to-read functionality
- Separate views for received and sent messages
- Statistics tracking for messaging activity
- Full API integration with error handling and loading states

### Treaty System Implementation (January 17, 2025)
- Created comprehensive treaty system for formal player agreements
- 6 treaty types aligned with game mechanics: Alliance Militaire (25 PA), Accord Commercial (15 PA), Pacte de Non-Agression (10 PA), Accès Militaire (8 PA), Échange de Ressources (12 PA), Défense Mutuelle (20 PA)
- Removed cultural and scientific treaty types as they don't align with current resource system
- Added Military Access treaty type for unit passage and territory access
- Added Resource Exchange treaty type for direct resource trading between players
- Removed military passage condition from Non-Aggression Pact (now only covers neutral zones and trade)
- Resource Exchange treaty includes: offered/requested resources, delivery schedule, duration, penalties system
- Treaty creation form with title, type, participants, and terms
- Variable cost system based on treaty type and complexity
- Multi-party signature system with automatic activation when all parties sign
- Treaty status tracking: draft, proposed, active, expired, broken
- Backend treatyService for persistent treaty management
- Real-time updates every 10 seconds for treaty status changes
- Statistics panel showing active, proposed, and created treaties
- Complete API integration with CRUD operations for treaties
- Military alliance treaties include detailed configuration: mutual defense, intelligence sharing, joint operations, resource sharing percentage, military support level

### Real-Time Exchange System (January 17, 2025)
- Implemented comprehensive real-time exchange system for direct resource and unique item trading
- ExchangeService managing trade rooms, offers, and real-time transactions
- Trade rooms created from Resource Exchange treaties for authorized participants
- Exchange offers with expiration system (5 minutes default) and real-time notifications
- Support for both regular resources and unique items in exchange offers
- Offer status tracking: pending, accepted, rejected, expired
- Real-time offer acceptance/rejection with immediate execution
- Complete API endpoints for trade room management and offer handling
- Subscriber system for real-time notifications to all participants
- Automatic cleanup of expired offers every minute
- Enhanced Resource Exchange treaty type with unique items and real-time capabilities

### Cartography System (January 17, 2025)
- Implemented comprehensive cartography system where players create tradeable map documents
- Region discovery system: players explore areas and can map them with varying detail levels
- Cartography projects requiring Action Points, tools, and assistants for completion
- Three quality levels: rough, detailed, masterwork maps with different accuracy and value
- Map documents include: region data, hidden secrets, unique features, trading value
- Tools system: precision compass, surveyor tools, masterwork instruments affect quality
- Assistants system: scout units, cartographer aides, surveyor experts reduce AP costs
- Hidden secrets discovery: ancient ruins, treasures, magical springs based on quality
- Unique features identification: natural harbors, mountain passes, strategic viewpoints
- Trading value calculation based on region size, quality, accuracy, and secrets
- Map transfer system for player-to-player exchanges through Resource Exchange treaties
- Complete API endpoints for discovery, project management, and map trading
- Cartography statistics tracking: regions discovered, maps created, trading values
- Maps become unique tradeable objects with strategic and commercial value

### Player Avatar System (January 17, 2025)
- Implemented 8-bit style 2D avatar system for player representation in the world
- Avatar sprites created with pixel art style matching old-school games aesthetic
- Character-specific avatar colors and appearances based on selected character type
- Avatar movement system with animation (walking animation, rotation, shadow effects)
- Avatar positioning integrated with hexagonal map coordinates
- Avatar action menu system accessible by clicking directly on the avatar
- Comprehensive action system with multiple categories:
  - Base actions: move, explore, rest (available to all players)
  - Competence-based actions: negotiate, command, trade, plan, ritual
  - Character-specific actions: knight charge, wizard spells, archer precision, priest blessings, rogue stealth
  - Reputation-based actions: inspire (Honorable), miracles (Saint), underground activities (Banished)
- Action Point costs integrated with avatar actions
- Visual feedback for avatar movement and available actions
- Avatar serves as main interface for player interaction with the world

### Avatar Movement System (January 18, 2025)
- Movement now initiated through avatar action menu instead of direct map clicks
- Click on avatar opens action menu with "Se Déplacer" option
- Selecting movement activates movement mode with crosshair cursor
- Visual indicator shows when movement mode is active
- Movement mode can be cancelled at any time
- Maintains movement confirmation system with preview and cost validation
- Prevents accidental movement while preserving deliberate player choice

### Comprehensive Code Optimization (January 18, 2025)
- Performed systematic code cleanup and optimization across entire codebase
- Removed unnecessary comments and consolidated code structure
- Optimized all Zustand stores (useGameState, useNovaImperium, usePlayer, useReputation)
- Cleaned up UI components (MedievalHUD, TreasuryPanel, ConstructionPanel, RecruitmentPanel)
- Optimized GameEngine class for better performance and readability
- Streamlined MapGenerator methods and removed redundant code
- Enhanced TreasuryPanel with simplified building data structure
- Improved ConstructionPanel and RecruitmentPanel with cleaner categorization
- Added visual improvements to movement mode with animated indicators
- Consolidated resource management systems for better efficiency
- Updated localStorage keys to use 'nova_imperium_save' instead of 'civ_save'
- All components now use consistent coding style and optimized structure

### Fog of War System Bug Fix (January 18, 2025)
- Fixed hexagonal grid adjacency calculation bug in vision system
- Corrected moveAvatarToHex method to use proper even/odd column hex grid offsets
- Fixed updateVisibleHexes to only show avatar hex + 6 directly adjacent hexes
- Ensured consistent hex adjacency patterns across all vision methods
- Vision system now correctly limits visibility to 1 hex radius around avatar
- Fixed bug where extra hexes were being revealed beyond intended vision range
- All vision methods (isHexVisible, isHexInCurrentVision, moveAvatarToHex) now use same hex grid logic

### Unique Items Exchange System (January 18, 2025)
- Created comprehensive unique items system for cards, magical objects, and artifacts
- Added 6 unique item types: carte, objet_magique, artefact, relique, document, equipement_legendaire
- Implemented 5 rarity levels: commun, rare, epique, legendaire, mythique
- Created UniqueItem interface with effects, requirements, value, and metadata
- Enhanced ExchangeService with unique item creation, transfer, and inventory management
- Added predefined unique items: Carte des Îles Perdues, Amulette de Vision, Orbe de Téléportation, etc.
- Implemented UniqueItemsPanel component with detailed item viewing and management
- Added API endpoints for unique item creation, inventory retrieval, and exchange offers
- Integrated unique items panel into MedievalHUD with 💎 icon
- System supports both resource and unique item exchanges in mixed offers
- Unique items have ownership tracking, tradeability status, and metadata for game mechanics

### Enhanced Reputation System & Game Mechanics (January 17, 2025)
- Updated reputation system with 6 clear levels: Banni, Méprisé, Suspect, Neutre, Honorable, Saint
- Added GN participation tracking and season pass system for faction creation requirements
- Reputation levels now provide specific access to different game content:
  - High honor: Postes de commandement, alliances prestigieuses, missions diplomatiques
  - Low honor: Quêtes clandestines, réseaux criminels, missions secrètes
- Implemented comprehensive faction creation system requiring 2 GN events OR season pass
- Added faction charter, emblem, structure, and territory management
- Created distinction between public and secret alliances
- Public alliances: Visible to all players, formal registration, -150 honor penalty for betrayal
- Secret alliances: Known only to participants, often GN-based, -75 honor penalty for betrayal
- Alliance creation system with 15 PA cost and proper reputation consequences
- Faction and alliance systems now fully integrated with honor/dishonor mechanics

### Fog of War and Movement System (January 18, 2025)
- Implemented comprehensive fog of war system with 1 hex vision radius around avatar
- Avatar positioned at correct hex coordinates (3,3) with proper world coordinate conversion
- Player vision limited to avatar position + 6 adjacent hexes in proper hexagonal pattern
- Game Master toggle button functional - allows full map visibility for GMs
- Movement restrictions implemented: land units and avatar cannot move to water terrain
- Water terrain types blocked: shallow_water, deep_water (units must use boats/ships)
- Console logging added for movement validation and debugging
- Vision system preserves explored areas - once seen, hexes remain visible permanently
- Proper hex coordinate system with adjacency calculations for vision updates
- Fixed vision system coordinate conversion and avatar positioning accuracy
- Fog of war now correctly follows avatar movement with proper hex-based vision calculation
- Avatar positioning system corrected to snap precisely to clicked hex coordinates
- Differentiated fog of war: current vision (normal colors) vs explored areas (dimmed with overlay)
- Avatar rotation disabled - always faces forward during movement for consistent orientation
- Movement confirmation system with preview and cost validation before execution
- Visual preview of movement destination with green highlight and arrow indicator
- Modal confirmation dialog showing terrain details, costs, and action points availability

### Action Points System (January 17, 2025)
- Replaced "production" with "action points" throughout the resource system
- Action points are generated by buildings, not by terrain tiles
- All terrain yields for action points set to 0 since buildings will provide them
- Updated UI to display ⚡ icon and "Points d'Action" label
- Action points will be used for player actions and building construction in Nova Imperium

### Streamlined Resource System (January 17, 2025)
- Removed science and culture from the resource system for simplicity
- Added precious metals (métaux précieux) to strategic resources
- Final resource system now contains:
  - 3 basic resources: food, action_points, gold
  - 4 strategic resources: iron, stone, wood, precious_metals
  - 3 magical resources: mana, crystals, ancient_knowledge
- Updated all interfaces, terrain yields, and UI components to reflect streamlined system
- Treasury panel now shows only relevant resources without science/culture clutter
- Strategic resources section reorganized with 2-column grid to accommodate precious metals

### Action Points Mechanic Implementation (January 17, 2025)
- Implemented comprehensive Action Points system based on Nova Imperium prototype
- Player store enhanced with Action Points tracking (current/max, spending, adding, limits)
- Action Points displayed in player info panel (25/100 starting values)
- Created ActionPointsCosts system defining costs for all game actions:
  - Building construction costs (4-25 PA depending on building type)
  - Unit movement costs (1-4 PA per tile, with 5x maximum)
  - Special actions: exploration (5 PA), diplomacy (3 PA), research (8 PA)
- Created ActionPointsGeneration system for building-based AP generation:
  - Buildings generate 1-8 PA per turn based on type and strategic value
  - Special buildings increase maximum AP capacity (8-20 bonus)
  - Magical/ancient buildings provide highest generation rates
- ActionPointsPanel interface showing costs, generation, and management options
- System bridges live GN events with online platform actions
- Integrated with existing game mechanics for construction and movement

### Game Guide Enhancement (January 17, 2025)
- Updated GameGuidePanel with Nova Imperium-specific content
- Added comprehensive "Types de Terrains" section showing all 14 terrain types
- Each terrain displays emoji, food yield, and detailed description
- Updated sections: Bases de Nova Imperium, Combat System, Competence Tree
- Removed Guild of Pandem references for now
- Enhanced tips and keyboard shortcuts for current game systems
- Guide accessible through HUD interface with tabbed navigation

### HUD Close Button System (January 17, 2025)
- Implemented comprehensive close button system for better UX
- HUD panel windows (treasury, construction, recruitment, etc.) have close buttons
- TileInfoPanel has close button for easy dismissal
- Modal windows (character selector, competence tree) have close buttons  
- Only permanent HUD elements (player info, minimap, controls) lack close buttons
- Consistent user experience with appropriate close controls throughout interface

### Construction & Recruitment Panel Expansion (January 17, 2025)
- Expanded ConstructionPanel with all 22 available building types organized by category
- Building categories: Transport, Agriculture, Défense, Culture, Magie, Ancien
- Each building has detailed description, cost, and thematic icon
- Expanded RecruitmentPanel with 16 unit types across 6 categories
- Unit categories: Infanterie, Distance, Siège, Cavalerie, Marine, Spécial
- Both panels now show comprehensive options with category organization for better navigation

### UI Layout Updates (January 17, 2025)
- Moved minimap to lower right corner as requested for better HUD organization
- Control buttons (sound toggle) now positioned in lower left corner
- Reputation system integrated into player info box with clickable details modal
- Centered left menu panel vertically on screen for better visual balance

### Nova Imperium Game Mechanics Integration (January 17, 2025)
- Implemented comprehensive Nova Imperium game mechanics based on user specifications
- Honor and dishonor system with clear consequences for player choices
- Faction creation requires 2 GN events participation OR valid season card
- Faction system includes charter, emblem, structure, and territory management
- Distinction between public alliances (visible to all) and secret alliances (GN-based)
- Betrayal consequences: -150 honor for public alliances, -75 for secret alliances
- GN actions directly influence online reputation and available content
- Reputation-based content access system guides players toward different gameplay paths
- Enhanced FactionPanel with creation, alliance management, and reputation tracking

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