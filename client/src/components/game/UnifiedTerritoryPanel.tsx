import React, { useState, useEffect, useCallback } from 'react';
import { UnifiedTerritorySystem, Territory } from '../../lib/systems/UnifiedTerritorySystem';
import { usePlayer } from '../../lib/stores/usePlayer';
import { useAuth } from '../../lib/auth/AuthContext';
import { useNovaImperium } from '../../lib/stores/useNovaImperium';
import { useFactions } from '../../lib/stores/useFactions';
import { useMap } from '../../lib/stores/useMap';
import { useCustomAlert } from '../ui/CustomAlert';
import { fetchAllTerritories, fetchAllColonies, apiClaimTerritory, apiFoundColony, apiSetGovernor, apiExploitTerritory } from '../../lib/api/territoriesApi';
import { CityManagementPanel } from './CityManagementPanel';

const TERRAIN_LABELS: Record<string, string> = {
  fertile_land: 'Terres fertiles', plains: 'Plaines', forest: 'Forêt',
  hills: 'Collines', mountains: 'Montagnes', desert: 'Désert',
  swamp: 'Marécages', tundra: 'Toundra', wasteland: 'Terres désolées',
  sacred_plains: 'Plaine sacrée', enchanted_meadow: 'Prairie enchantée',
  ancient_ruins: 'Ruines anciennes', caves: 'Grottes', volcano: 'Volcan',
  shallow_water: 'Eau peu profonde', deep_water: 'Eau profonde',
};

const RESOURCE_LABELS: Record<string, string> = {
  wheat: '🌾 Blé', cattle: '🐄 Bétail', fish: '🐟 Poisson', deer: '🦌 Cerf',
  stone: '🪨 Pierre', copper: '🔶 Cuivre', iron: '⚒️ Fer', coal: '⚫ Charbon',
  gold: '🥇 Or', oil: '🛢️ Pétrole', gems: '💎 Gemmes', herbs: '🌿 Herbes',
  crystals: '💠 Cristaux', crabs: '🦀 Crabes', whales: '🐋 Baleines',
  sulfur: '🔥 Soufre', obsidian: '⚫ Obsidienne', ancient_artifacts: '📿 Artefacts',
  sacred_stones: '🔮 Pierres sacrées', fur: '🧥 Fourrure',
};

const BUILDING_LABELS: Record<string, string> = {
  granary: 'Grenier', barracks: 'Caserne', palace: 'Palais', courthouse: 'Tribunal',
  university: 'Université', port: 'Port', market: 'Marché', road: 'Route',
  shipyard: 'Chantier naval', farm: 'Ferme', sawmill: 'Scierie', garden: 'Jardin',
  fortress: 'Forteresse', watchtower: 'Tour de guet', fortifications: 'Fortifications',
  library: 'Bibliothèque', temple: 'Temple', sanctuary: 'Sanctuaire', obelisk: 'Obélisque',
  mystic_portal: 'Portail mystique', legendary_forge: 'Forge légendaire', laboratory: 'Laboratoire',
};

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
  const mapData = useMap.getState().mapData;

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
  // Exploitation V1 — sous-bloc de gestion territoire par ville
  const [openCityId, setOpenCityId] = useState<string | null>(null);

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

  useEffect(() => {
    const id = setInterval(loadTerritories, 10000);
    return () => clearInterval(id);
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

  // Phase Exploitation V1 — Exploiter un territoire depuis sa ville gestionnaire
  const handleExploitTerritory = async (territoryId: number, colonyId: number) => {
    setIsLoading(true);
    try {
      await apiExploitTerritory(territoryId, colonyId, "exploitation_post");
      showAlert({
        title: "Territoire exploité",
        message: "Le poste d'exploitation a été installé avec succès.",
        type: "success"
      });
      await reloadFromServer();
      const gameEngine = (window as any).gameEngine;
      if (gameEngine) gameEngine.render();
    } catch (err: any) {
      showAlert({
        title: "Exploitation impossible",
        message: err.message || "Erreur lors de l'exploitation du territoire.",
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
  // Enrichi V1 : territoires rattachés + stats exploitation.
  const managedCityEntries = !isAdmin ? territories.flatMap(t => {
    if (!t.colonyId) return [];
    const city = currentNovaImperium?.cities.find(c => c.x === t.x && c.y === t.y);
    if (!city) return [];
    const canManage = (t.ownerType === 'player' && t.ownerPlayerId === realPlayerId)
      || (t.ownerType === 'faction' && t.governorUserId === realPlayerId);
    if (!canManage) return [];

    // Territoires rattachés à cette ville (excluant la tuile ville elle-même)
    const managed = territories.filter(
      ter => !ter.colonyId && ter.managingColonyId != null && String(ter.managingColonyId) === t.colonyId
    );
    const exploitedCount    = managed.filter(ter => ter.isExploited).length;
    const exploitableCount  = managed.filter(ter =>
      !ter.isExploited &&
      UnifiedTerritorySystem.isTerritoryExploitableClientSide(ter, t.worldX, t.worldY).exploitable
    ).length;

    return [{ territory: t, city, managed, exploitedCount, exploitableCount }];
  }) : [];

  // ─── Section B : backlog claims non exploités, non rattachés à une ville ────────
  // Admin : vue large (tous territoires).
  // Non-admin : seulement les territoires non exploités, sans colonie, sans managingColonyId.
  // Les territoires avec managingColonyId sont déjà visibles dans le sous-menu de leur ville (section A).
  const visibleTerritoriesForPanel = isAdmin
    ? territories
    : territories.filter(t => !t.colonyId && !t.isExploited && t.managingColonyId == null);

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
          <div className="space-y-4">
            {managedCityEntries.map(({ territory, city, managed, exploitedCount, exploitableCount }) => {
              const colonyNumId = parseInt(territory.colonyId!, 10);
              const isFactionLeader = myMemberRole === 'leader' && territory.ownerType === 'faction';
              const isOpen = openCityId === territory.colonyId;
              return (
                <div key={`managed-${territory.x}-${territory.y}`} className="parchment-section p-3">
                  {/* En-tête ville */}
                  <div className="flex justify-between items-start">
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => navigateToTerritory(territory)}
                    >
                      <div className="medieval-subtitle text-sm">🏘️ {territory.colonyName}</div>
                      <div className="medieval-text text-xs">
                        ({territory.x}, {territory.y}) — {territory.ownerType === 'faction' ? `🏰 ${territory.factionName}` : '👤 Personnel'}
                      </div>
                      {/* Résumé gestion territoire */}
                      <div className="medieval-text text-xs text-amber-800 mt-1 space-y-0.5">
                        <span className="mr-3">📋 Gérés : {managed.length}</span>
                        <span className="mr-3">🟢 Exploitables : {exploitableCount}</span>
                        <span>✅ Exploités : {exploitedCount}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 ml-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setManagedCityId(city.id)}
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-2 py-1.5 rounded font-medium"
                      >
                        🏘️ Gérer la ville
                      </button>
                      <button
                        onClick={() => setOpenCityId(isOpen ? null : territory.colonyId!)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded font-medium"
                      >
                        {isOpen ? '▲ Fermer' : '▼ Territoires'}
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
                              >✓</button>
                              <button
                                onClick={() => { setGovernorAssignColonyId(null); setGovernorInput(''); }}
                                className="flex-1 text-xs bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded"
                              >✕</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setGovernorAssignColonyId(colonyNumId); setGovernorInput(''); }}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 rounded font-medium"
                          >🔑 Gouverneur</button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Sous-bloc Gestion des territoires */}
                  {isOpen && (
                    <div className="mt-3 border-t border-amber-300 pt-3 space-y-2">
                      <div className="medieval-subtitle text-xs mb-2">📍 Gestion des territoires rattachés</div>
                      {managed.length === 0 ? (
                        <div className="medieval-text text-xs text-gray-500 italic">Aucun territoire rattaché à cette ville.</div>
                      ) : (
                        managed.map(ter => {
                          const h = mapData?.[ter.y]?.[ter.x];
                          const terrain  = h ? (TERRAIN_LABELS[h.terrain] ?? h.terrain) : '—';
                          const resource = h?.resource ? (RESOURCE_LABELS[h.resource] ?? h.resource) : 'Aucune ressource';
                          const eligibility = !ter.isExploited
                            ? UnifiedTerritorySystem.isTerritoryExploitableClientSide(ter, territory.worldX, territory.worldY)
                            : null;
                          const statusLabel = ter.isExploited
                            ? '✅ Exploité'
                            : eligibility?.exploitable
                              ? '🟢 Exploitable'
                              : '🔒 Non exploitable';
                          const statusColor = ter.isExploited
                            ? 'text-green-700'
                            : eligibility?.exploitable
                              ? 'text-green-600'
                              : 'text-gray-500';

                          return (
                            <div
                              key={`ter-${ter.x}-${ter.y}`}
                              className="bg-amber-50 border border-amber-200 rounded p-2 cursor-pointer hover:bg-amber-100 transition-colors"
                              onClick={() => navigateToTerritory(ter)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="text-xs space-y-0.5">
                                  <div className="font-medium text-amber-900">({ter.x}, {ter.y})</div>
                                  <div className="text-amber-700">🗻 {terrain} · {resource}</div>
                                  <div className={`font-medium ${statusColor}`}>{statusLabel}</div>
                                  {ter.isExploited && (
                                    <div className="text-amber-600">🏗️ Bâtiment : Poste d'exploitation</div>
                                  )}
                                  {!ter.isExploited && eligibility && (
                                    <div className="text-gray-500">
                                      📏 Distance : {eligibility.distance}
                                      {eligibility.connectedByChain ? ' · 🔗 Connecté' : ''}
                                    </div>
                                  )}
                                </div>
                                {/* Bouton Exploiter */}
                                {!ter.isExploited && eligibility?.exploitable && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (ter.managingColonyId != null) {
                                        handleExploitTerritory(
                                          ter.id,
                                          ter.managingColonyId,
                                        );
                                      }
                                    }}
                                    disabled={isLoading || !ter.managingColonyId}
                                    className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 rounded font-medium ml-2 flex-shrink-0"
                                  >
                                    ⛏️ Exploiter
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ SECTION B : Mes territoires (backlog non exploités) ═══ */}
      <div className="parchment-section p-4">
        <h4 className="medieval-subtitle mb-1">
          📋 {isAdmin ? 'Tous les Territoires' : 'Mes Territoires non exploités'} ({visibleTerritoriesForPanel.length})
        </h4>
        {!isAdmin && (
          <p className="medieval-text text-xs text-amber-700 mb-3 italic">
            Claims non exploités et non encore rattachés à une ville — réserve disponible pour fondation.
          </p>
        )}

        {visibleTerritoriesForPanel.length === 0 ? (
          <div className="medieval-text text-center py-6">
            {isAdmin ? 'Aucun territoire revendiqué sur la carte' : 'Aucun claim non exploité dans votre réserve'}
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
                      🗺️ ({territory.x}, {territory.y})
                    </div>
                    {isAdmin && (
                      <div className="medieval-text text-sm">
                        {territory.playerName} — {territory.ownerFactionName ?? territory.factionName ?? '—'}
                      </div>
                    )}
                    <div className="medieval-text text-xs">
                      {new Date(territory.claimedDate).toLocaleDateString('fr-FR')}
                    </div>
                    {/* Badge colonie admin */}
                    {territory.colonyName && isAdmin && (() => {
                      const isManageable = (territory.ownerType === 'player' && territory.ownerPlayerId === realPlayerId)
                        || (territory.ownerType === 'faction' && territory.governorUserId === realPlayerId);
                      return isManageable
                        ? <div className="text-green-800 text-sm font-medium mt-1">🏘️ {territory.colonyName}</div>
                        : <div className="text-gray-400 text-xs italic mt-1">🏛️ Ville de faction</div>;
                    })()}
                    {/* Détails terrain / ressource / statut exploitation */}
                    {(() => {
                      const h = mapData?.[territory.y]?.[territory.x];
                      const terrain  = h ? (TERRAIN_LABELS[h.terrain] ?? h.terrain) : '—';
                      const resource = h?.resource ? (RESOURCE_LABELS[h.resource] ?? h.resource) : 'Aucune ressource';
                      return (
                        <div className="mt-1.5 text-xs text-amber-900 space-y-0.5 border-t border-amber-200 pt-1">
                          <div>🗻 {terrain} · {resource}</div>
                          {territory.managingColonyName && (
                            <div>🏘️ Géré par : <span className="font-medium">{territory.managingColonyName}</span></div>
                          )}
                          <div className="text-amber-600 italic">⚙️ Non exploité</div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                    {/* Admin : bouton Gérer la ville si colonie présente */}
                    {isAdmin && territory.colonyId && (() => {
                      const city = currentNovaImperium?.cities.find(
                        c => c.x === territory.x && c.y === territory.y
                      );
                      if (!city) return null;
                      return (
                        <button
                          onClick={() => setManagedCityId(city.id)}
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
                          onClick={() => handleFoundColonyFromTerritory(territory)}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded font-medium"
                        >
                          🏘️ Fonder une Colonie
                        </button>
                      ) : (
                        <div className="text-xs text-gray-500 px-3 py-2 border border-gray-300 rounded font-medium">
                          🏘️ Déplacez ici
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
