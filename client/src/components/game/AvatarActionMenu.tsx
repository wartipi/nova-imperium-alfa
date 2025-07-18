import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { Card } from "../ui/card";

interface AvatarActionMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onMoveRequest: () => void;
}

export function AvatarActionMenu({ position, onClose, onMoveRequest }: AvatarActionMenuProps) {
  const { actionPoints, spendActionPoints, hasCompetenceLevel, competences } = usePlayer();
  const { reputation } = useReputation();

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

  // Actions principales de cartographie et exploration
  const competenceActions = [
    {
      id: 'discover_region',
      name: 'Explorer Région',
      description: 'Découvrir une nouvelle région cartographique',
      cost: 10,
      icon: '🧭',
      category: 'exploration',
      requiredCompetence: 'exploration',
      requiredLevel: 1
    },
    {
      id: 'create_map',
      name: 'Cartographier',
      description: 'Créer une carte détaillée de la région',
      cost: 15,
      icon: '🗺️',
      category: 'cartography',
      requiredCompetence: 'cartography',
      requiredLevel: 1
    }
  ];

  // Actions avancées basées sur les compétences de haut niveau
  const getAdvancedActions = () => {
    const actions = [];
    
    if (hasCompetenceLevel('exploration', 3)) {
      actions.push({
        id: 'advanced_exploration',
        name: 'Exploration Avancée',
        description: 'Découvrir des secrets cachés dans la région',
        cost: 15,
        icon: '🔍',
        category: 'exploration'
      });
    }
    
    if (hasCompetenceLevel('cartography', 3)) {
      actions.push({
        id: 'masterwork_map',
        name: 'Carte de Maître',
        description: 'Créer une carte de qualité exceptionnelle',
        cost: 25,
        icon: '📜',
        category: 'cartography'
      });
    }
    
    return actions;
  };

  // Actions basées sur la réputation
  const reputationActions = [
    {
      id: 'inspire',
      name: 'Inspirer',
      description: 'Utiliser votre réputation pour inspirer les autres',
      cost: 5,
      icon: '✨',
      category: 'reputation',
      requiredReputation: 'Honorable'
    }
  ];

  const isActionAvailable = (action: any) => {
    // Vérifier les points d'action
    if (actionPoints < action.cost) return false;
    
    // Vérifier les compétences requises
    if (action.requiredCompetence) {
      const hasCompetence = hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      if (!hasCompetence) return false;
    }
    
    // Vérifier la réputation requise
    if (action.requiredReputation && reputation !== action.requiredReputation) {
      return false;
    }
    
    return true;
  };

  const handleActionClick = async (action: any) => {
    if (!isActionAvailable(action)) return;
    
    if (action.id === 'move') {
      onMoveRequest();
      onClose();
      return;
    }
    
    // Actions de cartographie
    if (action.id === 'discover_region') {
      if (spendActionPoints(action.cost)) {
        try {
          const response = await fetch('/api/cartography/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: "player",
              centerX: Math.floor(Math.random() * 50),
              centerY: Math.floor(Math.random() * 30),
              radius: Math.floor(Math.random() * 3) + 2,
              name: `Région-${Date.now()}`
            })
          });
          
          if (response.ok) {
            const newRegion = await response.json();
            alert(`Région "${newRegion.name}" découverte avec succès !`);
          } else {
            alert('Erreur lors de la découverte de la région');
          }
        } catch (error) {
          console.error('Erreur:', error);
          alert('Erreur lors de la découverte');
        }
      }
      onClose();
      return;
    }
    
    if (action.id === 'create_map') {
      if (spendActionPoints(action.cost)) {
        alert('Création de carte en cours... (Cette action sera développée)');
      }
      onClose();
      return;
    }
    
    if (spendActionPoints(action.cost)) {
      console.log(`Action exécutée: ${action.name}`);
      onClose();
    }
  };

  const getAllAvailableActions = () => {
    // Debug: afficher les compétences apprises
    console.log('Compétences apprises:', competences);
    
    const filteredCompetenceActions = competenceActions.filter(action => {
      const hasRequiredCompetence = hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      console.log(`Action ${action.name}: requiert ${action.requiredCompetence} niveau ${action.requiredLevel || 1}, a compétence: ${hasRequiredCompetence}`);
      return hasRequiredCompetence;
    });
    
    return [
      ...baseActions,
      ...filteredCompetenceActions,
      ...getAdvancedActions(),
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
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isActionAvailable(action)
                    ? 'bg-amber-50 border-amber-300 hover:bg-amber-100'
                    : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => handleActionClick(action)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{action.icon}</span>
                    <div>
                      <div className="font-semibold text-amber-900">
                        {action.name}
                      </div>
                      <div className="text-xs text-amber-700">
                        {action.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-amber-800">
                    {action.cost} PA
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}