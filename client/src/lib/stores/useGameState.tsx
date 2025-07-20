import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "menu" | "loading" | "playing" | "paused" | "gameOver";

interface GameState {
  gamePhase: GamePhase;
  currentTurn: number;
  gameSpeed: number;
  isPaused: boolean;
  isGameMaster: boolean;
  
  // Actions
  initializeGame: () => void;
  startGame: () => void;
  endTurn: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  saveGame: () => void;
  loadGame: () => void;
  setGameSpeed: (speed: number) => void;
  toggleGameMaster: () => void;
}

export const useGameState = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    gamePhase: "menu",
    currentTurn: 1,
    gameSpeed: 1,
    isPaused: false,
    isGameMaster: false,
    
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
    
    pauseGame: () => {
      set({ isPaused: true });
    },
    
    resumeGame: () => {
      set({ isPaused: false });
    },
    
    saveGame: () => {
      const gameState = get();
      const saveData = {
        currentTurn: gameState.currentTurn,
        gamePhase: gameState.gamePhase,
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
          gamePhase: "playing" 
        });
        console.log('Game loaded');
      }
    },
    
    setGameSpeed: (speed: number) => {
      set({ gameSpeed: speed });
    },
    
    toggleGameMaster: () => {
      const state = get();
      const newGameMasterState = !state.isGameMaster;
      set({ isGameMaster: newGameMasterState });
      
      // Automatiquement donner toutes les compétences en mode MJ
      if (newGameMasterState) {
        setTimeout(() => {
          const playerStore = (window as any).usePlayer?.getState();
          if (playerStore?.giveAllMaxCompetences) {
            playerStore.giveAllMaxCompetences();
          }
        }, 100);
      }
      
      console.log('Basculer mode MJ:', newGameMasterState);
    }
  }))
);
