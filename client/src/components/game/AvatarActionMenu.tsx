import { useState, useEffect } from "react";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useReputation } from "../../lib/stores/useReputation";
import { useAuth } from "../../lib/auth/AuthContext";
import { useFactions } from "../../lib/stores/useFactions";
import { useMap } from "../../lib/stores/useMap";
// import { useMapState } from "../../lib/stores/useMapState"; // Pas utilisé ici
import { Card } from "../ui/card";
import { apiClaimTerritory } from "../../lib/api/territoriesApi";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

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
  const { actionPoints, spendActionPoints, hasCompetenceLevel, competences, discoverResourcesInVision, playerName } = usePlayer();
  const { reputation } = useReputation();
  const { isAdmin } = useAuth();
  const { playerFaction } = useFactions();
  const { setSelectedHex } = useMap();

  // ─── Accès ville — chargé au montage ────────────────────────────────────────
  const [cityAccess, setCityAccess] = useState<{
    onCity: boolean;
    bankOk: boolean;
    marketOk: boolean;
  }>({ onCity: false, bankOk: false, marketOk: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cityRes = await fetch('/api/economy/player-current-city', { headers: getAuthHeaders() });
        if (!cityRes.ok || cancelled) return;
        const city = await cityRes.json();
        const onCity = city.cityId != null;
        if (!onCity) { setCityAccess({ onCity: false, bankOk: false, marketOk: false }); return; }

        const [bankRes, marketRes] = await Promise.all([
          fetch('/api/economy/bank-access-check',  { headers: getAuthHeaders() }),
          fetch('/api/market/access-check',         { headers: getAuthHeaders() }),
        ]);
        if (cancelled) return;
        const bank   = bankRes.ok   ? await bankRes.json()   : { allowed: false };
        const market = marketRes.ok ? await marketRes.json() : { allowed: false };
        setCityAccess({ onCity: true, bankOk: !!bank.allowed, marketOk: !!market.allowed });
      } catch { /* hors ville ou réseau KO — on laisse onCity=false */ }
    })();
    return () => { cancelled = true; };
  }, []);

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

  // Action de revendication de territoire
  const territoryActions = [
    {
      id: 'claim_territory',
      name: 'Revendiquer le territoire',
      description: 'Revendiquer la case actuelle de votre avatar comme territoire',
      cost: 10,
      icon: '🚩',
      category: 'territory',
    }
  ];

  // Actions de fondation de colonie supprimées - utiliser le menu GESTION DE TERRITOIRE

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
    if (isAdmin) return true;
    
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

    if (action.id === 'claim_territory') {
      const claimCost = 10;
      if (!isAdmin) {
        const success = spendActionPoints(claimCost);
        if (!success) {
          alert(`${claimCost} PA requis pour revendiquer un territoire.`);
          return;
        }
      }
      try {
        const avatarPos = usePlayer.getState().avatarHexPosition;
        const { originWorldX, originWorldY } = useMap.getState();
        const worldX = avatarPos.x + originWorldX;
        const worldY = avatarPos.y + originWorldY;
        const effectiveOwnerType: 'player' | 'faction' = playerFaction ? 'faction' : 'player';
        console.log(`[AvatarActionMenu] Claim → avatarHex=(${avatarPos.x},${avatarPos.y}) world=(${worldX},${worldY}) ownerType=${effectiveOwnerType}`);
        await apiClaimTerritory(worldX, worldY, effectiveOwnerType);
        window.dispatchEvent(new CustomEvent('nova:logistic-refresh'));
        onClose();
      } catch (err: any) {
        if (!isAdmin) usePlayer.getState().addActionPoints(claimCost);
        alert(err.message || 'Erreur lors de la revendication du territoire.');
      }
      return;
    }


    if (action.id === 'found_colony') {
      // La fondation de colonie est gérée via le menu GESTION DE TERRITOIRE (UnifiedTerritoryPanel).
      // Ce chemin n'est plus accessible depuis l'AvatarActionMenu.
      console.log('[AvatarActionMenu] found_colony : utiliser le menu Gestion de Territoire.');
      onClose();
      return;
    }

    if (action.id === 'explore_zone') {
      // En mode MJ, l'exploration réussit toujours
      if (isAdmin) {
        const { currentVision } = usePlayer.getState();
        const visionSize = currentVision.size;
        
        // Forcer l'exploration avec ressources infinies en mode MJ
        console.log(`[Admin] Exploration forcée sans coût en PA`);
        discoverResourcesInVision();
        alert(`[Admin] Zone explorée avec succès ! Les ressources dans votre champ de vision (${visionSize} hexagones) ont été révélées.`);
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
      if (isAdmin || spendActionPoints(action.cost)) {
        if (isAdmin) {
          console.log(`[Admin] Action cartographie effectuée sans coût en PA`);
        }
        try {
          // Récupérer le champ de vision actuel du joueur (qui s'adapte au niveau d'exploration)
          const { currentVision } = usePlayer.getState();
          const avatarPosition = usePlayer.getState().avatarHexPosition;
          const gameEngine = (window as any).gameEngine;
          
          // NOUVELLE APPROCHE: Récupérer les données directement des stores
          const { mapData } = useMap.getState(); // Utiliser useMap au lieu de useMapState
          
          console.log('Cartographie - Position avatar:', avatarPosition);
          console.log('Cartographie - Vision actuelle:', currentVision.size, 'hexagones');
          console.log('🗺️ MapData disponible:', mapData ? `${mapData.length}x${mapData[0]?.length}` : 'non défini');
          
          // Créer les données de tuiles basées sur le champ de vision complet du joueur
          const { getCompetenceLevel, isResourceDiscovered } = usePlayer.getState();
          const cartographyLevel = getCompetenceLevel('cartography');
          const explorationLevel = getCompetenceLevel('exploration');
          
          const cartographyTiles = Array.from(currentVision).map((hexCoord: string) => {
            const [x, y] = hexCoord.split(',').map(Number);
            
            // MÉTHODE 1: Essayer gameEngine
            let tileData = gameEngine?.getTileAt(x, y);
            
            // MÉTHODE 2: Si gameEngine échoue, utiliser mapData directement
            if (!tileData?.terrain && mapData && mapData[y] && mapData[y][x]) {
              tileData = mapData[y][x];
              console.log(`📍 Récupération directe depuis mapData pour (${x},${y}):`, tileData);
            }
            
            // Debug pour identifier le problème
            if (x === avatarPosition.x && y === avatarPosition.y) {
              console.log('🔍 Debug tile à la position avatar:', { 
                x, y, 
                tileDataGameEngine: gameEngine?.getTileAt(x, y),
                tileDataMapState: mapData?.[y]?.[x],
                finalTileData: tileData,
                terrain: tileData?.terrain,
                gameEngineMapData: gameEngine?.getMapData(),
                mapStateData: mapData
              });
            }
            
            // Pour les cartes niveau 2+, inclure les ressources si le joueur peut les voir
            let includeResources = [];
            if (cartographyLevel >= 2 && tileData?.resource) {
              const hexResourceDiscovered = isResourceDiscovered(x, y);
              
              // Inclure la ressource seulement si elle est visible par le joueur
              if (hexResourceDiscovered && explorationLevel >= 1) {
                includeResources = [tileData.resource];
              }
            }
            
            // MÉTHODE 3: Utiliser les données brutes du générateur de cartes si les autres échouent
            if (!tileData?.terrain) {
              const gameMapData = gameEngine?.getMapData();
              if (gameMapData && gameMapData[y] && gameMapData[y][x]) {
                tileData = gameMapData[y][x];
                console.log(`🔧 Récupération depuis gameEngine.mapData pour (${x},${y}):`, tileData);
              }
            }
            
            // S'assurer que le terrain est bien récupéré
            const actualTerrain = tileData?.terrain;
            if (!actualTerrain || actualTerrain === 'undefined') {
              console.warn(`⚠️ Terrain manquant pour (${x},${y}):`, { 
                tileData, 
                gameEngineTile: gameEngine?.getTileAt(x, y),
                mapStateTile: mapData?.[y]?.[x],
                gameEngineMapData: gameEngine?.getMapData()?.[y]?.[x]
              });
            }
            
            return {
              x,
              y,
              terrain: actualTerrain && actualTerrain !== 'undefined' ? actualTerrain : 'unknown',
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
    
    if (action.id === 'open_bank') {
      window.dispatchEvent(new CustomEvent('nova:open-panel', { detail: { panel: 'treasury' } }));
      onClose();
      return;
    }

    if (action.id === 'open_market') {
      window.dispatchEvent(new CustomEvent('nova:open-panel', { detail: { panel: 'marketplace' } }));
      onClose();
      return;
    }

    // En mode MJ, on n'utilise pas de PA pour les autres actions
    if (isAdmin || spendActionPoints(action.cost)) {
      if (isAdmin) {
        console.log(`[Admin] Action ${action.name} exécutée sans coût en PA`);
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

    // Actions ville — visibles uniquement si le joueur est physiquement sur une ville
    const cityActions: any[] = [];
    if (cityAccess.onCity) {
      if (cityAccess.bankOk) {
        cityActions.push({
          id: 'open_bank',
          name: 'Accéder à la Banque',
          description: 'Ouvrir la banque de cette ville',
          cost: 0,
          icon: '🏦',
          category: 'city',
        });
      }
      if (cityAccess.marketOk) {
        cityActions.push({
          id: 'open_market',
          name: 'Accéder au Marché',
          description: 'Ouvrir le marché public de cette ville',
          cost: 0,
          icon: '🛒',
          category: 'city',
        });
      }
    }

    const allActions = [
      ...cityActions,
      ...filteredExplorationActions,
      ...filteredCompetenceActions,
      ...territoryActions,
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
            Points d'Action: {isAdmin ? '∞' : actionPoints}
          </div>
          {isAdmin && (
            <div className="text-xs text-green-600 font-medium mb-4">
              🎯 Mode Admin : Toutes les actions sont accessibles
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
                  {action.cost > 0 && (
                    <div className="text-sm font-bold text-amber-800">
                      {action.cost} PA
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}