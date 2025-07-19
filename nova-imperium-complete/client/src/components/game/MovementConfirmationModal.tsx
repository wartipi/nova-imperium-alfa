import React from 'react';
import { Button } from '../ui/button';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useMap } from '../../lib/stores/useMap';
import { getTerrainMovementCost, getTerrainCostDescription, getTerrainDifficultyEmoji } from '../../lib/game/TerrainCosts';

interface MovementConfirmationModalProps {
  targetHex: { x: number; y: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MovementConfirmationModal({ targetHex, onConfirm, onCancel }: MovementConfirmationModalProps) {
  const { avatarPosition, actionPoints, gainExperience } = usePlayer();
  const { mapData } = useMap();

  if (!targetHex || !mapData) return null;

  const currentHexX = Math.round(avatarPosition.x / 1.5);
  const currentHexY = Math.round(avatarPosition.z / (Math.sqrt(3) * 0.5));
  const targetTile = mapData[targetHex.y] && mapData[targetHex.y][targetHex.x];

  if (!targetTile) return null;

  const movementCost = getTerrainMovementCost(targetTile.terrain as any);

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

          {/* Coût du mouvement */}
          <div className={`rounded-lg p-3 border ${movementCost === 999 ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
            <div className={`font-medium mb-1 ${movementCost === 999 ? 'text-red-800' : 'text-blue-800'}`}>
              ⚡ Coût du mouvement
            </div>
            <div className={movementCost === 999 ? 'text-red-700' : 'text-blue-700'}>
              {movementCost === 999 ? (
                <div className="text-red-600 font-bold">
                  🚫 Déplacement impossible - Terrain aquatique
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span>{movementCost} Point{movementCost > 1 ? 's' : ''} d'Action</span>
                  <span className={`font-bold ${actionPoints >= movementCost ? 'text-green-600' : 'text-red-600'}`}>
                    {actionPoints} PA disponibles
                  </span>
                </div>
              )}
              {actionPoints < movementCost && movementCost !== 999 && (
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
              disabled={actionPoints < movementCost || movementCost === 999}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {movementCost === 999 ? 'Impossible' : 
               actionPoints >= movementCost ? 'Confirmer' : 'PA insuffisants'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}