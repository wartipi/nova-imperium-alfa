import { useState } from "react";
import { useFactions } from "../../lib/stores/useFactions";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";

export function FactionPanel() {
  const { factions, playerFaction, getFactionById, canCreateFaction, createFaction, joinFaction, leaveFaction, getAvailableQuests } = useFactions();
  const { playerName } = usePlayer();
  const { honor, getReputationLevel } = useReputation();
  const [showCreateFaction, setShowCreateFaction] = useState(false);
  const [newFactionName, setNewFactionName] = useState('');
  const [newFactionDescription, setNewFactionDescription] = useState('');
  const [newFactionType, setNewFactionType] = useState<'guild' | 'kingdom' | 'merchant' | 'religious' | 'mercenary' | 'scholar'>('guild');
  const [activeTab, setActiveTab] = useState<'overview' | 'factions' | 'quests'>('overview');
  
  const currentFaction = playerFaction ? getFactionById(playerFaction) : null;
  const canCreate = canCreateFaction('player', honor);
  const availableQuests = getAvailableQuests(playerFaction, honor);
  const reputationLevel = getReputationLevel();
  
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
    <div className="bg-gradient-to-b from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-800 rounded-lg shadow-lg p-4 w-96">
      <div className="text-amber-900 font-bold text-lg mb-3 text-center">
        FACTIONS & QUÊTES
      </div>
      
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'bg-amber-800 text-amber-100' 
              : 'bg-amber-300 text-amber-800 hover:bg-amber-400'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('factions')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            activeTab === 'factions' 
              ? 'bg-amber-800 text-amber-100' 
              : 'bg-amber-300 text-amber-800 hover:bg-amber-400'
          }`}
        >
          Factions
        </button>
        <button
          onClick={() => setActiveTab('quests')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            activeTab === 'quests' 
              ? 'bg-amber-800 text-amber-100' 
              : 'bg-amber-300 text-amber-800 hover:bg-amber-400'
          }`}
        >
          Quêtes
        </button>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Current Faction */}
          <div className="bg-amber-50 border border-amber-700 rounded p-3">
            <div className="text-amber-900 font-semibold mb-2">🏛️ Ma Faction</div>
            {currentFaction ? (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">{currentFaction.banner}</span>
                  <div>
                    <div className="font-semibold text-amber-800">{currentFaction.name}</div>
                    <div className="text-sm text-amber-600">{factionTypeLabels[currentFaction.type]}</div>
                  </div>
                </div>
                <div className="text-sm text-amber-700 mb-2">{currentFaction.description}</div>
                <div className="text-xs text-amber-600">
                  Membres: {currentFaction.members.length} • Réputation: {currentFaction.resources.reputation}
                </div>
                <button
                  onClick={handleLeaveFaction}
                  className="mt-2 px-3 py-1 bg-red-200 text-red-800 rounded text-sm hover:bg-red-300 transition-colors"
                >
                  Quitter la faction
                </button>
              </div>
            ) : (
              <div className="text-amber-600 text-sm">Vous n'appartenez à aucune faction</div>
            )}
          </div>
          
          {/* Reputation Status */}
          <div className="bg-amber-50 border border-amber-700 rounded p-3">
            <div className="text-amber-900 font-semibold mb-2">⚡ Statut auprès de la Guilde de Pandem</div>
            <div className="flex items-center space-x-2 mb-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: reputationLevel.color }}
              />
              <span className="text-amber-800 font-medium">{reputationLevel.name}</span>
            </div>
            <div className="text-sm text-amber-700 mb-2">{reputationLevel.description}</div>
            <div className="text-xs text-amber-600">
              Honneur: {honor} • {canCreate ? 'Peut créer une faction' : 'Ne peut pas créer de faction'}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-amber-50 border border-amber-700 rounded p-3">
            <div className="text-amber-900 font-semibold mb-2">🎯 Actions</div>
            <div className="space-y-2">
              {canCreate && !currentFaction && (
                <button
                  onClick={() => setShowCreateFaction(true)}
                  className="w-full px-3 py-2 bg-green-200 text-green-800 rounded text-sm hover:bg-green-300 transition-colors"
                >
                  Créer une faction
                </button>
              )}
              <div className="text-xs text-amber-600">
                Quêtes disponibles: {availableQuests.length}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Factions Tab */}
      {activeTab === 'factions' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {factions.map((faction) => (
            <div key={faction.id} className="bg-amber-50 border border-amber-700 rounded p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">{faction.banner}</span>
                <div className="flex-1">
                  <div className="font-semibold text-amber-800">{faction.name}</div>
                  <div className="text-sm text-amber-600">{factionTypeLabels[faction.type]}</div>
                </div>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: faction.color }}
                />
              </div>
              <div className="text-sm text-amber-700 mb-2">{faction.description}</div>
              <div className="text-xs text-amber-600 mb-2">
                Membres: {faction.members.length} • Réputation: {faction.resources.reputation}
              </div>
              
              {faction.id !== playerFaction && faction.id !== 'guild-de-pandem' && (
                <button
                  onClick={() => handleJoinFaction(faction.id)}
                  className="px-3 py-1 bg-blue-200 text-blue-800 rounded text-sm hover:bg-blue-300 transition-colors"
                >
                  Rejoindre
                </button>
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
      
      {/* Quests Tab */}
      {activeTab === 'quests' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {availableQuests.map((quest) => {
            const questFaction = getFactionById(quest.factionId);
            return (
              <div key={quest.id} className="bg-amber-50 border border-amber-700 rounded p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{questFaction?.banner || '📜'}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-amber-800">{quest.title}</div>
                    <div className="text-sm text-amber-600">{questFaction?.name}</div>
                  </div>
                </div>
                <div className="text-sm text-amber-700 mb-2">{quest.description}</div>
                <div className="text-xs text-amber-600 mb-2">
                  Récompenses: {quest.rewards.gold} or • {quest.rewards.reputation} réputation
                </div>
                <div className="text-xs text-amber-500">
                  Réputation requise: {quest.requirements.minReputation}
                </div>
                <button
                  className="mt-2 px-3 py-1 bg-green-200 text-green-800 rounded text-sm hover:bg-green-300 transition-colors"
                  onClick={() => {
                    // TODO: Implement quest acceptance
                    console.log('Accept quest:', quest.id);
                  }}
                >
                  Accepter
                </button>
              </div>
            );
          })}
          
          {availableQuests.length === 0 && (
            <div className="text-amber-600 text-sm text-center py-4">
              Aucune quête disponible pour votre niveau de réputation
            </div>
          )}
        </div>
      )}
      
      {/* Create Faction Modal */}
      {showCreateFaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-amber-100 border-2 border-amber-800 rounded-lg p-6 w-96">
            <h3 className="text-amber-900 font-bold text-lg mb-4">Créer une Faction</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-amber-800 text-sm font-medium mb-1">Nom</label>
                <input
                  type="text"
                  value={newFactionName}
                  onChange={(e) => setNewFactionName(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-600 rounded text-amber-900 bg-amber-50"
                  placeholder="Nom de la faction"
                />
              </div>
              
              <div>
                <label className="block text-amber-800 text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newFactionDescription}
                  onChange={(e) => setNewFactionDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-600 rounded text-amber-900 bg-amber-50 h-20"
                  placeholder="Description de la faction"
                />
              </div>
              
              <div>
                <label className="block text-amber-800 text-sm font-medium mb-1">Type</label>
                <select
                  value={newFactionType}
                  onChange={(e) => setNewFactionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-amber-600 rounded text-amber-900 bg-amber-50"
                >
                  <option value="guild">Guilde</option>
                  <option value="kingdom">Royaume</option>
                  <option value="merchant">Marchand</option>
                  <option value="religious">Religieux</option>
                  <option value="mercenary">Mercenaire</option>
                  <option value="scholar">Érudit</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleCreateFaction}
                disabled={!newFactionName.trim() || !newFactionDescription.trim()}
                className="flex-1 px-4 py-2 bg-green-200 text-green-800 rounded hover:bg-green-300 transition-colors disabled:opacity-50"
              >
                Créer
              </button>
              <button
                onClick={() => setShowCreateFaction(false)}
                className="flex-1 px-4 py-2 bg-red-200 text-red-800 rounded hover:bg-red-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}