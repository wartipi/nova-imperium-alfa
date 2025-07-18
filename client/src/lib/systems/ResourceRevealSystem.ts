/**
 * Système de révélation des ressources pour Nova Imperium
 * Niveau 1 d'Exploration révèle les ressources rares et stratégiques dans le champ de vision
 */

import type { ResourceType, HexTile } from '../game/types';

export interface ResourceInfo {
  type: ResourceType;
  rarity: 'common' | 'strategic' | 'rare' | 'magical';
  symbol: string;
  color: string;
  revealLevel: number; // Niveau d'exploration requis pour révéler
}

export class ResourceRevealSystem {
  // Classification des ressources par rareté et niveau de révélation
  private static readonly RESOURCE_INFO: Record<ResourceType, ResourceInfo> = {
    // Ressources communes (invisibles sans exploration niveau 1)
    wheat: { type: 'wheat', rarity: 'common', symbol: '🌾', color: '#FFD700', revealLevel: 1 },
    cattle: { type: 'cattle', rarity: 'common', symbol: '🐄', color: '#8B4513', revealLevel: 1 },
    fish: { type: 'fish', rarity: 'common', symbol: '🐟', color: '#4682B4', revealLevel: 1 },
    wood: { type: 'wood', rarity: 'common', symbol: '🪵', color: '#8B4513', revealLevel: 1 },
    
    // Ressources stratégiques (révélées niveau 1)
    stone: { type: 'stone', rarity: 'strategic', symbol: '🪨', color: '#708090', revealLevel: 1 },
    copper: { type: 'copper', rarity: 'strategic', symbol: '🔶', color: '#B87333', revealLevel: 1 },
    iron: { type: 'iron', rarity: 'strategic', symbol: '⚒️', color: '#C0C0C0', revealLevel: 1 },
    coal: { type: 'coal', rarity: 'strategic', symbol: '⚫', color: '#2F2F2F', revealLevel: 1 },
    
    // Ressources rares (révélées niveau 1)
    gold: { type: 'gold', rarity: 'rare', symbol: '🥇', color: '#FFD700', revealLevel: 1 },
    oil: { type: 'oil', rarity: 'rare', symbol: '🛢️', color: '#8B4513', revealLevel: 1 },
    uranium: { type: 'uranium', rarity: 'rare', symbol: '☢️', color: '#7CFC00', revealLevel: 1 },
    silk: { type: 'silk', rarity: 'rare', symbol: '🧵', color: '#DDA0DD', revealLevel: 1 },
    spices: { type: 'spices', rarity: 'rare', symbol: '🌶️', color: '#FF6347', revealLevel: 1 },
    gems: { type: 'gems', rarity: 'rare', symbol: '💎', color: '#00CED1', revealLevel: 1 },
    ivory: { type: 'ivory', rarity: 'rare', symbol: '🦴', color: '#FFF8DC', revealLevel: 1 },
    
    // Ressources magiques (révélées niveau 1, mais plus rares)
    herbs: { type: 'herbs', rarity: 'magical', symbol: '🌿', color: '#32CD32', revealLevel: 1 },
    crystals: { type: 'crystals', rarity: 'magical', symbol: '💠', color: '#9370DB', revealLevel: 1 },
    sacred_stones: { type: 'sacred_stones', rarity: 'magical', symbol: '🔮', color: '#8A2BE2', revealLevel: 1 },
    ancient_artifacts: { type: 'ancient_artifacts', rarity: 'magical', symbol: '📿', color: '#DAA520', revealLevel: 1 },
    mana_stones: { type: 'mana_stones', rarity: 'magical', symbol: '✨', color: '#4169E1', revealLevel: 1 },
    enchanted_wood: { type: 'enchanted_wood', rarity: 'magical', symbol: '🌳', color: '#228B22', revealLevel: 1 }
  };

  /**
   * Vérifie si une ressource peut être révélée selon le niveau d'exploration
   */
  static canRevealResource(resource: ResourceType, explorationLevel: number): boolean {
    const resourceInfo = this.RESOURCE_INFO[resource];
    return resourceInfo && explorationLevel >= resourceInfo.revealLevel;
  }

  /**
   * Obtient les informations d'affichage d'une ressource
   */
  static getResourceDisplayInfo(resource: ResourceType): ResourceInfo | null {
    return this.RESOURCE_INFO[resource] || null;
  }

  /**
   * Obtient toutes les ressources visibles dans un hexagone selon le niveau d'exploration
   */
  static getVisibleResources(hex: HexTile, explorationLevel: number): ResourceInfo[] {
    const visibleResources: ResourceInfo[] = [];
    
    if (hex.resource) {
      const resourceInfo = this.getResourceDisplayInfo(hex.resource);
      if (resourceInfo && this.canRevealResource(hex.resource, explorationLevel)) {
        visibleResources.push(resourceInfo);
      }
    }
    
    return visibleResources;
  }

  /**
   * Obtient le symbole d'affichage pour un hexagone avec ressources
   */
  static getHexResourceSymbol(hex: HexTile, explorationLevel: number): string | null {
    const visibleResources = this.getVisibleResources(hex, explorationLevel);
    
    if (visibleResources.length > 0) {
      // Prioriser les ressources les plus rares
      const priorityOrder = ['magical', 'rare', 'strategic', 'common'];
      
      for (const priority of priorityOrder) {
        const resource = visibleResources.find(r => r.rarity === priority);
        if (resource) {
          return resource.symbol;
        }
      }
    }
    
    return null;
  }

  /**
   * Obtient la couleur d'arrière-plan pour un hexagone avec ressources
   */
  static getHexResourceColor(hex: HexTile, explorationLevel: number): string | null {
    const visibleResources = this.getVisibleResources(hex, explorationLevel);
    
    if (visibleResources.length > 0) {
      // Prioriser les ressources les plus rares
      const priorityOrder = ['magical', 'rare', 'strategic', 'common'];
      
      for (const priority of priorityOrder) {
        const resource = visibleResources.find(r => r.rarity === priority);
        if (resource) {
          return resource.color;
        }
      }
    }
    
    return null;
  }

  /**
   * Vérifie si un hexagone a des ressources révélables
   */
  static hasRevealableResources(hex: HexTile, explorationLevel: number): boolean {
    return this.getVisibleResources(hex, explorationLevel).length > 0;
  }

  /**
   * Obtient une description textuelle des ressources visibles
   */
  static getResourceDescription(hex: HexTile, explorationLevel: number): string {
    const visibleResources = this.getVisibleResources(hex, explorationLevel);
    
    if (visibleResources.length === 0) {
      return explorationLevel >= 1 ? 'Aucune ressource détectée' : 'Exploration requise pour détecter les ressources';
    }
    
    const descriptions = visibleResources.map(r => {
      const rarityLabel = {
        common: 'Commune',
        strategic: 'Stratégique',
        rare: 'Rare',
        magical: 'Magique'
      }[r.rarity];
      
      return `${r.symbol} ${r.type} (${rarityLabel})`;
    });
    
    return descriptions.join(', ');
  }
}