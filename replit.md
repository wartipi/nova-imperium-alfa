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

### Suppression du Système de Génération Automatique d'Objets (Janvier 20, 2025)
- **Cleanup ExchangeService**: Supprimé `createPredefinedUniqueItems()` et `initializeTestItems()`
- **Service Simplifié**: ExchangeService maintenant initialisé vide, objets créés dynamiquement
- **API Conservée**: Routes `/api/unique-items/create` disponibles pour création d'objets via actions
- **Inventaire Vide par Design**: Plus de génération automatique, objets créés par gameplay seulement

### Nouvelles Améliorations Architecturales - Étapes 1-4 Complétées (Janvier 20, 2025)
- **GameContext Centralisé**: Contexte principal centralisant tous les états globaux et actions du jeu
- **Système d'Effets de Tour**: Résolution automatisée des effets (production, maintenance, événements)
- **Séparation Logique Métier**: Hooks dédiés pour combat, ressources, construction, exploration
- **Tests Unitaires Complets**: Couverture complète avec Jest et React Testing Library
- **Migration Progressive**: Wrapper de compatibilité pour transition en douceur
- **Auto-sauvegarde**: Système de sauvegarde automatique toutes les 30 secondes
- **Optimisation Temps Réel**: Synchronisation et validation automatiques des états

### Gestion des États Complexes - Étape 4 Complétée (Janvier 20, 2025)
- **Stores Spécialisés Zustand**: Création de 5 stores dédiés (Resources, MapState, Units, Buildings, GameManager)
- **Optimisations Performances**: Hooks optimisés avec useCallback/useMemo, sélecteurs mémorisés, évitement des re-rendus
- **Coordination Intelligente**: GameManager orchestre tous les stores avec synchronisation automatique
- **Tests Unitaires Avancés**: Tests complets pour tous les nouveaux stores avec validation d'état
- **Architecture Modulaire**: Séparation claire des responsabilités, 15 types de ressources, système de production
- **Batch Operations**: Opérations groupées pour optimiser les performances de fin de tour
- **Documentation Architecture**: Guide complet des stores avec exemples et bonnes pratiques

### Migration et Optimisations Avancées (Janvier 20, 2025)
- **Migration Replit Agent → Replit**: Migration réussie avec compatibilité complète
- **Optimisation des Types**: Nouvelles interfaces précises (Ressource, Tuile, ÉtatJeu, Joueur, Faction)
- **Optimisation des Performances**: Composants React.memo, useCallback, useMemo pour MedievalHUD et GameCanvas
- **Tests Unitaires**: Tests complets pour hooks useGameState et usePlayer, tests composants
- **Documentation**: Guide architectural complet, bonnes pratiques, exemples d'usage
- **Structure Optimisée**: Nouveau dossier `optimized/` pour composants haute performance
- **TypeScript Strict**: Types stricts pour éviter les erreurs de compilation

### Expansion Massive de la Carte - Format 10000x3000 (Janvier 23, 2025)
- **Carte Massive**: Expansion de 50x30 à 10000x3000 hexagones (30 millions de tuiles)
- **Génération Optimisée**: Système de génération procédurale par chunks pour cartes massives
- **Système d'Optimisation**: LargeMapOptimizer avec chargement à la demande et gestion mémoire
- **Rendu LOD**: LargeMapRenderer avec 3 niveaux de détail selon la distance
- **Gestionnaire Principal**: LargeMapManager coordonnant génération, optimisation et rendu
- **Canvas Optimisé**: LargeMapCanvas avec navigation fluide, pan/zoom et statistiques temps réel
- **Performance**: 7,497,242 ressources générées avec chunks de 100x100 et cache intelligent
- **Navigation**: Viewport culling, préchargement intelligent et contrôles utilisateur avancés

### Complete Code Cleanup (January 20, 2025)
- **Assets Cleanup**: Removed 66 unused files from attached_assets/ (8.9M → 0MB)
- **UI Components Optimization**: Removed 20+ unused shadcn/ui components (256K → ~180K)
- **Code Quality**: Cleaned up TODO comments and optimized imports
- **Dependencies**: Identified unused packages but kept for stability
- **Project Status**: Fully functional with optimized codebase

### Interactive MapViewer Complete Rebuild (January 20, 2025)
- **Complete Rebuild**: Created entirely new InteractiveMapViewer.tsx with accurate mouse detection
- **Visual Consistency**: Applied platform's amber color scheme and styling throughout
- **Hexagon Alignment**: Implemented flat-top hexagon rendering matching main game engine
- **Terrain Colors**: Used authentic terrain colors from MapGenerator.ts (wasteland: #F5F5DC, forest: #228B22, etc.)
- **Coordinate System**: Fixed hexagonal positioning using exact GameEngine.ts algorithm (screenX = x * 1.5, screenY with alternating offset)
- **Mouse Detection**: Precise tile detection synchronized with rendering coordinates
- **Status**: COMPLETED AND VERIFIED - MapViewer displays authentic hex coordinates and works perfectly

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the main application
- **Vite** for development and build tooling
- **Tailwind CSS** with shadcn/ui components for styling
- **Zustand** for state management
- **React Query** for server state management
- **Canvas-based game engine** for hex map rendering and game visualization