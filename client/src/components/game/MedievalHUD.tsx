import { useState } from "react";
import { useGameState } from "../../lib/stores/useGameState";
import { useCivilizations } from "../../lib/stores/useCivilizations";
import { useMap } from "../../lib/stores/useMap";
import { useAudio } from "../../lib/stores/useAudio";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { MiniMap } from "./MiniMap";
import { TreasuryPanel } from "./TreasuryPanel";
import { ConstructionPanel } from "./ConstructionPanel";
import { RecruitmentPanel } from "./RecruitmentPanel";
import { ActivityReportPanel } from "./ActivityReportPanel";
import { CourierPanel } from "./CourierPanel";
import { EventPanel } from "./EventPanel";
import { PublicAnnouncementPanel } from "./PublicAnnouncementPanel";
import { GameGuidePanel } from "./GameGuidePanel";
import { HelpPanel } from "./HelpPanel";

type MenuSection = 
  | 'treasury' 
  | 'construction' 
  | 'recruitment' 
  | 'activities' 
  | 'courier' 
  | 'events' 
  | 'announcements' 
  | 'guide' 
  | 'help';

export function MedievalHUD() {
  const { gamePhase, currentTurn, endTurn } = useGameState();
  const { civilizations, currentCivilization } = useCivilizations();
  const { selectedHex } = useMap();
  const { isMuted, toggleMute } = useAudio();
  const [activeSection, setActiveSection] = useState<MenuSection | null>(null);

  if (gamePhase !== "playing") return null;

  const menuItems = [
    { id: 'treasury' as MenuSection, label: 'TRÉSORERIE', icon: '💰' },
    { id: 'construction' as MenuSection, label: 'CONSTRUCTION', icon: '🏗️' },
    { id: 'recruitment' as MenuSection, label: 'RECRUTEMENT', icon: '⚔️' },
    { id: 'activities' as MenuSection, label: 'RAPPORT D\'ACTIVITÉS', icon: '📊' },
    { id: 'courier' as MenuSection, label: 'COURRIER', icon: '📮' },
    { id: 'events' as MenuSection, label: 'ÉVÉNEMENT', icon: '🎭' },
    { id: 'announcements' as MenuSection, label: 'ANNONCE PUBLIQUE', icon: '📢' },
    { id: 'guide' as MenuSection, label: 'GUIDE DE JEUX', icon: '📖' },
    { id: 'help' as MenuSection, label: 'AIDE', icon: '❓' }
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Parchment Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-amber-100 opacity-90"></div>
      
      {/* Top Information Banner */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="relative">
          {/* Scroll Banner Background */}
          <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg px-8 py-4">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-amber-800"></div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-800"></div>
            
            <div className="grid grid-cols-3 gap-8 text-amber-900 font-bold text-sm">
              <div className="text-center">
                <div className="text-xs text-amber-700">DATE DE JEUX</div>
                <div>Tour {currentTurn}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-700">TEMPS RESTANT</div>
                <div>∞</div>
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
          <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg px-6 py-3">
            <div className="text-amber-900 font-bold text-sm">
              <div className="text-xs text-amber-700">NOM DU JOUEUR</div>
              <div>{currentCivilization?.name || 'Joueur'}</div>
              <div className="text-xs text-amber-700 mt-1">RANG</div>
              <div>Empereur</div>
              <div className="text-xs text-amber-700 mt-1">POINT D'ACTION</div>
              <div className="text-green-600">{currentCivilization?.resources.gold || 0}</div>
            </div>
          </div>
          
          {/* Shield Emblem */}
          <div className="w-16 h-20 bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-t-full rounded-b-sm shadow-lg flex items-center justify-center">
            <div className="text-2xl">🛡️</div>
          </div>
        </div>
      </div>

      {/* Left Menu Panel */}
      <div className="absolute top-20 left-4 pointer-events-auto">
        <div className="relative">
          {/* Scroll Background */}
          <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-6 w-64">
            {/* Decorative scroll edges */}
            <div className="absolute -top-1 -left-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-800 rounded-full"></div>
            
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(activeSection === item.id ? null : item.id)}
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

      {/* MiniMap */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <MiniMap />
      </div>

      {/* Control Buttons */}
      <div className="absolute bottom-4 right-4 pointer-events-auto">
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
            onClick={endTurn}
            className="bg-amber-600 hover:bg-amber-700 text-white border-amber-800"
          >
            Terminer le tour
          </Button>
        </div>
      </div>

      {/* Active Section Panel */}
      {activeSection && (
        <div className="absolute top-20 left-72 pointer-events-auto">
          <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-6 w-80 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-amber-900 font-bold text-lg">
                {menuItems.find(item => item.id === activeSection)?.label}
              </h3>
              <button
                onClick={() => setActiveSection(null)}
                className="text-amber-800 hover:text-amber-900"
              >
                ✕
              </button>
            </div>
            
            <div className="text-amber-800">
              {activeSection === 'treasury' && <TreasuryPanel />}
              {activeSection === 'construction' && <ConstructionPanel />}
              {activeSection === 'recruitment' && <RecruitmentPanel />}
              {activeSection === 'activities' && <ActivityReportPanel />}
              {activeSection === 'courier' && <CourierPanel />}
              {activeSection === 'events' && <EventPanel />}
              {activeSection === 'announcements' && <PublicAnnouncementPanel />}
              {activeSection === 'guide' && <GameGuidePanel />}
              {activeSection === 'help' && <HelpPanel />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}