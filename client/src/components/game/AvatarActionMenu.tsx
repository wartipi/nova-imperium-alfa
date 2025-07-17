import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface AvatarActionMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
}

export function AvatarActionMenu({ position, onClose }: AvatarActionMenuProps) {
  const { competences, actionPoints, spendActionPoints, selectedCharacter } = usePlayer();
  const { honor, reputation } = useReputation();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Actions de base disponibles pour tous les joueurs
  const baseActions = [
    {
      id: 'move',
      name: 'Se Déplacer',
      description: 'Déplacer l\'avatar vers une nouvelle position',
      cost: 1,
      icon: '🚶',
      category: 'movement'
    },
    {
      id: 'explore',
      name: 'Explorer',
      description: 'Découvrir les environs et révéler des informations',
      cost: 3,
      icon: '🔍',
      category: 'exploration'
    },
    {
      id: 'rest',
      name: 'Se Reposer',
      description: 'Récupérer des points d\'action',
      cost: 0,
      icon: '🛌',
      category: 'utility'
    }
  ];

  // Actions basées sur les compétences
  const competenceActions = [
    {
      id: 'political_negotiate',
      name: 'Négocier',
      description: 'Utiliser ses compétences politiques pour négocier',
      cost: 5,
      icon: '🤝',
      category: 'political',
      requiredCompetence: 'political'
    },
    {
      id: 'military_command',
      name: 'Commander',
      description: 'Diriger des troupes et organiser la défense',
      cost: 4,
      icon: '⚔️',
      category: 'military',
      requiredCompetence: 'military'
    },
    {
      id: 'economic_trade',
      name: 'Commercer',
      description: 'Établir des routes commerciales et négocier',
      cost: 3,
      icon: '💰',
      category: 'economic',
      requiredCompetence: 'economic'
    },
    {
      id: 'strategic_plan',
      name: 'Planifier',
      description: 'Élaborer des stratégies à long terme',
      cost: 6,
      icon: '🎯',
      category: 'strategic',
      requiredCompetence: 'strategic'
    },
    {
      id: 'occult_ritual',
      name: 'Rituel Occulte',
      description: 'Utiliser des connaissances occultes anciennes',
      cost: 8,
      icon: '🔮',
      category: 'occult',
      requiredCompetence: 'occult'
    }
  ];

  // Actions basées sur le personnage sélectionné
  const characterActions = [
    {
      id: 'knight_charge',
      name: 'Charge Héroïque',
      description: 'Mener une charge courageuse au combat',
      cost: 5,
      icon: '🛡️',
      category: 'combat',
      requiredCharacter: 'knight'
    },
    {
      id: 'wizard_spell',
      name: 'Lancer un Sort',
      description: 'Utiliser la magie pour influencer l\'environnement',
      cost: 7,
      icon: '🧙',
      category: 'magic',
      requiredCharacter: 'wizard'
    },
    {
      id: 'archer_precision',
      name: 'Tir de Précision',
      description: 'Viser avec une précision mortelle',
      cost: 4,
      icon: '🏹',
      category: 'ranged',
      requiredCharacter: 'archer'
    },
    {
      id: 'priest_blessing',
      name: 'Bénédiction',
      description: 'Accorder des bénédictions divines',
      cost: 6,
      icon: '🙏',
      category: 'divine',
      requiredCharacter: 'priest'
    },
    {
      id: 'rogue_stealth',
      name: 'Furtivité',
      description: 'Se déplacer sans être détecté',
      cost: 3,
      icon: '🥷',
      category: 'stealth',
      requiredCharacter: 'rogue'
    }
  ];

  // Actions basées sur la réputation
  const reputationActions = [
    {
      id: 'honorable_inspire',
      name: 'Inspirer',
      description: 'Inspirer les autres par son honneur',
      cost: 4,
      icon: '✨',
      category: 'leadership',
      requiredReputation: 'Honorable'
    },
    {
      id: 'saint_miracle',
      name: 'Miracle',
      description: 'Accomplir des actes miraculeux',
      cost: 10,
      icon: '🌟',
      category: 'divine',
      requiredReputation: 'Saint'
    },
    {
      id: 'banished_underground',
      name: 'Action Clandestine',
      description: 'Utiliser les réseaux souterrains',
      cost: 3,
      icon: '🕶️',
      category: 'underground',
      requiredReputation: 'Banni'
    }
  ];

  const isActionAvailable = (action: any) => {
    // Vérifier les points d'action
    if (actionPoints < action.cost) return false;
    
    // Vérifier les compétences requises
    if (action.requiredCompetence) {
      const hasCompetence = competences.some(comp => comp.includes(action.requiredCompetence));
      if (!hasCompetence) return false;
    }
    
    // Vérifier le personnage requis
    if (action.requiredCharacter && selectedCharacter?.id !== action.requiredCharacter) {
      return false;
    }
    
    // Vérifier la réputation requise
    if (action.requiredReputation && reputation !== action.requiredReputation) {
      return false;
    }
    
    return true;
  };

  const handleActionClick = (action: any) => {
    if (!isActionAvailable(action)) return;
    
    if (spendActionPoints(action.cost)) {
      console.log(`Action exécutée: ${action.name}`);
      // Ici on peut ajouter la logique spécifique à chaque action
      onClose();
    }
  };

  const getAllAvailableActions = () => {
    return [
      ...baseActions,
      ...competenceActions.filter(action => 
        competences.some(comp => comp.includes(action.requiredCompetence))
      ),
      ...characterActions.filter(action => 
        selectedCharacter?.id === action.requiredCharacter
      ),
      ...reputationActions.filter(action => 
        reputation === action.requiredReputation
      )
    ];
  };

  return (
    <div 
      className="absolute z-50 pointer-events-auto"
      style={{
        left: position.x - 150,
        top: position.y - 200,
        maxWidth: '300px'
      }}
    >
      <Card className="bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-800 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-amber-900">
              Actions d'Avatar
            </h3>
            <button
              onClick={onClose}
              className="text-amber-700 hover:text-amber-900 text-xl"
            >
              ×
            </button>
          </div>
          
          <div className="text-sm text-amber-700 mb-4">
            Points d'Action: {actionPoints}
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getAllAvailableActions().map((action) => (
              <div
                key={action.id}
                className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                  isActionAvailable(action)
                    ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                    : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleActionClick(action)}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{action.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-amber-900">
                      {action.name}
                    </div>
                    <div className="text-xs text-amber-600">
                      {action.description}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Coût: {action.cost} PA
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {getAllAvailableActions().length === 0 && (
            <div className="text-center text-amber-600 py-4">
              Aucune action disponible
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}