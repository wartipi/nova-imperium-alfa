/**
 * Optimisations pour la Gestion de Cartes Massives - Nova Imperium
 * Système d'optimisation pour supporter des cartes de 10000x3000 hexagones
 */

import type { HexTile } from "./types";

export interface MapChunk {
  id: string;
  startX: number;
  startY: number;
  width: number;
  height: number;
  tiles: Map<string, HexTile>;
  isLoaded: boolean;
  lastAccessed: number;
}

export interface ViewportInfo {
  centerX: number;
  centerY: number;
  viewWidth: number;
  viewHeight: number;
  zoom: number;
}

export class LargeMapOptimizer {
  private static readonly CHUNK_SIZE = 100; // Chunks de 100x100 hexagones
  private static readonly MAX_LOADED_CHUNKS = 50; // Maximum 50 chunks en mémoire
  private static readonly CACHE_EXPIRY_TIME = 300000; // 5 minutes
  
  private chunks: Map<string, MapChunk> = new Map();
  private loadedChunks: Set<string> = new Set();
  private pendingChunks: Set<string> = new Set();
  
  constructor(
    private mapWidth: number,
    private mapHeight: number
  ) {}

  // Générer l'ID d'un chunk basé sur les coordonnées
  private getChunkId(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  // Obtenir les coordonnées de chunk pour une position donnée
  private getChunkCoordinates(x: number, y: number): { chunkX: number; chunkY: number } {
    return {
      chunkX: Math.floor(x / LargeMapOptimizer.CHUNK_SIZE),
      chunkY: Math.floor(y / LargeMapOptimizer.CHUNK_SIZE)
    };
  }

  // Calculer quels chunks sont nécessaires pour le viewport actuel
  getRequiredChunks(viewport: ViewportInfo): string[] {
    const requiredChunks: string[] = [];
    
    // Calculer la zone visible avec une marge pour le pré-chargement
    const margin = LargeMapOptimizer.CHUNK_SIZE;
    const minX = Math.max(0, viewport.centerX - viewport.viewWidth / 2 - margin);
    const maxX = Math.min(this.mapWidth, viewport.centerX + viewport.viewWidth / 2 + margin);
    const minY = Math.max(0, viewport.centerY - viewport.viewHeight / 2 - margin);
    const maxY = Math.min(this.mapHeight, viewport.centerY + viewport.viewHeight / 2 + margin);
    
    const minChunk = this.getChunkCoordinates(minX, minY);
    const maxChunk = this.getChunkCoordinates(maxX, maxY);
    
    for (let chunkY = minChunk.chunkY; chunkY <= maxChunk.chunkY; chunkY++) {
      for (let chunkX = minChunk.chunkX; chunkX <= maxChunk.chunkX; chunkX++) {
        const chunkId = this.getChunkId(chunkX, chunkY);
        requiredChunks.push(chunkId);
      }
    }
    
    return requiredChunks;
  }

  // Charger un chunk de manière asynchrone
  async loadChunk(chunkId: string): Promise<MapChunk> {
    if (this.chunks.has(chunkId)) {
      const chunk = this.chunks.get(chunkId)!;
      chunk.lastAccessed = Date.now();
      return chunk;
    }

    if (this.pendingChunks.has(chunkId)) {
      // Attendre que le chunk en cours de chargement soit prêt
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.chunks.has(chunkId)) {
            clearInterval(checkInterval);
            resolve(this.chunks.get(chunkId)!);
          }
        }, 50);
      });
    }

    this.pendingChunks.add(chunkId);
    
    try {
      const chunk = await this.generateChunk(chunkId);
      this.chunks.set(chunkId, chunk);
      this.loadedChunks.add(chunkId);
      this.pendingChunks.delete(chunkId);
      
      // Gérer la mémoire en déchargeant les anciens chunks
      await this.manageChunkMemory();
      
      return chunk;
    } catch (error) {
      this.pendingChunks.delete(chunkId);
      throw error;
    }
  }

  // Générer un chunk de données
  private async generateChunk(chunkId: string): Promise<MapChunk> {
    const [chunkXStr, chunkYStr] = chunkId.split(',');
    const chunkX = parseInt(chunkXStr);
    const chunkY = parseInt(chunkYStr);
    
    const startX = chunkX * LargeMapOptimizer.CHUNK_SIZE;
    const startY = chunkY * LargeMapOptimizer.CHUNK_SIZE;
    const endX = Math.min(startX + LargeMapOptimizer.CHUNK_SIZE, this.mapWidth);
    const endY = Math.min(startY + LargeMapOptimizer.CHUNK_SIZE, this.mapHeight);
    
    const tiles = new Map<string, HexTile>();
    
    // Générer les tuiles avec un générateur procédural optimisé
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.generateProceduralTile(x, y);
        tiles.set(`${x},${y}`, tile);
      }
    }
    
    return {
      id: chunkId,
      startX,
      startY,
      width: endX - startX,
      height: endY - startY,
      tiles,
      isLoaded: true,
      lastAccessed: Date.now()
    };
  }

  // Générateur procédural optimisé pour les grandes cartes
  private generateProceduralTile(x: number, y: number): HexTile {
    // Utiliser des fonctions de bruit pour créer un terrain cohérent
    const noiseScale = 0.01;
    const elevationNoise = this.simpleNoise(x * noiseScale, y * noiseScale);
    const temperatureNoise = this.simpleNoise(x * noiseScale * 0.5, y * noiseScale * 0.5, 1000);
    const moistureNoise = this.simpleNoise(x * noiseScale * 0.7, y * noiseScale * 0.7, 2000);
    
    // Déterminer le terrain basé sur les valeurs de bruit
    let terrain = 'deep_water';
    
    if (elevationNoise > 0.3) {
      if (temperatureNoise > 0.6) {
        terrain = moistureNoise > 0.5 ? 'forest' : 'desert';
      } else if (temperatureNoise > 0.3) {
        terrain = moistureNoise > 0.6 ? 'fertile_land' : 'hills';
      } else {
        terrain = elevationNoise > 0.7 ? 'mountains' : 'hills';
      }
    } else if (elevationNoise > 0.1) {
      terrain = 'shallow_water';
    }
    
    // Déterminer s'il y a une ressource (réduit pour les grandes cartes)
    let resource = null;
    if (Math.random() < 0.05) { // 5% de chance au lieu de 10%
      const resources = this.getResourcesForTerrain(terrain);
      if (resources.length > 0) {
        resource = resources[Math.floor(Math.random() * resources.length)];
      }
    }
    
    const yields = this.getTerrainYields(terrain);
    
    return {
      x,
      y,
      terrain: terrain as any,
      food: yields.food,
      action_points: yields.action_points,
      gold: yields.gold,
      resource,
      hasRiver: false,
      hasRoad: false,
      improvement: null,
      isVisible: false,
      isExplored: false
    };
  }

  // Fonction de bruit simple pour la génération procédurale
  private simpleNoise(x: number, y: number, seed: number = 0): number {
    const n = Math.sin(x + seed) * Math.sin(y + seed) + 
              Math.sin(x * 2.1 + seed) * Math.sin(y * 2.1 + seed) * 0.5 +
              Math.sin(x * 4.3 + seed) * Math.sin(y * 4.3 + seed) * 0.25;
    return (n + 1) / 2; // Normaliser entre 0 et 1
  }

  private getResourcesForTerrain(terrain: string): string[] {
    const terrainResources: Record<string, string[]> = {
      'mountains': ['iron', 'gold', 'gems', 'stone'],
      'hills': ['stone', 'copper', 'coal'],
      'forest': ['wood', 'herbs'],
      'fertile_land': ['wheat', 'cattle'],
      'deep_water': ['fish', 'whales', 'oil'],
      'shallow_water': ['fish', 'crabs'],
      'desert': ['oil', 'gems'],
      'swamp': ['herbs', 'oil']
    };
    
    return terrainResources[terrain] || [];
  }

  private getTerrainYields(terrain: string): { food: number; action_points: number; gold: number } {
    const yields: Record<string, { food: number; action_points: number; gold: number }> = {
      wasteland: { food: 0, action_points: 0, gold: 0 },
      forest: { food: 1, action_points: 0, gold: 0 },
      mountains: { food: 0, action_points: 0, gold: 1 },
      fertile_land: { food: 3, action_points: 0, gold: 1 },
      hills: { food: 1, action_points: 0, gold: 0 },
      shallow_water: { food: 2, action_points: 0, gold: 1 },
      deep_water: { food: 1, action_points: 0, gold: 2 },
      swamp: { food: 1, action_points: 0, gold: 0 },
      desert: { food: 0, action_points: 0, gold: 1 }
    };
    
    return yields[terrain] || { food: 0, action_points: 0, gold: 0 };
  }

  // Gérer la mémoire en déchargeant les chunks anciens
  private async manageChunkMemory(): Promise<void> {
    if (this.loadedChunks.size <= LargeMapOptimizer.MAX_LOADED_CHUNKS) {
      return;
    }

    const now = Date.now();
    const chunksToUnload: string[] = [];
    
    // Trouver les chunks les plus anciens
    for (const chunkId of this.loadedChunks) {
      const chunk = this.chunks.get(chunkId);
      if (chunk && (now - chunk.lastAccessed) > LargeMapOptimizer.CACHE_EXPIRY_TIME) {
        chunksToUnload.push(chunkId);
      }
    }
    
    // Trier par dernier accès et décharger les plus anciens
    chunksToUnload.sort((a, b) => {
      const chunkA = this.chunks.get(a)!;
      const chunkB = this.chunks.get(b)!;
      return chunkA.lastAccessed - chunkB.lastAccessed;
    });
    
    const toUnload = chunksToUnload.slice(0, this.loadedChunks.size - LargeMapOptimizer.MAX_LOADED_CHUNKS + 10);
    
    for (const chunkId of toUnload) {
      this.unloadChunk(chunkId);
    }
  }

  // Décharger un chunk de la mémoire
  private unloadChunk(chunkId: string): void {
    this.chunks.delete(chunkId);
    this.loadedChunks.delete(chunkId);
  }

  // Obtenir une tuile avec chargement à la demande
  async getTile(x: number, y: number): Promise<HexTile | null> {
    const { chunkX, chunkY } = this.getChunkCoordinates(x, y);
    const chunkId = this.getChunkId(chunkX, chunkY);
    
    try {
      const chunk = await this.loadChunk(chunkId);
      return chunk.tiles.get(`${x},${y}`) || null;
    } catch (error) {
      console.error(`Erreur lors du chargement de la tuile (${x},${y}):`, error);
      return null;
    }
  }

  // Obtenir les tuiles dans une région
  async getTilesInRegion(minX: number, minY: number, maxX: number, maxY: number): Promise<HexTile[]> {
    const tiles: HexTile[] = [];
    const requiredChunks = new Set<string>();
    
    // Déterminer tous les chunks nécessaires
    for (let y = minY; y <= maxY; y += LargeMapOptimizer.CHUNK_SIZE) {
      for (let x = minX; x <= maxX; x += LargeMapOptimizer.CHUNK_SIZE) {
        const { chunkX, chunkY } = this.getChunkCoordinates(x, y);
        requiredChunks.add(this.getChunkId(chunkX, chunkY));
      }
    }
    
    // Charger tous les chunks nécessaires
    const chunkPromises = Array.from(requiredChunks).map(chunkId => this.loadChunk(chunkId));
    const loadedChunks = await Promise.all(chunkPromises);
    
    // Collecter les tuiles dans la région
    for (const chunk of loadedChunks) {
      for (const [tileKey, tile] of chunk.tiles) {
        if (tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY) {
          tiles.push(tile);
        }
      }
    }
    
    return tiles;
  }

  // Précharger les chunks autour d'une position
  async preloadAroundPosition(centerX: number, centerY: number, radius: number = 3): Promise<void> {
    const { chunkX: centerChunkX, chunkY: centerChunkY } = this.getChunkCoordinates(centerX, centerY);
    const preloadPromises: Promise<MapChunk>[] = [];
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const chunkId = this.getChunkId(centerChunkX + dx, centerChunkY + dy);
        preloadPromises.push(this.loadChunk(chunkId));
      }
    }
    
    await Promise.all(preloadPromises);
  }

  // Statistiques pour le debug
  getStats(): { loadedChunks: number; totalTiles: number; memoryUsage: string } {
    let totalTiles = 0;
    for (const chunk of this.chunks.values()) {
      totalTiles += chunk.tiles.size;
    }
    
    const memoryUsage = `${Math.round(totalTiles * 0.5 / 1024)} KB`; // Estimation
    
    return {
      loadedChunks: this.loadedChunks.size,
      totalTiles,
      memoryUsage
    };
  }
}