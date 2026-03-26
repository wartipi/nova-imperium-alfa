import { useNovaImperium } from "../../lib/stores/useNovaImperium";
import { usePlayer } from "../../lib/stores/usePlayer";
import { useFactions } from "../../lib/stores/useFactions";
import { useAuth } from "../../lib/auth/AuthContext";
import { Button } from "../ui/button";
import { getBuildingCost, canAffordAction } from "../../lib/game/ActionPointsCosts";
import { getBuildingAPGeneration, getBuildingMaxAPIncrease } from "../../lib/game/ActionPointsGeneration";
import { UnifiedTerritorySystem } from "../../lib/systems/UnifiedTerritorySystem";
import { useMap } from "../../lib/stores/useMap";
import { useState, useEffect, useCallback } from "react";
import { getCityInventory } from "../../lib/api/economyApi";
import { apiStartConstruction } from "../../lib/api/citiesApi";

export function ConstructionPanel() {
  const { currentNovaImperium, buildInCity, addCity } = useNovaImperium();
  const { actionPoints, spendActionPoints } = usePlayer();
  const { playerFaction, getFactionById } = useFactions();
  const { isAdmin } = useAuth();
  const { selectedHex } = useMap();
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selectedColony, setSelectedColony] = useState<string>('');

  // Inventaires de villes (stock local) : keyed by city.id (string du serveur)
  const [cityInventories, setCityInventories] = useState<Record<string, { gold: number; food: number; wood: number; stone: number; iron: number }>>({});
  // Messages de construction : keyed par cityId
  const [buildMessages, setBuildMessages] = useState<Record<string, { type: 'error' | 'ok'; text: string } | null>>({});

  // Récupérer city_inventory pour toutes les villes connues
  const refreshInventories = useCallback(async (cities: Array<{ id: string }>) => {
    const entries = await Promise.allSettled(
      cities.map(async (c) => {
        const inv = await getCityInventory(parseInt(c.id, 10));
        return { id: c.id, inv };
      })
    );
    const map: Record<string, { gold: number; food: number; wood: number; stone: number; iron: number }> = {};
    for (const r of entries) {
      if (r.status === 'fulfilled') map[r.value.id] = {
        gold:  r.value.inv.gold,
        food:  r.value.inv.food,
        wood:  r.value.inv.wood  ?? 0,
        stone: r.value.inv.stone ?? 0,
        iron:  r.value.inv.iron  ?? 0,
      };
    }
    setCityInventories(map);
  }, []);

  useEffect(() => {
    if (currentNovaImperium?.cities.length) {
      refreshInventories(currentNovaImperium.cities).catch(() => {});
    }
  }, [currentNovaImperium?.cities, refreshInventories]);

  if (!currentNovaImperium) return null;

  // Obtenir les colonies du joueur avec leurs territoires contrôlés depuis UnifiedTerritorySystem
  const playerColoniesWithTerritories = UnifiedTerritorySystem.getPlayerColoniesWithTerritories('player');
  const currentFaction = playerFaction ? getFactionById(playerFaction) : null;
  const hasColonies = playerColoniesWithTerritories.length > 0;

  // Les MJ peuvent construire des bâtiments sans ville, directement sur le territoire

  // Afficher les informations sur les colonies existantes avec leurs terrains
  console.log('🏰', playerColoniesWithTerritories.length, 'colonies:', 
    playerColoniesWithTerritories.map(c => `${c.colony.colonyName} (${c.colony.x},${c.colony.y}) - ${c.controlledTerritories.length} cases - terrains: ${c.availableTerrains.join(', ')}`)
  );

  const buildings = [
    // === TERRE EN FRICHE (wasteland) ===
    { 
      id: 'outpost', 
      name: 'Avant-poste', 
      cost: { wood: 5, stone: 3, action_points: 8 }, 
      constructionTime: 2, 
      description: 'Structure d\'observation et de défense basique', 
      icon: '🏗️', 
      category: 'Basique',
      requiredTerrain: ['wasteland'],
      actionPointCost: 8
    },
    { 
      id: 'exploration_camp', 
      name: 'Camp d\'exploration', 
      cost: { wood: 8, food: 5, action_points: 12 }, 
      constructionTime: 3, 
      description: 'Base temporaire pour l\'exploration', 
      icon: '⛺', 
      category: 'Basique',
      requiredTerrain: ['wasteland'],
      actionPointCost: 12
    },
    { 
      id: 'observation_tower', 
      name: 'Tour d\'observation', 
      cost: { wood: 10, stone: 8, action_points: 15 }, 
      constructionTime: 4, 
      description: 'Tour pour surveiller les environs', 
      icon: '🗼', 
      category: 'Défense',
      requiredTerrain: ['wasteland', 'hills'],
      actionPointCost: 15
    },

    // === FORÊT (forest) ===
    { 
      id: 'sawmill', 
      name: 'Scierie', 
      cost: { wood: 12, iron: 4, action_points: 18 }, 
      constructionTime: 4, 
      description: 'Exploitation du bois', 
      icon: '🪚', 
      category: 'Production',
      requiredTerrain: ['forest'],
      actionPointCost: 18
    },
    { 
      id: 'hunting_post', 
      name: 'Poste de chasse', 
      cost: { wood: 8, action_points: 10 }, 
      constructionTime: 2, 
      description: 'Chasse au gibier forestier', 
      icon: '🏹', 
      category: 'Production',
      requiredTerrain: ['forest'],
      actionPointCost: 10
    },
    { 
      id: 'druidic_temple', 
      name: 'Temple druidique', 
      cost: { wood: 15, mana: 8, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Temple en harmonie avec la nature', 
      icon: '🌳', 
      category: 'Spirituel',
      requiredTerrain: ['forest', 'enchanted_meadow'],
      actionPointCost: 25
    },
    { 
      id: 'herbalist_house', 
      name: 'Maison de l\'herboriste', 
      cost: { wood: 10, stone: 5, action_points: 15 }, 
      constructionTime: 3, 
      description: 'Préparation de remèdes naturels', 
      icon: '🌿', 
      category: 'Production',
      requiredTerrain: ['forest', 'enchanted_meadow'],
      actionPointCost: 15
    },

    // === MONTAGNE (mountains) ===
    { 
      id: 'mine', 
      name: 'Mine', 
      cost: { wood: 8, iron: 12, action_points: 30 }, 
      constructionTime: 8, 
      description: 'Extraction de minerai', 
      icon: '⛏️', 
      category: 'Production',
      requiredTerrain: ['mountains'],
      actionPointCost: 30
    },
    { 
      id: 'fortress', 
      name: 'Forteresse', 
      cost: { stone: 30, iron: 20, action_points: 45 }, 
      constructionTime: 12, 
      description: 'Défense militaire majeure', 
      icon: '🏰', 
      category: 'Défense',
      requiredTerrain: ['mountains', 'hills'],
      actionPointCost: 45
    },
    { 
      id: 'watchtower', 
      name: 'Tour de guet', 
      cost: { stone: 15, wood: 8, action_points: 20 }, 
      constructionTime: 5, 
      description: 'Surveillance des environs', 
      icon: '👁️', 
      category: 'Défense',
      requiredTerrain: ['mountains', 'hills'],
      actionPointCost: 20
    },
    { 
      id: 'magic_forge', 
      name: 'Forge magique', 
      cost: { iron: 20, crystals: 10, mana: 15, action_points: 40 }, 
      constructionTime: 10, 
      description: 'Forge d\'objets enchantés', 
      icon: '🔥', 
      category: 'Magie',
      requiredTerrain: ['mountains', 'volcano'],
      actionPointCost: 40
    },

    // === TERRE FERTILE (fertile_land) ===
    { 
      id: 'farm', 
      name: 'Ferme', 
      cost: { wood: 8, stone: 4, action_points: 12 }, 
      constructionTime: 3, 
      description: 'Production alimentaire', 
      icon: '🚜', 
      category: 'Production',
      requiredTerrain: ['fertile_land'],
      actionPointCost: 12
    },
    { 
      id: 'granary', 
      name: 'Grenier', 
      cost: { wood: 12, stone: 8, action_points: 15 }, 
      constructionTime: 4, 
      description: 'Stockage de nourriture', 
      icon: '🌾', 
      category: 'Stockage',
      requiredTerrain: ['fertile_land'],
      actionPointCost: 15
    },
    { 
      id: 'market', 
      name: 'Marché', 
      cost: { wood: 15, gold: 20, action_points: 18 }, 
      constructionTime: 4, 
      description: 'Commerce et échange', 
      icon: '🏪', 
      category: 'Commerce',
      requiredTerrain: ['fertile_land'],
      actionPointCost: 18
    },
    { 
      id: 'monastery', 
      name: 'Monastère', 
      cost: { stone: 20, gold: 15, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Centre spirituel et d\'apprentissage', 
      icon: '⛪', 
      category: 'Spirituel',
      requiredTerrain: ['fertile_land', 'sacred_plains'],
      actionPointCost: 25
    },
    { 
      id: 'agricultural_academy', 
      name: 'Académie agricole', 
      cost: { wood: 18, stone: 12, gold: 25, action_points: 30 }, 
      constructionTime: 7, 
      description: 'Formation agricole avancée', 
      icon: '🎓', 
      category: 'Éducation',
      requiredTerrain: ['fertile_land'],
      actionPointCost: 30
    },

    // === COLLINE (hills) ===
    { 
      id: 'light_fortifications', 
      name: 'Fortifications légères', 
      cost: { stone: 12, wood: 8, action_points: 18 }, 
      constructionTime: 4, 
      description: 'Défenses de position', 
      icon: '🛡️', 
      category: 'Défense',
      requiredTerrain: ['hills'],
      actionPointCost: 18
    },
    { 
      id: 'ceremony_place', 
      name: 'Lieu de cérémonie', 
      cost: { stone: 15, mana: 5, action_points: 20 }, 
      constructionTime: 5, 
      description: 'Site rituel sur position élevée', 
      icon: '🗿', 
      category: 'Spirituel',
      requiredTerrain: ['hills', 'sacred_plains'],
      actionPointCost: 20
    },
    { 
      id: 'altitude_beacon', 
      name: 'Phare d\'altitude', 
      cost: { stone: 18, iron: 6, action_points: 22 }, 
      constructionTime: 5, 
      description: 'Signal de navigation élevé', 
      icon: '🕯️', 
      category: 'Navigation',
      requiredTerrain: ['hills'],
      actionPointCost: 22
    },

    // === EAU PEU PROFONDE (shallow_water) ===
    { 
      id: 'port', 
      name: 'Port', 
      cost: { wood: 20, stone: 15, action_points: 35 }, 
      constructionTime: 8, 
      description: 'Infrastructure maritime', 
      icon: '🚢', 
      category: 'Commerce',
      requiredTerrain: ['shallow_water'],
      actionPointCost: 35
    },
    { 
      id: 'shipyard', 
      name: 'Chantier naval', 
      cost: { wood: 25, iron: 12, action_points: 40 }, 
      constructionTime: 10, 
      description: 'Construction navale', 
      icon: '⚓', 
      category: 'Production',
      requiredTerrain: ['shallow_water'],
      actionPointCost: 40
    },
    { 
      id: 'fishing_post', 
      name: 'Comptoir de pêche', 
      cost: { wood: 12, action_points: 15 }, 
      constructionTime: 3, 
      description: 'Pêche maritime', 
      icon: '🎣', 
      category: 'Production',
      requiredTerrain: ['shallow_water'],
      actionPointCost: 15
    },
    { 
      id: 'marine_tower', 
      name: 'Tour marine', 
      cost: { stone: 20, iron: 8, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Défense côtière', 
      icon: '🗼', 
      category: 'Défense',
      requiredTerrain: ['shallow_water'],
      actionPointCost: 25
    },

    // === MARAIS (swamp) ===
    { 
      id: 'occult_sanctuary', 
      name: 'Sanctuaire occulte', 
      cost: { wood: 12, mana: 12, ancient_knowledge: 5, action_points: 30 }, 
      constructionTime: 8, 
      description: 'Site de magie sombre', 
      icon: '🕯️', 
      category: 'Magie',
      requiredTerrain: ['swamp'],
      actionPointCost: 30
    },
    { 
      id: 'alchemist_hut', 
      name: 'Cabane d\'alchimiste', 
      cost: { wood: 10, crystals: 6, action_points: 20 }, 
      constructionTime: 5, 
      description: 'Laboratoire de potions', 
      icon: '🧪', 
      category: 'Magie',
      requiredTerrain: ['swamp'],
      actionPointCost: 20
    },

    // === DÉSERT (desert) ===
    { 
      id: 'nomad_camp', 
      name: 'Campement nomade', 
      cost: { wood: 6, food: 8, action_points: 10 }, 
      constructionTime: 2, 
      description: 'Campement mobile temporaire', 
      icon: '🏕️', 
      category: 'Basique',
      requiredTerrain: ['desert'],
      actionPointCost: 10
    },
    { 
      id: 'solar_obelisk', 
      name: 'Obélisque solaire', 
      cost: { stone: 25, crystals: 8, action_points: 35 }, 
      constructionTime: 8, 
      description: 'Monument désertique magique', 
      icon: '🏛️', 
      category: 'Magie',
      requiredTerrain: ['desert'],
      actionPointCost: 35
    },
    { 
      id: 'glassworks', 
      name: 'Verrerie', 
      cost: { stone: 15, iron: 8, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Artisanat du verre', 
      icon: '💎', 
      category: 'Production',
      requiredTerrain: ['desert'],
      actionPointCost: 25
    },

    // === PLAINE SACRÉE (sacred_plains) ===
    { 
      id: 'stone_circle', 
      name: 'Cercle de pierre', 
      cost: { stone: 30, mana: 15, action_points: 40 }, 
      constructionTime: 10, 
      description: 'Site rituel ancien', 
      icon: '⭕', 
      category: 'Spirituel',
      requiredTerrain: ['sacred_plains'],
      actionPointCost: 40
    },
    { 
      id: 'forgotten_temple', 
      name: 'Temple oublié', 
      cost: { stone: 35, ancient_knowledge: 10, mana: 20, action_points: 50 }, 
      constructionTime: 12, 
      description: 'Sanctuaire des anciens', 
      icon: '🏛️', 
      category: 'Spirituel',
      requiredTerrain: ['sacred_plains'],
      actionPointCost: 50
    },
    { 
      id: 'mystic_portal', 
      name: 'Portail mystique', 
      cost: { crystals: 15, mana: 25, ancient_knowledge: 8, action_points: 60 }, 
      constructionTime: 15, 
      description: 'Portail dimensionnel', 
      icon: '🌀', 
      category: 'Magie',
      requiredTerrain: ['sacred_plains'],
      actionPointCost: 60
    },

    // === GROTTES (caves) ===
    { 
      id: 'fortified_entrance', 
      name: 'Entrée fortifiée', 
      cost: { stone: 20, iron: 12, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Sécurisation d\'entrée souterraine', 
      icon: '🚪', 
      category: 'Défense',
      requiredTerrain: ['caves'],
      actionPointCost: 25
    },
    { 
      id: 'advanced_mine', 
      name: 'Mine avancée', 
      cost: { wood: 15, iron: 20, action_points: 35 }, 
      constructionTime: 9, 
      description: 'Exploitation minière profonde', 
      icon: '⛏️', 
      category: 'Production',
      requiredTerrain: ['caves'],
      actionPointCost: 35
    },
    { 
      id: 'underground_base', 
      name: 'Base souterraine', 
      cost: { stone: 25, iron: 15, action_points: 40 }, 
      constructionTime: 10, 
      description: 'Complexe souterrain fortifié', 
      icon: '🕳️', 
      category: 'Défense',
      requiredTerrain: ['caves'],
      actionPointCost: 40
    },

    // === RUINES ANCIENNES (ancient_ruins) ===
    { 
      id: 'lost_library', 
      name: 'Bibliothèque perdue', 
      cost: { wood: 20, ancient_knowledge: 15, action_points: 45 }, 
      constructionTime: 10, 
      description: 'Restauration du savoir ancien', 
      icon: '📚', 
      category: 'Éducation',
      requiredTerrain: ['ancient_ruins'],
      actionPointCost: 45
    },
    { 
      id: 'restored_sanctuary', 
      name: 'Sanctuaire restauré', 
      cost: { stone: 25, mana: 12, ancient_knowledge: 8, action_points: 40 }, 
      constructionTime: 9, 
      description: 'Ancien temple remis en état', 
      icon: '🏛️', 
      category: 'Spirituel',
      requiredTerrain: ['ancient_ruins'],
      actionPointCost: 40
    },
    { 
      id: 'ancient_hall', 
      name: 'Hall antique', 
      cost: { stone: 30, ancient_knowledge: 20, mana: 10, action_points: 50 }, 
      constructionTime: 12, 
      description: 'Grande salle des anciens', 
      icon: '🏚️', 
      category: 'Prestige',
      requiredTerrain: ['ancient_ruins'],
      actionPointCost: 50
    },

    // === VOLCAN (volcano) ===
    { 
      id: 'legendary_forge', 
      name: 'Forge légendaire', 
      cost: { iron: 30, crystals: 15, mana: 20, action_points: 60 }, 
      constructionTime: 15, 
      description: 'Forge utilisant la puissance volcanique', 
      icon: '🔥', 
      category: 'Magie',
      requiredTerrain: ['volcano'],
      actionPointCost: 60
    },
    { 
      id: 'fire_temple', 
      name: 'Temple du feu', 
      cost: { stone: 25, crystals: 10, mana: 15, action_points: 45 }, 
      constructionTime: 11, 
      description: 'Sanctuaire dédié aux flammes', 
      icon: '🔥', 
      category: 'Spirituel',
      requiredTerrain: ['volcano'],
      actionPointCost: 45
    },
    { 
      id: 'elemental_laboratory', 
      name: 'Laboratoire élémentaire', 
      cost: { stone: 20, crystals: 12, mana: 18, action_points: 40 }, 
      constructionTime: 10, 
      description: 'Recherche sur la magie élémentaire', 
      icon: '🧪', 
      category: 'Magie',
      requiredTerrain: ['volcano'],
      actionPointCost: 40
    },

    // === PRAIRIE ENCHANTÉE (enchanted_meadow) ===
    { 
      id: 'awakening_garden', 
      name: 'Jardin d\'éveil', 
      cost: { wood: 15, mana: 10, action_points: 25 }, 
      constructionTime: 6, 
      description: 'Jardin magique régénérant', 
      icon: '🌸', 
      category: 'Magie',
      requiredTerrain: ['enchanted_meadow'],
      actionPointCost: 25
    },
    { 
      id: 'mana_fountain', 
      name: 'Fontaine de mana', 
      cost: { stone: 18, crystals: 8, mana: 15, action_points: 35 }, 
      constructionTime: 8, 
      description: 'Source d\'énergie magique', 
      icon: '⛲', 
      category: 'Magie',
      requiredTerrain: ['enchanted_meadow'],
      actionPointCost: 35
    },
    { 
      id: 'spirit_tree', 
      name: 'Arbre des esprits', 
      cost: { wood: 25, mana: 20, ancient_knowledge: 5, action_points: 45 }, 
      constructionTime: 10, 
      description: 'Arbre sacré connecté aux esprits', 
      icon: '🌳', 
      category: 'Spirituel',
      requiredTerrain: ['enchanted_meadow'],
      actionPointCost: 45
    }
  ];

  const getResourceIcon = (resource: string): string => {
    const icons: Record<string, string> = {
      food: '🍞',
      gold: '💰',
      wood: '🪵',
      stone: '🪨',
      iron: '⚔️',
      precious_metals: '🥇',
      mana: '🔮',
      crystals: '💎',
      ancient_knowledge: '📜',
      action_points: '⚡'
    };
    return icons[resource] || '❓';
  };

  // Vérifier si la colonie peut construire un bâtiment (contrôle du terrain requis)
  const canBuildBuilding = (building: any): { canBuild: boolean; missingTerrain?: string[] } => {
    // En mode MJ, tous les terrains sont disponibles
    if (isAdmin) {
      return { canBuild: true };
    }
    
    // Pour l'instant, on va simuler qu'on a une colonie qui contrôle quelques types de terrain
    // Terrain contrôlé basé sur les territoires de la colonie
    const controlledTerrain = ['fertile_land', 'hills', 'forest']; // Simulation temporaire
    
    const missingTerrain = building.requiredTerrain.filter((terrain: string) => 
      !controlledTerrain.includes(terrain)
    );
    
    return {
      canBuild: missingTerrain.length === 0,
      missingTerrain: missingTerrain.length > 0 ? missingTerrain : undefined
    };
  };

  // Obtenir le nom français du terrain
  const getTerrainName = (terrain: string): string => {
    const terrainNames: Record<string, string> = {
      wasteland: 'Terre en friche',
      forest: 'Forêt',
      mountains: 'Montagne',
      fertile_land: 'Terre fertile',
      hills: 'Colline',
      shallow_water: 'Eau peu profonde',
      deep_water: 'Eau profonde',
      swamp: 'Marais',
      desert: 'Désert',
      sacred_plains: 'Plaine sacrée',
      caves: 'Grottes',
      ancient_ruins: 'Ruines anciennes',
      volcano: 'Volcan',
      enchanted_meadow: 'Prairie enchantée'
    };
    return terrainNames[terrain] || terrain;
  };

  const getBuildingProduction = (buildingId: string): Record<string, number> => {
    const productions: Record<string, Record<string, number>> = {
      // Agriculture
      'farm': { food: 3, gold: 1 },
      'garden': { food: 2 },
      'sawmill': { wood: 2, gold: 1 },
      
      // Transport/Commercial
      'port': { gold: 4, food: 1 },
      'market': { gold: 6 },
      'road': { gold: 2 },
      'shipyard': { gold: 3, wood: 1 },
      
      // Defense (no resource production, only protection)
      'fortress': {},
      'watchtower': {},
      'fortifications': {},
      
      // Culture
      'library': { ancient_knowledge: 1 },
      'temple': { gold: 2, mana: 1 },
      'sanctuary': { mana: 2 },
      'obelisk': { gold: 1 },
      
      // Magic
      'mystic_portal': { mana: 3, ancient_knowledge: 1 },
      'legendary_forge': { precious_metals: 2, crystals: 1 },
      'laboratory': { mana: 2, crystals: 1, ancient_knowledge: 1 },
      
      // Ancient
      'ancient_hall': { ancient_knowledge: 3, mana: 1 },
      'underground_base': { stone: 2, iron: 1 },
      'cave_dwelling': { stone: 1, food: 1 }
    };
    return productions[buildingId] || {};
  };

  const formatProduction = (production: Record<string, number>): string => {
    const entries = Object.entries(production);
    if (entries.length === 0) return "Aucune production de ressources";
    
    return entries
      .map(([resource, amount]) => `+${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  const formatResourceCost = (cost: Record<string, number | undefined>): string => {
    return Object.entries(cost)
      .filter(([, amount]) => amount !== undefined && amount > 0)
      .map(([resource, amount]) => `${amount} ${getResourceIcon(resource)}`)
      .join(', ');
  };

  const canAffordBuilding = (buildingId: string): boolean => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !currentNovaImperium) return false;

    // En mode MJ, on peut toujours construire
    if (isAdmin) return true;

    const actionCost = getBuildingCost(buildingId);

    // Seule vérification locale : les PA.
    // Les matériaux sont validés côté serveur via city_inventory.
    return canAffordAction(actionPoints, actionCost);
  };

  const handleBuild = async (buildingId: string, cityId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !currentNovaImperium) return;

    const actionCost = getBuildingCost(buildingId);

    // Effacer le message précédent pour cette ville
    setBuildMessages(prev => ({ ...prev, [cityId]: null }));

    if (!canAffordBuilding(buildingId)) {
      console.log(`PA insuffisants pour construire ${buildingId}`);
      return;
    }

    // Extraire les coûts V1 depuis building.cost
    const goldCost  = Number(building.cost['gold']  ?? 0);
    const foodCost  = Number(building.cost['food']  ?? 0);
    const woodCost  = Number(building.cost['wood']  ?? 0);
    const stoneCost = Number(building.cost['stone'] ?? 0);
    const ironCost  = Number(building.cost['iron']  ?? 0);

    try {
      const result = await apiStartConstruction(
        cityId,
        buildingId,
        goldCost,
        foodCost,
        building.constructionTime,
        woodCost,
        stoneCost,
        ironCost,
      );

      if (result.mode === 'instant') {
        // Admin — construction immédiate : mettre à jour l'état local
        buildInCity(cityId, buildingId, {}, building.constructionTime, true);
        console.log(`[Admin] Construction instantanée de ${buildingId} (serveur validé)`);
        setBuildMessages(prev => ({ ...prev, [cityId]: { type: 'ok', text: `✅ ${building.name} construit` } }));
      } else {
        // Joueur — mis en file : déduire PA et mettre à jour production locale
        const success = spendActionPoints(actionCost);
        if (success) {
          buildInCity(cityId, buildingId, {}, building.constructionTime, false);
          console.log(`Construction de ${buildingId} lancée pour ${building.constructionTime} tours (matériaux déduits du stock ville)`);
          setBuildMessages(prev => ({ ...prev, [cityId]: { type: 'ok', text: `⏳ ${building.name} en construction (${building.constructionTime} tours)` } }));
          // Rafraîchir l'inventaire
          setTimeout(() => refreshInventories(currentNovaImperium.cities).catch(() => {}), 500);
        }
      }
    } catch (err: any) {
      const body = (err as any).body;
      if (body?.error === 'INSUFFICIENT_CITY_INVENTORY') {
        const miss = body.missing as Partial<Record<string, number>>;
        const labels: Record<string, string> = {
          gold: 'or', food: 'nourriture', wood: 'bois', stone: 'pierre', iron: 'fer',
        };
        const icons: Record<string, string> = {
          gold: '🪙', food: '🌿', wood: '🪵', stone: '🪨', iron: '⚙️',
        };
        const parts = Object.entries(miss).filter(([, v]) => v! > 0).map(([k, v]) => `${v}${icons[k] ?? ''} ${labels[k] ?? k}`);
        const msg = `❌ ${parts.join(', ')} manquant${parts.length > 1 ? 's' : ''} — transférez depuis la banque`;
        setBuildMessages(prev => ({ ...prev, [cityId]: { type: 'error', text: msg } }));
        console.warn(`[Construction] ${msg} pour ${buildingId} city=${cityId}`);
      } else {
        const msg = `❌ ${err.message ?? 'Erreur construction'}`;
        setBuildMessages(prev => ({ ...prev, [cityId]: { type: 'error', text: msg } }));
        console.error(`[handleBuild] Erreur:`, err);
      }
    }
  };

  const handleMouseEnter = (buildingId: string, event: React.MouseEvent) => {
    setHoveredBuilding(buildingId);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredBuilding(null);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (hoveredBuilding) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3">Projets de Construction</h4>
        {isAdmin && (
          <div className="bg-purple-100 border border-purple-400 rounded p-2 mb-3">
            <div className="text-purple-800 text-sm font-semibold">🎯 Mode Admin</div>
            <div className="text-purple-700 text-xs">
              Accès illimité : toutes constructions disponibles, ressources infinies, construction instantanée
            </div>
          </div>
        )}
      </div>

      {/* Information sur les colonies existantes */}
      {hasColonies && (
        <div className="bg-green-50 border border-green-400 rounded p-3 mb-4">
          <div className="font-medium text-sm mb-2 text-green-800">
            🏘️ Colonies fondées ({playerColoniesWithTerritories.length})
          </div>
          <div className="space-y-1">
            {playerColoniesWithTerritories.map(colonyData => (
              <div key={colonyData.colony.colonyId} className="text-xs text-green-700">
                📍 {colonyData.colony.colonyName} en ({colonyData.colony.x}, {colonyData.colony.y})
                <div className="text-xs text-blue-600 ml-4">
                  🗺️ {colonyData.controlledTerritories.length} case{colonyData.controlledTerritories.length > 1 ? 's' : ''} contrôlée{colonyData.controlledTerritories.length > 1 ? 's' : ''}
                </div>
                {colonyData.availableTerrains.length > 0 && (
                  <div className="text-xs text-purple-600 ml-4">
                    🌍 Terrains: {colonyData.availableTerrains.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-xs text-green-600 mt-2">
            💡 Utilisez le menu "GESTION DE TERRITOIRE" pour fonder de nouvelles colonies
          </div>
        </div>
      )}

      {/* Message d'état si pas de colonies (seulement pour joueurs normaux) */}
      {!isAdmin && !hasColonies && (
        <div className="bg-yellow-50 border border-yellow-400 rounded p-3 mb-4">
          <div className="text-yellow-800 text-sm font-semibold">⚠️ Aucune colonie fondée</div>
          <div className="text-yellow-700 text-xs mb-2">
            Les bâtiments ci-dessous nécessitent d'avoir fondé une colonie pour être construits.
          </div>
          <div className="text-yellow-600 text-xs">
            💡 Workflow: Revendiquez un territoire → Fondez une colonie → Construisez des bâtiments
          </div>
          <div className="text-yellow-600 text-xs">
            📍 Utilisez le menu "GESTION DE TERRITOIRE" pour commencer
          </div>
        </div>
      )}

      {/* Liste des colonies avec leurs constructions disponibles */}
      {hasColonies ? playerColoniesWithTerritories.map(colonyData => {
        // Trouver la ville correspondante dans le système Nova Imperium
        const city = currentNovaImperium.cities.find(c => c.x === colonyData.colony.x && c.y === colonyData.colony.y) || {
          id: colonyData.colony.colonyId!,
          name: colonyData.colony.colonyName!,
          population: 1,
          buildings: [],
          currentProduction: null,
          productionProgress: 0,
          x: colonyData.colony.x,
          y: colonyData.colony.y
        };
        
        // Matériaux V1 canoniques — exclure tout bâtiment qui coûte mana/crystals/ancient_knowledge
        const V1_MATERIALS = new Set(['gold', 'food', 'wood', 'stone', 'iron', 'action_points']);
        const isV1Building = (b: typeof buildings[0]) =>
          Object.keys(b.cost).every(k => V1_MATERIALS.has(k));

        // Filtrer les bâtiments selon les terrains disponibles dans cette colonie + matériaux V1
        const availableBuildings = buildings.filter(building =>
          isV1Building(building) &&
          (building.requiredTerrain.includes('any') ||
           building.requiredTerrain.some(terrain => colonyData.availableTerrains.includes(terrain)))
        );
        
        return (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">
            🏘️ {city.name} ({colonyData.controlledTerritories.length} case{colonyData.controlledTerritories.length > 1 ? 's' : ''})
          </div>
          <div className="text-xs text-purple-600 mb-1">
            🌍 Terrains disponibles: {colonyData.availableTerrains.length > 0 ? colonyData.availableTerrains.join(', ') : 'Aucun'}
          </div>

          {/* Inventaire local de la ville */}
          {(() => {
            const inv = cityInventories[city.id];
            const isEmpty = inv && inv.gold === 0 && inv.food === 0 && inv.wood === 0 && inv.stone === 0 && inv.iron === 0;
            return inv !== undefined ? (
              <div className="text-xs bg-amber-100 border border-amber-300 rounded px-2 py-1 mb-2">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="font-medium text-amber-800">📦 Stock ville :</span>
                  <span className="text-amber-700">{inv.gold}🪙 or</span>
                  <span className="text-amber-700">{inv.food}🌿 nourr.</span>
                  <span className="text-amber-700">{inv.wood}🪵 bois</span>
                  <span className="text-amber-700">{inv.stone}🪨 pierre</span>
                  <span className="text-amber-700">{inv.iron}⚙️ fer</span>
                </div>
                {isEmpty && <div className="text-amber-500 italic mt-0.5">Vide — transférez depuis la banque</div>}
              </div>
            ) : (
              <div className="text-xs text-amber-400 italic mb-2">Chargement stock…</div>
            );
          })()}

          {/* Message de construction (erreur ou succès) */}
          {buildMessages[city.id] && (
            <div className={[
              "text-xs rounded px-2 py-1 mb-2 font-medium",
              buildMessages[city.id]!.type === 'error'
                ? "bg-red-50 border border-red-300 text-red-700"
                : "bg-green-50 border border-green-300 text-green-700",
            ].join(" ")}>
              {buildMessages[city.id]!.text}
            </div>
          )}

          {city.currentProduction && hasColonies ? (
            <div className="mb-3">
              <div className="text-xs text-amber-700">En cours:</div>
              <div className="text-sm font-medium">{city.currentProduction.name}</div>
              <div className="w-full bg-amber-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (city.productionProgress / city.currentProduction.cost) * 100)}%` }}
                ></div>
              </div>
              <div className="text-xs text-amber-700 mt-1">
                🕐 {city.productionProgress}/{city.currentProduction.cost} tours
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 mb-3">
              {hasColonies || isAdmin ? 'Aucune construction en cours' : 'Fondez d\'abord une colonie'}
            </div>
          )}

          <div className="space-y-3">
            {['Basique', 'Production', 'Commerce', 'Défense', 'Spirituel', 'Magie', 'Éducation', 'Navigation', 'Stockage', 'Prestige'].map(category => {
              const categoryBuildings = availableBuildings.filter(b => b.category === category);
              return categoryBuildings.length > 0 ? (
                <div key={category} className="space-y-1">
                  <div className="text-xs font-bold text-amber-800 border-b border-amber-300 pb-1">
                    {category} ({categoryBuildings.length})
                  </div>
                  {categoryBuildings.map(building => (
                    <div 
                      key={building.id} 
                      className="flex items-center justify-between"
                      onMouseEnter={(e) => handleMouseEnter(building.id, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{building.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{building.name}</div>
                          <div className="text-xs text-amber-700">
                            {formatResourceCost(building.cost)}
                          </div>
                          <div className="text-xs text-blue-600">
                            ⚡ {isAdmin ? '∞ PA' : `${building.actionPointCost} PA`} | 🕐 {isAdmin ? 'Instantané' : `${building.constructionTime} tour${building.constructionTime > 1 ? 's' : ''}`}
                          </div>
                          <div className="text-xs text-green-600">
                            📍 {building.requiredTerrain.map(terrain => getTerrainName(terrain)).join(' ou ')}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleBuild(building.id, city.id)}
                        disabled={
                          city.currentProduction !== null || 
                          (city.buildings as string[]).includes(building.id) || 
                          !canAffordBuilding(building.id)
                        }
                        className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                      >
                        {(city.buildings as string[]).includes(building.id) ? 'Construit' : 
                         !canAffordBuilding(building.id) ? 'PA insuffisants' : 'Construire'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null;
            })}
            
            {availableBuildings.length === 0 && (
              <div className="text-center py-4 text-amber-700">
                🚫 Aucun bâtiment disponible avec les terrains actuels
                <div className="text-xs mt-1">
                  Étendez le territoire de votre colonie pour débloquer plus de constructions
                </div>
              </div>
            )}
          </div>
        </div>
        );
      }) : !isAdmin ? (
        <div className="bg-amber-50 border border-amber-700 rounded p-3 opacity-50">
          <div className="font-medium text-sm mb-2">Construction (nécessite une colonie)</div>
          <div className="text-amber-700 text-xs">
            Fondez d'abord une colonie via "GESTION DE TERRITOIRE"
          </div>
        </div>
      ) : currentNovaImperium.cities.map(city => (
        <div key={city.id} className="bg-amber-50 border border-amber-700 rounded p-3">
          <div className="font-medium text-sm mb-2">{city.name}</div>
          <div className="space-y-3">
            {['Basique', 'Production', 'Commerce', 'Défense', 'Spirituel', 'Magie', 'Éducation', 'Navigation', 'Stockage', 'Prestige'].map(category => {
              const categoryBuildings = buildings.filter(b => b.category === category);
              return (
                <div key={category} className="space-y-1">
                  <div className="text-xs font-bold text-amber-800 border-b border-amber-300 pb-1">
                    {category}
                  </div>
                  {categoryBuildings.map(building => (
                    <div 
                      key={building.id} 
                      className="flex items-center justify-between"
                      onMouseEnter={(e) => handleMouseEnter(building.id, e)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{building.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{building.name}</div>
                          <div className="text-xs text-amber-700">
                            {formatResourceCost(building.cost)}
                          </div>
                          <div className="text-xs text-blue-600">
                            ⚡ ∞ PA | 🕐 Instantané
                          </div>
                          <div className="text-xs text-green-600">
                            📍 {building.requiredTerrain.map(terrain => getTerrainName(terrain)).join(' ou ')}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleBuild(building.id, city.id)}
                        disabled={(city.buildings as string[]).includes(building.id)}
                        className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                      >
                        {(city.buildings as string[]).includes(building.id) ? 'Construit' : 'Construire'}
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Tooltip */}
      {hoveredBuilding && (
        <div 
          className="fixed z-50 bg-gray-800 text-white p-3 rounded shadow-lg max-w-sm pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-2">
            <div className="text-sm font-medium text-yellow-300">
              {buildings.find(b => b.id === hoveredBuilding)?.name}
            </div>
            <div className="text-sm">
              {buildings.find(b => b.id === hoveredBuilding)?.description}
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Production par tour:</div>
              <div className="text-sm text-green-400">
                {formatProduction(getBuildingProduction(hoveredBuilding))}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Points d'Action:</div>
              <div className="text-sm text-blue-400">
                Génère {getBuildingAPGeneration(hoveredBuilding)} PA/tour
                {getBuildingMaxAPIncrease(hoveredBuilding) > 0 && (
                  <span className="text-purple-400"> | +{getBuildingMaxAPIncrease(hoveredBuilding)} PA max</span>
                )}
              </div>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="text-xs text-gray-300 mb-1">Terrains requis:</div>
              <div className="text-sm text-orange-400">
                {buildings.find(b => b.id === hoveredBuilding)?.requiredTerrain.map(terrain => getTerrainName(terrain)).join(' ou ')}
              </div>
              {(() => {
                const buildingData = buildings.find(b => b.id === hoveredBuilding);
                if (!buildingData) return null;
                const { canBuild, missingTerrain } = canBuildBuilding(buildingData);
                if (!canBuild && missingTerrain) {
                  return (
                    <div className="text-sm text-red-400 mt-1">
                      ❌ Terrain manquant: {missingTerrain.map(terrain => getTerrainName(terrain)).join(', ')}
                    </div>
                  );
                }
                return (
                  <div className="text-sm text-green-400 mt-1">
                    ✅ Terrain disponible
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}