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

### Système de Fondation de Ville Unifié et Optimisations Interface (Janvier 26, 2025)
- **Problème Résolu**: Conflit entre noms techniques (colony_ID) et noms d'affichage utilisateur
- **Solution Unifiée**: foundColony() utilise directement le nom choisi par l'utilisateur comme displayName
- **Interface Épurée**: Suppression du bouton "Fonder une Colonie" redondant, fondation uniquement via territoires
- **Synchronisation Corrigée**: UnifiedTerritorySystem et Nova Imperium Cities maintenant synchronisés
- **CityFoundingModal**: Modal moderne créé mais pas intégré (fonctionnalité existante privilégiée)
- **Architecture Simplifiée**: Un seul point d'entrée pour fondation (liste des territoires contrôlés)
- **Taille Avatar Optimisée**: Réduction de 48 à 32 pixels pour affichage plus discret sur la carte
- **Validation Confirmée**: Test réussi avec nouvelle colonie affichant le nom correct

### Correction Transfert Objets Uniques Marketplace (Janvier 27, 2025)
- **Problème Résolu**: Les objets uniques achetés au marché n'apparaissaient pas dans l'inventaire du joueur
- **Intégration ExchangeService**: Route `/api/marketplace/purchase-integrated` maintenant intégrée avec le système d'inventaire
- **Transfert Automatique**: Objets uniques créés automatiquement dans l'inventaire de l'acheteur via `exchangeService.createUniqueItem()`
- **Test Validé**: Achat d'amulette confirmé avec apparition immédiate dans l'inventaire avatar
- **Icône Marketplace**: Changement de 🏪 vers ⚖️ (balance) pour symboliser l'équité des échanges
- **Position Interface**: Marché publique déplacé dans le menu de gauche pour meilleure organisation
- **Trésorerie Test**: Or initial augmenté à 500 pour faciliter les tests d'achat

### Système de Sécurité Cartes - Masquage Coordonnées (Janvier 27, 2025)
- **Sécurité Marketplace**: Coordonnées masquées dans prévisualisations marketplace (hideCoordinates=true)
- **Accès Propriétaire**: Coordonnées visibles dans inventaire personnel (hideCoordinates=false)
- **Noms Génériques**: Cartes affichées comme "Carte de Région [rareté]" dans marketplace
- **Tooltip Sécurisé**: Affichage "Hexagone (???, ???)" au lieu des vraies coordonnées
- **Titre Modal**: "Carte de Région (Prévisualisation Marketplace)" pour éviter révélation
- **Zone Info Masquée**: Informations de région cachées dans marketplace
- **Méthode getUniqueItemById**: Ajoutée à ExchangeService pour enrichissement métadonnées
- **Enrichissement Confirmé**: Logs "enriched: true" validant le système fonctionnel
- **Architecture Dual**: Système contextuel selon source (marketplace vs inventaire personnel)
- **Test Validé**: Fonctionnement parfait confirmé par l'utilisateur - sécurité et utilisabilité optimales

### Unification Système d'Icônes MapViewer (Janvier 27, 2025)
- **Problème Résolu**: MapViewer utilisait des icônes différentes du jeu principal
- **Solution Unifiée**: Création de ResourceIcons.ts partagé avec toutes les icônes et couleurs
- **Code Principal Préservé**: Aucune modification du GameEngine.ts ou autres composants principaux
- **Synchronisation Parfaite**: MapViewer utilise maintenant exactement les mêmes icônes, couleurs et styles
- **Fonds Colorés**: Système de fonds colorés des ressources identique au GameEngine.ts
- **Tooltips Enrichis**: Noms de ressources synchronisés avec le système principal
- **Architecture Modulaire**: System d'icônes réutilisable pour futurs composants
- **Test Validé**: Utilisateur confirme fonctionnement parfait avec cohérence visuelle totale

### Amélioration Interface Marketplace - Scroll Bar Globale Ventes (Janvier 27, 2025)
- **Problème Résolu**: Section "Vendre" complète ne permettait pas de voir tous les éléments (inventaire + ventes actives)
- **Solution Implémentée**: Scroll bar globale pour tout l'onglet "Vendre" avec flex-1 et overflow-y-auto
- **Architecture Optimisée**: Conteneur principal avec défilement, suppression des scroll bars spécifiques
- **Message Vide Amélioré**: Message informatif stylé quand aucune vente active n'existe
- **UX Cohérente**: Navigation fluide dans tout l'onglet vente sans limitation de hauteur

### Prévention Ventes Duplicatas d'Objets Uniques (Janvier 27, 2025)
- **Problème Résolu**: Un même objet unique pouvait être mis en vente plusieurs fois simultanément
- **Solution 1 Implémentée**: Filtrage côté client avec indicateurs visuels pour objets déjà en vente
- **Interface Améliorée**: Objets en vente affichent badge "En vente", bouton désactivé et style grisé
- **Sécurité Double**: Vérification dans l'inventaire ET dans le modal de création de vente
- **UX Optimisée**: Message clair "Cet objet est déjà en vente" au lieu du bouton de validation
- **Architecture Réactive**: Mise à jour automatique des statuts lors de création/suppression de ventes
- **Bug Fix Critique**: Correction de la vérification `uniqueItem?.id` vers `uniqueItemId` pour proper matching
- **Bouton Annulation**: Ajout bouton "Annuler vente" rouge remplaçant le texte statique "Déjà en vente"
- **API Intégrée**: Fonction handleCancelSale() utilisant l'endpoint DELETE `/api/marketplace/item/:itemId`
- **Confirmation UX**: Dialog de confirmation avant annulation avec nom de l'objet
- **Interface Parfaite**: Contenu grisé (opacité 60%) mais bouton "Annuler vente" reste rouge vif et cliquable
- **Test Validé**: Annulation de vente fonctionnelle - objet retiré du marché et inventaire mis à jour

### Actualisation Complète Guide de Jeu (Janvier 27, 2025)
- **Guide Modernisé**: GameGuidePanel.tsx entièrement actualisé avec dernières fonctionnalités
- **6 Nouvelles Sections**: Exploration, Marketplace, Ressources remplacent anciennes sections obsolètes
- **Mécaniques Actuelles**: Système d'exploration 5 niveaux, réductions coûts déplacement intégrées
- **Marketplace Complet**: Commerce hybride, sécurité coordonnées, prévention duplicatas documentés
- **Ressources Modernes**: 15 ressources + ressources magiques niveau 3+ expliquées
- **Interface Pratique**: Navigation, menus, accès directs clairement décrits
- **Conseils Stratégiques**: Remplace anciens conseils par stratégies modernes marketplace et exploration

### Actualisation Complète Panneau d'Aide (Janvier 27, 2025)
- **4 Nouvelles Catégories**: FAQ moderne, Navigation/Interface, Marché Publique, Problèmes Techniques
- **Questions Modernisées**: Focus sur exploration, marketplace, ressources magiques, cartes de région
- **Réponses Techniques**: Coûts PA, niveaux d'exploration, système de sécurité coordonnées
- **Dépannage Spécialisé**: Problèmes marketplace, ressources non visibles, déplacement bloqué
- **Actions Rapides**: Liens directs vers Guide, Marché, Trésorerie, Inventaire avatar
- **Statut Système**: Version 2.0.0, fonctionnalités actives avec indicateurs verts
- **Interface Cohérente**: Style uniforme avec GameGuidePanel, recherche intégrée

### Migration Finalisation Systèmes Construction/Recrutement Zustand (Janvier 26, 2025)
- **Migration Finalisée**: CityManagementPanel complètement migré vers nouveaux systèmes Zustand
- **Code Legacy Supprimé**: Ancien code de construction/recrutement entièrement retiré et nettoyé
- **Option 1 Implémentée**: Remplacement direct avec switch conditionnel activé définitivement
- **Intégration Complète**: ConstructionPanelZustand et RecruitmentPanelZustand intégrés dans onglets
- **18 Bâtiments Organisés**: Système terrain-dépendant opérationnel (wasteland→Avant-poste, forest→Scierie, etc.)
- **15 Unités Organisées**: Système complet par catégories (Civil, Militaire, Magique, Spirituel, Siège)
- **Indicateurs Visuels**: Onglets marqués "(Nova)" pour confirmer migration vers nouveaux systèmes
- **Prochaine Étape**: Définition collaborative des statistiques complètes (PA, coûts, durée, production)
- **Architecture Unifiée**: Tous les panneaux de gestion utilisent maintenant Zustand exclusivement

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