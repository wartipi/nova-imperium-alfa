import { useState } from "react";
import { useFactions } from "../../lib/stores/useFactions";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { useGameState } from "../../lib/stores/useGameState";
import { FactionCreationPanel } from "./FactionCreationPanel";
import { AlliancesPanel } from "./AlliancesPanel";
import { Button } from "../ui/button";

interface FactionPanelProps {
  onClose: () => void;
}

export function FactionPanel({ onClose }: FactionPanelProps) {
  const { factions, playerFaction, getFactionById, canCreateFaction, createFaction, joinFaction, leaveFaction, getAvailableQuests } = useFactions();
  const { playerName } = usePlayer();
  const { honor, getReputationLevel, canCreateFaction: canCreateFactionRep } = useReputation();
  const { currentNovaImperium } = useNovaImperium();
  const { isGameMaster } = useGameState();
  const [activeTab, setActiveTab] = useState<'overview' | 'factions' | 'create' | 'alliances' | 'quests'>('overview');
  
  const currentFaction = playerFaction ? getFactionById(playerFaction) : null;
  const canCreate = isGameMaster || canCreateFaction('player', honor);
  const availableQuests = getAvailableQuests(playerFaction, honor);
  const reputationLevel = getReputationLevel();

  if (!currentNovaImperium) return null;

  if (activeTab === 'alliances') {
    return <AlliancesPanel onClose={() => setActiveTab('overview')} />;
  }
  
  const handleCreateFaction = () => {
    if (newFactionName.trim() && newFactionDescription.trim() && canCreate) {
      createFaction(newFactionName, newFactionDescription, newFactionType, 'player');
      setNewFactionName('');
      setNewFactionDescription('');
      setShowCreateFaction(false);
    }
  };
  
  const handleJoinFaction = (factionId: string) => {
    if (playerName) {
      joinFaction(factionId, 'player', playerName);
    }
  };
  
  const handleLeaveFaction = () => {
    if (playerFaction) {
      leaveFaction(playerFaction, 'player');
    }
  };
  
  const factionTypeLabels = {
    guild: 'Guilde',
    kingdom: 'Royaume',
    merchant: 'Marchand',
    religious: 'Religieux',
    mercenary: 'Mercenaire',
    scholar: 'Érudit'
  };

  return (
    <div className="bg-white border-2 border-gray-800 rounded-lg p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Factions & Réputation</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-4">
        <Button
          size="sm"
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Vue d'ensemble
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'factions' ? 'default' : 'outline'}
          onClick={() => setActiveTab('factions')}
        >
          🏛️ Factions
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'create' ? 'default' : 'outline'}
          onClick={() => setActiveTab('create')}
          disabled={!canCreateFactionRep()}
        >
          ✨ Créer
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'alliances' ? 'default' : 'outline'}
          onClick={() => setActiveTab('alliances')}
        >
          🤝 Alliances
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'quests' ? 'default' : 'outline'}
          onClick={() => setActiveTab('quests')}
        >
          📜 Quêtes
        </Button>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Current Faction */}
          <div className="bg-blue-50 border border-blue-300 rounded p-3">
            <div className="text-sm font-medium mb-2">🏛️ Ma Faction</div>
            {currentFaction ? (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">{currentFaction.banner}</span>
                  <div>
                    <div className="font-semibold">{currentFaction.name}</div>
                    <div className="text-sm text-gray-600">{factionTypeLabels[currentFaction.type]}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-2">{currentFaction.description}</div>
                <div className="text-xs text-gray-500">
                  Membres: {currentFaction.members.length} • Réputation: {currentFaction.resources.reputation}
                </div>
                <Button
                  onClick={handleLeaveFaction}
                  size="sm"
                  variant="destructive"
                  className="mt-2"
                >
                  Quitter la faction
                </Button>
              </div>
            ) : (
              <div className="text-gray-600 text-sm">Vous n'appartenez à aucune faction</div>
            )}
          </div>
          
          {/* Reputation Status */}
          <div className="bg-green-50 border border-green-300 rounded p-3">
            <div className="text-sm font-medium mb-2">⚡ Statut de Réputation</div>
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: reputationLevel.color }}
              />
              <span className="font-medium">{reputationLevel.name}</span>
            </div>
            <div className="text-sm text-gray-600 mb-2">{reputationLevel.description}</div>
            <div className="text-xs text-gray-500">
              Honneur: {honor} • {canCreate ? 'Peut créer une faction' : 'Ne peut pas créer de faction'}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              <strong>Accès:</strong> {reputationLevel.effects.join(', ')}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-amber-50 border border-amber-300 rounded p-3">
            <div className="text-sm font-medium mb-2">🎯 Actions Rapides</div>
            <div className="space-y-2">
              <div className="text-xs text-gray-600">
                Quêtes disponibles: {availableQuests.length}
              </div>
              {canCreate && !currentFaction && (
                <div className="text-xs text-green-600">
                  Vous pouvez créer une faction !
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Factions Tab */}
      {activeTab === 'factions' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {factions.map((faction) => (
            <div key={faction.id} className="bg-gray-50 border border-gray-300 rounded p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{faction.banner}</span>
                <div className="flex-1">
                  <div className="font-semibold">{faction.name}</div>
                  <div className="text-sm text-gray-600">{factionTypeLabels[faction.type]}</div>
                </div>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: faction.color }}
                />
              </div>
              <div className="text-sm text-gray-600 mb-2">{faction.description}</div>
              <div className="text-xs text-gray-500 mb-2">
                Membres: {faction.members.length} • Réputation: {faction.resources.reputation}
              </div>
              
              {faction.id !== playerFaction && faction.id !== 'guild-de-pandem' && (
                <Button
                  onClick={() => handleJoinFaction(faction.id)}
                  size="sm"
                  variant="outline"
                >
                  Rejoindre
                </Button>
              )}
              
              {faction.id === 'guild-de-pandem' && (
                <div className="text-xs text-purple-600 italic">
                  Faction omnipotente et éternelle
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Faction Tab */}
      {activeTab === 'create' && (
        <FactionCreationPanel />
      )}

      {/* Quests Tab */}
      {activeTab === 'quests' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {availableQuests.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aucune quête disponible pour votre niveau de réputation
            </div>
          ) : (
            availableQuests.map((quest) => {
              const questFaction = getFactionById(quest.factionId);
              return (
                <div key={quest.id} className="bg-yellow-50 border border-yellow-300 rounded p-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{questFaction?.banner || '📜'}</span>
                    <div className="flex-1">
                      <div className="font-semibold">{quest.title}</div>
                      <div className="text-sm text-gray-600">{questFaction?.name}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{quest.description}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    Réputation requise: {quest.requirements.minReputation}
                  </div>
                  <div className="text-xs text-green-600 mb-3">
                    Récompenses: {quest.rewards.gold} or • {quest.rewards.reputation} réputation
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement quest acceptance
                      console.log('Accept quest:', quest.id);
                    }}
                  >
                    Accepter
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}