import { useCallback } from 'react';
import { useGameEngine } from '../contexts/GameEngineContext';
import { useGameState } from '../stores/useGameState';
import { usePlayer } from '../stores/usePlayer';

/**
 * Hook to provide controlled access to game engine and stores
 * Replaces direct window object exposure with proper React patterns
 */
export const useGameEngineAccess = () => {
  const { gameEngineRef } = useGameEngine();

  // Controlled access methods
  const getGameEngineInstance = useCallback(() => {
    return gameEngineRef.current;
  }, [gameEngineRef]);

  const getGameState = useCallback(() => {
    return useGameState.getState();
  }, []);

  const getPlayerState = useCallback(() => {
    return usePlayer.getState();
  }, []);

  const updateEngineStores = useCallback(() => {
    if (gameEngineRef.current) {
      // Update engine with latest store states
      const gameState = useGameState.getState();
      const playerState = usePlayer.getState();
      
      // Update vision callbacks if they exist
      if (gameEngineRef.current.setVisionCallbacks && playerState.isHexVisible && playerState.isHexInCurrentVision) {
        gameEngineRef.current.setVisionCallbacks(playerState.isHexVisible, playerState.isHexInCurrentVision);
      }

      return { gameState, playerState };
    }
    return null;
  }, [gameEngineRef]);

  const renderEngine = useCallback(() => {
    if (gameEngineRef.current) {
      updateEngineStores();
      gameEngineRef.current.render();
    }
  }, [gameEngineRef, updateEngineStores]);

  return {
    getGameEngineInstance,
    getGameState,
    getPlayerState,
    updateEngineStores,
    renderEngine
  };
};