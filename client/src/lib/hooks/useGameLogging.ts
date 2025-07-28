import { useCallback } from 'react';
import { useActivityLogs, ActivityLogUtils } from '../stores/useActivityLogs';
import { usePlayer } from '../stores/usePlayer';
import { useGameState } from '../stores/useGameState';

/**
 * Hook qui fournit des fonctions pour logger automatiquement les actions du joueur
 * Version simplifiée qui s'intègre avec les stores existants
 */
export function useGameLogging() {
  const { addLog } = useActivityLogs();
  const playerState = usePlayer();
  const gameState = useGameState();

  // Fonctions pour logger manuellement les actions spécifiques
  const logMovement = useCallback((from: string, to: string, cost: number) => {
    addLog(ActivityLogUtils.movement(from, to, cost));
  }, [addLog]);

  const logExploration = useCallback((location: string, cost: number, discovered?: string[]) => {
    addLog(ActivityLogUtils.exploration(location, cost, discovered));
  }, [addLog]);

  const logMarketplaceAction = useCallback((action: 'buy' | 'sell' | 'cancel', item: string, price?: number) => {
    addLog(ActivityLogUtils.marketplace(action, item, price));
  }, [addLog]);
  
  const logCompetenceGain = useCallback((competence: string, level: number, cost: number) => {
    addLog(ActivityLogUtils.competence(competence, level, cost));
  }, [addLog]);
  
  const logCreation = useCallback((item: string, cost: number) => {
    addLog(ActivityLogUtils.creation(item, cost));
  }, [addLog]);
  
  const logConstruction = useCallback((building: string, location: string, cost: number) => {
    addLog(ActivityLogUtils.construction(building, location, cost));
  }, [addLog]);
  
  const logRecruitment = useCallback((unit: string, location: string, cost: number) => {
    addLog(ActivityLogUtils.recruitment(unit, location, cost));
  }, [addLog]);
  
  const logCustomAction = useCallback((type: any, message: string, cost?: number, details?: any) => {
    addLog({
      type,
      message,
      cost,
      details
    });
  }, [addLog]);

  // Helper pour obtenir la position actuelle
  const getCurrentLocation = useCallback(() => {
    if (playerState?.avatarPosition) {
      // Convertir position monde en hex pour l'affichage
      const hexX = Math.round(playerState.avatarPosition.x / 1.5);
      const hexY = Math.round(playerState.avatarPosition.z / (Math.sqrt(3) / 2));
      return `Hex(${hexX},${hexY})`;
    }
    return 'Position inconnue';
  }, [playerState?.avatarPosition]);

  return {
    // Fonctions de logging
    logMovement,
    logExploration,
    logMarketplaceAction,
    logCompetenceGain,
    logCreation,
    logConstruction,
    logRecruitment,
    logCustomAction,
    
    // Helpers
    getCurrentLocation,
    
    // État actuel pour contexte
    currentLocation: getCurrentLocation(),
    actionPoints: playerState?.actionPoints || 0,
    currentTurn: gameState?.currentTurn || 1
  };
}