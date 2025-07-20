import React, { createContext, useContext, ReactNode } from 'react';
import { useCentralizedGameState } from '../stores/useCentralizedGameState';
import { usePlayer } from '../stores/usePlayer';
import { useMap } from '../stores/useMap';

/**
 * Context centralisé pour l'état global du jeu Nova Imperium
 * Évite le props drilling et centralise l'accès aux données de jeu
 */
interface GameContextValue {
  // État du jeu
  gamePhase: string;
  currentTurn: number;
  isPaused: boolean;
  isGameMaster: boolean;
  
  // Ressources
  globalResources: any;
  resourceProduction: any;
  
  // Carte
  mapData: any;
  selectedHex: any;
  
  // Joueur
  avatar: any;
  actionPoints: number;
  maxActionPoints: number;
  
  // Actions du jeu
  endTurn: () => void;
  finDuTour: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  
  // Actions des ressources
  updateResources: (delta: any) => void;
  calculateResourceProduction: () => any;
  applyResourceProduction: () => void;
  
  // Actions de la carte
  generateMap: (width: number, height: number) => void;
  setSelectedHex: (hex: any) => void;
  
  // Actions du joueur
  spendActionPoints: (amount: number) => boolean;
  addActionPoints: (amount: number) => void;
  moveAvatarToHex: (x: number, y: number) => void;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

/**
 * Provider du contexte de jeu
 */
export function GameProvider({ children }: { children: ReactNode }) {
  // États centralisés
  const centralizedState = useCentralizedGameState();
  const playerState = usePlayer();
  const mapState = useMap();

  const contextValue: GameContextValue = {
    // État du jeu
    gamePhase: centralizedState.gamePhase,
    currentTurn: centralizedState.currentTurn,
    isPaused: centralizedState.isPaused,
    isGameMaster: centralizedState.isGameMaster,
    
    // Ressources
    globalResources: centralizedState.globalResources,
    resourceProduction: centralizedState.resourceProduction,
    
    // Carte
    mapData: centralizedState.mapData || mapState.mapData,
    selectedHex: centralizedState.selectedHex || mapState.selectedHex,
    
    // Joueur
    avatar: playerState.avatar,
    actionPoints: playerState.actionPoints,
    maxActionPoints: playerState.maxActionPoints,
    
    // Actions du jeu
    endTour: centralizedState.endTurn,
    finDuTour: centralizedState.finDuTour,
    pauseGame: centralizedState.pauseGame,
    resumeGame: centralizedState.resumeGame,
    
    // Actions des ressources
    updateResources: centralizedState.updateResources,
    calculateResourceProduction: centralizedState.calculateResourceProduction,
    applyResourceProduction: centralizedState.applyResourceProduction,
    
    // Actions de la carte
    generateMap: centralizedState.generateMap,
    setSelectedHex: centralizedState.setSelectedHex,
    
    // Actions du joueur
    spendActionPoints: playerState.spendActionPoints,
    addActionPoints: playerState.addActionPoints,
    moveAvatarToHex: playerState.moveAvatarToHex
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte du jeu
 * Fournit un accès centralisé à l'état du jeu sans props drilling
 */
export function useGameContext() {
  const context = useContext(GameContext);
  
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  
  return context;
}

export default GameContext;