import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface AvatarActionMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onMoveRequest: () => void;
}

export function AvatarActionMenu({ position, onClose, onMoveRequest }: AvatarActionMenuProps) {
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

  // Actions basées sur les compétences acquises
  const getCompetenceBasedActions = () => {
    const actions = [];
    
    // Actions militaires
    if (competences.some(comp => comp.includes('Tactique'))) {
      actions.push({
        id: 'tactical_maneuver',
        name: 'Manœuvre Tactique',
        description: 'Organiser une manœuvre militaire stratégique',
        cost: 5,
        icon: '⚔️',
        category: 'military'
      });
    }
    
    if (competences.some(comp => comp.includes('Art de la Guerre'))) {
      actions.push({
        id: 'battle_command',
        name: 'Commandement de Bataille',
        description: 'Diriger les troupes au combat',
        cost: 7,
        icon: '🛡️',
        category: 'military'
      });
    }
    
    // Actions politiques
    if (competences.some(comp => comp.includes('Diplomatie'))) {
      actions.push({
        id: 'diplomatic_negotiation',
        name: 'Négociation Diplomatique',
        description: 'Négocier avec d\'autres factions',
        cost: 4,
        icon: '🤝',
        category: 'political'
      });
    }
    
    if (competences.some(comp => comp.includes('Intrigues'))) {
      actions.push({
        id: 'court_intrigue',
        name: 'Intrigue de Cour',
        description: 'Manigancer dans les cercles de pouvoir',
        cost: 6,
        icon: '🗡️',
        category: 'political'
      });
    }
    
    // Actions économiques
    if (competences.some(comp => comp.includes('Commerce'))) {
      actions.push({
        id: 'trade_negotiation',
        name: 'Négociation Commerciale',
        description: 'Établir des accords commerciaux',
        cost: 3,
        icon: '💰',
        category: 'economic'
      });
    }
    
    if (competences.some(comp => comp.includes('Gestion'))) {
      actions.push({
        id: 'resource_management',
        name: 'Gestion des Ressources',
        description: 'Optimiser l\'utilisation des ressources',
        cost: 5,
        icon: '📊',
        category: 'economic'
      });
    }
    
    // Actions stratégiques
    if (competences.some(comp => comp.includes('Espionnage'))) {
      actions.push({
        id: 'intelligence_gathering',
        name: 'Collecte d\'Intelligence',
        description: 'Rassembler des informations secrètes',
        cost: 4,
        icon: '🔍',
        category: 'strategic'
      });
    }
    
    if (competences.some(comp => comp.includes('Planification'))) {
      actions.push({
        id: 'strategic_planning',
        name: 'Planification Stratégique',
        description: 'Élaborer des plans à long terme',
        cost: 6,
        icon: '📋',
        category: 'strategic'
      });
    }
    
    // Actions occultes
    if (competences.some(comp => comp.includes('Rituels'))) {
      actions.push({
        id: 'occult_ritual',
        name: 'Rituel Occulte',
        description: 'Effectuer un rituel mystique',
        cost: 8,
        icon: '🔮',
        category: 'occult'
      });
    }
    
    if (competences.some(comp => comp.includes('Magie Noire'))) {
      actions.push({
        id: 'dark_magic',
        name: 'Magie Noire',
        description: 'Utiliser des pouvoirs interdits',
        cost: 10,
        icon: '🌙',
        category: 'occult'
      });
    }
    
    return actions;
  };

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
    
    if (action.id === 'move') {
      onMoveRequest();
      onClose();
      return;
    }
    
    if (spendActionPoints(action.cost)) {
      console.log(`Action exécutée: ${action.name}`);
      onClose();
    }
  };

  const getAllAvailableActions = () => {
    return [
      ...baseActions,
      ...competenceActions.filter(action => 
        competences.some(comp => comp.includes(action.requiredCompetence))
      ),
      ...getCompetenceBasedActions(),
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