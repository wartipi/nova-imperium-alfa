import { GameState } from '../stores/useNovaImperium';

export interface CartographyData {
  exploredRegions: Map<string, ExploredRegion>;
  availableMaps: string[];
  cartographyLevel: number;
  totalAreasExplored: number;
}

export interface ExploredRegion {
  centerX: number;
  centerY: number;
  radius: number;
  tiles: Array<{
    x: number;
    y: number;
    terrain: string;
    resources: string[];
    lastUpdated: number;
  }>;
  quality: 'rough' | 'detailed' | 'masterwork';
  createdAt: number;
}

export interface CartographyAction {
  id: string;
  name: string;
  description: string;
  cost: number;
  requirements: {
    skill?: string;
    level?: number;
    pa?: number;
  };
  available: boolean;
}

export class CartographySystem {
  private gameState: GameState;

  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  // Obtenir les actions de cartographie disponibles
  getAvailableActions(): CartographyAction[] {
    const avatar = this.gameState.avatar;
    const currentPA = this.gameState.pointsAction;
    const skills = this.gameState.competences;

    const actions: CartographyAction[] = [];

    // Explorer la Zone (base)
    if (skills.exploration >= 1) {
      actions.push({
        id: 'explore_area',
        name: 'Explorer la Zone',
        description: 'Révèle les terrains et ressources dans un rayon de 1 hexagone',
        cost: 5,
        requirements: { skill: 'exploration', level: 1, pa: 5 },
        available: currentPA >= 5
      });
    }

    // Cartographier (avancé)
    if (skills.cartography >= 1) {
      const radius = Math.min(2 + Math.floor(skills.cartography / 2), 4);
      const cost = 10 + radius * 3;
      
      actions.push({
        id: 'create_map',
        name: 'Cartographier',
        description: `Crée une carte de la région (rayon ${radius}) avec toutes les découvertes`,
        cost,
        requirements: { skill: 'cartography', level: 1, pa: cost },
        available: currentPA >= cost
      });
    }

    // Cartographie Détaillée (expert)
    if (skills.cartography >= 3) {
      actions.push({
        id: 'detailed_mapping',
        name: 'Cartographie Détaillée',
        description: 'Crée une carte de qualité supérieure avec informations précises',
        cost: 25,
        requirements: { skill: 'cartography', level: 3, pa: 25 },
        available: currentPA >= 25
      });
    }

    // Cartographie de Maître (maître)
    if (skills.cartography >= 5) {
      actions.push({
        id: 'master_mapping',
        name: 'Cartographie de Maître',
        description: 'Crée une carte exceptionnelle avec tous les détails secrets',
        cost: 50,
        requirements: { skill: 'cartography', level: 5, pa: 50 },
        available: currentPA >= 50
      });
    }

    return actions;
  }

  // Exécuter une action de cartographie
  executeAction(actionId: string): {
    success: boolean;
    message: string;
    data?: any;
  } {
    const actions = this.getAvailableActions();
    const action = actions.find(a => a.id === actionId);

    if (!action) {
      return { success: false, message: 'Action inconnue' };
    }

    if (!action.available) {
      return { success: false, message: 'Action non disponible (PA insuffisants)' };
    }

    const avatar = this.gameState.avatar;
    
    switch (actionId) {
      case 'explore_area':
        return this.exploreArea(avatar.x, avatar.y);
        
      case 'create_map':
        return this.createMap(avatar.x, avatar.y, 'rough');
        
      case 'detailed_mapping':
        return this.createMap(avatar.x, avatar.y, 'detailed');
        
      case 'master_mapping':
        return this.createMap(avatar.x, avatar.y, 'masterwork');
        
      default:
        return { success: false, message: 'Action non implémentée' };
    }
  }

  private exploreArea(centerX: number, centerY: number): {
    success: boolean;
    message: string;
    data?: any;
  } {
    try {
      // Révéler la zone (logique simplifiée)
      const exploredTiles = this.getVisibleTiles(centerX, centerY, 1);
      
      // Consommer les PA
      this.gameState.pointsAction -= 5;
      
      // Gagner de l'XP
      this.gameState.competences.exploration += 0.1;
      
      return {
        success: true,
        message: `Zone explorée! ${exploredTiles.length} hexagones révélés`,
        data: { exploredTiles }
      };
    } catch (error) {
      return { success: false, message: 'Erreur lors de l\'exploration' };
    }
  }

  private createMap(centerX: number, centerY: number, quality: 'rough' | 'detailed' | 'masterwork'): {
    success: boolean;
    message: string;
    data?: any;
  } {
    try {
      const skillLevel = this.gameState.competences.cartography;
      const radius = Math.min(2 + Math.floor(skillLevel / 2), 4);
      
      // Obtenir les tuiles visibles
      const tiles = this.getVisibleTiles(centerX, centerY, radius);
      
      // Créer la carte
      const mapData = {
        id: `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `Carte-Region-${centerX}-${centerY}-${quality}-${Date.now()}`,
        type: 'carte',
        rarity: this.getMapRarity(quality),
        description: `Carte ${quality} de la région autour de (${centerX},${centerY}) - ${tiles.length} hexagones`,
        quality,
        region: {
          centerX,
          centerY,
          radius,
          tiles
        }
      };

      // Consommer les PA selon la qualité
      const cost = quality === 'rough' ? 10 + radius * 3 : 
                   quality === 'detailed' ? 25 : 50;
      this.gameState.pointsAction -= cost;
      
      // Gagner de l'XP
      this.gameState.competences.cartography += quality === 'rough' ? 0.2 : 
                                                quality === 'detailed' ? 0.3 : 0.5;
      
      return {
        success: true,
        message: `Carte ${quality} créée avec succès!`,
        data: mapData
      };
    } catch (error) {
      return { success: false, message: 'Erreur lors de la création de la carte' };
    }
  }

  private getVisibleTiles(centerX: number, centerY: number, radius: number) {
    const tiles = [];
    const gameMap = this.gameState.gameMap;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        
        // Vérification des limites
        if (y >= 0 && y < gameMap.length && x >= 0 && x < gameMap[y].length) {
          // Distance hexagonale approximative
          if (Math.abs(dx) + Math.abs(dy) + Math.abs(dx - dy) <= radius * 2) {
            const hex = gameMap[y][x];
            if (hex.isVisible) {
              tiles.push({
                x,
                y,
                terrain: hex.terrain,
                resources: hex.resources || []
              });
            }
          }
        }
      }
    }
    
    return tiles;
  }

  private getMapRarity(quality: string): string {
    switch (quality) {
      case 'masterwork': return 'legendaire';
      case 'detailed': return 'epique';
      default: return 'rare';
    }
  }

  // Méthodes utilitaires pour l'interface
  getCartographyInfo() {
    return {
      level: this.gameState.competences.cartography,
      availableActions: this.getAvailableActions().length,
      currentPA: this.gameState.pointsAction
    };
  }
}

export default CartographySystem;