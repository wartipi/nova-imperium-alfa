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

**Development Process:** Always ask the user for confirmation before implementing any solution or code change. Present the proposed approach first and wait for approval before proceeding with the implementation.

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

### Système d'Exploration Multi-Niveaux Avancé (Janvier 25, 2025)
- **5 Niveaux d'Exploration**: Extension du système 0→4 avec mécaniques différenciées
- **Classification des Ressources**: Ressources de base (niveau 1+) vs ressources magiques (niveau 3+)
- **Vision Étendue Niveau 4**: Rayon de vision 3 hexagones (37 cases) au niveau d'exploration 4
- **Filtrage Intelligent**: Révélation progressive des ressources selon le niveau de compétence
- **13 Nouvelles Ressources Magiques**: Mana crystals, dragon scales, phoenix feathers, etc.
- **Validation Système**: 5/5 systèmes validés avec succès par GameSystemValidator
- **Mécaniques Différenciées**: Exploration niveau 1 = ressources de base uniquement, niveau 3+ = ressources magiques incluses
- **Correction Vision Hexagonale**: Algorithme de distance hexagonale pour cercles parfaits de rayon 3

### Système de Pathfinding et Déplacement Avancé (Janvier 25, 2025)
- **Pathfinding A* Hexagonal**: Algorithme de recherche de chemin optimal avec gestion des terrains
- **Animation Progressive**: Déplacement case par case avec décompte de PA pour chaque étape
- **Calcul Coût Total**: Prévisualisation du trajet complet et coût avant confirmation
- **Modal Enrichi**: Affichage du chemin calculé, distance et étapes intermédiaires
- **Système Unifié**: MovementSystem centralisé gérant planification et exécution
- **Validation Terrain**: Vérification automatique des cases traversables et coûts variables

### Système de Réduction des Coûts de Déplacement par Exploration (Janvier 25, 2025)
- **Réductions Différenciées**: Niveau 2+ (terrains modérés 2-3→1-2 PA), Niveau 3+ (difficiles 4-5→3-4 PA), Niveau 4+ (extrêmes 8→4 PA)
- **Integration Complète**: MovementSystem applique les réductions dans executeAnimatedMovement()
- **Interface Visuelle**: TileInfoPanel affiche coûts originaux rayés + coûts réduits avec indication niveau
- **Propriété Calculée**: explorationLevel ajoutée au PlayerState (calculée dynamiquement via getCompetenceLevel)
- **Pathfinding Unifié**: HexPathfinding.getTerrainCost() intègre les réductions selon niveau d'exploration
- **Déduction Correcte**: Points d'action maintenant correctement déduits avec les bonnes réductions lors des déplacements réels

### Système de Marché Publique Hybride Complet (Janvier 26, 2025)
- **Architecture Hybride**: Combinaison vente directe (prix fixe) + enchères (prix variable) dans un même système
- **Service Backend Complet**: MarketplaceService avec gestion complète des deux types de vente et système de notifications
- **APIs REST Complètes**: 10 endpoints pour création, achat, enchères, recherche et gestion des objets
- **Interface Utilisateur Moderne**: PublicMarketplace.tsx avec onglets Acheter/Vendre, recherche, filtres et modals
- **Enchères par Tours**: Système d'enchères qui se terminent automatiquement en fin de tour via TurnEffectsSystem
- **Support Multi-Types**: Ressources (wood, stone, iron, etc.) et objets uniques avec métadonnées complètes
- **Notifications Temps Réel**: Système de notifications pour vendeurs et enchérisseurs avec mise à jour auto
- **Bouton HUD Intégré**: Accès direct via "🏪 Marché Publique" dans l'interface principale
- **Intégration Ressources Complète**: Route `/api/marketplace/purchase-integrated` avec déduction d'or et ajout de ressources réels
- **Accès Direct aux Stores**: Utilisation optimisée de useResources() pour performance maximale (1000+ joueurs)
- **Plan d'Optimisation Futur**: Migration vers GameProvider planifiée pour améliorer l'architecture long terme

### Migration Système de Ressources vers Zustand (Janvier 26, 2025)
- **Problème Résolu**: Incompatibilité entre TreasuryPanel (useNovaImperium) et marketplace (useResources)
- **TreasuryPanelZustand.tsx**: Nouvelle trésorerie optimisée utilisant le store Zustand de ressources
- **Hook de Synchronisation**: useDualResourceSync.tsx pour maintenir cohérence entre systèmes pendant migration
- **Migration Sécurisée**: Switch conditionnel permettant de basculer entre ancienne/nouvelle trésorerie sans risque
- **Performance Optimisée**: Zustand choisi pour gestion optimale avec 1000+ joueurs concurrent
- **Intégration Marketplace**: Marketplace maintenant parfaitement intégré avec système de ressources unifié
- **Tests Validés**: Achat/vente fonctionnent avec déduction d'or et ajout de ressources automatiques
- **Architecture Future**: Plan de migration progressive de RecruitmentPanel.tsx et ConstructionPanelSimple.tsx

### Système Construction/Recrutement Zustand avec Stats Collaboratives (Janvier 26, 2025)
- **Migration Progressive Option 1**: ConstructionPanelZustand.tsx et RecruitmentPanelZustand.tsx créés avec stats vides
- **Logique Terrain Conservée**: Système de dépendance terrain maintenu (wasteland→Avant-poste, forest→Scierie, etc.)
- **18 Bâtiments Transférés**: Tous les bâtiments Nova Imperium organisés par terrain avec stats à définir ensemble
- **15 Unités Transférées**: Système complet d'unités (Civil, Militaire, Magique, Spirituel, Siège) avec stats vides
- **Interface Collaborative**: Boutons "Voir détails" affichent les statistiques à définir (PA, coûts, durée, production)
- **Prochaine Étape**: Définition collaborative des coûts PA, matériaux, durée construction/recrutement, et production
- **Système Sécurisé**: Composants prêts pour activation sans risque de casser le système actuel
- **Architecture Cohérente**: Même approche progressive que la trésorerie pour migration en douceur

### Élimination Complète de VisionSystem.worldToHex (Janvier 25, 2025)
- **Stockage Dual**: avatarPosition (monde) + avatarHexPosition (hex) pour éviter conversions défaillantes
- **Architecture Simplifiée**: Plus de conversion monde→hex, coordonnées hex stockées directement
- **Performance Optimisée**: Élimination de calculs de conversion répétitifs dans updateVision()
- **Compatibilité Maintenue**: Rendu 3D utilise avatarPosition, logique de jeu utilise avatarHexPosition
- **Migration Réussie**: Tous les systèmes (movement, vision, exploration) fonctionnent parfaitement
- **VisionSystem.worldToHex DEPRECATED**: Fonction marquée obsolète, remplacée par accès direct au store

### Migration et Optimisations Avancées (Janvier 20, 2025)
- **Migration Replit Agent → Replit**: Migration réussie avec compatibilité complète
- **Optimisation des Types**: Nouvelles interfaces précises (Ressource, Tuile, ÉtatJeu, Joueur, Faction)
- **Optimisation des Performances**: Composants React.memo, useCallback, useMemo pour MedievalHUD et GameCanvas
- **Tests Unitaires**: Tests complets pour hooks useGameState et usePlayer, tests composants
- **Documentation**: Guide architectural complet, bonnes pratiques, exemples d'usage
- **Structure Optimisée**: Nouveau dossier `optimized/` pour composants haute performance
- **TypeScript Strict**: Types stricts pour éviter les erreurs de compilation

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