import React, { useState, useCallback, useMemo } from "react";
import { useGameState } from "../../../lib/stores/useGameState";
import { useNovaImperium } from "../../../lib/stores/useNovaImperium";
import { useMap } from "../../../lib/stores/useMap";
import { usePlayer } from "../../../lib/stores/usePlayer";
import { useReputation } from "../../../lib/stores/useReputation";
import { Button } from "../../ui/button";
import { Card } from "../../ui/card";

// Types optimisés
interface HUDStats {
  tour: number;
  pointsAction: number;
  maxPointsAction: number;
  expérience: number;
  niveau: number;
  honneur: number;
  réputation: number;
}

interface HUDProps {
  stats: HUDStats;
  onEndTurn: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
}

// Composant mémoïsé pour les statistiques
const StatsPanel = React.memo<{ stats: HUDStats }>(({ stats }) => {
  return (
    <Card className="p-4 bg-amber-900/80 border-amber-600">
      <div className="grid grid-cols-2 gap-2 text-amber-100 text-sm">
        <div>Tour: <span className="font-bold text-white">{stats.tour}</span></div>
        <div>Niveau: <span className="font-bold text-white">{stats.niveau}</span></div>
        <div>PA: <span className="font-bold text-white">{stats.pointsAction}/{stats.maxPointsAction}</span></div>
        <div>Honneur: <span className="font-bold text-white">{stats.honneur}</span></div>
        <div>XP: <span className="font-bold text-white">{stats.expérience}</span></div>
        <div>Réputation: <span className="font-bold text-white">{stats.réputation}</span></div>
      </div>
    </Card>
  );
});

// Composant mémoïsé pour les boutons d'action
const ActionButtons = React.memo<{
  onEndTurn: () => void;
  onToggleMute: () => void;
  isMuted: boolean;
}>(({ onEndTurn, onToggleMute, isMuted }) => {
  return (
    <div className="flex gap-2">
      <Button 
        onClick={onEndTurn}
        className="bg-amber-700 hover:bg-amber-600 text-white"
      >
        Terminer le tour
      </Button>
      <Button 
        onClick={onToggleMute}
        variant="outline"
        className="border-amber-600 text-amber-100"
      >
        {isMuted ? '🔇' : '🔊'}
      </Button>
    </div>
  );
});

// Composant mémoïsé pour les sections de menu
const MenuSections = React.memo<{
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
}>(({ activeSection, onSectionChange }) => {
  const sections = useMemo(() => [
    { id: 'treasury', label: 'Trésorerie', icon: '💰' },
    { id: 'activities', label: 'Activités', icon: '📋' },
    { id: 'factions', label: 'Factions', icon: '⚔️' },
    { id: 'territory', label: 'Territoire', icon: '🗺️' },
    { id: 'help', label: 'Aide', icon: '❓' },
  ], []);

  const handleSectionClick = useCallback((sectionId: string) => {
    onSectionChange(activeSection === sectionId ? null : sectionId);
  }, [activeSection, onSectionChange]);

  return (
    <div className="flex gap-1">
      {sections.map((section) => (
        <Button
          key={section.id}
          variant={activeSection === section.id ? "default" : "outline"}
          size="sm"
          onClick={() => handleSectionClick(section.id)}
          className={`
            ${activeSection === section.id 
              ? 'bg-amber-600 text-white' 
              : 'border-amber-600 text-amber-100 hover:bg-amber-700'
            }
          `}
        >
          <span className="mr-1">{section.icon}</span>
          {section.label}
        </Button>
      ))}
    </div>
  );
});

// Composant principal optimisé
export const MedievalHUDOptimized = React.memo(() => {
  const { currentTurn, endTurn } = useGameState();
  const { selectedHex } = useMap();
  const { 
    level,
    experience,
    actionPoints, 
    maxActionPoints
  } = usePlayer();
  const { honor, reputation } = useReputation();
  
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Mémoïser les statistiques pour éviter les recalculs
  const stats = useMemo<HUDStats>(() => ({
    tour: currentTurn,
    pointsAction: actionPoints,
    maxPointsAction: maxActionPoints,
    expérience: experience,
    niveau: level,
    honneur: honor,
    réputation: reputation
  }), [currentTurn, actionPoints, maxActionPoints, experience, level, honor, reputation]);

  // Mémoïser les callbacks
  const handleEndTurn = useCallback(() => {
    endTurn();
  }, [endTurn]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const handleSectionChange = useCallback((section: string | null) => {
    setActiveSection(section);
  }, []);

  return (
    <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none">
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Panel gauche - Statistiques */}
        <div className="flex flex-col gap-2">
          <StatsPanel stats={stats} />
          <ActionButtons 
            onEndTurn={handleEndTurn}
            onToggleMute={handleToggleMute}
            isMuted={isMuted}
          />
        </div>

        {/* Panel droit - Navigation */}
        <div className="flex flex-col gap-2">
          <MenuSections 
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
        </div>
      </div>
    </div>
  );
});

MedievalHUDOptimized.displayName = 'MedievalHUDOptimized';