import type { HexTile, TerrainType } from "./types";

export class MapGenerator {
  private static readonly TERRAIN_TYPES: TerrainType[] = [
    'grassland', 'plains', 'desert', 'tundra', 'snow', 'ocean', 'coast', 'hills', 'mountains', 'forest', 'jungle'
  ];

  private static readonly RESOURCES = [
    'wheat', 'cattle', 'fish', 'stone', 'copper', 'iron', 'gold', 'oil', 'coal', 'uranium'
  ];

  static generateMap(width: number, height: number): HexTile[][] {
    const map: HexTile[][] = [];
    
    // Pre-calculate noise for more realistic terrain
    const elevationNoise = this.generateNoise(width, height, 0.1);
    const temperatureNoise = this.generateNoise(width, height, 0.08);
    const moistureNoise = this.generateNoise(width, height, 0.12);
    
    for (let y = 0; y < height; y++) {
      const row: HexTile[] = [];
      for (let x = 0; x < width; x++) {
        const hex = this.generateHex(x, y, elevationNoise[y][x], temperatureNoise[y][x], moistureNoise[y][x]);
        row.push(hex);
      }
      map.push(row);
    }
    
    // Add rivers
    this.addRivers(map, width, height);
    
    // Add resources
    this.addResources(map, width, height);
    
    return map;
  }

  private static generateHex(x: number, y: number, elevation: number, temperature: number, moisture: number): HexTile {
    let terrain: TerrainType;
    let food = 0;
    let production = 0;
    let science = 0;
    let commerce = 0;
    
    // Determine terrain based on elevation, temperature, and moisture
    if (elevation < 0.3) {
      terrain = 'ocean';
      food = 1;
      commerce = 2;
    } else if (elevation < 0.4) {
      terrain = 'coast';
      food = 2;
      commerce = 1;
    } else if (elevation > 0.8) {
      terrain = 'mountains';
      production = 2;
    } else if (elevation > 0.6) {
      terrain = 'hills';
      production = 1;
      food = 1;
    } else {
      // Land terrain based on temperature and moisture
      if (temperature < 0.3) {
        terrain = moisture > 0.5 ? 'tundra' : 'snow';
        food = terrain === 'tundra' ? 1 : 0;
      } else if (temperature > 0.7) {
        if (moisture < 0.3) {
          terrain = 'desert';
          food = 0;
        } else if (moisture > 0.7) {
          terrain = 'jungle';
          food = 1;
          production = 1;
        } else {
          terrain = 'plains';
          food = 1;
          production = 1;
        }
      } else {
        if (moisture > 0.6) {
          terrain = 'forest';
          food = 1;
          production = 1;
        } else {
          terrain = 'grassland';
          food = 2;
          commerce = 1;
        }
      }
    }
    
    return {
      x,
      y,
      terrain,
      food,
      production,
      science,
      commerce,
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
      grassland: ['wheat', 'cattle'],
      plains: ['wheat', 'cattle', 'stone'],
      desert: ['oil', 'gold'],
      hills: ['stone', 'copper', 'iron'],
      mountains: ['copper', 'iron', 'gold', 'coal'],
      forest: ['deer', 'fur'],
      jungle: ['spices', 'gems'],
      ocean: ['fish', 'whales'],
      coast: ['fish', 'crabs'],
      tundra: ['fur', 'oil'],
      snow: ['oil']
    };
    
    return resourceMap[terrain] || [];
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
