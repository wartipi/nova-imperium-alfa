import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { useGameState } from "../../lib/stores/useGameState";
import { useFactions } from "../../lib/stores/useFactions";
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
  const { isGameMaster } = useGameState();
  const { playerFaction } = useFactions();

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

  // Actions principales de cartographie
  const competenceActions = [
    {
      id: 'create_map',
      name: 'Cartographier',
      description: 'Créer une carte de votre champ de vision actuel (s\'adapte au niveau d\'exploration)',
      cost: 15,
      icon: '🗺️',
      category: 'cartography',
      requiredCompetence: 'cartography',
      requiredLevel: 1
    }
  ];

  // Actions de territoire
  const territoryActions = [
    {
      id: 'claim_territory',
      name: 'Revendiquer Territoire',
      description: 'Revendiquer le territoire actuel pour votre faction',
      cost: 10,
      icon: '🏰',
      category: 'territory',
      requiredCompetence: 'local_influence',
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
    // En mode MJ, toutes les actions sont disponibles
    if (isGameMaster) return true;
    
    // Vérifier les points d'action
    if (actionPoints < action.cost) return false;
    
    // Vérification spéciale pour la revendication territoriale
    if (action.id === 'claim_territory') {
      // Doit faire partie d'une faction
      if (!playerFaction) {
        console.log(`❌ Action ${action.name} indisponible: aucune faction`);
        return false;
      }
    }
    
    // Vérifier les compétences requises
    if (action.requiredCompetence) {
      const hasCompetence = hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      const currentLevel = usePlayer.getState().getCompetenceLevel(action.requiredCompetence);
      console.log(`🔍 Vérification compétence ${action.requiredCompetence} pour ${action.name}: niveau actuel=${currentLevel}, requis=${action.requiredLevel || 1}, a_competence=${hasCompetence}`);
      if (!hasCompetence) {
        console.log(`❌ Action ${action.name} indisponible: compétence ${action.requiredCompetence} niveau ${action.requiredLevel || 1} requise`);
        return false;
      }
    }
    
    // Vérifier la réputation requise
    if (action.requiredReputation && reputation !== action.requiredReputation) {
      return false;
    }
    
    console.log(`Action ${action.name} disponible: PA=${actionPoints}/${action.cost}, compétences OK`);
    return true;
  };

  const handleActionClick = async (action: any) => {
    if (!isActionAvailable(action)) return;
    
    if (action.id === 'move') {
      onMoveRequest();
      onClose();
      return;
    }

    if (action.id === 'claim_territory') {
      // En mode MJ, la revendication réussit toujours
      if (isGameMaster) {
        const { avatarPosition } = getGameData();
        console.log(`[MODE MJ] Territoire revendiqué sans coût en PA`);
        alert(`[MODE MJ] Territoire en (${avatarPosition.x},${avatarPosition.y}) revendiqué avec succès !`);
        onClose();
        return;
      }
      
      // Pour les joueurs normaux, vérifier les prérequis
      if (!playerFaction) {
        alert('Vous devez faire partie d\'une faction pour revendiquer un territoire.');
        onClose();
        return;
      }
      
      alert('Fonctionnalité de revendication de territoire accessible via le panneau dédié.');
      onClose();
      return;
    }

    if (action.id === 'explore_zone') {
      // En mode MJ, l'exploration réussit toujours
      if (isGameMaster) {
        const { currentVision } = usePlayer.getState();
        const visionSize = currentVision.size;
        
        // Forcer l'exploration avec ressources infinies en mode MJ
        console.log(`[MODE MJ] Exploration forcée sans coût en PA`);
        discoverResourcesInVision();
        alert(`[MODE MJ] Zone explorée avec succès ! Les ressources dans votre champ de vision (${visionSize} hexagones) ont été révélées.`);
        onClose();
        return;
      }
      
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
    

    
    if (action.id === 'create_map') {
      // En mode MJ, on ne dépense pas de PA
      if (isGameMaster || spendActionPoints(action.cost)) {
        if (isGameMaster) {
          console.log(`[MODE MJ] Action cartographie effectuée sans coût en PA`);
        }
        try {
          // Récupérer le champ de vision actuel du joueur (qui s'adapte au niveau d'exploration)
          const { currentVision } = usePlayer.getState();
          const gameEngine = (window as any).gameEngine;
          const avatarPosition = gameEngine?.getAvatarPosition() || { x: 25, y: 15 };
          
          console.log('Cartographie - Position avatar:', avatarPosition);
          console.log('Cartographie - Vision actuelle:', currentVision.size, 'hexagones');
          
          // Créer les données de tuiles basées sur le champ de vision complet du joueur
          const { getCompetenceLevel, isResourceDiscovered } = usePlayer.getState();
          const cartographyLevel = getCompetenceLevel('cartography');
          const explorationLevel = getCompetenceLevel('exploration');
          
          const cartographyTiles = Array.from(currentVision).map((hexCoord: string) => {
            const [x, y] = hexCoord.split(',').map(Number);
            const tileData = gameEngine?.getTileAt(x, y);
            
            // Pour les cartes niveau 2+, inclure les ressources si le joueur peut les voir
            let includeResources = [];
            if (cartographyLevel >= 2 && tileData?.resource) {
              const hexResourceDiscovered = isResourceDiscovered(x, y);
              
              // Inclure la ressource seulement si elle est visible par le joueur
              if (hexResourceDiscovered && explorationLevel >= 1) {
                includeResources = [tileData.resource];
              }
            }
            
            return {
              x,
              y,
              terrain: tileData?.terrain || 'unknown',
              resources: includeResources
            };
          });

          // Comptage des ressources pour déterminer le type de carte
          const resourceCount = cartographyTiles.filter(tile => tile.resources.length > 0).length;
          const hasResources = resourceCount > 0;
          
          // Générer un nom unique qui différencie les cartes avec/sans ressources
          const timestamp = Date.now();
          const mapSuffix = cartographyLevel >= 2 && hasResources ? '-avec-ressources' : '-terrain';
          const mapName = `Carte-Region-${avatarPosition.x}-${avatarPosition.y}${mapSuffix}-${timestamp}`;
          
          const response = await fetch('/api/unique-items/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: mapName,
              type: "carte",
              rarity: cartographyLevel >= 2 ? (cartographyTiles.length > 15 ? "epique" : "rare") : (cartographyTiles.length > 15 ? "rare" : "commun"),
              description: `Carte de la région autour de (${avatarPosition.x},${avatarPosition.y}) - ${cartographyTiles.length} hexagones${cartographyLevel >= 2 && hasResources ? ` (${resourceCount} ressources incluses)` : ' (terrain seulement)'}`,
              ownerId: "player",
              effects: ["navigation_locale"],
              requirements: ["cartography_level_1"],
              value: cartographyTiles.length * (cartographyLevel >= 2 && hasResources ? 25 : 15),
              metadata: {
                mapData: {
                  region: {
                    centerX: avatarPosition.x,
                    centerY: avatarPosition.y,
                    radius: explorationLevel, // Rayon basé sur le niveau d'exploration
                    tiles: cartographyTiles
                  },
                  quality: cartographyLevel >= 2 ? "masterwork" : explorationLevel >= 2 ? "detailed" : "rough",
                  includesResources: cartographyLevel >= 2 && hasResources,
                  accuracy: 100,
                  createdAt: Date.now(),
                  exploredBy: "player",
                  visionRange: explorationLevel,
                  hexCount: cartographyTiles.length,
                  resourcesCount: resourceCount
                }
              }
            })
          });
          
          if (response.ok) {
            const newItem = await response.json();
            const resourceText = cartographyLevel >= 2 && hasResources ? ` (${resourceCount} ressources incluses)` : '';
            const mapTypeText = cartographyLevel >= 2 && hasResources ? 'avec ressources' : 'terrain de base';
            alert(`Carte "${newItem.name}" créée avec succès ! ${cartographyTiles.length} hexagones cartographiés${resourceText}. Type: ${mapTypeText}. Consultez votre inventaire.`);
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
    
    // En mode MJ, on n'utilise pas de PA pour les autres actions
    if (isGameMaster || spendActionPoints(action.cost)) {
      if (isGameMaster) {
        console.log(`[MODE MJ] Action ${action.name} exécutée sans coût en PA`);
      } else {
        console.log(`Action exécutée: ${action.name}`);
      }
      onClose();
    }
  };

  const getAllAvailableActions = () => {
    const filteredCompetenceActions = competenceActions.filter(action => {
      if (action.requiredCompetence) {
        return hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      }
      return true;
    });

    const filteredExplorationActions = explorationActions.filter(action => {
      if (action.requiredCompetence) {
        return hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      }
      return true;
    });

    const filteredTerritoryActions = territoryActions.filter(action => {
      if (action.requiredCompetence) {
        return hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
      }
      return true;
    });
    
    const allActions = [
      ...baseActions,
      ...filteredExplorationActions,
      ...filteredCompetenceActions,
      ...filteredTerritoryActions,
      ...getAdvancedActions(),
      ...reputationActions.filter(action => 
        reputation === action.requiredReputation
      )
    ];
    
    console.log('🗺️ Actions disponibles:', allActions.map(a => a.name));
    return allActions;
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
            Points d'Action: {isGameMaster ? '∞ (Mode MJ)' : actionPoints}
          </div>
          {isGameMaster && (
            <div className="text-xs text-green-600 font-medium mb-4">
              🎯 Mode Maître de Jeu: Toutes les actions sont accessibles gratuitement
            </div>
          )}
          
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