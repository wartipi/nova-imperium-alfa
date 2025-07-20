/**
 * Index des stores optimisés pour Nova Imperium
 * Implémentation de l'Étape 4: Gestion des États Complexes
 */

// Exports des stores spécialisés
export { useResources, type Resources, type ResourceProduction } from './useResources';
export { useMapState, type HexTile, type MapRegion } from './useMapState';
export { useUnits, type Unit, type UnitType } from './useUnits';
export { useBuildings, type Building, type BuildingType } from './useBuildings';
export { useGameManager, type GameTurn, type GameEvent } from './useGameManager';

// Exports des hooks d'optimisation
export { 
  useOptimizedGameState, 
  useOptimizedGameActions, 
  useOptimizedUI, 
  useGamePerformanceData,
  useStoresSynchronization,
  useBatchOperations,
  type OptimizedGameState,
  type OptimizedGameActions,
  type OptimizedUIData,
  type GamePerformanceData
} from './useOptimizedStores';

// Exports des stores existants (compatibilité)
export { useGameState } from './useGameState';
export { usePlayer } from './usePlayer';
export { useFactions } from './useFactions';
export { useReputation } from './useReputation';
export { useAudio } from './useAudio';
export { useGame } from './useGame';

// Configuration globale des stores
export const STORES_CONFIG = {
  performance: {
    maxHistorySize: 1000,
    updateFrequency: 100,
    cleanupInterval: 30000
  },
  features: {
    debugMode: process.env.NODE_ENV === 'development',
    autoSync: true,
    persistentStorage: true
  }
} as const;