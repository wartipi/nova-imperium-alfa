import { useState } from "react";
import { Button } from "../ui/button";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";

interface Alliance {
  id: string;
  name: string;
  type: 'public' | 'secret';
  members: string[];
  description: string;
  terms: string;
  createdAt: number;
  createdBy: string;
  status: 'active' | 'broken' | 'expired';
  gnBased: boolean; // Basée sur des interactions GN
}

interface AlliancesPanelProps {
  onClose: () => void;
}

export function AlliancesPanel({ onClose }: AlliancesPanelProps) {
  const { currentNovaImperium } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const { honor, addReputationAction } = useReputation();
  
  const [activeTab, setActiveTab] = useState<'public' | 'secret' | 'create'>('public');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [allianceData, setAllianceData] = useState({
    name: '',
    type: 'public' as 'public' | 'secret',
    members: '',
    description: '',
    terms: '',
    gnBased: false
  });

  if (!currentNovaImperium) return null;

  const creationCost = 15; // Coût en PA pour créer une alliance
  const canCreateAlliance = actionPoints >= creationCost;

  // Alliances mock pour démonstration
  const mockAlliances: Alliance[] = [
    {
      id: '1',
      name: 'Ligue des Marchands',
      type: 'public',
      members: ['Empire du Joueur', 'Empire Rival', 'Cité des Mers'],
      description: 'Alliance commerciale pour faciliter les échanges',
      terms: 'Tarifs préférentiels, protection mutuelle des routes commerciales',
      createdAt: Date.now() - 86400000,
      createdBy: 'Empire du Joueur',
      status: 'active',
      gnBased: false
    },
    {
      id: '2',
      name: 'Pacte des Ombres',
      type: 'secret',
      members: ['Empire du Joueur', 'Royaume du Nord'],
      description: 'Alliance secrète pour actions clandestines',
      terms: 'Échange d\'informations, soutien mutuel en cas de conflit',
      createdAt: Date.now() - 172800000,
      createdBy: 'Empire du Joueur',
      status: 'active',
      gnBased: true
    }
  ];

  const publicAlliances = mockAlliances.filter(a => a.type === 'public');
  const secretAlliances = mockAlliances.filter(a => a.type === 'secret');

  const handleCreateAlliance = async () => {
    if (!allianceData.name.trim() || !allianceData.description.trim() || !allianceData.terms.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const success = spendActionPoints(creationCost);
    if (success) {
      // Créer l'alliance
      const newAlliance: Alliance = {
        id: Date.now().toString(),
        name: allianceData.name,
        type: allianceData.type,
        members: [currentNovaImperium.name, ...allianceData.members.split(',').map(m => m.trim()).filter(m => m)],
        description: allianceData.description,
        terms: allianceData.terms,
        createdAt: Date.now(),
        createdBy: currentNovaImperium.name,
        status: 'active',
        gnBased: allianceData.gnBased
      };

      // Ajouter à la réputation
      addReputationAction({
        description: `Créé l'alliance "${allianceData.name}"`,
        honorChange: allianceData.type === 'public' ? 25 : 10,
        category: 'diplomatic',
        witnesses: allianceData.type === 'public' ? newAlliance.members : []
      });

      // Réinitialiser le formulaire
      setAllianceData({
        name: '',
        type: 'public',
        members: '',
        description: '',
        terms: '',
        gnBased: false
      });
      setShowCreateForm(false);
      setActiveTab('public');
      
      console.log(`Alliance créée pour ${creationCost} PA`);
    }
  };

  const handleBetrayAlliance = (alliance: Alliance) => {
    if (window.confirm(`Êtes-vous sûr de vouloir trahir l'alliance "${alliance.name}" ? Cela affectera gravement votre réputation.`)) {
      addReputationAction({
        description: `Trahi l'alliance "${alliance.name}"`,
        honorChange: alliance.type === 'public' ? -150 : -75,
        category: 'diplomatic',
        witnesses: alliance.type === 'public' ? alliance.members : []
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="bg-white border-2 border-gray-800 rounded-lg p-4 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Alliances & Trahisons</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>

      {/* Navigation */}
      <div className="flex space-x-2 mb-4">
        <Button
          size="sm"
          variant={activeTab === 'public' ? 'default' : 'outline'}
          onClick={() => setActiveTab('public')}
        >
          🏛️ Publiques
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'secret' ? 'default' : 'outline'}
          onClick={() => setActiveTab('secret')}
        >
          🗝️ Secrètes
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'create' ? 'default' : 'outline'}
          onClick={() => setActiveTab('create')}
        >
          ✨ Créer
        </Button>
      </div>

      {/* Alliances publiques */}
      {activeTab === 'public' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-3">
            Les alliances publiques sont visibles par tous les joueurs et enregistrées officiellement.
          </div>
          
          {publicAlliances.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aucune alliance publique
            </div>
          ) : (
            <div className="space-y-3">
              {publicAlliances.map((alliance) => (
                <div key={alliance.id} className="bg-blue-50 border border-blue-300 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{alliance.name}</div>
                    <div className="text-xs text-gray-500">{formatDate(alliance.createdAt)}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{alliance.description}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    <strong>Membres:</strong> {alliance.members.join(', ')}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    <strong>Termes:</strong> {alliance.terms}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBetrayAlliance(alliance)}
                      className="text-xs"
                    >
                      💔 Trahir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alliances secrètes */}
      {activeTab === 'secret' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-3">
            Les alliances secrètes ne sont connues que des joueurs impliqués et souvent basées sur des interactions GN.
          </div>
          
          {secretAlliances.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Aucune alliance secrète
            </div>
          ) : (
            <div className="space-y-3">
              {secretAlliances.map((alliance) => (
                <div key={alliance.id} className="bg-purple-50 border border-purple-300 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">🗝️ {alliance.name}</div>
                    <div className="text-xs text-gray-500">{formatDate(alliance.createdAt)}</div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{alliance.description}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    <strong>Membres:</strong> {alliance.members.join(', ')}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    <strong>Termes:</strong> {alliance.terms}
                  </div>
                  {alliance.gnBased && (
                    <div className="text-xs text-amber-600 mb-3">
                      🎭 Basée sur des interactions GN
                    </div>
                  )}
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBetrayAlliance(alliance)}
                      className="text-xs"
                    >
                      💔 Trahir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Créer une alliance */}
      {activeTab === 'create' && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-3">
            Créez une nouvelle alliance. Coût: {creationCost} ⚡ Points d'Action
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nom de l'alliance:</label>
              <input
                type="text"
                value={allianceData.name}
                onChange={(e) => setAllianceData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full text-sm p-2 border rounded"
                placeholder="ex: Ligue des Marchands"
                maxLength={50}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Type d'alliance:</label>
              <select
                value={allianceData.type}
                onChange={(e) => setAllianceData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full text-sm p-2 border rounded"
              >
                <option value="public">🏛️ Publique - Visible par tous</option>
                <option value="secret">🗝️ Secrète - Connue seulement des membres</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Description:</label>
              <textarea
                value={allianceData.description}
                onChange={(e) => setAllianceData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full text-sm p-2 border rounded h-20 resize-none"
                placeholder="Décrivez l'objectif de cette alliance..."
                maxLength={200}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Termes et conditions:</label>
              <textarea
                value={allianceData.terms}
                onChange={(e) => setAllianceData(prev => ({ ...prev, terms: e.target.value }))}
                className="w-full text-sm p-2 border rounded h-20 resize-none"
                placeholder="Définissez les obligations et avantages..."
                maxLength={300}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Membres invités (séparés par des virgules):</label>
              <input
                type="text"
                value={allianceData.members}
                onChange={(e) => setAllianceData(prev => ({ ...prev, members: e.target.value }))}
                className="w-full text-sm p-2 border rounded"
                placeholder="ex: Empire Rival, Cité des Mers"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="gnBased"
                checked={allianceData.gnBased}
                onChange={(e) => setAllianceData(prev => ({ ...prev, gnBased: e.target.checked }))}
              />
              <label htmlFor="gnBased" className="text-sm">
                🎭 Basée sur des interactions Grandeur Nature
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveTab('public')}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleCreateAlliance}
                disabled={!canCreateAlliance}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Créer ({creationCost} ⚡)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Informations sur les conséquences */}
      <div className="mt-6 bg-amber-50 border border-amber-300 rounded p-3">
        <div className="text-sm font-medium mb-2">⚠️ Conséquences des trahisons</div>
        <div className="text-xs space-y-1">
          <div>• Trahir une alliance publique: -150 points d'honneur</div>
          <div>• Trahir une alliance secrète: -75 points d'honneur</div>
          <div>• Les actions GN influencent directement la réputation</div>
          <div>• Les alliances secrètes sont révélées en cas de trahison</div>
        </div>
      </div>
    </div>
  );
}