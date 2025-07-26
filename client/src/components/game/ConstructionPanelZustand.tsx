import React from "react";
import { useResources } from "../../lib/stores/useResources";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";

interface BuildingCost {
  wood?: number;
  stone?: number;
  iron?: number;
  gold?: number;
  food?: number;
  mana?: number;
  action_points?: number;
}

interface BuildingType {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  requiredTerrain: string[];
  // STATS À DÉFINIR ENSEMBLE - Actuellement vides
  cost: BuildingCost;
  constructionTime: number;
  actionPointCost: number;
  yields: {
    [key: string]: number;
  };
}

// SYSTÈME NOVA IMPERIUM - Bâtiments par terrain avec stats VIDES à définir ensemble
const availableBuildings: BuildingType[] = [
  
  // === TERRE EN FRICHE (wasteland) ===
  {
    id: 'outpost',
    name: 'Avant-poste', 
    icon: '🏗️', 
    description: 'Structure d\'observation et de défense basique',
    category: 'Basique',
    requiredTerrain: ['wasteland'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'exploration_camp',
    name: 'Camp d\'exploration',
    icon: '⛺',
    description: 'Base temporaire pour l\'exploration',
    category: 'Basique',
    requiredTerrain: ['wasteland'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'observation_tower',
    name: 'Tour d\'observation',
    icon: '🗼',
    description: 'Tour pour surveiller les environs',
    category: 'Défense',
    requiredTerrain: ['wasteland', 'hills'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === TERRE FERTILE (fertile_land) ===
  {
    id: 'farm',
    name: 'Ferme',
    icon: '🚜',
    description: 'Production agricole intensive',
    category: 'Production',
    requiredTerrain: ['fertile_land'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'granary',
    name: 'Grenier',
    icon: '🌾',
    description: 'Stockage et conservation des récoltes',
    category: 'Production',
    requiredTerrain: ['fertile_land'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === FORÊT (forest) ===
  {
    id: 'lumber_mill',
    name: 'Scierie',
    icon: '🪚',
    description: 'Production de bois optimisée',
    category: 'Production',
    requiredTerrain: ['forest'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'hunting_post',
    name: 'Poste de chasse',
    icon: '🏹',
    description: 'Chasse au gibier forestier',
    category: 'Production',
    requiredTerrain: ['forest'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'druidic_temple',
    name: 'Temple druidique',
    icon: '🌳',
    description: 'Temple en harmonie avec la nature',
    category: 'Spirituel',
    requiredTerrain: ['forest', 'enchanted_meadow'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'herbalist_house',
    name: 'Maison de l\'herboriste',
    icon: '🌿',
    description: 'Préparation de remèdes naturels',
    category: 'Production',
    requiredTerrain: ['forest', 'enchanted_meadow'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === MONTAGNES (mountains) ===
  {
    id: 'mine',
    name: 'Mine',
    icon: '⛏️',
    description: 'Extraction de minerais précieux',
    category: 'Production',
    requiredTerrain: ['mountains'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },
  {
    id: 'forge',
    name: 'Forge',
    icon: '🔨',
    description: 'Transformation des minerais en outils',
    category: 'Production',
    requiredTerrain: ['mountains'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === COLLINES (hills) ===
  {
    id: 'quarry',
    name: 'Carrière',
    icon: '🪨',
    description: 'Extraction de pierre de construction',
    category: 'Production',
    requiredTerrain: ['hills'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === MARÉCAGE (swamp) ===
  {
    id: 'alchemist_lab',
    name: 'Laboratoire d\'alchimie',
    icon: '🧪',
    description: 'Recherche et création de potions magiques',
    category: 'Production',
    requiredTerrain: ['swamp'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === PLAINES SACRÉES (sacred_plains) ===
  {
    id: 'sacred_altar',
    name: 'Autel sacré',
    icon: '⛩️',
    description: 'Centre spirituel et de recueillement',
    category: 'Spirituel',
    requiredTerrain: ['sacred_plains'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === GROTTES (caves) ===
  {
    id: 'underground_storage',
    name: 'Entrepôt souterrain',
    icon: '🕳️',
    description: 'Stockage sécurisé et protégé',
    category: 'Stockage',
    requiredTerrain: ['caves'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === RUINES ANTIQUES (ancient_ruins) ===
  {
    id: 'archaeological_site',
    name: 'Site archéologique',
    icon: '🏛️',
    description: 'Fouilles et recherche de connaissances anciennes',
    category: 'Recherche',
    requiredTerrain: ['ancient_ruins'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  },

  // === PRAIRIE ENCHANTÉE (enchanted_meadow) ===
  {
    id: 'mana_well',
    name: 'Puits de mana',
    icon: '💫',
    description: 'Source d\'énergie magique pure',
    category: 'Magique',
    requiredTerrain: ['enchanted_meadow'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    constructionTime: 0,
    actionPointCost: 0,
    yields: {}
  }
];

export function ConstructionPanelZustand() {
  const { resources, spendResources } = useResources();
  const { currentNovaImperium, buildInCity } = useNovaImperium();

  // FONCTION TEMPORAIRE - Stats vides
  const canAfford = (cost: BuildingCost): boolean => {
    // Toujours retourner true car costs sont vides
    return true;
  };

  const handleConstruct = (building: BuildingType) => {
    // Afficher un message informatif pour définition collaborative
    alert(`🏗️ BÂTIMENT: ${building.name}\n\n` +
          `📍 TERRAIN REQUIS: ${building.requiredTerrain.join(', ')}\n` +
          `📝 DESCRIPTION: ${building.description}\n\n` +
          `⚠️ STATS À DÉFINIR ENSEMBLE:\n` +
          `• Coût en PA: [À définir]\n` +
          `• Coût matériaux: [À définir]\n` +
          `• Durée construction: [À définir]\n` +
          `• Production: [À définir]`);
  };

  const getYieldsText = (yields: any): string => {
    if (Object.keys(yields).length === 0) {
      return '📝 Production à définir ensemble';
    }
    return 'Production configurée';
  };

  const getCostText = (cost: BuildingCost): string => {
    if (Object.keys(cost).length === 0) {
      return '📝 Coûts à définir ensemble';
    }
    return Object.entries(cost)
      .map(([key, value]) => `${value} ${getResourceIcon(key)}`)
      .join(', ');
  };

  const getResourceIcon = (resource: string) => {
    const icons: { [key: string]: string } = {
      food: '🌾',
      gold: '💰',
      wood: '🪵',
      stone: '🪨',
      iron: '⚙️',
      mana: '✨',
      action_points: '⚡'
    };
    return icons[resource] || resource;
  };

  // Grouper par terrain pour meilleure organisation
  const buildingsByTerrain = availableBuildings.reduce((acc, building) => {
    building.requiredTerrain.forEach(terrain => {
      if (!acc[terrain]) acc[terrain] = [];
      acc[terrain].push(building);
    });
    return acc;
  }, {} as { [terrain: string]: BuildingType[] });

  const getTerrainName = (terrain: string) => {
    const names: { [key: string]: string } = {
      wasteland: '🏜️ Terre en friche',
      fertile_land: '🌾 Terre fertile',
      forest: '🌲 Forêt',
      mountains: '⛰️ Montagnes',
      hills: '🏔️ Collines',
      swamp: '🦎 Marécage',
      sacred_plains: '⛩️ Plaines sacrées',
      caves: '🕳️ Grottes',
      ancient_ruins: '🏛️ Ruines antiques',
      enchanted_meadow: '🌸 Prairie enchantée'
    };
    return names[terrain] || terrain;
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3 text-amber-900">Construction Nova Imperium (Zustand)</h4>
        <div className="text-xs text-orange-700 bg-orange-100 border border-orange-300 rounded p-2">
          📝 Version collaborative - Stats à définir ensemble
        </div>
      </div>

      {/* Ressources disponibles */}
      <div className="bg-gradient-to-b from-amber-200 to-amber-300 border-2 border-amber-800 rounded-lg p-3">
        <div className="text-center mb-2">
          <h5 className="font-bold text-amber-900 text-sm">Ressources Actuelles</h5>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs text-center">
          <div>
            <div className="text-amber-700">💰 Or</div>
            <div className="font-bold text-amber-900">{resources.gold}</div>
          </div>
          <div>
            <div className="text-amber-700">🪨 Pierre</div>
            <div className="font-bold text-amber-900">{resources.stone}</div>
          </div>
          <div>
            <div className="text-amber-700">🪵 Bois</div>
            <div className="font-bold text-amber-900">{resources.wood}</div>
          </div>
          <div>
            <div className="text-amber-700">⚔️ Fer</div>
            <div className="font-bold text-amber-900">{resources.iron}</div>
          </div>
        </div>
      </div>

      {/* Bâtiments par terrain */}
      <div className="space-y-4">
        {Object.entries(buildingsByTerrain).map(([terrain, buildings]) => (
          <div key={terrain} className="bg-white border-2 border-amber-600 rounded-lg p-3">
            <h5 className="font-bold text-amber-800 text-sm mb-3 text-center">
              {getTerrainName(terrain)}
            </h5>
            
            <div className="space-y-2">
              {buildings.map((building) => (
                <div 
                  key={building.id}
                  className="bg-gradient-to-b from-yellow-100 to-yellow-200 border border-yellow-600 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{building.icon}</div>
                      <div>
                        <div className="font-bold text-amber-900 text-sm">{building.name}</div>
                        <div className="text-xs text-amber-700">{building.description}</div>
                        <div className="text-xs text-blue-600 mt-1">
                          Catégorie: {building.category}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {/* Statuts actuels */}
                      <div className="text-xs text-orange-700 mb-2 space-y-1">
                        <div>⚡ PA: {building.actionPointCost || 'À définir'}</div>
                        <div>⏱️ Durée: {building.constructionTime || 'À définir'}</div>
                        <div>💰 Coût: {getCostText(building.cost)}</div>
                        <div>📈 Produit: {getYieldsText(building.yields)}</div>
                      </div>
                      
                      {/* Bouton d'information */}
                      <button
                        onClick={() => handleConstruct(building)}
                        className="px-3 py-1 rounded text-xs font-bold bg-orange-400 hover:bg-orange-500 text-white transition-colors"
                      >
                        📝 Voir détails
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Note importante */}
      <div className="bg-blue-100 border-2 border-blue-600 rounded-lg p-3 text-center">
        <div className="text-blue-800 font-bold text-sm mb-1">
          🏗️ Système Prêt pour Configuration
        </div>
        <div className="text-xs text-blue-700">
          {availableBuildings.length} bâtiments Nova Imperium transférés vers Zustand
          <br />Prêt pour définition collaborative des statistiques
        </div>
      </div>
    </div>
  );
}