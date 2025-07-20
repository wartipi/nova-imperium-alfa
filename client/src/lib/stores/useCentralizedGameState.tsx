import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { HexTile, NovaImperium, Resources } from "../game/types";
import { MapGenerator } from "../game/MapGenerator";

export type GamePhase = "menu" | "loading" | "playing" | "paused" | "gameOver";

interface CentralizedGameState {
  // Game Core State
  gamePhase: GamePhase;
  currentTurn: number;
  gameSpeed: number;
  isPaused: boolean;
  isGameMaster: boolean;
  
  // Map State
  mapData: HexTile[][] | null;
  mapWidth: number;
  mapHeight: number;
  selectedHex: HexTile | null;
  
  // Global Resources & Economy
  globalResources: Resources;
  resourceProduction: Resources;
  
  // Nova Imperiums (Civilizations)
  novaImperiums: NovaImperium[];
  playerNovaImperiumId: string | null;
  
  // Player State
  avatarPosition: { x: number; y: number };
  actionPoints: number;
  maxActionPoints: number;
  explorationLevel: number;
  
  // Turn Management Actions
  initializeGame: () => void;
  startGame: () => void;
  endTurn: () => void;
  finDuTour: () => void; // Enhanced end turn function
  pauseGame: () => void;
  resumeGame: () => void;
  
  // Map Actions
  generateMap: (width: number, height: number) => void;
  setSelectedHex: (hex: HexTile | null) => void;
  getHexAt: (x: number, y: number) => HexTile | null;
  
  // Resource Actions
  updateResources: (delta: Resources) => void;
  calculateResourceProduction: () => void;
  applyResourceProduction: () => void;
  
  // Save/Load
  saveGame: () => void;
  loadGame: () => void;
  setGameSpeed: (speed: number) => void;
  toggleGameMaster: () => void;
}

export const useCentralizedGameState = create<CentralizedGameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    gamePhase: "menu",
    currentTurn: 1,
    gameSpeed: 1,
    isPaused: false,
    isGameMaster: false,
    
    // Map Initial State
    mapData: null,
    mapWidth: 0,
    mapHeight: 0,
    selectedHex: null,
    
    // Resources Initial State
    globalResources: {
      or: 100,
      bois: 50,
      nourriture: 75,
      pierre: 25,
      fer: 10,
      chevaux: 5
    },
    resourceProduction: {
      or: 10,
      bois: 15,
      nourriture: 20,
      pierre: 8,
      fer: 3,
      chevaux: 1
    },
    
    // Nova Imperiums Initial State
    novaImperiums: [],
    playerNovaImperiumId: null,
    
    // Player Initial State
    avatarPosition: { x: 0, y: 0 },
    actionPoints: 10,
    maxActionPoints: 10,
    explorationLevel: 0,
    
    // Game Management Actions
    initializeGame: () => {
      set({ gamePhase: "loading" });
      setTimeout(() => {
        set({ gamePhase: "playing", currentTurn: 1 });
      }, 1000);
    },
    
    startGame: () => {
      set({ gamePhase: "playing", currentTurn: 1 });
    },
    
    endTurn: () => {
      const { currentTurn } = get();
      set({ currentTurn: currentTurn + 1 });
      console.log(`Turn ${currentTurn + 1} started`);
    },
    
    // Enhanced End Turn Function
    finDuTour: () => {
      const state = get();
      
      // 1. Calculate and apply resource production
      state.calculateResourceProduction();
      state.applyResourceProduction();
      
      // 2. Restore action points
      set({ actionPoints: state.maxActionPoints });
      
      // 3. Process Nova Imperium turns
      const updatedNovaImperiums = state.novaImperiums.map(imperium => ({
        ...imperium,
        resources: {
          food: imperium.resources.food + (imperium.cities.length * 2),
          production: imperium.resources.production + (imperium.cities.length * 1.5),
          science: imperium.resources.science + (imperium.cities.length * 1),
          culture: imperium.resources.culture + (imperium.cities.length * 0.5),
          gold: imperium.resources.gold + (imperium.cities.length * 3)
        }
      }));
      
      // 4. Advance turn
      const newTurn = state.currentTurn + 1;
      set({ 
        currentTurn: newTurn,
        novaImperiums: updatedNovaImperiums
      });
      
      // 5. Update display
      console.log(`🎯 Fin du tour ${state.currentTurn}`);
      console.log(`📊 Ressources après production:`, state.globalResources);
      console.log(`🔄 Début du tour ${newTurn}`);
    },
    
    pauseGame: () => {
      set({ isPaused: true });
    },
    
    resumeGame: () => {
      set({ isPaused: false });
    },
    
    // Map Actions
    generateMap: (width: number, height: number) => {
      console.log(`Generating map: ${width}x${height}`);
      const mapData = MapGenerator.generateMap(width, height);
      set({ 
        mapData, 
        mapWidth: width, 
        mapHeight: height 
      });
    },
    
    setSelectedHex: (hex: HexTile | null) => {
      set({ selectedHex: hex });
    },
    
    getHexAt: (x: number, y: number) => {
      const { mapData } = get();
      if (!mapData || y < 0 || y >= mapData.length || x < 0 || x >= mapData[y].length) {
        return null;
      }
      return mapData[y][x];
    },
    
    // Resource Management
    updateResources: (delta: Resources) => {
      const { globalResources } = get();
      const newResources = {
        or: Math.max(0, globalResources.or + delta.or),
        bois: Math.max(0, globalResources.bois + delta.bois),
        nourriture: Math.max(0, globalResources.nourriture + delta.nourriture),
        pierre: Math.max(0, globalResources.pierre + delta.pierre),
        fer: Math.max(0, globalResources.fer + delta.fer),
        chevaux: Math.max(0, globalResources.chevaux + delta.chevaux)
      };
      set({ globalResources: newResources });
    },
    
    calculateResourceProduction: () => {
      const { mapData, avatarPosition } = get();
      if (!mapData) return;
      
      let baseProduction = {
        or: 5,
        bois: 10,
        nourriture: 15,
        pierre: 5,
        fer: 2,
        chevaux: 1
      };
      
      // Bonus based on controlled territories around avatar
      const radius = 3;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const hex = get().getHexAt(avatarPosition.x + dx, avatarPosition.y + dy);
          if (hex) {
            // Add terrain-based bonuses
            switch (hex.terrain) {
              case 'fertile_land':
                baseProduction.nourriture += 2;
                break;
              case 'forest':
                baseProduction.bois += 3;
                break;
              case 'hills':
                baseProduction.pierre += 2;
                break;
              case 'volcano':
                baseProduction.fer += 1;
                break;
            }
          }
        }
      }
      
      set({ resourceProduction: baseProduction });
    },
    
    applyResourceProduction: () => {
      const { globalResources, resourceProduction } = get();
      const newResources = {
        or: globalResources.or + resourceProduction.or,
        bois: globalResources.bois + resourceProduction.bois,
        nourriture: globalResources.nourriture + resourceProduction.nourriture,
        pierre: globalResources.pierre + resourceProduction.pierre,
        fer: globalResources.fer + resourceProduction.fer,
        chevaux: globalResources.chevaux + resourceProduction.chevaux
      };
      set({ globalResources: newResources });
    },
    
    // Save/Load
    saveGame: () => {
      const gameState = get();
      const saveData = {
        currentTurn: gameState.currentTurn,
        gamePhase: gameState.gamePhase,
        globalResources: gameState.globalResources,
        avatarPosition: gameState.avatarPosition,
        actionPoints: gameState.actionPoints,
        explorationLevel: gameState.explorationLevel,
        timestamp: Date.now()
      };
      
      localStorage.setItem('nova_imperium_save', JSON.stringify(saveData));
      console.log('Game saved');
    },
    
    loadGame: () => {
      const saveData = localStorage.getItem('nova_imperium_save');
      if (saveData) {
        const parsed = JSON.parse(saveData);
        set({ 
          currentTurn: parsed.currentTurn,
          gamePhase: parsed.gamePhase || "playing",
          globalResources: parsed.globalResources || get().globalResources,
          avatarPosition: parsed.avatarPosition || get().avatarPosition,
          actionPoints: parsed.actionPoints || get().maxActionPoints,
          explorationLevel: parsed.explorationLevel || 0
        });
        console.log('Game loaded');
      }
    },
    
    setGameSpeed: (speed: number) => {
      set({ gameSpeed: Math.max(0.5, Math.min(5, speed)) });
    },
    
    toggleGameMaster: () => {
      const state = get();
      const newGameMasterState = !state.isGameMaster;
      set({ isGameMaster: newGameMasterState });
      console.log('Basculer mode MJ:', newGameMasterState);
    }
  }))
);