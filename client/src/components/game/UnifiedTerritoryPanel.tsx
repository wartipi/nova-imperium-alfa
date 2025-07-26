import React, { useState, useEffect } from 'react';
import { UnifiedTerritorySystem, Territory } from '../../lib/systems/UnifiedTerritorySystem';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useGameState } from '../../lib/stores/useGameState';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { useFactions } from '../../lib/stores/useFactions';
import { useMap } from '../../lib/stores/useMap';
import { useCustomAlert } from '../ui/CustomAlert';
import { CityFoundingModal } from './CityFoundingModal';

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
  const { showAlert, AlertComponent } = useCustomAlert();
  
  const [isLoading, setIsLoading] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [showColonyModal, setShowColonyModal] = useState(false);
  const [showFoundingModal, setShowFoundingModal] = useState(false);
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
  const handleClaimTerritory = () => {
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
          showAlert({
            title: "Territoire Revendiqué (Mode MJ)",
            message: `Territoire revendiqué en (${avatarPos.x}, ${avatarPos.y})`,
            type: "success"
          });
        } else {
          showAlert({
            title: "Territoire Revendiqué",
            message: `Territoire revendiqué en (${avatarPos.x}, ${avatarPos.y}) pour ${playerFaction?.name}!`,
            type: "success"
          });
        }
        loadTerritories();
      } else {
        // Rembourser les PA en cas d'échec
        if (!isGameMaster) {
          const { addActionPoints } = usePlayer.getState();
          addActionPoints(claimCost);
        }
        showAlert({
          title: "Revendication Échouée",
          message: "Ce territoire est déjà revendiqué par un autre joueur.",
          type: "error"
        });
      }
    } catch (error) {
      console.error('Erreur lors de la revendication:', error);
      showAlert({
        title: "Erreur",
        message: "Erreur lors de la revendication du territoire",
        type: "error"
      });
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
    const avatarPos = getAvatarPosition();
    console.log('🧭 Vérification position avatar:', {
      avatarHex: avatarPos,
      territoryHex: { x: territory.x, y: territory.y },
      isOnTerritory: avatarPos.x === territory.x && avatarPos.y === territory.y
    });
    return avatarPos.x === territory.x && avatarPos.y === territory.y;
  };

  // Fonder une colonie directement à la position de l'avatar avec modal
  const handleFoundColonyAtAvatar = () => {
    const avatarPos = getAvatarPosition();
    const { isGameMaster } = useGameState.getState();
    
    // Validation des règles (sauf pour MJ)
    if (!isGameMaster) {
      const validation = UnifiedTerritorySystem.canFoundColony(avatarPos.x, avatarPos.y, 'player');
      if (!validation.canFound) {
        showAlert({
          title: "Fondation Impossible",
          message: validation.reason,
          type: "error"
        });
        return;
      }
    }

    // Stocker la position pour le modal
    setSelectedTerritory({
      x: avatarPos.x,
      y: avatarPos.y,
      playerId: 'player',
      playerName: playerName,
      factionId: playerFaction?.id || 'gm_faction',
      factionName: playerFaction?.name || 'Administration MJ',
      claimedDate: Date.now(),
      colonyId: null,
      colonyName: null,
      controlledByColony: null
    });
    setShowFoundingModal(true);
  };

  // Confirmer la fondation avec le nom choisi
  const handleConfirmFounding = (cityName: string) => {
    if (!selectedTerritory) return;

    const { isGameMaster } = useGameState.getState();
    const colonyId = `colony_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 1. Créer dans UnifiedTerritorySystem
    const success = UnifiedTerritorySystem.foundColony(
      selectedTerritory.x,
      selectedTerritory.y,
      colonyId,
      cityName,
      selectedTerritory.playerId,
      selectedTerritory.playerName,
      selectedTerritory.factionId,
      selectedTerritory.factionName
    );

    if (success) {
      // 2. Créer dans Nova Imperium avec displayName
      const { foundColony, renameCityDisplayName } = useNovaImperium.getState();
      const citySuccess = foundColony(
        selectedTerritory.x,
        selectedTerritory.y,
        colonyId,
        selectedTerritory.playerId,
        selectedTerritory.playerName,
        selectedTerritory.factionId,
        selectedTerritory.factionName
      );

      if (citySuccess) {
        // 3. Définir le displayName pour affichage
        renameCityDisplayName(colonyId, cityName);

        // 4. Dépenser les PA et afficher le succès
        if (!isGameMaster) {
          spendActionPoints(15);
        }

        showAlert({
          title: "Colonie Fondée",
          message: isGameMaster 
            ? `[MODE MJ] Colonie "${cityName}" fondée avec succès !`
            : `Colonie "${cityName}" fondée avec succès ! (15 PA dépensés)`,
          type: "success"
        });
        
        // 5. Rafraîchir
        loadTerritories();
        setTimeout(() => {
          const gameEngine = (window as any).gameEngine;
          if (gameEngine) {
            gameEngine.render();
          }
        }, 100);
      }
    } else {
      showAlert({
        title: "Erreur",
        message: "Erreur lors de la fondation de la colonie.",
        type: "error"
      });
    }

    setShowFoundingModal(false);
    setSelectedTerritory(null);
  };

  // Fonction pour fonder une colonie directement depuis la liste des territoires
  const handleFoundColonyFromTerritory = (territory: Territory) => {
    const { isGameMaster } = useGameState.getState();
    
    // Validation des règles (sauf pour MJ)
    if (!isGameMaster) {
      const validation = UnifiedTerritorySystem.canFoundColony(territory.x, territory.y, territory.playerId);
      if (!validation.canFound) {
        showAlert({
          title: "Fondation Impossible",
          message: validation.reason,
          type: "error"
        });
        return;
      }
    }

    // Utiliser le même modal pour la cohérence
    setSelectedTerritory(territory);
    setShowFoundingModal(true);
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
        showAlert({
          title: "Colonie Fondée",
          message: `Colonie "${colonyName.trim()}" fondée avec succès!`,
          type: "success"
        });
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
        showAlert({
          title: "Erreur",
          message: "Erreur lors de la création de la ville sur la carte.",
          type: "error"
        });
      }
    } else {
      showAlert({
        title: "Fondation Impossible",
        message: "Impossible de fonder la colonie sur ce territoire.",
        type: "error"
      });
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
          className="w-full medieval-button medieval-button-success py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {isLoading ? 'Revendication...' : `🚩 Revendiquer (${isGameMaster ? '0' : '10'} PA)`}
        </button>

        {/* Bouton pour fonder une colonie directement */}
        <button
          onClick={handleFoundColonyAtAvatar}
          disabled={isLoading || (!isGameMaster && actionPoints < 15)}
          className="w-full medieval-button medieval-button-primary py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Fondation...' : `🏘️ Fonder une Colonie (${isGameMaster ? '0' : '15'} PA)`}
        </button>

        {!isGameMaster && !playerFaction && (
          <p className="text-red-700 text-xs mt-3 font-medium">⚠️ Vous devez faire partie d'une faction</p>
        )}
        {!isGameMaster && actionPoints < 15 && (
          <p className="text-red-700 text-xs mt-2 font-medium">⚠️ Pas assez de PA pour fonder une colonie</p>
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
                  
                  {/* Bouton Fonder une Colonie - seulement si l'avatar est présent sur ce territoire */}
                  {!territory.colonyId && (
                    <div className="flex flex-col gap-2">
                      {isAvatarOnTerritory(territory) ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFoundColonyFromTerritory(territory);
                          }}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium"
                        >
                          🏘️ Fonder une Colonie
                        </button>
                      ) : (
                        <div className="text-xs text-gray-500 px-3 py-2 border border-gray-300 rounded font-medium">
                          🏘️ Déplacez votre avatar ici
                        </div>
                      )}
                    </div>
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

      {/* Modal de Fondation Moderne */}
      {showFoundingModal && selectedTerritory && (
        <CityFoundingModal 
          onClose={() => {
            setShowFoundingModal(false);
            setSelectedTerritory(null);
          }}
          onConfirm={handleConfirmFounding}
          position={{ x: selectedTerritory.x, y: selectedTerritory.y }}
        />
      )}

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