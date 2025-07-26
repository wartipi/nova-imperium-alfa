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

// SYSTÈME NOVA IMPERIUM - Unités avec stats VIDES à définir ensemble
const availableUnits: UnitType[] = [
  
  // === UNITÉS DE BASE ===
  {
    id: 'settler',
    name: 'Colon',
    icon: '👥',
    description: 'Fonde de nouvelles colonies et développe les territoires',
    category: 'Civil',
    requiredBuilding: [],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'scout',
    name: 'Éclaireur',
    icon: '🕵️',
    description: 'Unité rapide pour exploration et reconnaissance',
    category: 'Exploration',
    requiredBuilding: [],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'worker',
    name: 'Ouvrier',
    icon: '👷',
    description: 'Construit des améliorations et récolte des ressources',
    category: 'Civil',
    requiredBuilding: [],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === UNITÉS MILITAIRES DE BASE ===
  {
    id: 'warrior',
    name: 'Guerrier',
    icon: '⚔️',
    description: 'Unité de combat de base, polyvalente',
    category: 'Militaire',
    requiredBuilding: ['barracks'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'spearman',
    name: 'Lancier',
    icon: '🗡️',
    description: 'Infanterie défensive, efficace contre cavalerie',
    category: 'Militaire',
    requiredBuilding: ['barracks'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'archer',
    name: 'Archer',
    icon: '🏹',
    description: 'Unité à distance, efficace contre infanterie',
    category: 'Militaire',
    requiredBuilding: ['barracks'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === UNITÉS AVANCÉES ===
  {
    id: 'swordsman',
    name: 'Épéiste',
    icon: '🗡️',
    description: 'Guerrier expérimenté avec armure et épée',
    category: 'Militaire',
    requiredBuilding: ['barracks', 'forge'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'catapult',
    name: 'Catapulte',
    icon: '🎯',
    description: 'Machine de siège pour attaquer les fortifications',
    category: 'Siège',
    requiredBuilding: ['barracks', 'forge'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === UNITÉS MAGIQUES ===
  {
    id: 'mage',
    name: 'Mage',
    icon: '🧙',
    description: 'Unité magique puissante, coûteuse à maintenir',
    category: 'Magique',
    requiredBuilding: ['library', 'mana_well'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'druid',
    name: 'Druide',
    icon: '🍃',
    description: 'Maître de la nature et des sorts de soutien',
    category: 'Magique',
    requiredBuilding: ['druidic_temple'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'alchemist',
    name: 'Alchimiste',
    icon: '🧪',
    description: 'Expert en potions et transmutations',
    category: 'Magique',
    requiredBuilding: ['alchemist_lab'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },

  // === UNITÉS SPÉCIALISÉES ===
  {
    id: 'priest',
    name: 'Prêtre',
    icon: '⛪',
    description: 'Unité de soutien spirituel et soins',
    category: 'Spirituel',
    requiredBuilding: ['sacred_altar'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'scholar',
    name: 'Érudit',
    icon: '📚',
    description: 'Spécialiste de la recherche et des connaissances',
    category: 'Civil',
    requiredBuilding: ['library'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  },
  {
    id: 'merchant',
    name: 'Marchand',
    icon: '💰',
    description: 'Expert en commerce et négociation',
    category: 'Civil',
    requiredBuilding: ['market'],
    // À DÉFINIR ENSEMBLE :
    cost: {},
    recruitmentTime: 0,
    actionPointCost: 0,
    combatStats: {}
  }
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