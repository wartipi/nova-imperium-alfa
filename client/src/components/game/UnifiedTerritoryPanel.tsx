import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedTerritorySystem, Territory } from '../../lib/systems/UnifiedTerritorySystem';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { useFactions } from '../../lib/stores/useFactions';
import { useMap } from '../../lib/stores/useMap';
import { useCustomAlert } from '../ui/CustomAlert';
import { fetchAllTerritories, fetchAllColonies, apiClaimTerritory, apiFoundColony, apiSetGovernor } from '../../lib/api/territoriesApi';
import { CityManagementPanel } from './CityManagementPanel';

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
  const { isAdmin, currentUser } = useAuth();
  const { playerFaction, myMemberRole } = useFactions();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { currentNovaImperium } = useNovaImperium();

  // Identité réelle du joueur pour getAccessibleTerritories
  const realPlayerId   = currentUser ?? playerName;
  const realFactionId  = playerFaction ? String(playerFaction.id) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [showColonyModal, setShowColonyModal] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [colonyName, setColonyName] = useState('');
  const [managedCityId, setManagedCityId] = useState<string | null>(null);
  // Phase 13 — Attribution gouverneur
  const [governorAssignColonyId, setGovernorAssignColonyId] = useState<number | null>(null);
  const [governorInput, setGovernorInput] = useState('');
  // Phase 12 — choix ownership lors du claim
  const [ownerType, setOwnerType] = useState<'player' | 'faction'>(
    playerFaction ? 'faction' : 'player'
  );

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
      : UnifiedTerritorySystem.getAccessibleTerritories(realPlayerId, realFactionId);
    setTerritories(refreshed);
  }, [isAdmin, realPlayerId, realFactionId]);

  // Charger les territoires depuis la façade locale
  const loadTerritories = useCallback(() => {
    const list = isAdmin
      ? UnifiedTerritorySystem.getAllTerritories()
      : UnifiedTerritorySystem.getAccessibleTerritories(realPlayerId, realFactionId);
    setTerritories(list);
  }, [isAdmin, realPlayerId, realFactionId]);

  useEffect(() => {
    loadTerritories();
  }, [loadTerritories]);

  // Revendiquer le territoire à la position de l'avatar
  const handleClaimTerritory = async () => {
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

    // Choisir l'ownerType effectif :
    // sans faction → toujours 'player' ; avec faction → selon le choix de l'UI
    const effectiveOwnerType: 'player' | 'faction' = playerFaction ? ownerType : 'player';

    setIsLoading(true);
    try {
      const avatarPos = getAvatarPosition();
      const { originWorldX, originWorldY } = useMap.getState();
      const worldX = avatarPos.x + originWorldX;
      const worldY = avatarPos.y + originWorldY;

      console.log(`[Claim] hex=(${avatarPos.x},${avatarPos.y}) → world=(${worldX},${worldY}) ownerType=${effectiveOwnerType}`);

      await apiClaimTerritory(worldX, worldY, effectiveOwnerType);

      const ownerLabel = effectiveOwnerType === 'faction'
        ? `pour ${playerFaction?.name}`
        : 'pour vous personnellement';

      showAlert({
        title: "Territoire Revendiqué",
        message: `Territoire revendiqué en (${avatarPos.x}, ${avatarPos.y}) ${ownerLabel} !`,
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

  // Phase 13 — Attribuer un gouverneur à une colonie de faction
  const handleSetGovernor = async (colonyId: number) => {
    const trimmed = governorInput.trim();
    if (!trimmed) return;
    setIsLoading(true);
    try {
      await apiSetGovernor(colonyId, trimmed);
      showAlert({
        title: "Gouverneur attribué",
        message: `Le gouverneur de la colonie a été mis à jour.`,
        type: "success"
      });
      setGovernorAssignColonyId(null);
      setGovernorInput('');
      await reloadFromServer();
    } catch (err: any) {
      showAlert({
        title: "Erreur",
        message: err.message || "Impossible d'attribuer le gouverneur.",
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

  // ─── Section A : pré-calcul des villes gérables (non-admin uniquement) ───────
  // Une entrée = un territoire avec colonie dont canManage === true pour ce joueur.
  const managedCityEntries = !isAdmin ? territories.flatMap(t => {
    if (!t.colonyId) return [];
    const city = currentNovaImperium?.cities.find(c => c.x === t.x && c.y === t.y);
    if (!city) return [];
    const canManage = (t.ownerType === 'player' && t.ownerPlayerId === realPlayerId)
      || (t.ownerType === 'faction' && t.governorUserId === realPlayerId);
    if (!canManage) return [];
    return [{ territory: t, city }];
  }) : [];

  // ─── Section B : territoires visibles (non-admin = sans colonie uniquement) ──
  // Admin conserve la vue large (tous territoires).
  // Non-admin : les villes gérables sont dans section A — section B ne montre
  // que les territoires sans colonie (fondation possible) pour éviter toute confusion.
  const visibleTerritoriesForPanel = isAdmin
    ? territories
    : territories.filter(t => !t.colonyId);

  return (
    <div className="medieval-text h-full overflow-y-auto">
      {AlertComponent}

      {/* En-tête */}
      <div className="mb-6">
        <h3 className="medieval-subtitle mb-4">
          {isAdmin ? 'Gestion Ville/Territoire (Admin)' : 'Mes Villes & Territoires'}
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

        {/* Mini-choix owner — affiché uniquement si le joueur a une faction */}
        {!isAdmin && playerFaction && (
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setOwnerType('faction')}
              className={`flex-1 text-sm py-2 px-3 rounded border font-medium transition-colors ${
                ownerType === 'faction'
                  ? 'bg-amber-700 text-white border-amber-800'
                  : 'bg-amber-50 text-amber-900 border-amber-400 hover:bg-amber-100'
              }`}
            >
              🏰 Pour ma faction
            </button>
            <button
              onClick={() => setOwnerType('player')}
              className={`flex-1 text-sm py-2 px-3 rounded border font-medium transition-colors ${
                ownerType === 'player'
                  ? 'bg-blue-700 text-white border-blue-800'
                  : 'bg-blue-50 text-blue-900 border-blue-400 hover:bg-blue-100'
              }`}
            >
              👤 Pour moi
            </button>
          </div>
        )}

        <button
          onClick={handleClaimTerritory}
          disabled={isLoading}
          className="w-full medieval-button medieval-button-success py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {isLoading ? 'Revendication...' : `🚩 Revendiquer (${isAdmin ? '0' : '10'} PA)`}
        </button>
      </div>

      {/* ═══ SECTION A : Mes villes gérables ═══ */}
      {!isAdmin && managedCityEntries.length > 0 && (
        <div className="parchment-section p-4 mb-6">
          <h4 className="medieval-subtitle mb-4">🏘️ Mes villes gérables ({managedCityEntries.length})</h4>
          <div className="space-y-3">
            {managedCityEntries.map(({ territory, city }) => {
              const colonyNumId = parseInt(territory.colonyId!, 10);
              const isFactionLeader = myMemberRole === 'leader' && territory.ownerType === 'faction';
              return (
                <div
                  key={`managed-${territory.x}-${territory.y}`}
                  className="parchment-section p-3 cursor-pointer hover:scale-105 transition-all duration-200"
                  onClick={() => navigateToTerritory(territory)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="medieval-subtitle text-sm">🏘️ {territory.colonyName}</div>
                      <div className="medieval-text text-xs">
                        ({territory.x}, {territory.y}) — {territory.ownerType === 'faction' ? `🏰 ${territory.factionName}` : '👤 Personnel'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setManagedCityId(city.id)}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded font-medium"
                      >
                        🏘️ Gérer la ville
                      </button>
                      {isFactionLeader && !isNaN(colonyNumId) && (
                        governorAssignColonyId === colonyNumId ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={governorInput}
                              onChange={e => setGovernorInput(e.target.value)}
                              placeholder="ID du nouveau gouverneur"
                              className="text-xs border border-amber-600 rounded px-2 py-1 bg-amber-50 w-full"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSetGovernor(colonyNumId)}
                                disabled={!governorInput.trim() || isLoading}
                                className="flex-1 text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 rounded"
                              >
                                ✓ Confirmer
                              </button>
                              <button
                                onClick={() => { setGovernorAssignColonyId(null); setGovernorInput(''); }}
                                className="flex-1 text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setGovernorAssignColonyId(colonyNumId); setGovernorInput(''); }}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded font-medium"
                          >
                            🔑 Attribuer gouverneur
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTION B : Mes territoires ═══ */}
      <div className="parchment-section p-4">
        <h4 className="medieval-subtitle mb-4">
          📋 {isAdmin ? 'Tous les Territoires' : 'Mes Territoires'} ({visibleTerritoriesForPanel.length})
        </h4>

        {visibleTerritoriesForPanel.length === 0 ? (
          <div className="medieval-text text-center py-6">
            {isAdmin ? 'Aucun territoire revendiqué sur la carte' : 'Vous n\'avez encore revendiqué aucun territoire'}
          </div>
        ) : (
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {visibleTerritoriesForPanel.map((territory) => (
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
                    {/* Badge colonie : vert si gérable, grisé+italique si non gérable */}
                    {territory.colonyName && (() => {
                      const isManageable = isAdmin
                        || (territory.ownerType === 'player' && territory.ownerPlayerId === realPlayerId)
                        || (territory.ownerType === 'faction' && territory.governorUserId === realPlayerId);
                      return isManageable
                        ? <div className="text-green-800 text-sm font-medium mt-1">🏘️ {territory.colonyName}</div>
                        : <div className="text-gray-400 text-xs italic mt-1">🏛️ Ville de faction</div>;
                    })()}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Section B : bouton Gérer uniquement pour admin (les non-admins utilisent section A) */}
                    {isAdmin && territory.colonyId && (() => {
                      const city = currentNovaImperium?.cities.find(
                        c => c.x === territory.x && c.y === territory.y
                      );
                      if (!city) return null;
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); setManagedCityId(city.id); }}
                          className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded font-medium"
                        >
                          🏘️ Gérer la ville
                        </button>
                      );
                    })()}

                    {/* Bouton Fonder une Colonie — seulement si pas encore de colonie */}
                    {!territory.colonyId && (
                      isAvatarOnTerritory(territory) ? (
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
                      )
                    )}
                  </div>
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

      {/* Pipeline complet de gestion de ville */}
      {managedCityId && (
        <CityManagementPanel
          cityId={managedCityId}
          onClose={() => setManagedCityId(null)}
        />
      )}
    </div>
  );
}
