import { useCallback, useState } from 'react';
import { usePlayer } from '../stores/usePlayer';
import { useGameState } from '../stores/useGameState';
import { TerrainHelpers } from '../constants/TerrainTypes';
import { MovementSystem } from '../movement/MovementSystem';
import { useDoubleClick } from './useDoubleClick';

/**
 * Hook dedicated to avatar movement logic
 * Extracts movement-specific functionality from GameCanvas
 */
export const useAvatarMovement = () => {
  const { pendingMovement, setPendingMovement, avatarPosition } = usePlayer();
  const { isGameMaster } = useGameState();

  const handleSingleClick = useCallback((position: { x: number; y: number }) => {
    console.log('Premier clic enregistré sur:', position.x, position.y, '- Double-cliquez pour vous déplacer');
  }, []);

  const handleDoubleClick = useCallback((position: { x: number; y: number }) => {
    const targetTile = { x: position.x, y: position.y };
    console.log('Double-clic détecté - tentative de déplacement vers:', targetTile.x, targetTile.y);
    
    // Check if terrain is walkable (we'll need to get terrain info from parent)
    // For now, we'll rely on the parent to pass terrain info
    setPendingMovement({ x: targetTile.x, y: targetTile.y });
  }, [setPendingMovement]);

  const { handleClick } = useDoubleClick({
    onSingleClick: handleSingleClick,
    onDoubleClick: handleDoubleClick
  });

  const proposeMovement = useCallback((targetX: number, targetY: number, terrain: string) => {
    // Check if terrain is walkable first
    if (!TerrainHelpers.isWalkable(terrain)) {
      console.log('Cannot move avatar to water terrain:', terrain);
      alert('Impossible de se déplacer sur l\'eau sans navire !');
      return false;
    }

    // Check if target is different from current position
    if (avatarPosition && (targetX === avatarPosition.x && targetY === avatarPosition.y)) {
      console.log('Already at target position');
      return false;
    }

    // Check if movement is already in progress
    if (MovementSystem.isMoving()) {
      alert('Un déplacement est déjà en cours !');
      return false;
    }

    // Use double-click handler
    handleClick({ x: targetX, y: targetY });
    return true;
  }, [avatarPosition, handleClick]);

  const canMoveToTerrain = useCallback((terrain: string): boolean => {
    return TerrainHelpers.isWalkable(terrain);
  }, []);

  const isCurrentlyMoving = useCallback((): boolean => {
    return MovementSystem.isMoving();
  }, []);

  return {
    proposeMovement,
    canMoveToTerrain,
    isCurrentlyMoving,
    pendingMovement
  };
};