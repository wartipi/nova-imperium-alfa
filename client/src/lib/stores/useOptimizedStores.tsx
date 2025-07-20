import { useMemo, useCallback } from 'react';
import { useResources } from './useResources';
import { useMapState } from './useMapState';
import { useUnits } from './useUnits';
import { useBuildings } from './useBuildings';
import { useGameManager } from './useGameManager';

/**
 * Hook d'optimisation qui combine tous les stores avec des sélecteurs optimisés
 * Évite les re-rendus inutiles selon les recommandations de l'étape 4
 */

// Sélecteurs optimisés pour éviter les re-rendus
export const useOptimizedGameState = () => {
  // Sélecteurs avec useMemo pour éviter les re-créations d'objets
  const gameManagerState = useGameManager(useCallback((state) => ({
    currentTurn: state.currentTurn,
    gamePhase: state.gamePhase,
    currentPlayerId: state.currentPlayerId,
    turnPhase: state.turnPhase
  }), []));

  const resourcesState = useResources(useCallback((state) => ({
    resources: state.resources,
    resourcesStatus: state.getResourcesStatus()
  }), []));

  const mapState = useMapState(useCallback((state) => ({
    selectedTile: state.selectedTile,
    visibleTiles: state.visibleTiles,
    exploredTiles: state.exploredTiles
  }), []));

  const unitsState = useUnits(useCallback((state) => ({
    selectedUnitId: state.selectedUnitId,
    selectedUnit: state.getSelectedUnit()
  }), []));

  const buildingsState = useBuildings(useCallback((state) => ({
    constructionQueue: state.constructionQueue
  }), []));

  return useMemo(() => ({
    gameManager: gameManagerState,
    resources: resourcesState,
    map: mapState,
    units: unitsState,
    buildings: buildingsState
  }), [gameManagerState, resourcesState, mapState, unitsState, buildingsState]);
};

// Hook optimisé pour les actions les plus courantes (évite les re-rendus)
export const useOptimizedGameActions = () => {
  const gameManager = useGameManager();
  const resources = useResources();
  const mapState = useMapState();
  const units = useUnits();
  const buildings = useBuildings();

  return useMemo(() => ({
    // Actions de jeu
    endTurn: gameManager.endTurn,
    pauseGame: gameManager.pauseGame,
    resumeGame: gameManager.resumeGame,
    
    // Actions de ressources
    addResource: resources.addResource,
    spendResources: resources.spendResources,
    hasResources: resources.hasResources,
    
    // Actions de carte
    selectTile: mapState.selectTile,
    exploreTile: mapState.exploreTile,
    centerCameraOnTile: mapState.centerCameraOnTile,
    
    // Actions d'unités
    selectUnit: units.selectUnit,
    moveUnit: units.moveUnit,
    attackWithUnit: units.attackWithUnit,
    
    // Actions de bâtiments
    startConstruction: buildings.startConstruction,
    upgradeBuilding: buildings.upgradeBuilding
  }), [gameManager, resources, mapState, units, buildings]);
};

// Hook optimisé spécialement pour les composants UI (évite les calculs lourds)
export const useOptimizedUI = () => {
  const resources = useResources(useCallback((state) => ({
    food: state.resources.food,
    gold: state.resources.gold,
    actionPoints: state.resources.action_points,
    mana: state.resources.mana
  }), []));

  const gameManager = useGameManager(useCallback((state) => ({
    currentTurn: state.currentTurn,
    currentPlayer: state.currentPlayerId,
    gamePhase: state.gamePhase
  }), []));

  const mapStats = useMapState(useCallback((state) => 
    state.getMapStatistics()
  , []));

  return useMemo(() => ({
    resources,
    gameManager,
    mapStats
  }), [resources, gameManager, mapStats]);
};

// Hook pour les données de performance uniquement (pour debug/monitoring)
export const useGamePerformanceData = () => {
  const gameStats = useGameManager(useCallback((state) => 
    state.getGameStatistics()
  , []));

  const resourcesCount = useResources(useCallback((state) => 
    Object.keys(state.resources).length
  , []));

  const mapStatsData = useMapState(useCallback((state) => 
    state.getMapStatistics()
  , []));

  const unitsCount = useUnits(useCallback((state) => 
    state.units.size
  , []));

  const buildingsCount = useBuildings(useCallback((state) => 
    state.buildings.size
  , []));

  return useMemo(() => ({
    gameStats,
    storesSizes: {
      resources: resourcesCount,
      mapTiles: mapStatsData.totalTiles,
      units: unitsCount,
      buildings: buildingsCount
    },
    performance: {
      lastUpdate: Date.now(),
      storesLoaded: true
    }
  }), [gameStats, resourcesCount, mapStatsData, unitsCount, buildingsCount]);
};

// Hook de synchronisation pour coordonner tous les stores
export const useStoresSynchronization = () => {
  const gameManager = useGameManager();
  
  const synchronizeAll = useCallback(() => {
    gameManager.synchronizeStores();
    gameManager.optimizeRendering();
  }, [gameManager]);

  const validateState = useCallback(() => {
    return gameManager.validateGameState();
  }, [gameManager]);

  const cleanupData = useCallback(() => {
    gameManager.cleanupOldData();
  }, [gameManager]);

  return useMemo(() => ({
    synchronizeAll,
    validateState,
    cleanupData
  }), [synchronizeAll, validateState, cleanupData]);
};

// Hook pour les actions de batch (plusieurs opérations en une fois)
export const useBatchOperations = () => {
  const gameManager = useGameManager();
  const resources = useResources();
  const units = useUnits();
  const buildings = useBuildings();

  const processEndTurn = useCallback(async () => {
    // Traitement groupé de fin de tour pour optimiser les performances
    gameManager.processTurnUpdates();
    
    // Traiter la production en batch
    resources.processProduction();
    
    // Traiter les files de construction
    buildings.processConstructionQueue();
    
    // Rafraîchir toutes les unités du joueur actuel
    units.refreshAllUnits(gameManager.currentPlayerId);
    
    // Synchroniser et nettoyer
    gameManager.synchronizeStores();
    gameManager.cleanupOldData();
    
    return true;
  }, [gameManager, resources, buildings, units]);

  const initializeNewGame = useCallback(async (playerIds: string[]) => {
    // Initialisation groupée d'une nouvelle partie
    gameManager.initializeGame(playerIds);
    
    // Créer les ressources initiales pour tous les joueurs
    playerIds.forEach(playerId => {
      // Logique d'initialisation des ressources par joueur
      // Cette logique sera adaptée selon les besoins spécifiques
    });
    
    return true;
  }, [gameManager]);

  return useMemo(() => ({
    processEndTurn,
    initializeNewGame
  }), [processEndTurn, initializeNewGame]);
};

// Types pour TypeScript avec optimisations
export type OptimizedGameState = ReturnType<typeof useOptimizedGameState>;
export type OptimizedGameActions = ReturnType<typeof useOptimizedGameActions>;
export type OptimizedUIData = ReturnType<typeof useOptimizedUI>;
export type GamePerformanceData = ReturnType<typeof useGamePerformanceData>;