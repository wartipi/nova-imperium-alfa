import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { Card } from "../ui/card";

interface AvatarActionMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  onMoveRequest: () => void;
}

// Fonction pour accéder aux données du jeu
const getGameData = () => {
  const gameEngine = (window as any).gameEngine;
  return {
    avatarPosition: gameEngine?.avatarPosition || { x: 25, y: 15 },
    visibleHexes: gameEngine?.getVisibleHexes() || [],
    mapData: gameEngine?.getMapData() || null
  };
};

export function AvatarActionMenu({ position, onClose, onMoveRequest }: AvatarActionMenuProps) {
  const { actionPoints, spendActionPoints, hasCompetenceLevel, competences, gainExperience, exploreCurrentLocation, discoverResourcesInVision } = usePlayer();
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
      id: 'rest',
      name: 'Se Reposer',
      description: 'Récupérer des points d\'action',
      cost: 0,
      icon: '🛌',
      category: 'utility'
    }
  ];

  // Action d'exploration nécessitant la compétence exploration niveau 1
  const explorationActions = [
    {
      id: 'explore_zone',
      name: 'Explorer la Zone',
      description: 'Révéler les ressources dans tout votre champ de vision actuel - requiert Exploration niveau 1',
      cost: 5,
      icon: '🔍',
      category: 'exploration',
      requiredCompetence: 'exploration',
      requiredLevel: 1
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
      category: 'exploration'
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

    if (action.id === 'explore_zone') {
      const { getCompetenceLevel, currentVision } = usePlayer.getState();
      const explorationLevel = getCompetenceLevel('exploration');
      const visionSize = currentVision.size;
      
      const success = discoverResourcesInVision();
      if (success) {
        alert(`Zone explorée avec succès ! Les ressources dans votre champ de vision (${visionSize} hexagones) ont été révélées.`);
      } else {
        alert('Exploration impossible : vérifiez vos PA ou votre compétence Exploration.');
      }
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
        try {
          // Récupérer les données réelles de la carte et du champ de vision
          const gameEngine = (window as any).gameEngine;
          const avatarPosition = gameEngine?.getAvatarPosition() || { x: 25, y: 15 };
          const visibleHexes = gameEngine?.getVisibleHexes() || [];
          
          console.log('Cartographie - Position avatar:', avatarPosition);
          console.log('Cartographie - Hexes visibles:', visibleHexes);
          
          // Créer les données de tuiles basées sur le champ de vision réel
          const cartographyTiles = visibleHexes.map((hexCoord: string) => {
            const [x, y] = hexCoord.split(',').map(Number);
            const tileData = gameEngine?.getTileAt(x, y);
            console.log(`Tile ${x},${y}:`, tileData);
            return {
              x,
              y,
              terrain: tileData?.terrain || 'unknown',
              resources: tileData?.resources || []
            };
          });

          const response = await fetch('/api/unique-items/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Carte-Region-${avatarPosition.x}-${avatarPosition.y}`,
              type: "carte",
              rarity: "commun",
              description: `Carte de la région explorée autour de la position (${avatarPosition.x},${avatarPosition.y})`,
              ownerId: "player",
              effects: ["navigation_locale"],
              requirements: ["cartography_level_1"],
              value: 75,
              metadata: {
                mapData: {
                  region: {
                    centerX: avatarPosition.x,
                    centerY: avatarPosition.y,
                    radius: 1,
                    tiles: cartographyTiles
                  },
                  quality: "rough",
                  accuracy: 100,
                  createdAt: Date.now(),
                  exploredBy: "player",
                  visionRange: 1
                }
              }
            })
          });
          
          if (response.ok) {
            const newItem = await response.json();
            alert(`Carte "${newItem.name}" créée avec succès ! Consultez votre inventaire.`);
          } else {
            alert('Erreur lors de la création de la carte');
          }
        } catch (error) {
          console.error('Erreur:', error);
          alert('Erreur lors de la création de la carte');
        }
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
    const filteredCompetenceActions = competenceActions.filter(action => {
      return hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
    });

    const filteredExplorationActions = explorationActions.filter(action => {
      if (action.requiredCompetence) {
        return hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      }
      return true;
    });
    
    return [
      ...baseActions,
      ...filteredExplorationActions,
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