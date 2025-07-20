import { useState } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { useGameState } from "../../lib/stores/useGameState";
import { useFactions } from "../../lib/stores/useFactions";
import { useMap } from "../../lib/stores/useMap";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";
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
  const { actionPoints, spendActionPoints, addActionPoints, hasCompetenceLevel, competences, gainExperience, exploreCurrentLocation, discoverResourcesInVision, playerName, getCompetenceLevel } = usePlayer();
  const { reputation } = useReputation();
  const { isGameMaster } = useGameState();
  const { playerFaction } = useFactions();
  const { setSelectedHex } = useMap();
  const { foundColony } = useNovaImperium();

  // Debug immédiat des compétences
  console.log('🎯 AvatarActionMenu - Debug compétences immédiat:', {
    competences,
    cartographyLevel: getCompetenceLevel('cartography'),
    explorationLevel: getCompetenceLevel('exploration'),
    hasCartography1: hasCompetenceLevel('cartography', 1),
    hasExploration1: hasCompetenceLevel('exploration', 1)
  });

  // Actions de base supprimées - déplacement par clic direct sur la carte

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

  // Actions de fondation de colonie supprimées - utiliser le menu GESTION DE TERRITOIRE

  // Actions avancées basées sur les compétences de haut niveau
  const getAdvancedActions = () => {
    const actions = [];
    
    // En mode MJ : débloquer toutes les actions avancées
    if (isGameMaster || hasCompetenceLevel('exploration', 3)) {
      actions.push({
        id: 'advanced_exploration',
        name: 'Exploration Avancée',
        description: isGameMaster ? '[MODE MJ] Découvrir des secrets cachés dans la région' : 'Découvrir des secrets cachés dans la région',
        cost: 15,
        icon: '🔍',
        category: 'exploration'
      });
    }
    
    if (isGameMaster || hasCompetenceLevel('cartography', 3)) {
      actions.push({
        id: 'masterwork_map',
        name: 'Carte de Maître',
        description: isGameMaster ? '[MODE MJ] Créer une carte de qualité exceptionnelle' : 'Créer une carte de qualité exceptionnelle',
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
    
    // Vérifications spéciales supprimées - actions territoire gérées via menu GESTION DE TERRITOIRE
    
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

    // Action claim_territory supprimée - utiliser le menu GESTION DE TERRITOIRE



    if (action.id === 'found_colony') {
      const { avatarPosition } = getGameData();
      
      // En mode MJ, la fondation réussit toujours
      if (isGameMaster) {
        const colonyName = prompt("Nom de la colonie (Mode MJ):") || "Colonie MJ";
        const success = foundColony(
          avatarPosition.x,
          avatarPosition.y,
          colonyName,
          'gm_player',
          'Maître de Jeu',
          'gm_faction',
          'Administration MJ'
        );
        
        if (success) {
          console.log(`[MODE MJ] Colonie "${colonyName}" fondée sans coût en PA en (${avatarPosition.x},${avatarPosition.y})`);
          alert(`[MODE MJ] Colonie "${colonyName}" fondée avec succès !`);
          
          // Rafraîchir l'affichage
          setSelectedHex(null);
          setTimeout(() => {
            const gameEngine = (window as any).gameEngine;
            const tileData = gameEngine?.getTileAt(avatarPosition.x, avatarPosition.y);
            if (tileData) {
              setSelectedHex(tileData);
            }
          }, 100);
        } else {
          alert('Impossible de fonder une colonie ici.');
        }
        onClose();
        return;
      }
      
      // Pour les joueurs normaux, vérifier les prérequis
      if (!playerFaction) {
        alert('Vous devez faire partie d\'une faction pour fonder une colonie.');
        onClose();
        return;
      }
      
      // Vérifier que le territoire est revendiqué par la faction du joueur
      import('../../lib/systems/TerritorySystem').then(({ TerritorySystem }) => {
        const territoryInfo = TerritorySystem.getTerritoryInfo(avatarPosition.x, avatarPosition.y);
        if (!territoryInfo) {
          alert('Vous devez d\'abord revendiquer ce territoire pour y fonder une colonie.');
          onClose();
          return;
        }
        
        if (territoryInfo.factionId !== playerFaction.id) {
          alert('Ce territoire appartient à une autre faction.');
          onClose();
          return;
        }
        
        // Vérifier qu'il n'y a pas déjà une colonie
        const { novaImperiums } = useNovaImperium.getState();
        const existingCity = novaImperiums.flatMap(ni => ni.cities).find(city => city.x === avatarPosition.x && city.y === avatarPosition.y);
        if (existingCity) {
          alert('Il y a déjà une colonie à cet emplacement.');
          onClose();
          return;
        }
        
        // Dépenser les points d'action
        const success = spendActionPoints(action.cost);
        if (success) {
          const colonyName = prompt("Nom de la nouvelle colonie:") || "Nouvelle Colonie";
          const colonySuccess = foundColony(
            avatarPosition.x,
            avatarPosition.y,
            colonyName,
            'player',
            playerName || 'Joueur',
            playerFaction.id,
            playerFaction.name
          );
          
          if (colonySuccess) {
            gainExperience(15); // Récompense XP pour fonder une colonie
            console.log(`✅ Colonie "${colonyName}" fondée en (${avatarPosition.x},${avatarPosition.y}) par la faction ${playerFaction.name}`);
            alert(`Colonie "${colonyName}" fondée avec succès pour votre faction "${playerFaction.name}" !`);
            
            // Rafraîchir l'affichage
            setSelectedHex(null);
            setTimeout(() => {
              const gameEngine = (window as any).gameEngine;
              const tileData = gameEngine?.getTileAt(avatarPosition.x, avatarPosition.y);
              if (tileData) {
                setSelectedHex(tileData);
              }
            }, 100);
          } else {
            alert('Impossible de fonder une colonie ici.');
            // Rembourser les PA en cas d'échec
            addActionPoints(action.cost);
          }
        } else {
          alert(`Impossible de fonder la colonie : ${action.cost} Points d'Action requis.`);
        }
      });
      
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
    // Debug des compétences
    const cartographyLevel = usePlayer.getState().getCompetenceLevel('cartography');
    const explorationLevel = usePlayer.getState().getCompetenceLevel('exploration');
    console.log('🎯 Debug compétences actuelles:', {
      cartography: cartographyLevel,
      exploration: explorationLevel,
      competences: competences,
      isGameMaster: isGameMaster
    });

    // En mode MJ : toutes les actions sont disponibles sans vérification de compétences
    if (isGameMaster) {
      console.log('🎮 MODE MJ : Toutes les actions débloquées');
      const allActions = [
        ...explorationActions,
        ...competenceActions,
        ...getAdvancedActions(),
        ...reputationActions
      ];
      
      console.log('🗺️ Actions MJ disponibles:', allActions.map(a => a.name));
      return allActions;
    }

    // Mode normal : vérification des compétences
    const filteredCompetenceActions = competenceActions.filter(action => {
      if (action.requiredCompetence) {
        const hasLevel = hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
        console.log(`🔍 Action ${action.name}: compétence ${action.requiredCompetence} niveau ${action.requiredLevel || 1} - ${hasLevel ? 'DISPONIBLE' : 'INDISPONIBLE'}`);
        return hasLevel;
      }
      return true;
    });

    const filteredExplorationActions = explorationActions.filter(action => {
      if (action.requiredCompetence) {
        const hasLevel = hasCompetenceLevel(action.requiredCompetence, action.requiredLevel || 1);
        console.log(`🔍 Action ${action.name}: compétence ${action.requiredCompetence} niveau ${action.requiredLevel || 1} - ${hasLevel ? 'DISPONIBLE' : 'INDISPONIBLE'}`);
        return hasLevel;
      }
      return true;
    });

    // filteredTerritoryActions supprimées - utiliser menu GESTION DE TERRITOIRE
    
    const allActions = [
      ...filteredExplorationActions,
      ...filteredCompetenceActions,
      ...getAdvancedActions(),
      ...reputationActions.filter(action => 
        reputation === action.requiredReputation
      )
    ];
    
    console.log('🗺️ Actions finales disponibles:', allActions.map(a => a.name));
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
            <div className="text-xs">
              Debug: Cartographie:{getCompetenceLevel('cartography')} | Exploration:{getCompetenceLevel('exploration')}
            </div>
          </div>
          {isGameMaster && (
            <div className="text-xs text-green-600 font-medium mb-4 p-2 bg-green-50 rounded">
              🎯 Mode MJ Actif: Toutes les actions débloquées sans prérequis de compétences
            </div>
          )}
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getAllAvailableActions().length === 0 ? (
              <div className="p-3 text-center text-amber-700">
                Aucune action disponible
              </div>
            ) : (
              getAllAvailableActions().map((action) => {
                const actionAvailable = isActionAvailable(action);
                console.log(`🎮 Rendu action ${action.name}: disponible=${actionAvailable}, PA=${actionPoints}/${action.cost}`);
                
                return (
                  <div
                    key={action.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      actionAvailable
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
                            {action.name} {!actionAvailable ? '(Indisponible)' : ''}
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
                );
              })
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}