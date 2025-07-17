import { useState } from "react";
import { Button } from "../ui/button";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { useFactions } from "../../lib/stores/useFactions";

interface FactionCreationData {
  name: string;
  charter: string;
  emblem: string;
  structure: string;
  type: 'military' | 'commercial' | 'religious' | 'political' | 'cultural' | 'academic';
  recruitment: 'open' | 'invitation' | 'restricted';
  territory?: string;
}

export function FactionCreationPanel() {
  const { currentNovaImperium } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const { honor, gnParticipation, seasonPass, canCreateFaction } = useReputation();
  const { createFaction } = useFactions();
  
  const [showForm, setShowForm] = useState(false);
  const [factionData, setFactionData] = useState<FactionCreationData>({
    name: '',
    charter: '',
    emblem: '',
    structure: '',
    type: 'military',
    recruitment: 'open'
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!currentNovaImperium) return null;

  const creationCost = 50; // Coût en PA pour créer une faction
  const canCreate = canCreateFaction() && actionPoints >= creationCost;

  const factionTypes = {
    military: { name: 'Militaire', icon: '⚔️', description: 'Spécialisée dans le combat et la défense' },
    commercial: { name: 'Commerciale', icon: '💰', description: 'Dédiée au commerce et aux échanges' },
    religious: { name: 'Religieuse', icon: '🏛️', description: 'Consacrée aux affaires spirituelles' },
    political: { name: 'Politique', icon: '🏛️', description: 'Axée sur la diplomatie et le pouvoir' },
    cultural: { name: 'Culturelle', icon: '🎭', description: 'Vouée aux arts et à la culture' },
    academic: { name: 'Académique', icon: '📚', description: 'Orientée vers la recherche et le savoir' }
  };

  const recruitmentTypes = {
    open: { name: 'Ouvert', description: 'Tout joueur peut rejoindre' },
    invitation: { name: 'Sur invitation', description: 'Recrutement sur invitation uniquement' },
    restricted: { name: 'Restreint', description: 'Critères spécifiques requis' }
  };

  const handleCreateFaction = async () => {
    if (!factionData.name.trim() || !factionData.charter.trim() || !factionData.emblem.trim() || !factionData.structure.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);

    try {
      const success = spendActionPoints(creationCost);
      if (success) {
        await createFaction({
          ...factionData,
          founderId: currentNovaImperium.id,
          founderName: currentNovaImperium.name
        });
        
        // Réinitialiser le formulaire
        setFactionData({
          name: '',
          charter: '',
          emblem: '',
          structure: '',
          type: 'military',
          recruitment: 'open'
        });
        setShowForm(false);
        
        console.log(`Faction créée pour ${creationCost} PA`);
      }
    } catch (error) {
      console.error('Erreur lors de la création de la faction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRequirementStatus = () => {
    const requirements = [];
    
    if (honor < 200) {
      requirements.push(`❌ Réputation Honorable requise (${honor}/200)`);
    } else {
      requirements.push(`✅ Réputation Honorable (${honor}/200)`);
    }
    
    if (gnParticipation < 2 && !seasonPass) {
      requirements.push(`❌ 2 événements GN participés OU carte de saison (${gnParticipation}/2 événements)`);
    } else if (gnParticipation >= 2) {
      requirements.push(`✅ Événements GN participés (${gnParticipation}/2)`);
    } else if (seasonPass) {
      requirements.push(`✅ Carte de saison valide`);
    }
    
    if (actionPoints < creationCost) {
      requirements.push(`❌ Points d'Action insuffisants (${actionPoints}/${creationCost})`);
    } else {
      requirements.push(`✅ Points d'Action suffisants (${actionPoints}/${creationCost})`);
    }
    
    return requirements;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Création de Faction</h4>
        <div className="text-xs text-gray-600">
          Coût de création: {creationCost} ⚡ Points d'Action
        </div>
      </div>

      {/* Prérequis */}
      <div className="bg-blue-50 border border-blue-300 rounded p-3">
        <div className="text-sm font-medium mb-2">Prérequis</div>
        <div className="space-y-1">
          {getRequirementStatus().map((req, index) => (
            <div key={index} className="text-xs">{req}</div>
          ))}
        </div>
      </div>

      {/* Formulaire de création */}
      {showForm ? (
        <div className="bg-amber-50 border border-amber-300 rounded p-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Nouvelle Faction</div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-xs"
              >
                ✕
              </Button>
            </div>
            
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Nom de la faction *:</label>
                <input
                  type="text"
                  value={factionData.name}
                  onChange={(e) => setFactionData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs p-1 border rounded"
                  placeholder="ex: Les Gardiens de l'Aurore"
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Type de faction:</label>
                <select
                  value={factionData.type}
                  onChange={(e) => setFactionData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full text-xs p-1 border rounded"
                >
                  {Object.entries(factionTypes).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.icon} {info.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {factionTypes[factionData.type].description}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Emblème *:</label>
                <input
                  type="text"
                  value={factionData.emblem}
                  onChange={(e) => setFactionData(prev => ({ ...prev, emblem: e.target.value }))}
                  className="w-full text-xs p-1 border rounded"
                  placeholder="ex: 🦅 ou description de l'emblème"
                  maxLength={100}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Politique de recrutement:</label>
                <select
                  value={factionData.recruitment}
                  onChange={(e) => setFactionData(prev => ({ ...prev, recruitment: e.target.value as any }))}
                  className="w-full text-xs p-1 border rounded"
                >
                  {Object.entries(recruitmentTypes).map(([type, info]) => (
                    <option key={type} value={type}>
                      {info.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 mt-1">
                  {recruitmentTypes[factionData.recruitment].description}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Charte de la faction *:</label>
                <textarea
                  value={factionData.charter}
                  onChange={(e) => setFactionData(prev => ({ ...prev, charter: e.target.value }))}
                  className="w-full text-xs p-2 border rounded h-20 resize-none"
                  placeholder="Décrivez les objectifs, valeurs et principes de votre faction..."
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {factionData.charter.length}/500 caractères
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Structure organisationnelle *:</label>
                <textarea
                  value={factionData.structure}
                  onChange={(e) => setFactionData(prev => ({ ...prev, structure: e.target.value }))}
                  className="w-full text-xs p-2 border rounded h-16 resize-none"
                  placeholder="Décrivez la hiérarchie, les rôles et l'organisation interne..."
                  maxLength={300}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {factionData.structure.length}/300 caractères
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-600">Territoire revendiqué (optionnel):</label>
                <input
                  type="text"
                  value={factionData.territory || ''}
                  onChange={(e) => setFactionData(prev => ({ ...prev, territory: e.target.value }))}
                  className="w-full text-xs p-1 border rounded"
                  placeholder="ex: Îles du Nord, Côte Est..."
                  maxLength={100}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowForm(false)}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleCreateFaction}
                disabled={!canCreate || isLoading}
                className="text-xs bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? 'Création...' : `Créer (${creationCost} ⚡)`}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            disabled={!canCreate}
            className="text-xs bg-amber-600 hover:bg-amber-700"
          >
            🏛️ Créer une Faction
          </Button>
          {!canCreate && (
            <div className="text-xs text-red-600 mt-2">
              Prérequis non remplis
            </div>
          )}
        </div>
      )}

      {/* Informations sur les factions */}
      <div className="bg-gray-50 border border-gray-300 rounded p-3">
        <div className="text-sm font-medium mb-2">À propos des factions</div>
        <div className="text-xs space-y-1">
          <div>• Une faction peut établir ses propres règles internes</div>
          <div>• Les factions peuvent recruter librement selon leur politique</div>
          <div>• Les alliances entre factions sont possibles</div>
          <div>• Les actions GN influencent la réputation de la faction</div>
          <div>• Les factions peuvent posséder des territoires</div>
        </div>
      </div>
    </div>
  );
}