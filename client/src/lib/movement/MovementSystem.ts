/**
 * Système de déplacement — preview uniquement.
 * Le déplacement effectif est serveur-authoritative via requestMove() / playerActions.ts.
 */

import { HexPathfinding, type PathfindingResult } from '../pathfinding/HexPathfinding';
import { usePlayer } from '../stores/usePlayer';

export class MovementSystem {
  /**
   * Prévisualise un chemin et son coût sans l'exécuter.
   * Aligne le preview client sur les règles serveur :
   * - destination non découverte → success: false
   * - chemin traversant une case non découverte → success: false
   */
  static previewMovement(
    targetX: number,
    targetY: number,
    mapData: any[][]
  ): PathfindingResult {
    const playerStore = usePlayer.getState();
    const startHex = playerStore.getAvatarPosition();

    console.log('🔍 Preview movement:', {
      startHex,
      target: { x: targetX, y: targetY }
    });

    // Garde 1 — destination non découverte : refus immédiat
    if (!playerStore.isHexExplored(targetX, targetY)) {
      console.log('🚫 Preview bloqué : destination non découverte', { targetX, targetY });
      return { success: false, path: [], totalCost: 0 };
    }

    const result = HexPathfinding.findPath(
      startHex.x,
      startHex.y,
      targetX,
      targetY,
      mapData
    );

    // Garde 2 — chemin traverse une case non découverte (hors départ, index 0)
    if (result.success) {
      for (let i = 1; i < result.path.length; i++) {
        if (!playerStore.isHexExplored(result.path[i].x, result.path[i].y)) {
          console.log('🚫 Preview bloqué : étape non découverte', result.path[i]);
          return { success: false, path: [], totalCost: 0 };
        }
      }
    }

    return result;
  }
}
