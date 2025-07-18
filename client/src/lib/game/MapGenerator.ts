import type { HexTile, TerrainType, BuildingType } from "./types";

export class MapGenerator {
  private static readonly TERRAIN_TYPES: TerrainType[] = [
    'wasteland', 'forest', 'mountains', 'fertile_land', 'hills', 'shallow_water', 
    'deep_water', 'swamp', 'desert', 'sacred_plains', 'caves', 'ancient_ruins', 
    'volcano', 'enchanted_meadow'
  ];

  private static readonly TERRAIN_COLORS = {
    wasteland: '#F5F5DC',        // Beige pâle
    forest: '#228B22',           // Vert foncé
    mountains: '#708090',        // Gris pierre
    fertile_land: '#90EE90',     // Vert clair
    hills: '#D2B48C',            // Brun clair
    shallow_water: '#87CEEB',    // Bleu clair
    deep_water: '#191970',       // Bleu foncé
    swamp: '#556B2F',            // Vert olive foncé
    desert: '#FFD700',           // Jaune doré
    sacred_plains: '#F0E68C',    // Blanc doré / beige lumineux
    caves: '#2F2F2F',            // Gris très foncé
    ancient_ruins: '#8B7355',    // Brun-gris
    volcano: '#B22222',          // Rouge foncé
    enchanted_meadow: '#50C878'  // Vert émeraude
  };

  private static readonly RESOURCES = [
    'wheat', 'cattle', 'fish', 'stone', 'copper', 'iron', 'gold', 'wood', 'oil', 'coal', 'uranium',
    'silk', 'spices', 'gems', 'ivory', 'herbs', 'crystals', 'sacred_stones', 'ancient_artifacts',
    'mana_stones', 'enchanted_wood'
  ];

  private static readonly TERRAIN_YIELDS = {
    wasteland: { food: 0, action_points: 0, gold: 0 },
    forest: { food: 1, action_points: 0, gold: 0 },
    mountains: { food: 0, action_points: 0, gold: 1 },
    fertile_land: { food: 3, action_points: 0, gold: 1 },
    hills: { food: 1, action_points: 0, gold: 0 },
    shallow_water: { food: 2, action_points: 0, gold: 1 },
    deep_water: { food: 1, action_points: 0, gold: 2 },
    swamp: { food: 1, action_points: 0, gold: 0 },
    desert: { food: 0, action_points: 0, gold: 1 },
    sacred_plains: { food: 2, action_points: 0, gold: 0 },
    caves: { food: 0, action_points: 0, gold: 0 },
    ancient_ruins: { food: 0, action_points: 0, gold: 1 },
    volcano: { food: 0, action_points: 0, gold: 0 },
    enchanted_meadow: { food: 2, action_points: 0, gold: 0 }
  };

  static generateMap(width: number, height: number): HexTile[][] {
    const map: HexTile[][] = [];
    
    for (let y = 0; y < height; y++) {
      const row: HexTile[] = [];
      for (let x = 0; x < width; x++) {
        const yields = this.TERRAIN_YIELDS['deep_water'];
        row.push({
          x,
          y,
          terrain: 'deep_water',
          food: yields.food,
          action_points: yields.action_points,
          gold: yields.gold,
          resource: null,
          hasRiver: false,
          hasRoad: false,
          improvement: null,
          isVisible: false,
          isExplored: false
        });
      }
      map.push(row);
    }
    
    this.generateArchipelagoIslands(map, width, height);
    this.addRivers(map, width, height);
    this.addResources(map, width, height);
    
    return map;
  }

  private static generateArchipelagoIslands(map: HexTile[][], width: number, height: number) {
    const numIslands = Math.floor((width * height) / 25);
    
    for (let i = 0; i < numIslands; i++) {
      const centerX = Math.floor(Math.random() * width);
      const centerY = Math.floor(Math.random() * height);
      const islandSize = 1 + Math.floor(Math.random() * 3);
      
      this.generateSmallIsland(map, width, height, centerX, centerY, islandSize);
    }
  }

  private static generateSmallIsland(map: HexTile[][], width: number, height: number, centerX: number, centerY: number, maxRadius: number) {
    const temperature = Math.random();
    const moisture = Math.random();
    
    for (let y = Math.max(0, centerY - maxRadius); y <= Math.min(height - 1, centerY + maxRadius); y++) {
      for (let x = Math.max(0, centerX - maxRadius); x <= Math.min(width - 1, centerX + maxRadius); x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distance <= maxRadius) {
          // Create land or shallow water based on distance
          const elevation = 0.4 + (1 - distance / maxRadius) * 0.4 + Math.random() * 0.2;
          
          if (distance <= maxRadius - 0.5) {
            // Core land
            map[y][x] = this.generateHex(x, y, elevation, temperature, moisture);
          } else if (distance <= maxRadius) {
            // Shallow water around island
            const yields = this.TERRAIN_YIELDS['shallow_water'];
            map[y][x] = {
              x,
              y,
              terrain: 'shallow_water',
              food: yields.food,
              production: yields.production,
              gold: yields.gold,
              science: yields.science,
              culture: yields.culture,
              resource: null,
              hasRiver: false,
              hasRoad: false,
              improvement: null,
              isVisible: false,
              isExplored: false
            };
          }
        }
      }
    }
  }

  private static generateHex(x: number, y: number, elevation: number, temperature: number, moisture: number): HexTile {
    let terrain: TerrainType;
    
    // Determine terrain based on elevation, temperature, and moisture
    if (elevation < 0.25) {
      terrain = 'deep_water';
    } else if (elevation < 0.35) {
      terrain = 'shallow_water';
    } else if (elevation > 0.85) {
      terrain = 'mountains';
    } else if (elevation > 0.7) {
      terrain = 'hills';
    } else {
      // Land terrain based on temperature and moisture
      if (temperature < 0.2) {
        terrain = 'wasteland';
      } else if (temperature > 0.8) {
        if (moisture < 0.3) {
          terrain = 'desert';
        } else if (moisture > 0.8) {
          terrain = 'swamp';
        } else {
          terrain = 'fertile_land';
        }
      } else {
        // Special terrain chances
        const rand = Math.random();
        if (rand < 0.02) {
          terrain = 'volcano';
        } else if (rand < 0.04) {
          terrain = 'ancient_ruins';
        } else if (rand < 0.06) {
          terrain = 'sacred_plains';
        } else if (rand < 0.08) {
          terrain = 'enchanted_meadow';
        } else if (rand < 0.1) {
          terrain = 'caves';
        } else {
          // Normal terrain
          if (moisture > 0.6) {
            terrain = 'forest';
          } else {
            terrain = 'fertile_land';
          }
        }
      }
    }
    
    const yields = this.TERRAIN_YIELDS[terrain];
    return {
      x,
      y,
      terrain,
      food: yields.food,
      action_points: yields.action_points,
      gold: yields.gold,
      resource: null,
      hasRiver: false,
      hasRoad: false,
      improvement: null,
      isVisible: false,
      isExplored: false
    };
  }

  private static generateNoise(width: number, height: number, scale: number): number[][] {
    const noise: number[][] = [];
    
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        // Simple Perlin-like noise
        const value = this.simpleNoise(x * scale, y * scale);
        row.push(value);
      }
      noise.push(row);
    }
    
    return noise;
  }

  private static simpleNoise(x: number, y: number): number {
    // Simple pseudo-random noise function
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return (n - Math.floor(n));
  }

  private static addRivers(map: HexTile[][], width: number, height: number) {
    // Add some rivers from mountains to ocean
    const riverSources = [];
    
    // Find mountain tiles as potential river sources
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (map[y][x].terrain === 'mountains' && Math.random() < 0.1) {
          riverSources.push({ x, y });
        }
      }
    }
    
    // Create rivers from sources
    riverSources.forEach(source => {
      this.createRiver(map, source.x, source.y, width, height);
    });
  }

  private static createRiver(map: HexTile[][], startX: number, startY: number, width: number, height: number) {
    let x = startX;
    let y = startY;
    const visited = new Set<string>();
    
    while (x >= 0 && x < width && y >= 0 && y < height) {
      const key = `${x},${y}`;
      if (visited.has(key)) break;
      visited.add(key);
      
      map[y][x].hasRiver = true;
      map[y][x].food += 1; // Rivers add food
      
      if (map[y][x].terrain === 'ocean' || map[y][x].terrain === 'coast') {
        break;
      }
      
      // Move toward lower elevation (simplified)
      const neighbors = this.getNeighbors(x, y, width, height);
      const validNeighbors = neighbors.filter(n => 
        n.x >= 0 && n.x < width && n.y >= 0 && n.y < height
      );
      
      if (validNeighbors.length === 0) break;
      
      const next = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
      x = next.x;
      y = next.y;
    }
  }

  private static addResources(map: HexTile[][], width: number, height: number) {
    const resourceDensity = 0.15; // 15% of tiles have resources
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() < resourceDensity) {
          const hex = map[y][x];
          const suitableResources = this.getSuitableResources(hex.terrain);
          
          if (suitableResources.length > 0) {
            const resource = suitableResources[Math.floor(Math.random() * suitableResources.length)];
            hex.resource = resource;
            
            // Resources modify yields
            this.applyResourceYields(hex, resource);
          }
        }
      }
    }
  }

  private static getSuitableResources(terrain: TerrainType): string[] {
    const resourceMap = {
      wasteland: ['stone', 'oil'],
      forest: ['deer', 'fur', 'herbs'],
      mountains: ['copper', 'iron', 'gold', 'coal', 'stone'],
      fertile_land: ['wheat', 'cattle', 'herbs'],
      hills: ['stone', 'copper', 'iron'],
      shallow_water: ['fish', 'crabs'],
      deep_water: ['fish', 'whales'],
      swamp: ['herbs', 'oil'],
      desert: ['oil', 'gold'],
      sacred_plains: ['sacred_stones', 'herbs'],
      caves: ['iron', 'copper', 'crystals'],
      ancient_ruins: ['ancient_artifacts', 'gold'],
      volcano: ['sulfur', 'obsidian', 'iron'],
      enchanted_meadow: ['crystals', 'herbs', 'sacred_stones']
    };
    
    return resourceMap[terrain] || [];
  }

  // Helper method to get terrain color for rendering
  static getTerrainColor(terrain: TerrainType): string {
    return this.TERRAIN_COLORS[terrain] || '#FFFFFF';
  }

  private static applyResourceYields(hex: HexTile, resource: string) {
    const resourceYields = {
      wheat: { food: 2 },
      cattle: { food: 1, production: 1 },
      fish: { food: 2 },
      stone: { production: 1 },
      copper: { production: 1 },
      iron: { production: 2 },
      gold: { science: 1 },
      coal: { production: 2 },
      oil: { production: 3 },
      uranium: { production: 2, science: 2 }
    };
    
    const yields = resourceYields[resource as keyof typeof resourceYields];
    if (yields) {
      hex.food += yields.food || 0;
      hex.production += yields.production || 0;
      hex.science += yields.science || 0;
    }
  }

  private static getNeighbors(x: number, y: number, width: number, height: number) {
    // Hex grid neighbors (even/odd row offset)
    const isEvenRow = y % 2 === 0;
    const neighbors = [];
    
    const offsets = isEvenRow ? [
      [-1, -1], [0, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]
    ] : [
      [0, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [1, 1]
    ];
    
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    
    return neighbors;
  }
}
