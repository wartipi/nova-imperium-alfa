import React, { useState, useEffect } from 'react';
import { UnifiedTerritorySystem, Territory } from '../../lib/systems/UnifiedTerritorySystem';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useGameState } from '../../lib/stores/useGameState';
import { useFactions } from '../../lib/stores/useFactions';
import { useMap } from '../../lib/stores/useMap';

interface UnifiedTerritoryPanelProps {
  onClose: () => void;
}

export function UnifiedTerritoryPanel({ onClose }: UnifiedTerritoryPanelProps) {
  const { 
    getAvatarPosition, 
    actionPoints, 
    spendActionPoints, 
    playerName = 'Joueur' 
  } = usePlayer();
  const { isGameMaster } = useGameState();
  const { playerFaction } = useFactions();
  const { setSelectedHex } = useMap();
  
  const [isLoading, setIsLoading] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [showColonyModal, setShowColonyModal] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [colonyName, setColonyName] = useState('');

  // Charger les territoires
  const loadTerritories = () => {
    if (isGameMaster) {
      setTerritories(UnifiedTerritorySystem.getAllTerritories());
    } else {
      setTerritories(UnifiedTerritorySystem.getPlayerTerritories('player'));
    }
  };

  useEffect(() => {
    loadTerritories();
  }, [isGameMaster]);

  // Revendiquer le territoire à la position de l'avatar
  const handleClaimTerritory = async () => {
    if (!isGameMaster && !playerFaction) {
      alert('Vous devez faire partie d\'une faction pour revendiquer un territoire.');
      return;
    }

    setIsLoading(true);
    try {
      // Obtenir la position de l'avatar
      const avatarPos = getAvatarPosition();
      console.log('🎯 Position avatar pour revendication:', avatarPos);

      // Vérifier les Points d'Action (sauf en mode MJ)
      const claimCost = 10;
      if (!isGameMaster && actionPoints < claimCost) {
        alert(`Pas assez de Points d'Action (${claimCost} PA requis)`);
        return;
      }

      // Dépenser les PA (sauf en mode MJ)
      if (!isGameMaster) {
        const success = spendActionPoints(claimCost);
        if (!success) {
          alert('Impossible de dépenser les Points d\'Action');
          return;
        }
      }

      // Revendiquer le territoire
      const success = UnifiedTerritorySystem.claimTerritory(
        avatarPos.x,
        avatarPos.y,
        'player',
        playerName,
        playerFaction?.id || 'gm_faction',
        playerFaction?.name || 'Administration MJ'
      );

      if (success) {
        if (isGameMaster) {
          alert(`[MODE MJ] Territoire revendiqué en (${avatarPos.x}, ${avatarPos.y})`);
        } else {
          alert(`Territoire revendiqué en (${avatarPos.x}, ${avatarPos.y}) pour ${playerFaction?.name}!`);
        }
        loadTerritories();
      } else {
        // Rembourser les PA en cas d'échec
        if (!isGameMaster) {
          const { addActionPoints } = usePlayer.getState();
          addActionPoints(claimCost);
        }
        alert('Ce territoire est déjà revendiqué par un autre joueur.');
      }
    } catch (error) {
      console.error('Erreur lors de la revendication:', error);
      alert('Erreur lors de la revendication du territoire');
    } finally {
      setIsLoading(false);
    }
  };

  // Naviguer vers un territoire
  const navigateToTerritory = (territory: Territory) => {
    setSelectedHex({ x: territory.x, y: territory.y });
    
    // Centrer la caméra
    if ((window as any).gameEngine) {
      (window as any).gameEngine.centerCameraOnHex(territory.x, territory.y);
    }
  };

  // Fonder une colonie
  const handleFoundColony = () => {
    if (!selectedTerritory || !colonyName.trim()) return;

    const success = UnifiedTerritorySystem.foundColony(
      selectedTerritory.x,
      selectedTerritory.y,
      colonyName.trim()
    );

    if (success) {
      alert(`Colonie "${colonyName.trim()}" fondée avec succès!`);
      setColonyName('');
      setShowColonyModal(false);
      setSelectedTerritory(null);
      loadTerritories();
    } else {
      alert('Impossible de fonder la colonie sur ce territoire.');
    }
  };

  return (
    <div className="medieval-text h-full overflow-y-auto">
      {/* En-tête */}
      <div className="mb-6">
        <h3 className="medieval-subtitle mb-4">
          {isGameMaster ? 'Gestion de Territoire (Mode MJ)' : 'Mes Territoires'}
        </h3>
      </div>

      {/* Section de revendication */}
      <div className="parchment-section p-4 mb-6">
        <h4 className="medieval-subtitle mb-3">🗺️ Revendiquer un Territoire</h4>
        <p className="medieval-text text-sm mb-4">
          Placez votre avatar sur une case libre et cliquez sur le bouton ci-dessous.
        </p>
        <button
          onClick={handleClaimTerritory}
          disabled={isLoading || (!isGameMaster && !playerFaction)}
          className="w-full medieval-button medieval-button-success py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Revendication...' : `🚩 Revendiquer (${isGameMaster ? '0' : '10'} PA)`}
        </button>
        {!isGameMaster && !playerFaction && (
          <p className="text-red-700 text-xs mt-3 font-medium">⚠️ Vous devez faire partie d'une faction</p>
        )}
      </div>

      {/* Liste des territoires */}
      <div className="parchment-section p-4">
        <h4 className="medieval-subtitle mb-4">
          📋 {isGameMaster ? 'Tous les Territoires' : 'Mes Territoires'} ({territories.length})
        </h4>
        
        {territories.length === 0 ? (
          <div className="medieval-text text-center py-6">
            {isGameMaster ? 'Aucun territoire revendiqué sur la carte' : 'Vous n\'avez encore revendiqué aucun territoire'}
          </div>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {territories.map((territory) => (
              <div
                key={`${territory.x}-${territory.y}`}
                className="parchment-section p-3 hover:transform hover:scale-105 transition-all duration-200 cursor-pointer"
                onClick={() => navigateToTerritory(territory)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="medieval-subtitle text-sm">
                      🏰 ({territory.x}, {territory.y})
                    </div>
                    {isGameMaster && (
                      <div className="medieval-text text-sm">
                        {territory.playerName} - {territory.factionName}
                      </div>
                    )}
                    <div className="medieval-text text-xs">
                      {new Date(territory.claimedDate).toLocaleDateString('fr-FR')}
                    </div>
                    {territory.colonyName && (
                      <div className="text-green-800 text-sm font-medium mt-1">
                        🏘️ {territory.colonyName}
                      </div>
                    )}
                  </div>
                  
                  {!territory.colonyId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTerritory(territory);
                        setShowColonyModal(true);
                      }}
                      className="text-xs medieval-button medieval-button-primary px-2 py-1"
                    >
                      🏘️ Fonder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="mt-6 text-center">
        <div className="medieval-text text-sm">
          📊 Total: {territories.length} territoire{territories.length > 1 ? 's' : ''} | 
          🏘️ Colonies: {territories.filter(t => t.colonyId).length}
        </div>
      </div>

      {/* Modal de fondation de colonie - Style médiéval */}
      {showColonyModal && selectedTerritory && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-auto">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative parchment-panel p-6 w-96">
            <h4 className="medieval-subtitle mb-4">
              🏘️ Fonder une Colonie en ({selectedTerritory.x}, {selectedTerritory.y})
            </h4>
            <input
              type="text"
              value={colonyName}
              onChange={(e) => setColonyName(e.target.value)}
              placeholder="Nom de la colonie"
              className="w-full border-2 border-amber-700 rounded px-3 py-2 mb-4 bg-amber-50 medieval-text"
              maxLength={30}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowColonyModal(false);
                  setSelectedTerritory(null);
                  setColonyName('');
                }}
                className="flex-1 medieval-button py-2 px-4"
              >
                Annuler
              </button>
              <button
                onClick={handleFoundColony}
                disabled={!colonyName.trim()}
                className="flex-1 medieval-button medieval-button-success py-2 px-4 disabled:opacity-50"
              >
                Fonder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}