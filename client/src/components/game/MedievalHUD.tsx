import React, { useState, useEffect } from "react";
import { useGameState } from "../../lib/stores/useGameState";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { useMap } from "../../lib/stores/useMap";
import { useAudio } from "../../lib/stores/useAudio";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { MiniMap } from "./MiniMap";
import { TreasuryPanel } from "./TreasuryPanel";
import { postProductionTick, type ProductionTickResult } from "../../lib/api/economyApi";
import { fetchPlayerState } from "../../lib/api/playerStateApi";
import { apiProductionTick } from "../../lib/api/citiesApi";
import { useDualResourceSync } from "../../hooks/useDualResourceSync";

import { ActivityReportPanel } from "./ActivityReportPanel";
import { CouriersPanel } from "./CouriersPanel";
import { TreatiesPanel } from "./TreatiesPanel";
import { EventPanel } from "./EventPanel";
import { PublicAnnouncementPanel } from "./PublicAnnouncementPanel";
import { GameGuidePanel } from "./GameGuidePanel";
import { HelpPanel } from "./HelpPanel";
import { CharacterSelector, CharacterOption } from "./CharacterSelector";
import { CompetenceTree } from "./CompetenceTree";
import { TileInfoPanel } from "./TileInfoPanel";
import { ReputationPanel } from "./ReputationPanel";
import { FactionPanel } from "./FactionPanel";
import { UnifiedTerritoryPanel } from "./UnifiedTerritoryPanel";
import { ReputationManagementPanel } from "./ReputationManagementPanel";
import { useFactions } from "../../lib/stores/useFactions";

import { PublicMarketplace } from "./PublicMarketplace";
import { useAuth } from "../../lib/auth/AuthContext";
import { LevelUpNotification, useLevelUpNotification } from "./LevelUpNotification";
import { MarshalPanel } from "../marshal/MarshalPanel";
import { PublicEventsPanel } from "./PublicEventsPanel";
import { ActiveActionWidget } from "./ActiveActionWidget";
import { PlayerTransportPanel } from "./PlayerTransportPanel";

type MenuSection = 
  | 'treasury' 
  | 'activities' 
  | 'courier' 
  | 'treaties'
  | 'events' 
  | 'announcements' 
  | 'guide' 
  | 'help'
  | 'competences'
  | 'factions'
  | 'territory'
  | 'reputation_management'
  | 'marketplace'
  | 'marshals'
  | 'transport';

export function MedievalHUD() {
  const { gamePhase, currentTurn, endTurn } = useGameState();
  const { currentUser, logout, role, adminModeEnabled, toggleAdminMode } = useAuth();
  const { novaImperiums, currentNovaImperium, processTurn, hydrateCitiesFromServer, hydrateUnitsFromServer } = useNovaImperium();
  const { selectedHex } = useMap();
  const { isMuted, toggleMute } = useAudio();
  
  // Synchronisation des systèmes de ressources
  const { isInSync } = useDualResourceSync();

  // Flag fin de tour — empêche le double clic pendant le traitement
  const [isEndingTurn, setIsEndingTurn] = useState(false);

  const { 
    selectedCharacter, 
    playerName, 
    setSelectedCharacter, 
    setPlayerName, 
    level,
    experience,
    experienceToNextLevel,
    totalExperience,
    competences, 
    competencePoints, 
    actionPoints, 
    maxActionPoints, 
    getExperienceProgress,
    gainExperience,
    // Gestion des avatars
    avatars,
    currentAvatarId,
    createAvatar,
    switchToAvatar,
    getCurrentAvatar,
    updateAvatarName,
    canCreateNewAvatar,
    setMaxActionPointsForTesting
  } = usePlayer();
  const { honor, reputation, getReputationLevel } = useReputation();
  const { playerFaction, getFactionById } = useFactions();
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showCompetenceModal, setShowCompetenceModal] = useState(false);
  const [showReputationDetails, setShowReputationDetails] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAvatarManager, setShowAvatarManager] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTerritoryPanel, setShowTerritoryPanel] = useState(false);
  const [showReputationManagement, setShowReputationManagement] = useState(false);
  const { notification, showLevelUpNotification, hideLevelUpNotification } = useLevelUpNotification();

  // Résumé du dernier tick de production (affiché après fin de tour)
  const [lastTurnResult, setLastTurnResult] = useState<ProductionTickResult | null>(null);

  // ─── Noms lisibles par buildingId ────────────────────────────────────────
  const BUILDING_NAMES: Record<string, { name: string; icon: string; bankEffect?: boolean }> = {
    outpost:          { name: 'Avant-poste',              icon: '🏗️' },
    exploration_camp: { name: "Camp d'exploration",        icon: '⛺' },
    observation_tower:{ name: "Tour d'observation",        icon: '🗼' },
    sawmill:          { name: 'Scierie',                   icon: '🪚', },
    hunting_post:     { name: 'Poste de chasse',           icon: '🏹' },
    druidic_temple:   { name: 'Temple druidique',          icon: '🌳' },
    herbalist_house:  { name: "Maison de l'herboriste",    icon: '🌿' },
    mine:             { name: 'Mine',                      icon: '⛏️' },
    advanced_mine:    { name: 'Mine avancée',              icon: '⛏️' },
    fortress:         { name: 'Forteresse',                icon: '🏰' },
    watchtower:       { name: 'Tour de guet',              icon: '🗼' },
    oil_camp:         { name: "Camp pétrolier",            icon: '🛢️' },
    farm:             { name: 'Ferme',                     icon: '🌾' },
    granary:          { name: 'Grenier',                   icon: '🏚️' },
    fishing_post:     { name: 'Poste de pêche',            icon: '🎣' },
    bank:             { name: 'Banque',                    icon: '🏦', bankEffect: true },
    market:           { name: 'Marché',                    icon: '🛒' },
    workshop:         { name: 'Atelier',                   icon: '🔨' },
    library:          { name: 'Bibliothèque',              icon: '📚' },
    temple:           { name: 'Temple',                    icon: '🕍' },
    wall:             { name: 'Rempart',                   icon: '🧱' },
    tower:            { name: 'Tour de guet',              icon: '🗼' },
    harbor:           { name: 'Port',                      icon: '⚓' },
    stable:           { name: 'Écurie',                    icon: '🐎' },
    blacksmith:       { name: 'Forgeron',                  icon: '⚒️' },
    barracks:         { name: 'Caserne',                   icon: '⚔️' },
  };

  // Toast complétion de construction
  const [buildingToasts, setBuildingToasts] = useState<Array<{ id: number; buildingId: string; cityName: string }>>([]);
  // Toast complétion d'unité
  const [unitToasts, setUnitToasts] = useState<Array<{ id: number; unitType: string; unitName: string; cityName: string }>>([]);
  const toastCounterRef = React.useRef(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const { buildingId, cityName } = (e as CustomEvent).detail ?? {};
      if (!buildingId) return;
      const id = ++toastCounterRef.current;
      setBuildingToasts(prev => [...prev, { id, buildingId, cityName }]);
      setTimeout(() => setBuildingToasts(prev => prev.filter(t => t.id !== id)), 6000);
    };
    window.addEventListener('nova:building-completed', handler);
    return () => window.removeEventListener('nova:building-completed', handler);
  }, []);

  // ─── Refresh PA depuis le serveur (step confirmé ou complétion de déplacement) ──
  useEffect(() => {
    const handler = async () => {
      try {
        const data = await fetchPlayerState();
        usePlayer.setState({ actionPoints: data.actionPoints, maxActionPoints: data.maxActionPoints });
      } catch (_e) { /* non bloquant */ }
    };
    window.addEventListener('nova:ap-refresh', handler);
    return () => window.removeEventListener('nova:ap-refresh', handler);
  }, []);

  // ─── Fin de Tour ──────────────────────────────────────────────────────────
  const handleEndTurn = async () => {
    if (isEndingTurn) return;
    setIsEndingTurn(true);
    try {
      if (playerFaction) {
        // Tick de production par-ville (player_bank / city_pending_harvest)
        // Modèle canonique — faction_economy n'est plus alimentée automatiquement.
        try {
          const prodResult = await postProductionTick(currentTurn);
          console.log("[handleEndTurn] Production tick:", prodResult);
          if (prodResult.applied && prodResult.cities.length > 0) {
            setLastTurnResult(prodResult);
            window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
          }
        } catch (prodErr) {
          console.warn("[handleEndTurn] Production tick échoué (non bloquant):", prodErr);
        }
        // Tick de production de ville — serveur autoritaire
        try {
          const cityTickResult = await apiProductionTick();
          console.log("[handleEndTurn] City production tick:", cityTickResult);
          // Hydrate le store local depuis l'état serveur réel
          await hydrateCitiesFromServer();
          await hydrateUnitsFromServer();
          // Toasts bâtiments
          for (const { buildingId, cityName } of cityTickResult.completedBuildings) {
            window.dispatchEvent(new CustomEvent('nova:building-completed', {
              detail: { buildingId, cityName },
            }));
          }
          // Toasts unités
          for (const { unitType, unitName, cityName } of cityTickResult.completedUnits) {
            const id = ++toastCounterRef.current;
            setUnitToasts(prev => [...prev, { id, unitType, unitName, cityName }]);
            setTimeout(() => setUnitToasts(prev => prev.filter(t => t.id !== id)), 6000);
          }
          if (cityTickResult.completedBuildings.length > 0 || cityTickResult.progressed.length > 0 || cityTickResult.completedUnits.length > 0) {
            window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
          }
        } catch (cityTickErr) {
          console.warn("[handleEndTurn] Tick production ville échoué (non bloquant):", cityTickErr);
        }
        // Reset mouvement unités + IA locale (production ville retirée de processTurn)
        processTurn();
        // Incrément du tour
        endTurn();
      } else {
        // Pas de faction — pas de tick économique, on avance quand même
        processTurn();
        endTurn();
      }
    } catch (err) {
      console.warn("[handleEndTurn] Erreur fin de tour — tour non avancé :", err);
    } finally {
      setIsEndingTurn(false);
    }
  };

  const getUserRole = () => {
    if (currentUser === 'admin') return 'Administrateur';
    if (currentUser === 'maitre') return 'Maître de Jeu';
    return 'Joueur';
  };

  const getUserColor = () => {
    if (currentUser === 'admin') return 'text-red-600';
    if (currentUser === 'maitre') return 'text-purple-600';
    return 'text-blue-600';
  };

  const canAccessAdmin = () => {
    return role === 'admin';
  };

  React.useEffect(() => {
    (window as any).showLevelUpNotification = showLevelUpNotification;
    return () => {
      delete (window as any).showLevelUpNotification;
    };
  }, [showLevelUpNotification]);

  React.useEffect(() => {
    const handleOpenTerritoryPanel = () => {
      setActiveSection('territory');
    };

    window.addEventListener('openTerritoryPanel', handleOpenTerritoryPanel);
    return () => {
      window.removeEventListener('openTerritoryPanel', handleOpenTerritoryPanel);
    };
  }, []);

  // ─── Listener nova:open-panel — déclenché depuis TileContextMenu ──────────
  // Ouvre le panneau demandé (marketplace, treasury, etc.) via le menu contextuel de case.
  React.useEffect(() => {
    const handleOpenPanel = (e: Event) => {
      const panel = (e as CustomEvent<{ panel: MenuSection }>).detail?.panel;
      if (panel) setActiveSection(panel);
    };
    window.addEventListener('nova:open-panel', handleOpenPanel);
    return () => window.removeEventListener('nova:open-panel', handleOpenPanel);
  }, []);

  if (gamePhase !== "playing") return null;

  // Titres des panneaux qui ne figurent pas dans menuItems (accès contextuel uniquement).
  // Utilisé par le resolver de titre ci-dessous — indépendant de la liste visible du menu.
  const PANEL_TITLES: Partial<Record<MenuSection, string>> = {
    treasury:    'TRÉSORERIE',
    marketplace: 'MARCHÉ PUBLIC',
    competences: 'COMPÉTENCES',
    factions:    'FACTIONS',
    transport:   'INVENTAIRE DE TRANSPORT',
  };

  const menuItems = [
    { id: 'territory'  as MenuSection, label: 'GESTION VILLE/TERRITOIRE', icon: '🗺️' },
    { id: 'marshals'   as MenuSection, label: 'GESTION DES ARMÉES',       icon: '⚔️' },
    { id: 'treaties'   as MenuSection, label: 'TRAITÉS',                   icon: '📜' },
    { id: 'courier'    as MenuSection, label: 'COURRIER',                  icon: '✉️' },
    { id: 'activities' as MenuSection, label: "RAPPORT D'ACTIVITÉS",       icon: '📊' },
    { id: 'events'     as MenuSection, label: 'ÉVÉNEMENT',                 icon: '🎭' },
    { id: 'announcements' as MenuSection, label: 'ANNONCE PUBLIQUE',       icon: '📢' },
    { id: 'guide'      as MenuSection, label: 'GUIDE DE JEUX',             icon: '📖' },
    { id: 'help'       as MenuSection, label: 'AIDE',                      icon: '❓' },
  ];

  const handleCharacterSelect = (character: CharacterOption) => {
    setSelectedCharacter(character);
    console.log('Character selected:', character);
  };

  const getGameDate = (turn: number) => {
    const startYear = 1000;
    const year = Math.floor(turn / 12) + startYear;
    const month = (turn % 12) + 1;
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    return `${months[month - 1]} ${year}`;
  };

  const getTimeRemaining = () => {
    // In a real implementation, this would show actual time remaining in the current month
    return "15 jours";
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      
      {/* Top Information Banner */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="relative">
          {/* Scroll Banner Background */}
          <div 
            className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg px-8 py-4"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-amber-800"></div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-800"></div>
            
            <div className="grid grid-cols-4 gap-6 text-amber-900 font-bold text-sm">
              <div className="text-center">
                <div className="text-xs text-amber-700">DATE DE JEUX</div>
                <div>{getGameDate(currentTurn)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-700">TEMPS RESTANT</div>
                <div>{getTimeRemaining()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-700">BONUS ACTIF</div>
                <div>Aucun</div>
              </div>
              {/* Faction Coat of Arms integrated in banner */}
              <div className="text-center">
                <div className="text-xs text-amber-700">FACTION</div>
                {playerFaction && (() => {
                  const currentFaction = getFactionById(playerFaction);
                  if (currentFaction) {
                    return (
                      <div 
                        className="flex flex-col items-center cursor-pointer hover:bg-amber-300 rounded p-1 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSection('factions');
                        }}
                        title={`${currentFaction.name} - Cliquez pour voir les détails`}
                      >
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-lg">{currentFaction.banner || currentFaction.emblem || '🏛️'}</span>
                          <div 
                            className="w-2 h-2 rounded-full border border-amber-800"
                            style={{ backgroundColor: currentFaction.color }}
                          />
                        </div>
                        <div className="text-xs font-medium">
                          {currentFaction.name.length > 8 
                            ? currentFaction.name.substring(0, 6) + '...' 
                            : currentFaction.name
                          }
                        </div>
                      </div>
                    );
                  }
                })()}
                
                {!playerFaction && (
                  <div 
                    className="flex flex-col items-center cursor-pointer hover:bg-amber-300 rounded p-1 transition-colors opacity-60"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSection('factions');
                    }}
                    title="Aucune faction - Cliquez pour rejoindre ou créer une faction"
                  >
                    <span className="text-lg">🏛️</span>
                    <div className="text-xs">Sans Faction</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Player Info & Shield */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="flex items-center space-x-4">
          {/* Player Info */}
          <div 
            className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg px-4 py-5 w-64"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div className="text-amber-900 font-bold text-sm">
              <div className="text-xs text-amber-700">UTILISATEUR CONNECTÉ</div>
              <div className="flex items-center justify-between">
                <div className={`font-bold ${getUserColor()}`}>
                  {currentUser || 'Invité'} ({getUserRole()})
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLogoutConfirm(true);
                  }}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                  title="Verrouiller la session"
                >
                  🗝️
                </button>
              </div>
              <div className="text-xs text-amber-700 mt-1">PERSONNAGE ACTUEL</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{getCurrentAvatar()?.name || 'Avatar Principal'}</div>
                  <div className="text-xs text-amber-600">Niveau {level} - {selectedCharacter?.name || 'Empereur'}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAvatarManager(!showAvatarManager);
                  }}
                  className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded"
                  title="Gérer les avatars"
                >
                  👥
                </button>
              </div>

              {/* Gestionnaire d'avatars */}
              {showAvatarManager && (
                <div className="mt-2 p-2 bg-amber-100 border border-amber-300 rounded">
                  <div className="text-xs text-amber-700 mb-2 font-medium">GESTION DES AVATARS</div>
                  
                  {/* Liste des avatars */}
                  <div className="space-y-1 mb-2">
                    {avatars.map((avatar) => (
                      <div 
                        key={avatar.id}
                        className={`flex items-center justify-between p-1 rounded text-xs ${
                          avatar.id === currentAvatarId 
                            ? 'bg-amber-300 text-amber-900' 
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-200 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (avatar.id !== currentAvatarId) {
                            switchToAvatar(avatar.id);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{avatar.character.image}</span>
                          <span className="font-medium">{avatar.name}</span>
                          <span className="text-xs">Niv.{avatar.level}</span>
                        </div>
                        {avatar.id === currentAvatarId && (
                          <span className="text-xs text-green-600">● Actuel</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Créer un nouvel avatar */}
                  {canCreateNewAvatar() && (
                    <div className="border-t border-amber-300 pt-2">
                      <div className="text-xs text-amber-700 mb-1">Créer un nouvel avatar:</div>
                      <div className="flex space-x-1">
                        <input
                          type="text"
                          value={newAvatarName}
                          onChange={(e) => setNewAvatarName(e.target.value)}
                          placeholder="Nom de l'avatar"
                          className="flex-1 text-xs px-1 py-0.5 border border-amber-300 rounded bg-white"
                          maxLength={20}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (newAvatarName.trim()) {
                              createAvatar(newAvatarName.trim(), selectedCharacter!);
                              setNewAvatarName('');
                            }
                          }}
                          disabled={!newAvatarName.trim()}
                          className="text-xs bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-2 py-0.5 rounded"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!canCreateNewAvatar() && (
                    <div className="text-xs text-amber-600 text-center py-1">
                      Maximum 2 avatars par joueur
                    </div>
                  )}
                </div>
              )}
              
              {/* Barre d'expérience */}
              <div className="mt-1">
                <div className="flex justify-between text-xs text-amber-600 mb-1">
                  <span>Expérience</span>
                  <span>{experience}/{experienceToNextLevel} XP</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-amber-400 to-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getExperienceProgress()}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-amber-700 mt-1 flex items-center justify-between">
                <span>POINTS D'ACTION</span>
                {(currentUser === 'admin' || currentUser === 'maitre') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMaxActionPointsForTesting();
                    }}
                    className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-1 py-0.5 rounded"
                    title="Test: Max PA"
                  >
                    🔧
                  </button>
                )}
              </div>
              <div className="text-blue-600">{actionPoints}/{maxActionPoints}</div>
              <ActiveActionWidget />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection('transport');
                }}
                className="mt-2 w-full text-xs bg-amber-700 hover:bg-amber-600 text-amber-100 font-semibold px-2 py-1.5 rounded border border-amber-900 flex items-center justify-center gap-1"
                title="Inventaire de transport"
              >
                🎒 Inventaire du joueur
              </button>
              <div className="text-xs text-amber-700 mt-1">RÉPUTATION</div>
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-1 cursor-pointer hover:bg-amber-200 rounded px-1 py-0.5 transition-colors flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReputationDetails(true);
                  }}
                  title="Cliquer pour voir les détails"
                >
                  <div className="flex items-center space-x-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getReputationLevel().color }}
                    />
                    <div className="text-sm font-medium">{reputation}</div>
                  </div>
                  <div className="text-xs text-amber-600">({honor})</div>
                </div>
                {canAccessAdmin() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReputationManagement(true);
                    }}
                    className="text-xs px-1 py-0.5 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded transition-colors ml-1"
                    title="Gestion de la réputation"
                  >
                    ⚖️
                  </button>
                )}
              </div>
              <div className="text-xs text-amber-700 mt-1">COMPÉTENCES</div>
              <div className="flex items-center justify-between">
                <div className="text-purple-600">{competences.length} apprises ({competencePoints} pts)</div>
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCompetenceModal(true);
                    }}
                    className="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded"
                  >
                    🎯
                  </button>
                </div>
              </div>
              
              {/* Inventaire accessible via TRÉSORERIE */}



              {/* Panneau d'administration intégré */}
              {canAccessAdmin() && (
                <div className="mt-2 pt-2 border-t border-amber-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdminPanel(!showAdminPanel);
                    }}
                    className="text-xs text-amber-700 hover:text-amber-900 flex items-center space-x-1 w-full"
                  >
                    <span>⚙️</span>
                    <span>Administration</span>
                    <span>{showAdminPanel ? '▼' : '▶'}</span>
                  </button>
                  
                  {showAdminPanel && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-700">Mode Admin</span>
                        <button
                          onClick={toggleAdminMode}
                          className={`text-xs px-2 py-1 rounded ${adminModeEnabled ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}
                        >
                          {adminModeEnabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      
                      <div className="text-xs text-amber-600">
                        {adminModeEnabled ? '👁️ Vision complète de la carte' : '🔒 Vision limitée normale'}
                      </div>
                      
                      {currentUser === 'admin' && (
                        <div className="pt-1 border-t border-amber-400">
                          <div className="text-xs text-amber-700">Privilèges Admin:</div>
                          <div className="text-xs text-amber-600">• Contrôle total du jeu</div>
                          <div className="text-xs text-amber-600">• Accès à tous les systèmes</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Shield Emblem - Character Display - Positioned in empty space between banner and player info */}
      <div className="absolute top-8 right-72 pointer-events-auto">
        <div 
          className="w-16 h-20 bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-t-full rounded-b-sm shadow-lg flex items-center justify-center cursor-pointer hover:bg-gradient-to-b hover:from-amber-300 hover:to-amber-400 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Shield clicked!');
            setShowCharacterSelector(true);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          title="Cliquez pour changer de personnage"
        >
          <div className="text-2xl">
            {selectedCharacter?.image || '🛡️'}
          </div>
        </div>
      </div>

      {/* Left Menu Panel - Back to original position */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto">
        <div className="relative">
          {/* Menu principal unifié */}
          <div 
            className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-64"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >

            
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('Menu item clicked:', item.id);
                    setActiveSection(activeSection === item.id ? null : item.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseUp={(e) => e.stopPropagation()}
                  className={`w-full text-left px-3 py-2 rounded border border-amber-700 font-bold transition-all duration-200 flex items-center space-x-2 ${
                    activeSection === item.id
                      ? 'bg-amber-300 text-amber-900'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div 
        className="absolute bottom-4 left-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <div className="flex space-x-2">
          <button
            onClick={toggleMute}
            className="bg-amber-100 border border-amber-700 text-amber-800 hover:bg-amber-200 px-3 py-1 rounded text-sm font-bold"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={handleEndTurn}
            disabled={isEndingTurn}
            className="bg-amber-700 border border-amber-900 text-amber-50 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1 rounded text-sm font-bold"
            title={isEndingTurn ? "Traitement en cours..." : "Passer au tour suivant"}
          >
            {isEndingTurn ? "⏳" : "⚔️ Fin de Tour"}
          </button>
        </div>
      </div>

      {/* Bouton Recentrer caméra */}
      <button
        className="fixed bottom-48 right-4 pointer-events-auto z-[9991] bg-amber-800 hover:bg-amber-700 text-amber-100 text-xs font-semibold px-3 py-1.5 rounded shadow-md border border-amber-600"
        onClick={() => (window as any).gameEngine?.centerCameraOnAvatar()}
        title="Recentrer la caméra sur votre personnage (ou appuyez sur Espace)"
      >
        🎯 Recentrer
      </button>

      {/* MiniMap */}
      <div 
        className="absolute bottom-4 right-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <MiniMap />
      </div>

      {/* Active Section Panel - Style médiéval parchemin */}
      {activeSection && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-auto z-50">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setActiveSection(null)}></div>
          <div 
            className="relative bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-6 w-[700px] max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-amber-900">
                {PANEL_TITLES[activeSection!] ?? menuItems.find(item => item.id === activeSection)?.label}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection(null);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-lg font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="text-amber-800">
              {activeSection === 'treasury' && (
                <TreasuryPanel
                  currentUser={currentUser ?? 'player'}
                  role={role}
                  adminModeEnabled={adminModeEnabled}
                />
              )}
              {activeSection === 'marketplace' && (
                <PublicMarketplace 
                  playerId={currentUser || 'player'} 
                  onClose={() => setActiveSection(null)} 
                />
              )}
              {activeSection === 'activities' && <ActivityReportPanel />}
              {activeSection === 'courier' && <CouriersPanel />}
              {activeSection === 'treaties' && <TreatiesPanel />}
              {activeSection === 'events' && <EventPanel />}
              {activeSection === 'territory' && (
                <div className="h-full">
                  <UnifiedTerritoryPanel onClose={() => setActiveSection(null)} />
                </div>
              )}
              {activeSection === 'marshals' && <MarshalPanel />}
              {activeSection === 'announcements' && <PublicEventsPanel />}
              {activeSection === 'guide' && <GameGuidePanel />}
              {activeSection === 'help' && <HelpPanel />}
              {activeSection === 'competences' && <CompetenceTree />}
              {activeSection === 'factions' && <FactionPanel onClose={() => setActiveSection(null)} />}
              {activeSection === 'transport' && <PlayerTransportPanel />}
            </div>
          </div>
        </div>
      )}

      {/* Tile Information Panel */}
      <TileInfoPanel />

      {/* Character Selector Modal */}
      {showCharacterSelector && (
        <div className="z-[100]">
          <CharacterSelector
            onSelect={handleCharacterSelect}
            onClose={() => setShowCharacterSelector(false)}
          />
        </div>
      )}

      {/* Competence Tree Modal */}
      {showCompetenceModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            setShowCompetenceModal(false);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-2xl p-6 w-[800px] max-h-[80vh] overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();

            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onMouseUp={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-900 font-bold text-xl">Arbre de Compétences</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  setShowCompetenceModal(false);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                className="text-amber-800 hover:text-amber-900 text-xl font-bold px-2 py-1 rounded hover:bg-amber-300 transition-colors"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="text-amber-800 max-h-[70vh] overflow-y-auto">
              <CompetenceTree />
            </div>
          </div>
        </div>
      )}

      {/* Reputation Details Modal */}
      {showReputationDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]"
          onClick={(e) => {
            e.stopPropagation();
            setShowReputationDetails(false);
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-2xl p-6 w-[400px] max-h-[80vh] overflow-y-auto"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-900 font-bold text-lg">Réputation</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReputationDetails(false);
                }}
                className="text-amber-800 hover:text-amber-900 text-xl font-bold px-2 py-1 rounded hover:bg-amber-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <ReputationPanel />
          </div>
        </div>
      )}

      {/* Tile Information Panel */}
      <TileInfoPanel />

      {/* Level Up Notification */}
      <LevelUpNotification
        show={notification.show}
        newLevel={notification.newLevel}
        competencePointsGained={notification.competencePointsGained}
        actionPointsBonus={notification.actionPointsBonus}
        onClose={hideLevelUpNotification}
      />

      {/* ─── Toasts complétion de construction ────────────────────────────── */}
      {buildingToasts.length > 0 && (
        <div className="fixed bottom-24 left-4 z-[9990] pointer-events-auto flex flex-col gap-2 max-w-xs">
          {buildingToasts.map(toast => {
            const meta = BUILDING_NAMES[toast.buildingId];
            const icon = meta?.icon ?? '🏗️';
            const name = meta?.name ?? toast.buildingId;
            return (
              <div key={toast.id} className="bg-emerald-900 border-2 border-emerald-400 rounded-lg shadow-2xl p-3 text-white text-xs">
                <div className="font-bold text-emerald-200 text-sm mb-1">
                  {icon} {name} terminé{meta?.bankEffect ? '' : ''}
                </div>
                {toast.cityName && (
                  <p className="text-emerald-300 text-xs mb-1">📍 {toast.cityName}</p>
                )}
                {meta?.bankEffect && (
                  <p className="text-emerald-400 italic text-xs">🏦 Dépôt automatique actif dès le prochain tour</p>
                )}
                <p className="text-emerald-500 italic text-xs mt-1">Trésorerie et Construction mis à jour</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Toasts complétion d'unité ─────────────────────────────────────── */}
      {unitToasts.length > 0 && (
        <div className="fixed bottom-44 left-4 z-[9990] pointer-events-auto flex flex-col gap-2 max-w-xs">
          {unitToasts.map(toast => (
            <div key={toast.id} className="bg-blue-900 border-2 border-blue-400 rounded-lg shadow-2xl p-3 text-white text-xs">
              <div className="font-bold text-blue-200 text-sm mb-1">
                ⚔️ {toast.unitName} recrutée
              </div>
              {toast.cityName && (
                <p className="text-blue-300 text-xs mb-1">📍 {toast.cityName}</p>
              )}
              <p className="text-blue-500 italic text-xs mt-1">Unité disponible dans vos forces</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Résumé du dernier tick de production ─────────────────────────── */}
      {lastTurnResult && lastTurnResult.applied && lastTurnResult.cities.length > 0 && (
        <div className="fixed bottom-24 right-4 z-[9990] pointer-events-auto max-w-xs w-full">
          <div className="bg-amber-900 border-2 border-amber-500 rounded-lg shadow-2xl p-3 text-white text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-200 text-sm">⚡ Tour {currentTurn - 1} — Production</span>
              <button
                onClick={() => setLastTurnResult(null)}
                className="text-amber-400 hover:text-white ml-2 font-bold text-base leading-none"
              >✕</button>
            </div>
            <div className="space-y-1.5">
              {lastTurnResult.cities.map(city => {
                const mats = [
                  [city.gold,   '🪙'], [city.food,   '🌿'], [city.wood,  '🪵'],
                  [city.stone,  '🪨'], [city.iron,   '⚙️'], [city.copper,'🟤'],
                  [city.coal,   '🖤'], [city.oil,    '🛢️'], [city.herbs, '🌱'],
                  [city.fur,    '🦊'],
                ] as [number, string][];
                const active = mats.filter(([v]) => v > 0);
                return (
                  <div key={city.cityId} className="bg-amber-800 rounded p-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-amber-100">{city.name}</span>
                      <span className={[
                        "text-xs px-1 rounded font-medium",
                        city.destination === 'bank' ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
                      ].join(" ")}>
                        {city.destination === 'bank' ? '🏦 banque' : '⏳ à collecter'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {active.length === 0
                        ? <span className="text-amber-400 italic">rien produit</span>
                        : active.map(([v, icon], i) => (
                            <span key={i} className="bg-amber-700 px-1 rounded text-amber-100">+{v}{icon}</span>
                          ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-amber-400 italic mt-2 text-xs">
              Ouvrez Trésorerie pour voir les stocks · Transfert → Construire
            </p>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-auto">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-gradient-to-br from-amber-200 via-amber-100 to-amber-200 border-4 border-amber-800 rounded-lg p-6 shadow-2xl max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">🚪</div>
              <h2 className="text-xl font-bold text-amber-900 mb-4">
                Confirmation de Déconnexion
              </h2>
              <p className="text-amber-800 mb-6">
                Êtes-vous sûr de vouloir vous déconnecter ? Votre progression sera sauvegardée.
              </p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  🚪 Se Déconnecter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Reputation Management Panel */}
      {showReputationManagement && (
        <ReputationManagementPanel onClose={() => setShowReputationManagement(false)} />
      )}


    </div>
  );
}