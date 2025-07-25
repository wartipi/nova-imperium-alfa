import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useMap } from '../../lib/stores/useMap';
import { getTerrainMovementCost, getTerrainCostDescription, getTerrainDifficultyEmoji } from '../../lib/game/TerrainCosts';
import { MovementSystem } from '../../lib/movement/MovementSystem';
import type { PathfindingResult } from '../../lib/pathfinding/HexPathfinding';

interface MovementConfirmationModalProps {
  targetHex: { x: number; y: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MovementConfirmationModal({ targetHex, onConfirm, onCancel }: MovementConfirmationModalProps) {
  const { avatarPosition, actionPoints, gainExperience } = usePlayer();
  const { mapData } = useMap();
  const [pathResult, setPathResult] = useState<PathfindingResult | null>(null);

  // Calculer le chemin et le coût total
  useEffect(() => {
    if (targetHex && mapData) {
      const result = MovementSystem.previewMovement(targetHex.x, targetHex.y, mapData);
      setPathResult(result);
    }
  }, [targetHex, mapData]);

  if (!targetHex || !mapData || !pathResult) return null;

  const targetTile = mapData[targetHex.y] && mapData[targetHex.y][targetHex.x];
  if (!targetTile) return null;

  // Calculer les positions actuelles
  const currentHexX = Math.round(avatarPosition.x / 1.5);
  const currentHexY = Math.round(avatarPosition.z / (Math.sqrt(3) * 0.5));
  
  // Utiliser le coût total du pathfinding au lieu du coût direct
  const movementCost = pathResult.totalCost;

  const getTerrainEmoji = (terrain: string) => {
    const terrainEmojis = {
      wasteland: '🏜️',
      forest: '🌲',
      mountains: '⛰️',
      fertile_land: '🌾',
      hills: '🏔️',
      shallow_water: '💧',
      deep_water: '🌊',
      swamp: '🐊',
      desert: '🏜️',
      sacred_plains: '✨',
      caves: '🕳️',
      ancient_ruins: '🏛️',
      volcano: '🌋',
      enchanted_meadow: '🌸'
    };
    return terrainEmojis[terrain as keyof typeof terrainEmojis] || '🗺️';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4">
        <h3 className="text-amber-900 font-bold text-xl mb-4 text-center">
          Confirmer le Déplacement
        </h3>
        
        <div className="space-y-4">
          {/* Position actuelle */}
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-300">
            <div className="text-amber-800 font-medium mb-1">📍 Position actuelle</div>
            <div className="text-amber-700">
              Hex ({currentHexX}, {currentHexY})
            </div>
          </div>

          {/* Destination */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-300">
            <div className="text-green-800 font-medium mb-1">🎯 Destination</div>
            <div className="text-green-700">
              <div className="flex items-center gap-2">
                <span>{getTerrainEmoji(targetTile.terrain)}</span>
                <span>Hex ({targetHex.x}, {targetHex.y})</span>
              </div>
              <div className="text-sm mt-1">
                Terrain: {targetTile.terrain.replace('_', ' ')}
              </div>
              <div className="text-sm mt-1 flex items-center gap-1">
                <span>{getTerrainDifficultyEmoji(targetTile.terrain as any)}</span>
                <span>{getTerrainCostDescription(targetTile.terrain as any)}</span>
              </div>
              {targetTile.resource && (
                <div className="text-sm">
                  Ressource: {targetTile.resource}
                </div>
              )}
            </div>
          </div>

          {/* Informations sur le chemin */}
          {pathResult.success && pathResult.path.length > 1 && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-300">
              <div className="text-purple-800 font-medium mb-2">🗺️ Chemin calculé</div>
              <div className="text-purple-700 text-sm">
                <div className="mb-2">
                  Distance: {pathResult.path.length - 1} case{pathResult.path.length > 2 ? 's' : ''}
                </div>
                {pathResult.path.length > 2 && (
                  <div className="text-xs space-y-1">
                    <div className="font-medium">Étapes du trajet:</div>
                    <div className="max-h-20 overflow-y-auto">
                      {pathResult.path.slice(1).map((step, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <span>→</span>
                          <span>({step.x}, {step.y})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coût du mouvement */}
          <div className={`rounded-lg p-3 border ${!pathResult.success ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
            <div className={`font-medium mb-1 ${!pathResult.success ? 'text-red-800' : 'text-blue-800'}`}>
              ⚡ Coût du mouvement
            </div>
            <div className={!pathResult.success ? 'text-red-700' : 'text-blue-700'}>
              {!pathResult.success ? (
                <div className="text-red-600 font-bold">
                  🚫 Aucun chemin trouvé vers cette destination
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>{movementCost} Point{movementCost > 1 ? 's' : ''} d'Action</span>
                  <span className={`font-bold ${actionPoints >= movementCost ? 'text-green-600' : 'text-red-600'}`}>
                    {actionPoints} PA disponibles
                  </span>
                </div>
              )}
              {actionPoints < movementCost && pathResult.success && (
                <div className="text-red-600 text-sm mt-1">
                  ⚠️ Points d'Action insuffisants
                </div>
              )}
            </div>
          </div>

          {/* Boutons de confirmation */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 bg-gray-100 border-gray-400 text-gray-800 hover:bg-gray-200"
            >
              Annuler
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!pathResult.success || actionPoints < movementCost}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {!pathResult.success ? 'Impossible' : 
               actionPoints >= movementCost ? 'Confirmer le Trajet' : 'PA insuffisants'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}