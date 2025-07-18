import React, { useState } from "react";
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
import { ConstructionPanel } from "./ConstructionPanel";
import { RecruitmentPanel } from "./RecruitmentPanel";
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

import { PlayerInventory } from "./PlayerInventory";
import { LevelUpNotification, useLevelUpNotification } from "./LevelUpNotification";

type MenuSection = 
  | 'treasury' 
  | 'construction' 
  | 'recruitment' 
  | 'activities' 
  | 'courier' 
  | 'treaties'
  | 'events' 
  | 'announcements' 
  | 'guide' 
  | 'help'
  | 'competences'
  | 'factions';

export function MedievalHUD() {
  const { gamePhase, currentTurn, endTurn } = useGameState();
  const { novaImperiums, currentNovaImperium } = useNovaImperium();
  const { selectedHex } = useMap();
  const { isMuted, toggleMute } = useAudio();
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
    isGameMaster, 
    setGameMaster,
    getExperienceProgress,
    gainExperience
  } = usePlayer();
  const { honor, reputation, getReputationLevel } = useReputation();
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const [showCompetenceModal, setShowCompetenceModal] = useState(false);
  const [showReputationDetails, setShowReputationDetails] = useState(false);
  const { notification, showLevelUpNotification, hideLevelUpNotification } = useLevelUpNotification();

  // Exposer la fonction de notification au niveau global
  React.useEffect(() => {
    (window as any).showLevelUpNotification = showLevelUpNotification;
    return () => {
      delete (window as any).showLevelUpNotification;
    };
  }, [showLevelUpNotification]);

  if (gamePhase !== "playing") return null;

  const menuItems = [
    { id: 'treasury' as MenuSection, label: 'TRÉSORERIE', icon: '💰' },
    { id: 'construction' as MenuSection, label: 'CONSTRUCTION', icon: '🔨' },
    { id: 'recruitment' as MenuSection, label: 'RECRUTEMENT', icon: '⚔️' },
    { id: 'activities' as MenuSection, label: 'RAPPORT D\'ACTIVITÉS', icon: '📊' },
    { id: 'courier' as MenuSection, label: 'COURRIER', icon: '✉️' },
    { id: 'treaties' as MenuSection, label: 'TRAITÉS', icon: '📜' },
    { id: 'events' as MenuSection, label: 'ÉVÉNEMENT', icon: '🎭' },
    { id: 'announcements' as MenuSection, label: 'ANNONCE PUBLIQUE', icon: '📢' },
    { id: 'guide' as MenuSection, label: 'GUIDE DE JEUX', icon: '📖' },
    { id: 'help' as MenuSection, label: 'AIDE', icon: '❓' },
    { id: 'factions' as MenuSection, label: 'FACTIONS', icon: '🏛️' }
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
      {/* Parchment Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 opacity-90"></div>
      
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
            
            <div className="grid grid-cols-3 gap-8 text-amber-900 font-bold text-sm">
              <div className="text-center">
                <div className="text-xs text-amber-700">DATE DE JEUX</div>
                <div>{getGameDate(currentTurn)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-700">TEMPS RESTANT</div>
                <div>{getTimeRemaining()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-700">COMPÉTENCE ACTIVE</div>
                <div>Stratégie</div>
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
            className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg px-6 py-3"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div className="text-amber-900 font-bold text-sm">
              <div className="text-xs text-amber-700">NOM DU JOUEUR</div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-transparent border-none text-amber-900 font-bold focus:outline-none focus:bg-amber-100 rounded px-1 py-0.5 w-full text-sm"
                placeholder="Nom du joueur"
                maxLength={20}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
              />
              <div className="text-xs text-amber-700 mt-1">NIVEAU</div>
              <div>Niveau {level} - {selectedCharacter?.name || 'Empereur'}</div>
              
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
              <div className="text-xs text-amber-700 mt-1">POINTS D'ACTION</div>
              <div className="text-blue-600">{actionPoints}/{maxActionPoints}</div>
              <div className="text-xs text-amber-700 mt-1">RÉPUTATION</div>
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-amber-200 rounded px-1 py-0.5 transition-colors"
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
              <div className="text-xs text-amber-700 mt-1">COMPÉTENCES</div>
              <div className="flex items-center justify-between">
                <div className="text-purple-600">{competences.length} apprises ({competencePoints} pts)</div>
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
              

              
              {/* Inventaire d'objets uniques */}
              <PlayerInventory playerId="player" />
            </div>
          </div>
          
          {/* Shield Emblem - Character Display */}
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
      </div>

      {/* Left Menu Panel */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 pointer-events-auto">
        <div className="relative">
          {/* Scroll Background */}
          <div 
            className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-6 w-64"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            {/* Decorative scroll edges */}
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            
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
                  className={`w-full text-left px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-3 ${
                    activeSection === item.id
                      ? 'bg-amber-300 text-amber-900 shadow-inner'
                      : 'text-amber-800 hover:bg-amber-200'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
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
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="bg-amber-100 border-amber-800 text-amber-800 hover:bg-amber-200"
          >
            {isMuted ? "🔇" : "🔊"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Basculer mode MJ:', !isGameMaster);
              setGameMaster(!isGameMaster);
            }}
            className={`${isGameMaster ? 'bg-red-100 border-red-800 text-red-800 hover:bg-red-200' : 'bg-gray-100 border-gray-800 text-gray-800 hover:bg-gray-200'}`}
          >
            {isGameMaster ? "👁️ MJ" : "👤 PJ"}
          </Button>
        </div>
      </div>

      {/* MiniMap */}
      <div 
        className="absolute bottom-4 right-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <MiniMap />
      </div>

      {/* Active Section Panel */}
      {activeSection && (
        <div className="absolute top-20 left-72 pointer-events-auto z-50">
          <div 
            className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-2xl p-6 w-80 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-900 font-bold text-lg">
                {menuItems.find(item => item.id === activeSection)?.label}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSection(null);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                className="text-amber-800 hover:text-amber-900 text-xl font-bold px-2 py-1 rounded hover:bg-amber-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="text-amber-800">
              {activeSection === 'treasury' && <TreasuryPanel />}
              {activeSection === 'construction' && <ConstructionPanel />}
              {activeSection === 'recruitment' && <RecruitmentPanel />}
              {activeSection === 'activities' && <ActivityReportPanel />}
              {activeSection === 'courier' && <CouriersPanel />}
              {activeSection === 'treaties' && <TreatiesPanel />}
              {activeSection === 'events' && <EventPanel />}
              {activeSection === 'announcements' && <PublicAnnouncementPanel />}
              {activeSection === 'guide' && <GameGuidePanel />}
              {activeSection === 'help' && <HelpPanel />}
              {activeSection === 'competences' && <CompetenceTree />}
              {activeSection === 'factions' && <FactionPanel />}
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
    </div>
  );
}