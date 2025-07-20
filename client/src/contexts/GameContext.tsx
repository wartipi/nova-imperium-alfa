import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useOptimizedGameState, useOptimizedGameActions, useBatchOperations } from '../lib/stores/useOptimizedStores';
import { useGameManager } from '../lib/stores/useGameManager';
import { useResources } from '../lib/stores/useResources';
import { useMapState } from '../lib/stores/useMapState';
import { useUnits } from '../lib/stores/useUnits';
import { useBuildings } from '../lib/stores/useBuildings';

/**
 * GameContext - Contexte principal du jeu Nova Imperium
 * Centralise tous les états globaux et actions du jeu
 */

export interface GameContextType {
  // États du jeu
  gameState: ReturnType<typeof useOptimizedGameState>;
  
  // Actions optimisées
  actions: ReturnType<typeof useOptimizedGameActions>;
  
  // Système de tours
  turnSystem: {
    currentTurn: number;
    currentPlayer: string;
    turnPhase: string;
    endTurn: () => void;
    startTurn: (playerId: string) => void;
  };
  
  // Gestion des ressources
  resourceManager: {
    resources: any;
    addResource: (type: string, amount: number) => boolean;
    spendResources: (costs: any) => boolean;
    hasResources: (costs: any) => boolean;
  };
  
  // Gestion de la carte
  mapManager: {
    selectedTile: any;
    visibleTiles: Set<string>;
    selectTile: (x: number, y: number) => void;
    centerCameraOnTile: (x: number, y: number) => void;
  };
  
  // Gestion des unités
  unitManager: {
    selectedUnit: any;
    selectUnit: (unitId: string) => void;
    moveUnit: (unitId: string, x: number, y: number) => boolean;
    attackWithUnit: (attackerId: string, targetX: number, targetY: number) => boolean;
  };
  
  // Gestion des bâtiments
  buildingManager: {
    constructionQueue: any[];
    startConstruction: (typeId: string, ownerId: string, x: number, y: number) => string | null;
    upgradeBuilding: (buildingId: string) => boolean;
  };
  
  // Utilitaires
  utilities: {
    initializeGame: (playerIds: string[]) => void;
    saveGame: () => string;
    loadGame: (data: string) => boolean;
    pauseGame: () => void;
    resumeGame: () => void;
  };
}

const GameContext = createContext<GameContextType | null>(null);

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: React.ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  // Hooks des stores
  const gameState = useOptimizedGameState();
  const actions = useOptimizedGameActions();
  const batchOperations = useBatchOperations();
  
  // Stores individuels pour accès direct
  const gameManager = useGameManager();
  const resources = useResources();
  const mapState = useMapState();
  const units = useUnits();
  const buildings = useBuildings();
  
  // Système de tours
  const turnSystem = {
    currentTurn: gameState.gameManager.currentTurn,
    currentPlayer: gameState.gameManager.currentPlayerId,
    turnPhase: gameState.gameManager.turnPhase,
    endTurn: useCallback(() => {
      batchOperations.processEndTurn();
    }, [batchOperations]),
    startTurn: useCallback((playerId: string) => {
      gameManager.startTurn(playerId);
    }, [gameManager])
  };
  
  // Gestionnaire de ressources
  const resourceManager = {
    resources: gameState.resources.resources,
    addResource: useCallback((type: string, amount: number) => {
      return resources.addResource(type as any, amount);
    }, [resources]),
    spendResources: useCallback((costs: any) => {
      return resources.spendResources(costs);
    }, [resources]),
    hasResources: useCallback((costs: any) => {
      return resources.hasResources(costs);
    }, [resources])
  };
  
  // Gestionnaire de carte
  const mapManager = {
    selectedTile: gameState.map.selectedTile,
    visibleTiles: gameState.map.visibleTiles,
    selectTile: useCallback((x: number, y: number) => {
      mapState.selectTile(x, y);
    }, [mapState]),
    centerCameraOnTile: useCallback((x: number, y: number) => {
      mapState.centerCameraOnTile(x, y);
    }, [mapState])
  };
  
  // Gestionnaire d'unités
  const unitManager = {
    selectedUnit: gameState.units.selectedUnit,
    selectUnit: useCallback((unitId: string) => {
      units.selectUnit(unitId);
    }, [units]),
    moveUnit: useCallback((unitId: string, x: number, y: number) => {
      return units.moveUnit(unitId, x, y);
    }, [units]),
    attackWithUnit: useCallback((attackerId: string, targetX: number, targetY: number) => {
      return units.attackWithUnit(attackerId, targetX, targetY);
    }, [units])
  };
  
  // Gestionnaire de bâtiments
  const buildingManager = {
    constructionQueue: gameState.buildings.constructionQueue,
    startConstruction: useCallback((typeId: string, ownerId: string, x: number, y: number) => {
      return buildings.startConstruction(typeId, ownerId, x, y);
    }, [buildings]),
    upgradeBuilding: useCallback((buildingId: string) => {
      return buildings.upgradeBuilding(buildingId);
    }, [buildings])
  };
  
  // Utilitaires du jeu
  const utilities = {
    initializeGame: useCallback((playerIds: string[]) => {
      batchOperations.initializeNewGame(playerIds);
    }, [batchOperations]),
    saveGame: useCallback(() => {
      return gameManager.saveGameState();
    }, [gameManager]),
    loadGame: useCallback((data: string) => {
      return gameManager.loadGameState(data);
    }, [gameManager]),
    pauseGame: useCallback(() => {
      gameManager.pauseGame();
    }, [gameManager]),
    resumeGame: useCallback(() => {
      gameManager.resumeGame();
    }, [gameManager])
  };
  
  // Auto-sauvegarde périodique
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameState.gameManager.gamePhase === 'playing') {
        utilities.saveGame();
      }
    }, 30000); // Sauvegarde toutes les 30 secondes
    
    return () => clearInterval(interval);
  }, [gameState.gameManager.gamePhase, utilities]);
  
  // Synchronisation automatique
  useEffect(() => {
    if (gameState.gameManager.gamePhase === 'playing') {
      gameManager.optimizeRendering();
    }
  }, [gameState, gameManager]);
  
  const contextValue: GameContextType = {
    gameState,
    actions,
    turnSystem,
    resourceManager,
    mapManager,
    unitManager,
    buildingManager,
    utilities
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

// Hook personnalisé pour accéder à des parties spécifiques du contexte
export const useGameTurn = () => {
  const { turnSystem } = useGameContext();
  return turnSystem;
};

export const useGameResources = () => {
  const { resourceManager } = useGameContext();
  return resourceManager;
};

export const useGameMap = () => {
  const { mapManager } = useGameContext();
  return mapManager;
};

export const useGameUnits = () => {
  const { unitManager } = useGameContext();
  return unitManager;
};

export const useGameBuildings = () => {
  const { buildingManager } = useGameContext();
  return buildingManager;
};

export const useGameUtilities = () => {
  const { utilities } = useGameContext();
  return utilities;
};