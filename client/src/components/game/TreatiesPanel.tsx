import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useQueryClient } from "@tanstack/react-query";

interface Treaty {
  id: string;
  title: string;
  type: 'alliance' | 'commerce' | 'non_aggression' | 'mutual_defense' | 'cultural' | 'research';
  parties: string[]; // IDs des joueurs participants
  terms: string;
  status: 'draft' | 'proposed' | 'active' | 'expired' | 'broken';
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  signatures: { playerId: string; signedAt: number }[];
}

export function TreatiesPanel() {
  const { currentNovaImperium, novaImperiums } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const queryClient = useQueryClient();
  const [treaties, setTreaties] = useState<Treaty[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTreatyType, setSelectedTreatyType] = useState<Treaty['type']>('alliance');
  const [treatyTitle, setTreatyTitle] = useState('');
  const [treatyTerms, setTreatyTerms] = useState('');
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!currentNovaImperium) return null;

  const otherPlayers = novaImperiums.filter(ni => ni.id !== currentNovaImperium.id);
  const treatyCost = 5; // Coût en PA pour créer un traité

  // Charger les traités au démarrage
  useEffect(() => {
    loadTreaties();
    // Recharger les traités toutes les 10 secondes
    const interval = setInterval(loadTreaties, 10000);
    return () => clearInterval(interval);
  }, [currentNovaImperium.id]);

  const loadTreaties = async () => {
    try {
      const response = await fetch(`/api/treaties/${currentNovaImperium.id}`);
      if (response.ok) {
        const data = await response.json();
        setTreaties(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des traités:', error);
    }
  };

  const treatyTypes = {
    alliance: { 
      name: 'Alliance Militaire', 
      icon: '🤝', 
      color: 'text-green-600',
      description: 'Alliance offensive et défensive mutuelle'
    },
    commerce: { 
      name: 'Accord Commercial', 
      icon: '💰', 
      color: 'text-yellow-600',
      description: 'Échanges commerciaux privilégiés'
    },
    non_aggression: { 
      name: 'Pacte de Non-Agression', 
      icon: '🕊️', 
      color: 'text-blue-600',
      description: 'Engagement mutuel de non-agression'
    },
    mutual_defense: { 
      name: 'Défense Mutuelle', 
      icon: '🛡️', 
      color: 'text-purple-600',
      description: 'Aide militaire en cas d\'attaque'
    },
    cultural: { 
      name: 'Échange Culturel', 
      icon: '🎭', 
      color: 'text-pink-600',
      description: 'Partage de connaissances culturelles'
    },
    research: { 
      name: 'Coopération Scientifique', 
      icon: '🔬', 
      color: 'text-indigo-600',
      description: 'Recherche collaborative'
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
      alert('Pas assez de Points d\'Action pour créer un traité (5 PA requis)');
      return;
    }

    setIsLoading(true);
    
    try {
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
          createdBy: currentNovaImperium.id
        })
      });

      if (response.ok) {
        const success = spendActionPoints(treatyCost);
        if (success) {
          setTreatyTitle('');
          setTreatyTerms('');
          setSelectedParties([]);
          setShowCreateForm(false);
          await loadTreaties(); // Recharger les traités
          console.log(`Traité créé pour ${treatyCost} PA`);
        }
      } else {
        console.error('Erreur lors de la création du traité');
      }
    } catch (error) {
      console.error('Erreur lors de la création du traité:', error);
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
        await loadTreaties(); // Recharger les traités
        console.log('Traité signé avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de la signature du traité:', error);
    }
  };

  const myTreaties = treaties.filter(treaty => 
    treaty.parties.includes(currentNovaImperium.id)
  );

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
          Coût de création: {treatyCost} ⚡ Points d'Action
        </div>
      </div>

      {/* Formulaire de création */}
      {showCreateForm ? (
        <div className="bg-blue-50 border border-blue-300 rounded p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Nouveau Traité</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="text-xs"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Type de traité:</label>
                <select
                  value={selectedTreatyType}
                  onChange={(e) => setSelectedTreatyType(e.target.value as Treaty['type'])}
                  className="w-full text-xs p-1 border rounded"
                >
                  {Object.entries(treatyTypes).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.icon} {info.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {treatyTypes[selectedTreatyType].description}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Titre du traité:</label>
                <input
                  type="text"
                  value={treatyTitle}
                  onChange={(e) => setTreatyTitle(e.target.value)}
                  className="w-full text-xs p-1 border rounded"
                  placeholder="ex: Alliance du Nord"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Participants:</label>
                <div className="space-y-1">
                  {otherPlayers.map(player => (
                    <label key={player.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedParties.includes(player.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParties(prev => [...prev, player.id]);
                          } else {
                            setSelectedParties(prev => prev.filter(id => id !== player.id));
                          }
                        }}
                        className="text-xs"
                      />
                      <span className="text-xs">{player.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Termes du traité:</label>
                <textarea
                  value={treatyTerms}
                  onChange={(e) => setTreatyTerms(e.target.value)}
                  className="w-full text-xs p-2 border rounded h-20 resize-none"
                  placeholder="Décrivez les termes et conditions..."
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {treatyTerms.length}/500 caractères
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={createTreaty}
                disabled={!treatyTitle.trim() || !treatyTerms.trim() || selectedParties.length === 0 || actionPoints < treatyCost || isLoading}
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Création...' : `Créer (${treatyCost} ⚡)`}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Button
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700"
          >
            📜 Nouveau Traité
          </Button>
        </div>
      )}

      {/* Liste des traités */}
      <div className="bg-amber-50 border border-amber-300 rounded p-3">
        <div className="text-sm font-medium mb-2">
          Mes Traités ({myTreaties.length})
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {myTreaties.length === 0 ? (
            <div className="text-xs text-gray-500 italic">Aucun traité en cours</div>
          ) : (
            myTreaties.map(treaty => {
              const treatyInfo = treatyTypes[treaty.type];
              const hasUserSigned = treaty.signatures.some(sig => sig.playerId === currentNovaImperium.id);
              const canSign = treaty.status === 'proposed' && !hasUserSigned;
              
              return (
                <div key={treaty.id} className="p-2 bg-white rounded text-xs border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      <span>{treatyInfo.icon}</span>
                      <span className="font-medium">{treaty.title}</span>
                    </div>
                    <span className={`text-xs ${getStatusColor(treaty.status)}`}>
                      {getStatusText(treaty.status)}
                    </span>
                  </div>
                  
                  <div className={`text-xs ${treatyInfo.color} mb-1`}>
                    {treatyInfo.name}
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {treaty.terms}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-1">
                    Participants: {treaty.parties.map(getPlayerName).join(', ')}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-1">
                    Créé le: {formatDate(treaty.createdAt)}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">
                    Signatures: {treaty.signatures.length}/{treaty.parties.length}
                  </div>
                  
                  {canSign && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => signTreaty(treaty.id)}
                        className="text-xs bg-green-600 hover:bg-green-700"
                      >
                        ✍️ Signer
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="bg-gray-50 border border-gray-300 rounded p-3">
        <div className="text-sm font-medium mb-2">Statistiques</div>
        <div className="text-xs space-y-1">
          <div>Traités actifs: {myTreaties.filter(t => t.status === 'active').length}</div>
          <div>Traités proposés: {myTreaties.filter(t => t.status === 'proposed').length}</div>
          <div>Traités créés: {myTreaties.filter(t => t.createdBy === currentNovaImperium.id).length}</div>
          <div>Total traités: {myTreaties.length}</div>
        </div>
      </div>
    </div>
  );
}