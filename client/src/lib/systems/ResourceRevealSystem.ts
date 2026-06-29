/**
 * Système de révélation des ressources pour Nova Imperium V2
 * Liste officielle : 8 communes + 5 stratégiques + 4 rares + 9 magiques + 1 monnaie
 */

import type { ResourceType, HexTile } from '../game/types';

export interface ResourceInfo {
  type: ResourceType;
  rarity: 'common' | 'strategic' | 'rare' | 'magical';
  symbol: string;
  color: string;
  revealLevel: number; // Niveau d'exploration requis pour révéler
  label: string;       // Nom français officiel
}

export class ResourceRevealSystem {
  private static readonly RESOURCE_INFO: Record<ResourceType, ResourceInfo> = {
    // A. COMMUNES — révélées niveau 1
    food:           { type: 'food',           rarity: 'common',    symbol: '🌿', color: '#7EC850', revealLevel: 1, label: 'Nourriture'          },
    wood:           { type: 'wood',           rarity: 'common',    symbol: '🪵', color: '#8B4513', revealLevel: 1, label: 'Bois'                 },
    leather_fur:    { type: 'leather_fur',    rarity: 'common',    symbol: '🦊', color: '#A0522D', revealLevel: 1, label: 'Cuir et fourrure'     },
    stone:          { type: 'stone',          rarity: 'common',    symbol: '🪨', color: '#708090', revealLevel: 1, label: 'Pierre'               },
    common_metals:  { type: 'common_metals',  rarity: 'common',    symbol: '⚙️', color: '#C0C0C0', revealLevel: 1, label: 'Métaux communs'       },
    coal:           { type: 'coal',           rarity: 'common',    symbol: '⚫', color: '#2F2F2F', revealLevel: 1, label: 'Charbon'              },
    oil:            { type: 'oil',            rarity: 'common',    symbol: '🛢️', color: '#5C4033', revealLevel: 1, label: 'Huile'                },
    herbs:          { type: 'herbs',          rarity: 'common',    symbol: '🌿', color: '#32CD32', revealLevel: 1, label: 'Herbes'               },

    // B. STRATÉGIQUES — produites par bâtiments, ne sont jamais révélées sur la carte
    basic_equipment:        { type: 'basic_equipment',        rarity: 'strategic', symbol: '🛡️', color: '#808080', revealLevel: 99, label: 'Équipement basique'       },
    intermediate_equipment: { type: 'intermediate_equipment', rarity: 'strategic', symbol: '⚔️', color: '#708090', revealLevel: 99, label: 'Équipement intermédiaire'  },
    advanced_equipment:     { type: 'advanced_equipment',     rarity: 'strategic', symbol: '🗡️', color: '#607090', revealLevel: 99, label: 'Équipement avancé'         },
    epic_equipment:         { type: 'epic_equipment',         rarity: 'strategic', symbol: '🏹', color: '#9370DB', revealLevel: 99, label: 'Équipement épique'          },
    legendary_equipment:    { type: 'legendary_equipment',    rarity: 'strategic', symbol: '👑', color: '#FFD700', revealLevel: 99, label: 'Équipement légendaire'      },

    // C. RARES — révélées niveau 1
    rare_metals_alloys: { type: 'rare_metals_alloys', rarity: 'rare', symbol: '🥇', color: '#DAA520', revealLevel: 1, label: 'Métaux et alliages rares' },
    textiles:           { type: 'textiles',           rarity: 'rare', symbol: '🧵', color: '#DDA0DD', revealLevel: 1, label: 'Textiles'                 },
    spices:             { type: 'spices',             rarity: 'rare', symbol: '🌶️', color: '#FF6347', revealLevel: 1, label: 'Épices'                   },
    precious_stones:    { type: 'precious_stones',    rarity: 'rare', symbol: '💎', color: '#00CED1', revealLevel: 1, label: 'Pierres précieuses'        },

    // D. MAGIQUES — révélées niveau 3+
    crystals:          { type: 'crystals',          rarity: 'magical', symbol: '💠', color: '#9370DB', revealLevel: 3, label: 'Cristaux'             },
    sacred_stones:     { type: 'sacred_stones',     rarity: 'magical', symbol: '🔮', color: '#8A2BE2', revealLevel: 3, label: 'Pierres sacrées'      },
    ancient_artifacts: { type: 'ancient_artifacts', rarity: 'magical', symbol: '📿', color: '#DAA520', revealLevel: 3, label: 'Artefacts anciens'    },
    enchanted_wood:    { type: 'enchanted_wood',    rarity: 'magical', symbol: '🌳', color: '#228B22', revealLevel: 3, label: 'Bois enchanté'        },
    mana_crystals:     { type: 'mana_crystals',     rarity: 'magical', symbol: '🔵', color: '#0066FF', revealLevel: 3, label: 'Cristaux de mana'     },
    arcane_stones:     { type: 'arcane_stones',     rarity: 'magical', symbol: '⚡', color: '#9932CC', revealLevel: 3, label: 'Pierres arcaniques'   },
    elemental_essence: { type: 'elemental_essence', rarity: 'magical', symbol: '🌀', color: '#00FFFF', revealLevel: 3, label: 'Essence élémentaire'  },
    spirit_stones:     { type: 'spirit_stones',     rarity: 'magical', symbol: '👻', color: '#E6E6FA', revealLevel: 3, label: 'Pierres d\'esprit'    },
    void_shards:       { type: 'void_shards',       rarity: 'magical', symbol: '🕳️', color: '#1a1a2e', revealLevel: 3, label: 'Éclats du vide'      },
  };

  static canRevealResource(resource: ResourceType, explorationLevel: number): boolean {
    const info = this.RESOURCE_INFO[resource];
    return !!info && explorationLevel >= info.revealLevel;
  }

  static getResourceDisplayInfo(resource: ResourceType): ResourceInfo | null {
    return this.RESOURCE_INFO[resource] || null;
  }

  static getVisibleResources(hex: HexTile, explorationLevel: number, isResourceDiscovered?: boolean): ResourceInfo[] {
    const visible: ResourceInfo[] = [];
    if (hex.resource && explorationLevel >= 1 && isResourceDiscovered) {
      const info = this.getResourceDisplayInfo(hex.resource);
      if (info && this.canRevealResource(hex.resource, explorationLevel)) {
        visible.push(info);
      }
    }
    return visible;
  }

  static getHexResourceSymbol(hex: HexTile, explorationLevel: number): string | null {
    const visible = this.getVisibleResources(hex, explorationLevel);
    if (visible.length === 0) return null;
    const priority = ['magical', 'rare', 'strategic', 'common'];
    for (const p of priority) {
      const r = visible.find(x => x.rarity === p);
      if (r) return r.symbol;
    }
    return null;
  }

  static getHexResourceColor(hex: HexTile, explorationLevel: number): string | null {
    const visible = this.getVisibleResources(hex, explorationLevel);
    if (visible.length === 0) return null;
    const priority = ['magical', 'rare', 'strategic', 'common'];
    for (const p of priority) {
      const r = visible.find(x => x.rarity === p);
      if (r) return r.color;
    }
    return null;
  }

  static hasRevealableResources(hex: HexTile, explorationLevel: number): boolean {
    return this.getVisibleResources(hex, explorationLevel).length > 0;
  }

  static getResourceDescription(hex: HexTile, explorationLevel: number): string {
    const visible = this.getVisibleResources(hex, explorationLevel);
    if (visible.length === 0) {
      return explorationLevel >= 1 ? 'Aucune ressource détectée' : 'Exploration requise pour détecter les ressources';
    }
    const rarityLabel: Record<string, string> = {
      common: 'Commune', strategic: 'Stratégique', rare: 'Rare', magical: 'Magique'
    };
    return visible.map(r => `${r.symbol} ${r.label} (${rarityLabel[r.rarity]})`).join(', ');
  }

  // Utilitaire : retourne le label français d'une clé de ressource
  static getLabel(resource: string): string {
    const info = this.RESOURCE_INFO[resource as ResourceType];
    return info?.label ?? resource;
  }
}
