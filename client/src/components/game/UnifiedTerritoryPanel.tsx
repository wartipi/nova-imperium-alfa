import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedTerritorySystem, Territory } from '../../lib/systems/UnifiedTerritorySystem';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { useFactions } from '../../lib/stores/useFactions';
import { useMap } from '../../lib/stores/useMap';
import { useCustomAlert } from '../ui/CustomAlert';
import { fetchAllTerritories, fetchAllColonies, apiClaimTerritory, apiFoundColony } from '../../lib/api/territoriesApi';

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
  const { isAdmin } = useAuth();
  const { playerFaction } = useFactions();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [isLoading, setIsLoading] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [showColonyModal, setShowColonyModal] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [colonyName, setColonyName] = useState('');

  // Recharger la façade locale depuis le serveur puis rafraîchir l'affichage
  const reloadFromServer = useCallback(async () => {
    const { originWorldX, originWorldY } = useMap.getState();
    const [serverTerritories, serverColonies] = await Promise.all([
      fetchAllTerritories(),
      fetchAllColonies(),
    ]);
    UnifiedTerritorySystem.loadFromServer(serverTerritories, serverColonies, originWorldX, originWorldY);
    const refreshed = isAdmin
      ? UnifiedTerritorySystem.getAllTerritories()
      : UnifiedTerritorySystem.getPlayerTerritories('player');
    setTerritories(refreshed);
  }, [isAdmin]);

  // Charger les territoires depuis la façade locale
  const loadTerritories = useCallback(() => {
    const list = isAdmin
      ? UnifiedTerritorySystem.getAllTerritories()
      : UnifiedTerritorySystem.getPlayerTerritories('player');
    setTerritories(list);
  }, [isAdmin]);

  useEffect(() => {
    loadTerritories();
  }, [loadTerritories]);

  // Revendiquer le territoire à la position de l'avatar
  const handleClaimTerritory = async () => {
    if (!isAdmin && !playerFaction) {
      showAlert({
        title: "Faction requise",
        message: "Vous devez faire partie d'une faction pour revendiquer un territoire.",
        type: "error"
      });
      return;
    }

    const claimCost = 10;
    if (!isAdmin && actionPoints < claimCost) {
      showAlert({
        title: "Points d'Action insuffisants",
        message: `${claimCost} PA requis pour revendiquer un territoire.`,
        type: "error"
      });
      return;
    }

    if (!isAdmin) {
      const success = spendActionPoints(claimCost);
      if (!success) {
        showAlert({ title: "Erreur", message: "Impossible de dépenser les Points d'Action.", type: "error" });
        return;
      }
    }

    setIsLoading(true);
    try {
      const avatarPos = getAvatarPosition();
      const { originWorldX, originWorldY } = useMap.getState();
      const worldX = avatarPos.x + originWorldX;
      const worldY = avatarPos.y + originWorldY;

      console.log(`[Claim] hex=(${avatarPos.x},${avatarPos.y}) → world=(${worldX},${worldY})`);

      await apiClaimTerritory(worldX, worldY);

      showAlert({
        title: "Territoire Revendiqué",
        message: `Territoire revendiqué en (${avatarPos.x}, ${avatarPos.y})${playerFaction ? ` pour ${playerFaction.name}` : ''} !`,
        type: "success"
      });

      await reloadFromServer();

      const gameEngine = (window as any).gameEngine;
      if (gameEngine) gameEngine.render();

    } catch (err: any) {
      // Rembourser les PA en cas d'échec serveur
      if (!isAdmin) {
        const { addActionPoints } = usePlayer.getState();
        addActionPoints(claimCost);
      }
      showAlert({
        title: "Revendication Échouée",
        message: err.message || "Erreur lors de la revendication du territoire.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Naviguer vers un territoire
  const navigateToTerritory = (territory: Territory) => {
    const { setSelectedHex } = useMap.getState();
    setSelectedHex({ x: territory.x, y: territory.y });
    const gameEngine = (window as any).gameEngine;
    if (gameEngine) gameEngine.centerCameraOnPosition(territory.x, territory.y);
  };

  // Vérifier si l'avatar du joueur est présent sur ce territoire
  const isAvatarOnTerritory = (territory: Territory): boolean => {
    const avatarPos = getAvatarPosition();
    return avatarPos.x === territory.x && avatarPos.y === territory.y;
  };

  // Ouvrir le modal de fondation depuis la liste des territoires
  const handleFoundColonyFromTerritory = (territory: Territory) => {
    setSelectedTerritory(territory);
    setShowColonyModal(true);
  };

  // Fonder une colonie via le serveur
  const handleFoundColony = async () => {
    if (!selectedTerritory || !colonyName.trim()) return;

    setIsLoading(true);
    try {
      const { originWorldX, originWorldY } = useMap.getState();
      const worldX = selectedTerritory.worldX;
      const worldY = selectedTerritory.worldY;
      const trimmedName = colonyName.trim();

      console.log(`[Colony] Fondation "${trimmedName}" → world=(${worldX},${worldY})`);

      const colony = await apiFoundColony(worldX, worldY, trimmedName);

      // Recharger la façade locale depuis le serveur
      await reloadFromServer();

      // Phase 6 : hydratation des villes depuis le serveur (source de vérité).
      // Remplace l'ancienne création locale dans useNovaImperium.foundColony().
      const { hydrateCitiesFromServer } = useNovaImperium.getState();
      await hydrateCitiesFromServer();

      showAlert({
        title: "Colonie Fondée",
        message: `Colonie "${trimmedName}" fondée avec succès${colony.isCapital ? ' — Capitale de votre faction !' : ' !'}`,
        type: "success"
      });

      setColonyName('');
      setShowColonyModal(false);
      setSelectedTerritory(null);

      const gameEngine = (window as any).gameEngine;
      if (gameEngine) gameEngine.render();

    } catch (err: any) {
      showAlert({
        title: "Fondation Impossible",
        message: err.message || "Erreur lors de la fondation de la colonie.",
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="medieval-text h-full overflow-y-auto">
      {AlertComponent}

      {/* En-tête */}
      <div className="mb-6">
        <h3 className="medieval-subtitle mb-4">
          {isAdmin ? 'Gestion de Territoire (Admin)' : 'Mes Territoires'}
        </h3>
      </div>

      {/* Aide fondation */}
      {!isAdmin && (
        <div className="parchment-section p-3 mb-4 border-l-4 border-amber-600 bg-amber-50">
          <p className="medieval-text text-xs text-amber-900">
            <span className="font-semibold">Pour fonder une colonie :</span> revendiquez d'abord un territoire (bouton ci-dessous), puis déplacez votre avatar dessus — le bouton de fondation apparaîtra dans la liste.
          </p>
        </div>
      )}

      {/* Section de revendication */}
      <div className="parchment-section p-4 mb-6">
        <h4 className="medieval-subtitle mb-3">🗺️ Revendiquer un Territoire</h4>
        <p className="medieval-text text-sm mb-4">
          Placez votre avatar sur une case libre et cliquez sur le bouton ci-dessous.
        </p>
        <button
          onClick={handleClaimTerritory}
          disabled={isLoading || (!isAdmin && !playerFaction)}
          className="w-full medieval-button medieval-button-success py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {isLoading ? 'Revendication...' : `🚩 Revendiquer (${isAdmin ? '0' : '10'} PA)`}
        </button>

        {!isAdmin && !playerFaction && (
          <p className="text-red-700 text-xs mt-3 font-medium">⚠️ Vous devez faire partie d'une faction</p>
        )}
      </div>

      {/* Liste des territoires */}
      <div className="parchment-section p-4">
        <h4 className="medieval-subtitle mb-4">
          📋 {isAdmin ? 'Tous les Territoires' : 'Mes Territoires'} ({territories.length})
        </h4>

        {territories.length === 0 ? (
          <div className="medieval-text text-center py-6">
            {isAdmin ? 'Aucun territoire revendiqué sur la carte' : 'Vous n\'avez encore revendiqué aucun territoire'}
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
                    {isAdmin && (
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

                  {/* Bouton Fonder une Colonie — seulement si l'avatar est présent et pas encore de colonie */}
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
          📊 Total: {territories.length} territoire{territories.length > 1 ? 's' : ''} |{' '}
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
                disabled={!colonyName.trim() || isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded"
              >
                {isLoading ? '...' : '🏘️ Fonder la Colonie'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
