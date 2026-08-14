import React from "react";
import { useResources } from "../../lib/stores/useResources";
import { useNovaImperium } from "../../lib/stores/useNovaImperium";

interface UnitCost {
  gold?: number;
  food?: number;
  iron?: number;
  wood?: number;
  stone?: number;
  mana?: number;
  action_points?: number;
}

interface UnitType {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  requiredBuilding?: string[];
  // STATS À DÉFINIR ENSEMBLE - Actuellement vides
  cost: UnitCost;
  recruitmentTime: number;
  actionPointCost: number;
  combatStats: {
    attack?: number;
    defense?: number;
    health?: number;
    movement?: number;
  };
}

// SYSTÈME NOVA IMPERIUM — Unités prototype canoniques V3-D6 (stats vides à calibrer en V3-D7)
// IDs alignés sur PROTOTYPE_UNITS dans RecruitmentPanel.tsx et UNIT_CATALOG dans server/unitCatalog.ts.
// Ce composant est une vue collaborative (handleRecruit = informatif uniquement — le vrai recrutement
// passe par RecruitmentPanel.tsx serveur-authoritative).
const availableUnits: UnitType[] = [

  // === INFANTERIE LÉGÈRE ===
  {
    id: 'militia',
    name: 'Milice',
    icon: '🛡️',
    description: 'Unité commune de défense locale.',
    category: 'Infanterie légère',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'garrison',
    name: 'Garnison',
    icon: '🏰',
    description: 'Unité défensive lente, adaptée à la protection d\'une ville.',
    category: 'Infanterie légère',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'patrollers',
    name: 'Patrouilleurs',
    icon: '👁️',
    description: 'Unité rapide de surveillance et contrôle de zone.',
    category: 'Infanterie légère',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'scouts',
    name: 'Éclaireurs',
    icon: '🔭',
    description: 'Unité très mobile pour l\'exploration.',
    category: 'Infanterie légère',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'light_infantry',
    name: 'Infanterie légère',
    icon: '🏃',
    description: 'Unité mobile de ligne légère.',
    category: 'Infanterie légère',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === INFANTERIE LOURDE ===
  {
    id: 'regular_infantry',
    name: 'Infanterie régulière',
    icon: '⚔️',
    description: 'Unité robuste de ligne.',
    category: 'Infanterie lourde',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'noble_infantry',
    name: 'Infanterie noble',
    icon: '👑',
    description: 'Unité lourde et coûteuse.',
    category: 'Infanterie lourde',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'shock_troops',
    name: 'Troupe de choc',
    icon: '💥',
    description: 'Unité offensive spécialisée.',
    category: 'Infanterie lourde',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === DISTANCE ===
  {
    id: 'bow_infantry',
    name: 'Infanterie à arc',
    icon: '🏹',
    description: 'Unité de projectile léger.',
    category: 'Distance',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'crossbow_infantry',
    name: 'Infanterie à arbalète',
    icon: '🎯',
    description: 'Unité de projectile lourd.',
    category: 'Distance',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === TECHNIQUE ===
  {
    id: 'sappers',
    name: 'Sapeurs',
    icon: '⛏️',
    description: 'Unité technique pour opérations de siège et sabotage.',
    category: 'Technique',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'field_engineers',
    name: 'Ingénieurs de campagne',
    icon: '🔧',
    description: 'Unité technique avancée de terrain.',
    category: 'Technique',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === RAID / SOUTIEN ===
  {
    id: 'raid_troops',
    name: 'Troupe de raid',
    icon: '🔥',
    description: 'Unité mobile pour pression économique.',
    category: 'Raid / Soutien',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'hunters',
    name: 'Chasseurs',
    icon: '🌿',
    description: 'Unité légère de soutien et survie.',
    category: 'Raid / Soutien',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === CONTRÔLE ===
  {
    id: 'pikemen',
    name: 'Piquiers',
    icon: '🪛',
    description: 'Unité de contrôle défensif.',
    category: 'Contrôle',
    requiredBuilding: [],
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
];

export function RecruitmentPanelZustand() {
  const { resources, spendResources } = useResources();
  const { currentNovaImperium, trainUnit } = useNovaImperium();

  // FONCTION TEMPORAIRE - Stats vides
  const canAfford = (cost: UnitCost): boolean => {
    // Toujours retourner true car costs sont vides
    return true;
  };

  const handleRecruit = (unit: UnitType) => {
    // Afficher un message informatif pour définition collaborative
    alert(`⚔️ UNITÉ: ${unit.name}\n\n` +
          `📍 CATÉGORIE: ${unit.category}\n` +
          `🏗️ BÂTIMENTS REQUIS: ${unit.requiredBuilding?.join(', ') || 'Aucun'}\n` +
          `📝 DESCRIPTION: ${unit.description}\n\n` +
          `⚠️ STATS À DÉFINIR ENSEMBLE:\n` +
          `• Coût en PA: [À définir]\n` +
          `• Coût matériaux: [À définir]\n` +
          `• Durée recrutement: [À définir]\n` +
          `• Stats combat: [À définir]`);
  };

  const getCombatStatsText = (combatStats: any): string => {
    if (Object.keys(combatStats).length === 0) {
      return '📝 Stats combat à définir ensemble';
    }
    return 'Stats combat configurées';
  };

  const getCostText = (cost: UnitCost): string => {
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

  // Grouper par catégorie pour meilleure organisation
  const unitsByCategory = availableUnits.reduce((acc, unit) => {
    if (!acc[unit.category]) acc[unit.category] = [];
    acc[unit.category].push(unit);
    return acc;
  }, {} as { [category: string]: UnitType[] });

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Civil': '👥',
      'Militaire': '⚔️',
      'Exploration': '🔍',
      'Magique': '🧙',
      'Spirituel': '⛪',
      'Siège': '🎯'
    };
    return icons[category] || '🎯';
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="font-bold text-base mb-3 text-amber-900">Recrutement Nova Imperium (Zustand)</h4>
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
            <div className="text-amber-700">🌾 Nourriture</div>
            <div className="font-bold text-amber-900">{resources.food}</div>
          </div>
          <div>
            <div className="text-amber-700">⚔️ Fer</div>
            <div className="font-bold text-amber-900">{resources.iron}</div>
          </div>
          <div>
            <div className="text-amber-700">🪵 Bois</div>
            <div className="font-bold text-amber-900">{resources.wood}</div>
          </div>
        </div>
      </div>

      {/* Unités par catégorie */}
      <div className="space-y-4">
        {Object.entries(unitsByCategory).map(([category, units]) => (
          <div key={category} className="bg-white border-2 border-amber-600 rounded-lg p-3">
            <h5 className="font-bold text-amber-800 text-sm mb-3 text-center">
              {getCategoryIcon(category)} {category}
            </h5>
            
            <div className="space-y-2">
              {units.map((unit) => (
                <div 
                  key={unit.id}
                  className="bg-gradient-to-b from-yellow-100 to-yellow-200 border border-yellow-600 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{unit.icon}</div>
                      <div>
                        <div className="font-bold text-amber-900 text-sm">{unit.name}</div>
                        <div className="text-xs text-amber-700">{unit.description}</div>
                        <div className="text-xs text-purple-600 mt-1">
                          Requis: {unit.requiredBuilding?.length ? unit.requiredBuilding.join(', ') : 'Aucun bâtiment'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {/* Statuts actuels */}
                      <div className="text-xs text-orange-700 mb-2 space-y-1">
                        <div>⚡ PA: {unit.actionPointCost || 'À définir'}</div>
                        <div>⏱️ Durée: {unit.recruitmentTime || 'À définir'}</div>
                        <div>💰 Coût: {getCostText(unit.cost)}</div>
                        <div>⚔️ Combat: {getCombatStatsText(unit.combatStats)}</div>
                      </div>
                      
                      {/* Bouton d'information */}
                      <button
                        onClick={() => handleRecruit(unit)}
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
          ⚔️ Système Prêt pour Configuration
        </div>
        <div className="text-xs text-blue-700">
          {availableUnits.length} unités Nova Imperium transférées vers Zustand
          <br />Prêt pour définition collaborative des statistiques
        </div>
      </div>
    </div>
  );
}