import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useQueryClient } from "@tanstack/react-query";

type TreatyType = 
  | 'alliance_militaire'
  | 'accord_commercial' 
  | 'pacte_non_agression'
  | 'defense_mutuelle';

interface TreatyProperties {
  alliance_militaire?: {
    mutualDefense: boolean;
    sharedIntelligence: boolean;
    jointOperations: boolean;
    resourceSharing: number;
    militarySupport: 'full' | 'partial' | 'emergency_only';
  };
  accord_commercial?: {
    tradeRoutes: boolean;
    tariffsReduction: number;
    exclusiveDeals: boolean;
    resourcePriority: string[];
    goldBonus: number;
  };
  pacte_non_agression?: {
    duration: number;
    neutralZones: { x: number; y: number }[];
    tradingAllowed: boolean;
    militaryPassage: boolean;
  };
  defense_mutuelle?: {
    responseTime: number;
    supportLevel: 'troops' | 'resources' | 'both';
    sharedTerritories: boolean;
    emergencyContact: boolean;
  };

}

interface Treaty {
  id: string;
  title: string;
  type: TreatyType;
  parties: string[];
  terms: string;
  status: 'draft' | 'proposed' | 'active' | 'expired' | 'broken';
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  signatures: { playerId: string; signedAt: number }[];
  properties: TreatyProperties;
  actionPointsCost: number;
}

interface TreatyTypeInfo {
  type: TreatyType;
  name: string;
  description: string;
  cost: number;
  icon: string;
}

export function TreatiesPanel() {
  const { currentNovaImperium, novaImperiums } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const queryClient = useQueryClient();
  const [treaties, setTreaties] = useState<Treaty[]>([]);
  const [treatyTypes, setTreatyTypes] = useState<TreatyTypeInfo[]>([]);
  const [selectedTreatyType, setSelectedTreatyType] = useState<TreatyType>('alliance_militaire');
  const [treatyTitle, setTreatyTitle] = useState('');
  const [treatyTerms, setTreatyTerms] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'active' | 'history'>('overview');

  // Propriétés spécifiques pour alliance militaire
  const [militaryProps, setMilitaryProps] = useState({
    mutualDefense: true,
    sharedIntelligence: false,
    jointOperations: false,
    resourceSharing: 0,
    militarySupport: 'partial' as const
  });

  if (!currentNovaImperium) return null;

  const otherPlayers = novaImperiums.filter(ni => ni.id !== currentNovaImperium.id);
  const currentTreatyType = treatyTypes.find(t => t.type === selectedTreatyType);
  const treatyCost = currentTreatyType?.cost || 15;

  // Charger les traités et types au démarrage
  useEffect(() => {
    loadTreaties();
    loadTreatyTypes();
    const interval = setInterval(loadTreaties, 10000);
    return () => clearInterval(interval);
  }, [currentNovaImperium.id]);

  const loadTreaties = async () => {
    try {
      const response = await fetch(`/api/treaties/player/${currentNovaImperium.id}`);
      if (response.ok) {
        const data = await response.json();
        setTreaties(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des traités:', error);
    }
  };

  const loadTreatyTypes = async () => {
    try {
      const response = await fetch('/api/treaties/types');
      if (response.ok) {
        const data = await response.json();
        setTreatyTypes(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types de traités:', error);
    }
  };

  const getTypeColor = (type: TreatyType) => {
    switch (type) {
      case 'alliance_militaire': return 'text-red-600';
      case 'accord_commercial': return 'text-yellow-600';
      case 'pacte_non_agression': return 'text-blue-600';
      case 'defense_mutuelle': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: Treaty['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-500';
      case 'proposed': return 'text-orange-500';
      case 'active': return 'text-green-500';
      case 'expired': return 'text-gray-400';
      case 'broken': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusText = (status: Treaty['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'proposed': return 'Proposé';
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'broken': return 'Rompu';
      default: return status;
    }
  };

  const createTreaty = async () => {
    if (!treatyTitle.trim() || !treatyTerms.trim() || selectedParties.length === 0) return;
    
    if (actionPoints < treatyCost) {
      alert(`Pas assez de Points d'Action pour créer un traité (${treatyCost} PA requis)`);
      return;
    }

    setIsLoading(true);
    try {
      let properties: TreatyProperties = {};
      
      if (selectedTreatyType === 'alliance_militaire') {
        properties.alliance_militaire = militaryProps;
      }

      const response = await fetch('/api/treaties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: treatyTitle,
          type: selectedTreatyType,
          parties: [currentNovaImperium.id, ...selectedParties],
          terms: treatyTerms,
          createdBy: currentNovaImperium.id,
          properties
        })
      });

      if (response.ok) {
        spendActionPoints(treatyCost);
        setActiveTab('overview');
        setTreatyTitle('');
        setTreatyTerms('');
        setSelectedParties([]);
        setMilitaryProps({
          mutualDefense: true,
          sharedIntelligence: false,
          jointOperations: false,
          resourceSharing: 0,
          militarySupport: 'partial'
        });
        await loadTreaties();
      } else {
        alert('Erreur lors de la création du traité');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du traité');
    } finally {
      setIsLoading(false);
    }
  };

  const signTreaty = async (treatyId: string) => {
    try {
      const response = await fetch(`/api/treaties/${treatyId}/sign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: currentNovaImperium.id
        })
      });

      if (response.ok) {
        await loadTreaties();
      }
    } catch (error) {
      console.error('Erreur lors de la signature du traité:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerName = (playerId: string) => {
    const player = novaImperiums.find(ni => ni.id === playerId);
    return player?.name || 'Joueur inconnu';
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Traités & Accords</h4>
        <div className="text-xs text-gray-600">
          Points d'Action: {actionPoints} ⚡
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded">
        <Button
          size="sm"
          variant={activeTab === 'overview' ? 'default' : 'outline'}
          onClick={() => setActiveTab('overview')}
        >
          📊 Vue d'ensemble
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'create' ? 'default' : 'outline'}
          onClick={() => setActiveTab('create')}
        >
          ✍️ Créer
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'active' ? 'default' : 'outline'}
          onClick={() => setActiveTab('active')}
        >
          ✅ Actifs
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'history' ? 'default' : 'outline'}
          onClick={() => setActiveTab('history')}
        >
          📜 Historique
        </Button>
      </div>

      {/* Onglet Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-300 rounded p-3">
            <div className="text-sm font-medium mb-2">📊 Statistiques</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Traités actifs: {treaties.filter(t => t.status === 'active').length}</div>
              <div>Traités proposés: {treaties.filter(t => t.status === 'proposed').length}</div>
              <div>Traités créés: {treaties.filter(t => t.createdBy === currentNovaImperium.id).length}</div>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-300 rounded p-3">
            <div className="text-sm font-medium mb-2">🎯 Types de traités disponibles</div>
            <div className="grid grid-cols-2 gap-2">
              {treatyTypes.map(type => (
                <div key={type.type} className="flex items-center space-x-2">
                  <span className="text-lg">{type.icon}</span>
                  <div>
                    <div className="text-xs font-medium">{type.name}</div>
                    <div className="text-xs text-gray-500">{type.cost} PA</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onglet Créer */}
      {activeTab === 'create' && (
        <div className="bg-blue-50 border border-blue-300 rounded p-4">
          <div className="space-y-4">
            <div className="text-sm font-medium mb-3">✍️ Créer un nouveau traité</div>
            
            {/* Sélection du type de traité */}
            <div>
              <label className="block text-xs font-medium mb-1">Type de traité</label>
              <select
                value={selectedTreatyType}
                onChange={(e) => setSelectedTreatyType(e.target.value as TreatyType)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
              >
                {treatyTypes.map(type => (
                  <option key={type.type} value={type.type}>
                    {type.icon} {type.name} ({type.cost} PA)
                  </option>
                ))}
              </select>
              {currentTreatyType && (
                <div className="text-xs text-gray-600 mt-1">
                  {currentTreatyType.description}
                </div>
              )}
            </div>

            {/* Titre du traité */}
            <div>
              <label className="block text-xs font-medium mb-1">Titre</label>
              <input
                type="text"
                value={treatyTitle}
                onChange={(e) => setTreatyTitle(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                placeholder="Titre du traité"
              />
            </div>

            {/* Sélection des parties */}
            <div>
              <label className="block text-xs font-medium mb-1">Parties impliquées</label>
              <div className="space-y-1">
                {otherPlayers.map(player => (
                  <label key={player.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedParties.includes(player.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParties([...selectedParties, player.id]);
                        } else {
                          setSelectedParties(selectedParties.filter(id => id !== player.id));
                        }
                      }}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">{player.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Configuration spécifique pour Alliance Militaire */}
            {selectedTreatyType === 'alliance_militaire' && (
              <div className="bg-red-50 border border-red-300 rounded p-3">
                <div className="text-xs font-medium mb-2">⚔️ Configuration de l'Alliance Militaire</div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={militaryProps.mutualDefense}
                      onChange={(e) => setMilitaryProps({...militaryProps, mutualDefense: e.target.checked})}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Défense mutuelle automatique</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={militaryProps.sharedIntelligence}
                      onChange={(e) => setMilitaryProps({...militaryProps, sharedIntelligence: e.target.checked})}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Partage de renseignements</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={militaryProps.jointOperations}
                      onChange={(e) => setMilitaryProps({...militaryProps, jointOperations: e.target.checked})}
                      className="w-3 h-3"
                    />
                    <span className="text-xs">Opérations conjointes</span>
                  </label>
                  <div>
                    <label className="block text-xs font-medium mb-1">Partage de ressources (%)</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={militaryProps.resourceSharing}
                      onChange={(e) => setMilitaryProps({...militaryProps, resourceSharing: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-600">{militaryProps.resourceSharing}%</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Niveau de soutien militaire</label>
                    <select
                      value={militaryProps.militarySupport}
                      onChange={(e) => setMilitaryProps({...militaryProps, militarySupport: e.target.value as any})}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="emergency_only">Urgence uniquement</option>
                      <option value="partial">Partiel</option>
                      <option value="full">Complet</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Termes du traité */}
            <div>
              <label className="block text-xs font-medium mb-1">Termes et conditions</label>
              <textarea
                value={treatyTerms}
                onChange={(e) => setTreatyTerms(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs h-20"
                placeholder="Détails des termes du traité..."
              />
            </div>

            {/* Boutons d'action */}
            <div className="flex space-x-2">
              <Button
                onClick={createTreaty}
                disabled={!treatyTitle.trim() || !treatyTerms.trim() || selectedParties.length === 0 || isLoading || actionPoints < treatyCost}
                size="sm"
                className="flex-1"
              >
                {isLoading ? 'Création...' : `Créer (${treatyCost} PA)`}
              </Button>
              <Button
                onClick={() => setActiveTab('overview')}
                size="sm"
                variant="outline"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Traités actifs */}
      {activeTab === 'active' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {treaties.filter(t => t.status === 'active').map(treaty => (
            <div key={treaty.id} className="bg-green-50 border border-green-300 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{treatyTypes.find(t => t.type === treaty.type)?.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{treaty.title}</div>
                    <div className="text-xs text-gray-600">
                      {treatyTypes.find(t => t.type === treaty.type)?.name}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(treaty.status)}`}>
                  {getStatusText(treaty.status)}
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-2">
                Parties: {treaty.parties.map(getPlayerName).join(', ')}
              </div>
              <div className="text-xs text-gray-700 mb-2">{treaty.terms}</div>
              <div className="text-xs text-gray-500">
                Créé le {formatDate(treaty.createdAt)}
              </div>
              
              {/* Affichage des propriétés spécifiques */}
              {treaty.type === 'alliance_militaire' && treaty.properties.alliance_militaire && (
                <div className="mt-2 p-2 bg-red-100 rounded text-xs">
                  <div className="font-medium mb-1">⚔️ Configuration militaire:</div>
                  <div className="space-y-1">
                    {treaty.properties.alliance_militaire.mutualDefense && <div>• Défense mutuelle active</div>}
                    {treaty.properties.alliance_militaire.sharedIntelligence && <div>• Partage de renseignements</div>}
                    {treaty.properties.alliance_militaire.jointOperations && <div>• Opérations conjointes</div>}
                    {treaty.properties.alliance_militaire.resourceSharing > 0 && (
                      <div>• Partage de ressources: {treaty.properties.alliance_militaire.resourceSharing}%</div>
                    )}
                    <div>• Soutien: {treaty.properties.alliance_militaire.militarySupport}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {treaties.filter(t => t.status === 'active').length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun traité actif
            </div>
          )}
        </div>
      )}

      {/* Onglet Historique */}
      {activeTab === 'history' && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {treaties.filter(t => t.status === 'proposed').map(treaty => (
            <div key={treaty.id} className="bg-yellow-50 border border-yellow-300 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{treatyTypes.find(t => t.type === treaty.type)?.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{treaty.title}</div>
                    <div className="text-xs text-gray-600">
                      {treatyTypes.find(t => t.type === treaty.type)?.name}
                    </div>
                  </div>
                </div>
                <div className={`text-xs font-medium ${getStatusColor(treaty.status)}`}>
                  {getStatusText(treaty.status)}
                </div>
              </div>
              <div className="text-xs text-gray-600 mb-2">
                Parties: {treaty.parties.map(getPlayerName).join(', ')}
              </div>
              <div className="text-xs text-gray-700 mb-2">{treaty.terms}</div>
              <div className="text-xs text-gray-500 mb-2">
                Créé le {formatDate(treaty.createdAt)}
              </div>
              
              {/* Signatures */}
              <div className="text-xs text-gray-600 mb-2">
                Signatures: {treaty.signatures.length}/{treaty.parties.length}
              </div>
              
              {/* Bouton de signature si pas encore signé */}
              {!treaty.signatures.some(sig => sig.playerId === currentNovaImperium.id) && (
                <Button
                  onClick={() => signTreaty(treaty.id)}
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  Signer
                </Button>
              )}
            </div>
          ))}
          
          {treaties.filter(t => t.status === 'proposed').length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun traité en attente
            </div>
          )}
        </div>
      )}
    </div>
  );
}