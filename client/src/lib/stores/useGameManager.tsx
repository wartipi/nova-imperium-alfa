import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useResources } from "./useResources";
import { useMapState } from "./useMapState";
import { useUnits } from "./useUnits";
import { useBuildings } from "./useBuildings";

/**
 * Store principal de gestion du jeu qui coordonne tous les autres stores
 * Implémente la gestion des états complexes selon les recommandations
 */

export interface GameTurn {
  turnNumber: number;
  phase: 'planning' | 'action' | 'production' | 'resolution';
  playerId: string;
  timestamp: number;
}

export interface GameEvent {
  id: string;
  type: string;
  description: string;
  playerId: string;
  turn: number;
  data: any;
}

interface GameManagerState {
  // État principal du jeu
  isInitialized: boolean;
  gamePhase: 'setup' | 'playing' | 'paused' | 'ended';
  
  // Système de tours
  currentTurn: number;
  currentPlayerId: string;
  playerOrder: string[];
  turnPhase: GameTurn['phase'];
  
  // Historique et événements
  gameEvents: GameEvent[];
  turnHistory: GameTurn[];
  
  // Performance et optimisation
  lastUpdateTimestamp: number;
  updateFrequency: number; // ms entre les mises à jour
  
  // Actions d'initialisation
  initializeGame: (playerIds: string[]) => void;
  resetGame: () => void;
  
  // Gestion des tours
  startTurn: (playerId: string) => void;
  endTurn: () => void;
  nextPlayer: () => void;
  setTurnPhase: (phase: GameTurn['phase']) => void;
  
  // Gestion des événements
  addGameEvent: (event: Omit<GameEvent, 'id' | 'turn'>) => void;
  getEventsForPlayer: (playerId: string) => GameEvent[];
  getEventsForTurn: (turnNumber: number) => GameEvent[];
  
  // Coordination des stores
  processTurnUpdates: () => void;
  synchronizeStores: () => void;
  validateGameState: () => boolean;
  
  // Actions globales
  pauseGame: () => void;
  resumeGame: () => void;
  saveGameState: () => string;
  loadGameState: (data: string) => boolean;
  
  // Optimisations de performance
  optimizeRendering: () => void;
  cleanupOldData: () => void;
  
  // Statistiques et métriques
  getGameStatistics: () => {
    totalTurns: number;
    totalEvents: number;
    averageTurnDuration: number;
    playersActive: number;
  };
  
  // Debug et développement
  debugMode: boolean;
  toggleDebugMode: () => void;
  exportGameData: () => string;
}

export const useGameManager = create<GameManagerState>()(
  subscribeWithSelector((set, get) => ({
    // État initial
    isInitialized: false,
    gamePhase: 'setup',
    currentTurn: 0,
    currentPlayerId: '',
    playerOrder: [],
    turnPhase: 'planning',
    gameEvents: [],
    turnHistory: [],
    lastUpdateTimestamp: Date.now(),
    updateFrequency: 100, // 100ms par défaut
    debugMode: false,
    
    // Initialisation
    initializeGame: (playerIds) => {
      set({
        isInitialized: true,
        gamePhase: 'playing',
        currentTurn: 1,
        currentPlayerId: playerIds[0] || 'player',
        playerOrder: [...playerIds],
        turnPhase: 'planning',
        gameEvents: [],
        turnHistory: [],
        lastUpdateTimestamp: Date.now()
      });
      
      // Initialiser les autres stores
      const mapStore = useMapState.getState();
      mapStore.initializeMap(50, 30);
      
      // Ajouter un événement de début de partie
      get().addGameEvent({
        type: 'game_start',
        description: 'La partie commence !',
        playerId: 'system',
        data: { playerIds }
      });
      
      console.log('🎮 Jeu initialisé avec', playerIds.length, 'joueurs');
    },
    
    resetGame: () => {
      set({
        isInitialized: false,
        gamePhase: 'setup',
        currentTurn: 0,
        currentPlayerId: '',
        playerOrder: [],
        turnPhase: 'planning',
        gameEvents: [],
        turnHistory: [],
        lastUpdateTimestamp: Date.now()
      });
      
      console.log('🔄 Jeu réinitialisé');
    },
    
    // Gestion des tours
    startTurn: (playerId) => {
      const state = get();
      if (!state.isInitialized) {
        console.warn('Cannot start turn: game not initialized');
        return;
      }
      
      set({
        currentPlayerId: playerId,
        turnPhase: 'planning',
        lastUpdateTimestamp: Date.now()
      });
      
      // Ajouter à l'historique des tours
      const turnData: GameTurn = {
        turnNumber: state.currentTurn,
        phase: 'planning',
        playerId,
        timestamp: Date.now()
      };
      
      set((state) => ({
        turnHistory: [...state.turnHistory, turnData]
      }));
      
      // Rafraîchir les unités du joueur
      const unitsStore = useUnits.getState();
      unitsStore.refreshAllUnits(playerId);
      
      get().addGameEvent({
        type: 'turn_start',
        description: `Tour ${state.currentTurn} - ${playerId}`,
        playerId,
        data: { turnNumber: state.currentTurn }
      });
    },
    
    endTurn: () => {
      const state = get();
      
      // Traiter les mises à jour de fin de tour
      get().processTurnUpdates();
      
      // Passer au joueur suivant
      get().nextPlayer();
      
      get().addGameEvent({
        type: 'turn_end',
        description: `Fin du tour ${state.currentTurn}`,
        playerId: state.currentPlayerId,
        data: { turnNumber: state.currentTurn }
      });
    },
    
    nextPlayer: () => {
      const state = get();
      const currentIndex = state.playerOrder.indexOf(state.currentPlayerId);
      const nextIndex = (currentIndex + 1) % state.playerOrder.length;
      const nextPlayerId = state.playerOrder[nextIndex];
      
      // Si on revient au premier joueur, augmenter le numéro de tour
      const newTurnNumber = nextIndex === 0 ? state.currentTurn + 1 : state.currentTurn;
      
      set({
        currentTurn: newTurnNumber,
        currentPlayerId: nextPlayerId
      });
      
      // Démarrer le tour du joueur suivant
      get().startTurn(nextPlayerId);
    },
    
    setTurnPhase: (phase) => {
      set({ turnPhase: phase });
    },
    
    // Gestion des événements
    addGameEvent: (eventData) => {
      const event: GameEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        turn: get().currentTurn,
        ...eventData
      };
      
      set((state) => ({
        gameEvents: [...state.gameEvents.slice(-999), event] // Garder seulement les 1000 derniers événements
      }));
      
      if (get().debugMode) {
        console.log('🎯 Événement ajouté:', event);
      }
    },
    
    getEventsForPlayer: (playerId) => {
      return get().gameEvents.filter(event => event.playerId === playerId);
    },
    
    getEventsForTurn: (turnNumber) => {
      return get().gameEvents.filter(event => event.turn === turnNumber);
    },
    
    // Coordination des stores
    processTurnUpdates: () => {
      const state = get();
      
      // Traiter la production des ressources
      const resourcesStore = useResources.getState();
      resourcesStore.processProduction();
      
      // Traiter les files de construction
      const buildingsStore = useBuildings.getState();
      buildingsStore.processConstructionQueue();
      
      // Traiter les maintenances
      const playerBuildings = buildingsStore.getBuildingsForPlayer(state.currentPlayerId);
      const maintenanceCost = buildingsStore.getPlayerBuildingStats(state.currentPlayerId).totalMaintenanceCost;
      
      // Déduire les coûts de maintenance
      Object.entries(maintenanceCost).forEach(([resource, cost]) => {
        resourcesStore.removeResource(resource as any, cost);
      });
      
      // Gestion automatique des ressources
      resourcesStore.autoManageResources();
      
      get().addGameEvent({
        type: 'turn_processed',
        description: 'Mise à jour de fin de tour traitée',
        playerId: state.currentPlayerId,
        data: { maintenanceCost }
      });
    },
    
    synchronizeStores: () => {
      // Synchroniser les données entre les différents stores
      const state = get();
      
      // Synchroniser la position des unités avec la carte
      const mapStore = useMapState.getState();
      const unitsStore = useUnits.getState();
      const buildingsStore = useBuildings.getState();
      
      // Marquer les tuiles occupées par les unités
      Array.from(unitsStore.units.values()).forEach(unit => {
        mapStore.setTile(unit.x, unit.y, { 
          unit: unit.id, 
          isOccupied: true, 
          occupiedBy: unit.ownerId 
        });
      });
      
      // Marquer les tuiles occupées par les bâtiments
      Array.from(buildingsStore.buildings.values()).forEach(building => {
        if (building.isCompleted) {
          mapStore.setTile(building.x, building.y, { 
            building: building.id, 
            isOccupied: true, 
            occupiedBy: building.ownerId 
          });
        }
      });
      
      if (get().debugMode) {
        console.log('🔄 Stores synchronisés');
      }
    },
    
    validateGameState: () => {
      try {
        const state = get();
        
        // Vérifications de base
        if (!state.isInitialized) return false;
        if (state.playerOrder.length === 0) return false;
        if (!state.playerOrder.includes(state.currentPlayerId)) return false;
        
        // Vérifier la cohérence des stores
        const resourcesStore = useResources.getState();
        const mapStore = useMapState.getState();
        
        // Vérifier que les ressources sont valides
        const resources = resourcesStore.resources;
        const hasNegativeResources = Object.values(resources).some(amount => amount < 0);
        if (hasNegativeResources) {
          console.warn('⚠️ Ressources négatives détectées');
          return false;
        }
        
        // Vérifier que la carte est initialisée
        if (mapStore.tiles.size === 0) {
          console.warn('⚠️ Carte non initialisée');
          return false;
        }
        
        return true;
      } catch (error) {
        console.error('❌ Erreur lors de la validation de l\'état du jeu:', error);
        return false;
      }
    },
    
    // Actions globales
    pauseGame: () => {
      set({ gamePhase: 'paused' });
      get().addGameEvent({
        type: 'game_paused',
        description: 'Jeu mis en pause',
        playerId: 'system',
        data: {}
      });
    },
    
    resumeGame: () => {
      set({ gamePhase: 'playing' });
      get().addGameEvent({
        type: 'game_resumed',
        description: 'Jeu repris',
        playerId: 'system',
        data: {}
      });
    },
    
    saveGameState: () => {
      try {
        const state = get();
        const resourcesStore = useResources.getState();
        const mapStore = useMapState.getState();
        const unitsStore = useUnits.getState();
        const buildingsStore = useBuildings.getState();
        
        const gameData = {
          gameManager: {
            currentTurn: state.currentTurn,
            currentPlayerId: state.currentPlayerId,
            playerOrder: state.playerOrder,
            gamePhase: state.gamePhase,
            turnPhase: state.turnPhase,
            gameEvents: state.gameEvents.slice(-100) // Sauvegarder seulement les 100 derniers événements
          },
          resources: resourcesStore.resources,
          mapData: mapStore.exportMapData(),
          units: Array.from(unitsStore.units.entries()),
          buildings: Array.from(buildingsStore.buildings.entries()),
          timestamp: Date.now()
        };
        
        const saveString = JSON.stringify(gameData);
        localStorage.setItem('nova_imperium_full_save', saveString);
        
        get().addGameEvent({
          type: 'game_saved',
          description: 'État du jeu sauvegardé',
          playerId: 'system',
          data: { size: saveString.length }
        });
        
        return saveString;
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        return '';
      }
    },
    
    loadGameState: (data) => {
      try {
        const gameData = JSON.parse(data);
        
        // Restaurer l'état du GameManager
        const gmData = gameData.gameManager;
        set({
          currentTurn: gmData.currentTurn,
          currentPlayerId: gmData.currentPlayerId,
          playerOrder: gmData.playerOrder,
          gamePhase: gmData.gamePhase,
          turnPhase: gmData.turnPhase,
          gameEvents: gmData.gameEvents,
          isInitialized: true
        });
        
        // Restaurer les autres stores
        const resourcesStore = useResources.getState();
        const mapStore = useMapState.getState();
        const unitsStore = useUnits.getState();
        const buildingsStore = useBuildings.getState();
        
        // Restaurer les ressources
        set(() => ({ resources: gameData.resources }));
        
        // Restaurer la carte
        mapStore.importMapData(gameData.mapData);
        
        // Restaurer les unités
        const unitsMap = new Map(gameData.units);
        unitsStore.units = unitsMap;
        
        // Restaurer les bâtiments
        const buildingsMap = new Map(gameData.buildings);
        buildingsStore.buildings = buildingsMap;
        
        // Synchroniser après le chargement
        get().synchronizeStores();
        
        get().addGameEvent({
          type: 'game_loaded',
          description: 'État du jeu chargé',
          playerId: 'system',
          data: { timestamp: gameData.timestamp }
        });
        
        return true;
      } catch (error) {
        console.error('❌ Erreur lors du chargement:', error);
        return false;
      }
    },
    
    // Optimisations de performance
    optimizeRendering: () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - get().lastUpdateTimestamp;
      
      if (timeSinceLastUpdate >= get().updateFrequency) {
        // Mettre à jour seulement si assez de temps s'est écoulé
        set({ lastUpdateTimestamp: now });
        get().synchronizeStores();
      }
    },
    
    cleanupOldData: () => {
      const maxEvents = 1000;
      const maxTurnHistory = 500;
      
      set((state) => ({
        gameEvents: state.gameEvents.slice(-maxEvents),
        turnHistory: state.turnHistory.slice(-maxTurnHistory)
      }));
      
      if (get().debugMode) {
        console.log('🧹 Nettoyage des anciennes données effectué');
      }
    },
    
    // Statistiques
    getGameStatistics: () => {
      const state = get();
      
      const turnDurations = state.turnHistory.map((turn, index) => {
        if (index === 0) return 0;
        return turn.timestamp - state.turnHistory[index - 1].timestamp;
      }).filter(duration => duration > 0);
      
      const averageTurnDuration = turnDurations.length > 0 
        ? turnDurations.reduce((a, b) => a + b, 0) / turnDurations.length 
        : 0;
      
      return {
        totalTurns: state.currentTurn,
        totalEvents: state.gameEvents.length,
        averageTurnDuration: Math.round(averageTurnDuration / 1000), // en secondes
        playersActive: state.playerOrder.length
      };
    },
    
    // Debug
    toggleDebugMode: () => {
      set((state) => ({ debugMode: !state.debugMode }));
      console.log('🐛 Mode debug:', get().debugMode ? 'activé' : 'désactivé');
    },
    
    exportGameData: () => {
      const state = get();
      const stats = get().getGameStatistics();
      
      const debugData = {
        gameManager: state,
        statistics: stats,
        timestamp: Date.now(),
        version: '1.0.0'
      };
      
      return JSON.stringify(debugData, null, 2);
    }
  }))
);