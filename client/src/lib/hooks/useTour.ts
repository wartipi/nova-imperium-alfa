import { useCallback, useMemo } from 'react';
import { useCentralizedGameState } from '../stores/useCentralizedGameState';
import { usePlayer } from '../stores/usePlayer';
import { useRessources } from './useRessources';

/**
 * Hook personnalisé pour gérer la logique de changement de tour
 * Gère l'avancement du jeu et les événements de fin de tour
 */
export function useTour() {
  const { 
    currentTurn, 
    gamePhase, 
    gameSpeed, 
    isPaused, 
    endTurn, 
    finDuTour, 
    pauseGame, 
    resumeGame, 
    setGameSpeed 
  } = useGameState();
  
  const { maxActionPoints, addActionPoints } = usePlayer();
  const { applyProduction } = useRessources();

  // État actuel du tour
  const getTurnInfo = useCallback(() => {
    return {
      current: currentTurn,
      phase: gamePhase,
      speed: gameSpeed,
      isPaused,
      isActive: gamePhase === 'playing'
    };
  }, [currentTurn, gamePhase, gameSpeed, isPaused]);

  // Passer au tour suivant (version simple)
  const nextTurn = useCallback(() => {
    endTurn();
  }, [endTurn]);

  // Fin de tour avancée avec traitement complet
  const advancedEndTurn = useCallback(() => {
    // Appliquer la production de ressources
    applyProduction();
    
    // Restaurer les points d'action
    addActionPoints(maxActionPoints);
    
    // Passer au tour suivant avec le système avancé
    finDuTour();
  }, [applyProduction, addActionPoints, maxActionPoints, finDuTour]);

  // Mettre le jeu en pause
  const pause = useCallback(() => {
    pauseGame();
  }, [pauseGame]);

  // Reprendre le jeu
  const resume = useCallback(() => {
    resumeGame();
  }, [resumeGame]);

  // Changer la vitesse du jeu
  const changeSpeed = useCallback((speed: number) => {
    setGameSpeed(speed);
  }, [setGameSpeed]);

  // Basculer pause/reprise
  const togglePause = useCallback(() => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  }, [isPaused, pause, resume]);

  // Obtenir les actions disponibles pour le tour actuel
  const getTurnActions = useCallback(() => {
    const actions = [];
    
    if (gamePhase === 'playing') {
      actions.push({
        id: 'end_turn',
        name: 'Terminer le tour',
        description: 'Passer au tour suivant',
        action: nextTurn,
        available: true
      });
      
      actions.push({
        id: 'advanced_end_turn',
        name: 'Fin de tour avancée',
        description: 'Terminer le tour avec application de la production',
        action: advancedEndTurn,
        available: true
      });
    }
    
    actions.push({
      id: 'toggle_pause',
      name: isPaused ? 'Reprendre' : 'Pause',
      description: isPaused ? 'Reprendre le jeu' : 'Mettre en pause',
      action: togglePause,
      available: true
    });
    
    return actions;
  }, [gamePhase, isPaused, nextTurn, advancedEndTurn, togglePause]);

  // Obtenir les statistiques du jeu
  const getGameStats = useMemo(() => {
    return {
      totalTurns: currentTurn,
      gamePhase,
      speed: gameSpeed,
      isPaused,
      averageTurnDuration: 0, // Peut être calculé plus tard avec un historique
      sessionTime: 0 // Peut être calculé avec un timer de session
    };
  }, [currentTurn, gamePhase, gameSpeed, isPaused]);

  // Prédire les changements du prochain tour
  const predictNextTurn = useCallback(() => {
    // Simulation des changements qui auront lieu au prochain tour
    return {
      turnNumber: currentTurn + 1,
      resourceChanges: {}, // Basé sur la production actuelle
      actionPointsRestored: maxActionPoints,
      eventsScheduled: [] // Événements prévus
    };
  }, [currentTurn, maxActionPoints]);

  // Vérifier si certaines conditions de fin de jeu sont remplies
  const checkEndGameConditions = useCallback(() => {
    // Logique pour vérifier les conditions de victoire/défaite
    const conditions = {
      victory: false,
      defeat: false,
      conditions: [] as string[]
    };
    
    // Ajouter ici la logique spécifique au jeu
    
    return conditions;
  }, []);

  return {
    // État du tour
    turnInfo: getTurnInfo(),
    gameStats: getGameStats,
    
    // Actions de tour
    nextTurn,
    advancedEndTurn,
    pause,
    resume,
    togglePause,
    changeSpeed,
    
    // Informations utiles
    getTurnActions,
    predictNextTurn,
    checkEndGameConditions,
    
    // État direct pour faciliter l'accès
    currentTurn,
    gamePhase,
    gameSpeed,
    isPaused
  };
}

export default useTour;