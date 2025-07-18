import { useState } from 'react';
import { useMap } from '../../lib/stores/useMap';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useFactions } from '../../lib/stores/useFactions';
import { useGameState } from '../../lib/stores/useGameState';
import { TerritorySystem } from '../../lib/systems/TerritorySystem';
import { Button } from '../ui/button';

interface TerritoryClaimPanelProps {
  onClose: () => void;
}

export function TerritoryClaimPanel({ onClose }: TerritoryClaimPanelProps) {
  const { selectedHex } = useMap();
  const { getCompetenceLevel, spendActionPoints, actionPoints } = usePlayer();
  const { playerFaction, getFactionById } = useFactions();
  const { isGameMaster } = useGameState();
  const [isLoading, setIsLoading] = useState(false);
  const [showColonyForm, setShowColonyForm] = useState(false);
  const [colonyName, setColonyName] = useState('');

  if (!selectedHex) {
    return (
      <div className="absolute top-32 right-4 w-80 bg-gradient-to-r from-red-100 to-red-50 border-2 border-red-700 rounded-lg shadow-lg z-20 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-red-900">Revendication de territoire</h3>
          <button onClick={onClose} className="text-red-700 hover:text-red-900 text-xl font-bold">×</button>
        </div>
        <div className="text-red-800">Veuillez sélectionner une case sur la carte.</div>
      </div>
    );
  }

  const influenceLevel = getCompetenceLevel('local_influence');
  const currentFaction = playerFaction ? getFactionById(playerFaction) : null;
  const existingClaim = TerritorySystem.isTerritoryClaimed(selectedHex.x, selectedHex.y);
  const canClaim = TerritorySystem.canClaimTerritory('player', influenceLevel, playerFaction, isGameMaster);

  const handleClaimTerritory = async () => {
    if (!canClaim) return;
    
    // En mode MJ, pas besoin de faction
    if (!isGameMaster && !currentFaction) return;

    setIsLoading(true);
    try {
      // Coût : 10 PA pour revendiquer un territoire (sauf en mode MJ)
      const claimCost = 10;
      if (!isGameMaster && actionPoints < claimCost) {
        alert('Pas assez de Points d\'Action (10 PA requis)');
        return;
      }

      const success = isGameMaster || spendActionPoints(claimCost);
      if (success) {
        // En mode MJ, créer une faction temporaire si nécessaire
        const factionId = currentFaction?.id || 'gm_faction';
        const factionName = currentFaction?.name || 'Faction MJ';
        
        const claimed = TerritorySystem.claimTerritory(
          selectedHex.x,
          selectedHex.y,
          'player',
          'Joueur', // TODO: get actual player name
          factionId,
          factionName
        );

        if (claimed) {
          if (isGameMaster) {
            console.log(`[MODE MJ] Territoire revendiqué sans coût en PA`);
          }
          alert(`Territoire revendiqué pour ${factionName} !`);
          onClose();
        } else {
          alert('Échec de la revendication');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la revendication:', error);
      alert('Erreur lors de la revendication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFoundColony = async () => {
    if (!colonyName.trim() || !currentFaction || !existingClaim) return;

    setIsLoading(true);
    try {
      // Coût : 25 PA pour fonder une colonie
      const colonyCost = 25;
      if (actionPoints < colonyCost) {
        alert('Pas assez de Points d\'Action (25 PA requis)');
        return;
      }

      const success = spendActionPoints(colonyCost);
      if (success) {
        const colony = TerritorySystem.foundColony(
          selectedHex.x,
          selectedHex.y,
          colonyName,
          'player',
          'Joueur', // TODO: get actual player name
          currentFaction.id,
          currentFaction.name
        );

        if (colony) {
          alert(`Colonie "${colonyName}" fondée !`);
          setColonyName('');
          setShowColonyForm(false);
          onClose();
        } else {
          alert('Échec de la fondation de colonie');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la fondation:', error);
      alert('Erreur lors de la fondation de colonie');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute top-32 right-4 w-80 bg-gradient-to-r from-green-100 to-green-50 border-2 border-green-700 rounded-lg shadow-lg z-20 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-green-900">Gestion du territoire</h3>
        <button
          onClick={onClose}
          className="text-green-700 hover:text-green-900 text-xl font-bold"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {/* Informations sur la case */}
        <div className="bg-green-50 border border-green-700 rounded p-2">
          <div className="text-green-900 font-semibold mb-1">📍 Case sélectionnée</div>
          <div className="text-green-800 text-sm">
            Position: ({selectedHex.x}, {selectedHex.y})
          </div>
          <div className="text-green-800 text-sm">
            Terrain: {selectedHex.terrain}
          </div>
        </div>

        {/* État actuel du territoire */}
        {existingClaim ? (
          <div className="bg-blue-50 border border-blue-700 rounded p-2">
            <div className="text-blue-900 font-semibold mb-1">🏰 Territoire revendiqué</div>
            <div className="text-blue-800 text-sm">
              Faction: {existingClaim.factionName}
            </div>
            <div className="text-blue-800 text-sm">
              Revendiqué par: {existingClaim.claimedByName}
            </div>
            <div className="text-blue-800 text-sm">
              Date: {new Date(existingClaim.claimedDate).toLocaleDateString()}
            </div>
            {existingClaim.colonyId && (
              <div className="text-blue-800 text-sm font-medium">
                🏘️ Colonie établie
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-300 rounded p-2">
            <div className="text-gray-700 text-sm">
              Territoire libre - non revendiqué
            </div>
          </div>
        )}

        {/* Prérequis */}
        <div className="bg-yellow-50 border border-yellow-700 rounded p-2">
          <div className="text-yellow-900 font-semibold mb-2">📋 Prérequis</div>
          <div className="space-y-1 text-sm">
            <div className={`flex items-center gap-2 ${influenceLevel >= 1 ? 'text-green-700' : 'text-red-700'}`}>
              {influenceLevel >= 1 ? '✅' : '❌'}
              Influence locale niveau 1 ({influenceLevel >= 1 ? `Niv. ${influenceLevel}` : 'Non acquise'})
            </div>
            <div className={`flex items-center gap-2 ${currentFaction ? 'text-green-700' : 'text-red-700'}`}>
              {currentFaction ? '✅' : '❌'}
              Membre d'une faction ({currentFaction ? currentFaction.name : 'Aucune faction'})
            </div>
          </div>
        </div>

        {/* Actions disponibles */}
        <div className="space-y-2">
          {/* Revendication */}
          {!existingClaim && (
            <div>
              {canClaim ? (
                <Button
                  onClick={handleClaimTerritory}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading ? 'Revendication...' : 'Revendiquer le territoire (10 PA)'}
                </Button>
              ) : (
                <div className="bg-red-50 border border-red-300 rounded p-2 text-red-800 text-sm">
                  Prérequis non remplis pour revendiquer
                </div>
              )}
            </div>
          )}

          {/* Fondation de colonie */}
          {existingClaim && existingClaim.factionId === currentFaction?.id && !existingClaim.colonyId && (
            <div>
              {!showColonyForm ? (
                <Button
                  onClick={() => setShowColonyForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Fonder une colonie (25 PA)
                </Button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={colonyName}
                    onChange={(e) => setColonyName(e.target.value)}
                    placeholder="Nom de la colonie"
                    className="w-full p-2 border border-gray-300 rounded"
                    maxLength={50}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleFoundColony}
                      disabled={isLoading || !colonyName.trim()}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isLoading ? 'Fondation...' : 'Fonder'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowColonyForm(false);
                        setColonyName('');
                      }}
                      className="flex-1 bg-gray-400 hover:bg-gray-500 text-white"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Informations */}
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          💡 <strong>Info:</strong> Une fois revendiqué, le territoire appartient à votre faction. 
          Vous pouvez ensuite y établir une colonie pour accéder au menu de construction.
        </div>
      </div>
    </div>
  );
}