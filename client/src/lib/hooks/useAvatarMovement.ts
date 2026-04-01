import { useCallback } from 'react';
import { usePlayer } from '../stores/usePlayer';
import { TerrainHelpers } from '../constants/TerrainTypes';
import { useDoubleClick } from './useDoubleClick';

/**
 * Hook dedicated to avatar movement logic.
 * Note: le déplacement effectif est serveur-authoritative via requestMove() / GameCanvas.
 * Ce hook ne sert plus qu'à gérer setPendingMovement via double-clic.
 */
export const useAvatarMovement = () => {
  const { pendingMovement, setPendingMovement, avatarPosition } = usePlayer();

  const handleSingleClick = useCallback((position: { x: number; y: number }) => {
    console.log('Premier clic enregistré sur:', position.x, position.y, '- Double-cliquez pour vous déplacer');
  }, []);

  const handleDoubleClick = useCallback((position: { x: number; y: number }) => {
    const targetTile = { x: position.x, y: position.y };
    console.log('Double-clic détecté - tentative de déplacement vers:', targetTile.x, targetTile.y);
    setPendingMovement({ x: targetTile.x, y: targetTile.y });
  }, [setPendingMovement]);

  const { handleClick } = useDoubleClick({
    onSingleClick: handleSingleClick,
    onDoubleClick: handleDoubleClick
  });

  const proposeMovement = useCallback((targetX: number, targetY: number, terrain: string) => {
    if (!TerrainHelpers.isWalkable(terrain)) {
      console.log('Cannot move avatar to water terrain:', terrain);
      alert('Impossible de se déplacer sur l\'eau sans navire !');
      return false;
    }

    if (avatarPosition && (targetX === avatarPosition.x && targetY === avatarPosition.y)) {
      console.log('Already at target position');
      return false;
    }

    handleClick({ x: targetX, y: targetY });
    return true;
  }, [avatarPosition, handleClick]);

  const canMoveToTerrain = useCallback((terrain: string): boolean => {
    return TerrainHelpers.isWalkable(terrain);
  }, []);

  return {
    proposeMovement,
    canMoveToTerrain,
    pendingMovement
  };
};
