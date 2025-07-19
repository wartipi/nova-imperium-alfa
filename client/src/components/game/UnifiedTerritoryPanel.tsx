import React, { useState, useEffect } from 'react';
import { UnifiedTerritorySystem, Territory } from '../../lib/systems/UnifiedTerritorySystem';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useGameState } from '../../lib/stores/useGameState';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
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
  const [showExpansionMode, setShowExpansionMode] = useState(false);
  const [selectedColony, setSelectedColony] = useState<string | null>(null);

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
    
    // Centrer la caméra avec la bonne méthode
    if ((window as any).gameEngine) {
      (window as any).gameEngine.centerCameraOnPosition(territory.x, territory.y);
    }
  };

  // Vérifier si l'avatar du joueur est présent sur ce territoire
  const isAvatarOnTerritory = (territory: Territory): boolean => {
    const { avatarPosition } = usePlayer.getState();
    return avatarPosition.x === territory.x && avatarPosition.y === territory.y;
  };

  // Fonction pour fonder une colonie directement depuis la liste des territoires
  const handleFoundColonyFromTerritory = async (territory: Territory) => {
    const { isGameMaster } = useGameState.getState();
    
    // Validation des règles (sauf pour MJ)
    if (!isGameMaster) {
      const validation = UnifiedTerritorySystem.canFoundColony(territory.x, territory.y, territory.playerId);
      if (!validation.canFound) {
        alert(`❌ Impossible de fonder une colonie :\n${validation.reason}`);
        return;
      }
    }

    // Demander le nom de la colonie
    const colonyName = prompt("Nom de la colonie :") || null;
    if (!colonyName) return;

    // Fondation de la colonie
    const colonyId = `colony_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const success = UnifiedTerritorySystem.foundColony(
      territory.x,
      territory.y,
      colonyId,
      colonyName.trim(),
      territory.playerId,
      territory.playerName,
      territory.factionId,
      territory.factionName
    );

    if (success) {
      // Dépenser les PA (sauf mode MJ)
      if (!isGameMaster) {
        const { spendActionPoints } = usePlayer.getState();
        spendActionPoints(15);
        alert(`✅ Colonie "${colonyName}" fondée avec succès ! (15 PA dépensés)`);
      } else {
        alert(`[MODE MJ] Colonie "${colonyName}" fondée avec succès !`);
      }
      
      // Rafraîchir la liste
      loadTerritories();
      
      // Rafraîchir l'affichage de la carte
      setTimeout(() => {
        const gameEngine = (window as any).gameEngine;
        if (gameEngine) {
          gameEngine.render();
        }
      }, 100);
    } else {
      alert('Erreur lors de la fondation de la colonie.');
    }
  };

  // Fonder une colonie (ancienne méthode pour le modal)
  const handleFoundColony = () => {
    if (!selectedTerritory || !colonyName.trim()) return;

    // 1. Créer la colonie dans UnifiedTerritorySystem
    const territorySuccess = UnifiedTerritorySystem.foundColony(
      selectedTerritory.x,
      selectedTerritory.y,
      colonyName.trim()
    );

    if (territorySuccess) {
      // 2. Créer la ville dans le système useNovaImperium pour l'affichage
      const { foundColony } = useNovaImperium.getState();
      const colonySuccess = foundColony(
        selectedTerritory.x,
        selectedTerritory.y,
        colonyName.trim(),
        'player',
        playerName || 'Joueur',
        selectedTerritory.factionId || 'gm_faction',
        selectedTerritory.factionName || 'Administration MJ'
      );

      if (colonySuccess) {
        alert(`Colonie "${colonyName.trim()}" fondée avec succès!`);
        setColonyName('');
        setShowColonyModal(false);
        setSelectedTerritory(null);
        loadTerritories();
        
        // Rafraîchir l'affichage de la carte
        setTimeout(() => {
          const gameEngine = (window as any).gameEngine;
          if (gameEngine) {
            gameEngine.render();
          }
        }, 100);
      } else {
        alert('Erreur lors de la création de la ville sur la carte.');
      }
    } else {
      alert('Impossible de fonder la colonie sur ce territoire.');
    }
  };

  // Étendre le territoire d'une colonie
  const handleExpandColonyTerritory = async () => {
    if (!selectedColony) {
      alert('Veuillez sélectionner une colonie');
      return;
    }

    if (!isGameMaster && !playerFaction) {
      alert('Vous devez faire partie d\'une faction pour étendre un territoire.');
      return;
    }

    setIsLoading(true);
    try {
      const avatarPos = getAvatarPosition();
      console.log('🎯 Position avatar pour extension:', avatarPos);

      // Vérifier les Points d'Action (sauf en mode MJ)
      const expandCost = 8;
      if (!isGameMaster && actionPoints < expandCost) {
        alert(`Pas assez de Points d'Action (${expandCost} PA requis)`);
        return;
      }

      // Dépenser les PA (sauf en mode MJ)
      if (!isGameMaster) {
        const success = spendActionPoints(expandCost);
        if (!success) {
          alert('Impossible de dépenser les Points d\'Action');
          return;
        }
      }

      // Étendre le territoire de la colonie
      const success = UnifiedTerritorySystem.expandColonyTerritory(
        selectedColony,
        avatarPos.x,
        avatarPos.y,
        'player',
        playerName,
        playerFaction?.id || 'gm_faction',
        playerFaction?.name || 'Administration MJ'
      );

      if (success) {
        const colony = territories.find(t => t.colonyId === selectedColony);
        if (isGameMaster) {
          alert(`[MODE MJ] Case (${avatarPos.x}, ${avatarPos.y}) ajoutée au territoire de ${colony?.colonyName}`);
        } else {
          alert(`Case (${avatarPos.x}, ${avatarPos.y}) ajoutée au territoire de ${colony?.colonyName} ! (${expandCost} PA dépensés)`);
        }
        loadTerritories();
        
        // Forcer le re-rendu de la carte
        if ((window as any).gameEngine) {
          (window as any).gameEngine.render();
        }
      } else {
        alert('Impossible d\'étendre le territoire. Vérifiez que la case est adjacente et libre.');
        // Rembourser les PA en cas d'échec
        if (!isGameMaster) {
          const { addActionPoints } = usePlayer.getState();
          addActionPoints(expandCost);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'extension territoriale:', error);
      alert('Erreur lors de l\'extension territoriale');
    } finally {
      setIsLoading(false);
    }
  };

  // Obtenir les colonies pour l'expansion territoriale
  const hasColonies = territories.some(t => t.colonyId);

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

      {/* Section d'expansion territoriale */}
      {hasColonies && (
        <div className="parchment-section p-4 mb-6">
          <h4 className="medieval-subtitle mb-3">🗺️ Expansion Territoriale</h4>
          <p className="medieval-text text-sm mb-4">
            Étendez le territoire d'une colonie en ajoutant des cases adjacentes.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Colonie à étendre:</label>
            <select 
              value={selectedColony || ''} 
              onChange={(e) => setSelectedColony(e.target.value || null)}
              className="w-full p-2 border border-amber-400 rounded bg-amber-50"
            >
              <option value="">Sélectionnez une colonie</option>
              {territories
                .filter(t => t.colonyId)
                .map(territory => (
                  <option key={territory.colonyId} value={territory.colonyId}>
                    {territory.colonyName} ({territory.x}, {territory.y})
                  </option>
                ))
              }
            </select>
          </div>
          
          <div className="text-xs text-gray-600 mb-3">
            💡 Placez votre avatar sur une case adjacente à votre colonie pour l'ajouter à son territoire
          </div>
          
          <button
            onClick={handleExpandColonyTerritory}
            disabled={isLoading || !selectedColony}
            className="w-full medieval-button medieval-button-primary py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Extension en cours...' : 
             isGameMaster ? '🎯 Étendre Territoire (Mode MJ)' : 
             '🗺️ Étendre Territoire (8 PA)'}
          </button>
        </div>
      )}

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
                  
                  {/* Bouton Fonder une Colonie - seulement si l'avatar est présent sur ce territoire */}
                  {!territory.colonyId && isAvatarOnTerritory(territory) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFoundColonyFromTerritory(territory);
                      }}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium"
                    >
                      🏘️ Fonder une Colonie
                    </button>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div className="mt-4 text-center">
        <div className="text-amber-700 text-sm">
          📊 Total: {territories.length} territoire{territories.length > 1 ? 's' : ''} | 
          🏘️ Colonies: {territories.filter(t => t.colonyId).length}
        </div>
      </div>

      {/* Modal de fondation de colonie */}
      {showColonyModal && selectedTerritory && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] pointer-events-auto">
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          <div className="relative bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-6 w-96">
            <h4 className="font-bold text-amber-900 mb-4">
              🏘️ Fonder une Colonie en ({selectedTerritory.x}, {selectedTerritory.y})
            </h4>
            <input
              type="text"
              value={colonyName}
              onChange={(e) => setColonyName(e.target.value)}
              placeholder="Nom de la colonie"
              className="w-full border-2 border-amber-700 rounded px-3 py-2 mb-4 bg-amber-50"
              maxLength={30}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowColonyModal(false);
                  setSelectedTerritory(null);
                  setColonyName('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
              >
                Annuler
              </button>
              <button
                onClick={handleFoundColony}
                disabled={!colonyName.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded"
              >
                🏘️ Fonder la Colonie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}