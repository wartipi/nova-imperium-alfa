/**
 * Gestionnaire Principal pour Cartes Massives - Nova Imperium
 * Coordonne la génération, l'optimisation et le rendu des cartes 10000x3000
 */

import { LargeMapOptimizer, ViewportInfo } from './LargeMapOptimizer';
import { LargeMapRenderer, ViewportBounds } from './LargeMapRenderer';
import type { HexTile } from './types';

export interface LargeMapConfig {
  width: number;
  height: number;
  enableChunkLoading: boolean;
  enableLODRendering: boolean;
  preloadRadius: number;
  maxCachedChunks: number;
}

export class LargeMapManager {
  private optimizer: LargeMapOptimizer;
  private renderer: LargeMapRenderer;
  private config: LargeMapConfig;
  private currentViewport: ViewportBounds;
  private lastUpdateTime: number = 0;
  
  constructor(
    canvas: HTMLCanvasElement,
    config: LargeMapConfig
  ) {
    this.config = config;
    this.optimizer = new LargeMapOptimizer(config.width, config.height);
    this.renderer = new LargeMapRenderer(canvas);
    
    this.currentViewport = {
      minX: 0,
      maxX: 1000,
      minY: 0,
      maxY: 1000,
      centerX: 5000, // Centre de la carte massive
      centerY: 1500,
      zoom: 1
    };
    
    console.log(`🎮 LargeMapManager initialisé pour carte ${config.width}x${config.height}`);
  }

  // Initialisation avec préchargement autour de la position de départ
  async initialize(startX: number = 5000, startY: number = 1500): Promise<void> {
    console.log(`🚀 Initialisation carte massive, position de départ: (${startX}, ${startY})`);
    
    // Centrer le viewport sur la position de départ
    this.updateViewport(startX, startY, 1);
    
    // Précharger les chunks autour de la position de départ
    await this.optimizer.preloadAroundPosition(startX, startY, this.config.preloadRadius);
    
    console.log(`✅ Initialisation terminée, ${this.optimizer.getStats().loadedChunks} chunks chargés`);
  }

  // Mise à jour du viewport (appelé quand la caméra bouge)
  updateViewport(centerX: number, centerY: number, zoom: number): void {
    const viewWidth = 1000 / zoom; // Largeur visible dépend du zoom
    const viewHeight = 600 / zoom;  // Hauteur visible dépend du zoom
    
    this.currentViewport = {
      minX: Math.max(0, centerX - viewWidth / 2),
      maxX: Math.min(this.config.width, centerX + viewWidth / 2),
      minY: Math.max(0, centerY - viewHeight / 2),
      maxY: Math.min(this.config.height, centerY + viewHeight / 2),
      centerX,
      centerY,
      zoom
    };
  }

  // Rendu principal avec optimisations
  async render(): Promise<void> {
    const now = performance.now();
    
    // Limiter les FPS pour économiser les ressources
    if (now - this.lastUpdateTime < 16) { // 60 FPS max
      return;
    }
    
    try {
      // Obtenir les données visibles via l'optimiseur
      const visibleTiles = await this.getVisibleTiles();
      
      // Rendre avec le système LOD
      this.renderer.render(this.createMapDataFromTiles(visibleTiles), this.currentViewport);
      
      this.lastUpdateTime = now;
      
    } catch (error) {
      console.error('❌ Erreur lors du rendu:', error);
    }
  }

  // Obtenir les tuiles visibles dans le viewport actuel
  private async getVisibleTiles(): Promise<HexTile[]> {
    return await this.optimizer.getTilesInRegion(
      Math.floor(this.currentViewport.minX),
      Math.floor(this.currentViewport.minY),
      Math.ceil(this.currentViewport.maxX),
      Math.ceil(this.currentViewport.maxY)
    );
  }

  // Convertir les tuiles en format compatible avec le renderer
  private createMapDataFromTiles(tiles: HexTile[]): HexTile[][] {
    if (tiles.length === 0) return [];
    
    // Trouver les dimensions de la grille
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const tile of tiles) {
      minX = Math.min(minX, tile.x);
      maxX = Math.max(maxX, tile.x);
      minY = Math.min(minY, tile.y);
      maxY = Math.max(maxY, tile.y);
    }
    
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    
    // Créer une grille 2D
    const grid: HexTile[][] = Array(height).fill(null).map(() => Array(width).fill(null));
    
    for (const tile of tiles) {
      const gridX = tile.x - minX;
      const gridY = tile.y - minY;
      if (gridY >= 0 && gridY < height && gridX >= 0 && gridX < width) {
        grid[gridY][gridX] = tile;
      }
    }
    
    return grid;
  }

  // Obtenir une tuile spécifique (avec chargement à la demande)
  async getTile(x: number, y: number): Promise<HexTile | null> {
    // Vérifier les limites
    if (x < 0 || x >= this.config.width || y < 0 || y >= this.config.height) {
      return null;
    }
    
    return await this.optimizer.getTile(x, y);
  }

  // Déplacer la vue vers une position
  async moveTo(x: number, y: number, zoom: number = this.currentViewport.zoom): Promise<void> {
    console.log(`🎯 Déplacement vers (${x}, ${y}) avec zoom ${zoom}`);
    
    // Mettre à jour le viewport
    this.updateViewport(x, y, zoom);
    
    // Précharger les chunks autour de la nouvelle position
    if (this.config.enableChunkLoading) {
      await this.optimizer.preloadAroundPosition(x, y, this.config.preloadRadius);
    }
    
    // Rendre immédiatement
    await this.render();
  }

  // Rechercher des ressources dans une région
  async findResourcesInRegion(centerX: number, centerY: number, radius: number, resourceType?: string): Promise<HexTile[]> {
    const tiles = await this.optimizer.getTilesInRegion(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius
    );
    
    return tiles.filter(tile => {
      if (!tile.resource) return false;
      if (resourceType && tile.resource !== resourceType) return false;
      
      const distance = Math.sqrt(Math.pow(tile.x - centerX, 2) + Math.pow(tile.y - centerY, 2));
      return distance <= radius;
    });
  }

  // Rechercher des terrains spécifiques
  async findTerrainInRegion(centerX: number, centerY: number, radius: number, terrainType: string): Promise<HexTile[]> {
    const tiles = await this.optimizer.getTilesInRegion(
      centerX - radius,
      centerY - radius,
      centerX + radius,
      centerY + radius
    );
    
    return tiles.filter(tile => {
      if (tile.terrain !== terrainType) return false;
      
      const distance = Math.sqrt(Math.pow(tile.x - centerX, 2) + Math.pow(tile.y - centerY, 2));
      return distance <= radius;
    });
  }

  // Optimisation: nettoyer la mémoire
  clearCache(): void {
    this.renderer.clearCache();
    console.log('🧹 Cache nettoyé');
  }

  // Statistiques et debug
  getStats(): {
    mapSize: string;
    loadedChunks: number;
    totalTiles: number;
    memoryUsage: string;
    currentPosition: { x: number; y: number };
    viewportSize: { width: number; height: number };
  } {
    const optimizerStats = this.optimizer.getStats();
    const rendererStats = this.renderer.getStats();
    
    return {
      mapSize: `${this.config.width}x${this.config.height}`,
      loadedChunks: optimizerStats.loadedChunks,
      totalTiles: optimizerStats.totalTiles,
      memoryUsage: optimizerStats.memoryUsage,
      currentPosition: {
        x: this.currentViewport.centerX,
        y: this.currentViewport.centerY
      },
      viewportSize: {
        width: this.currentViewport.maxX - this.currentViewport.minX,
        height: this.currentViewport.maxY - this.currentViewport.minY
      }
    };
  }

  // Sauvegarder l'état pour la persistance
  saveState(): string {
    return JSON.stringify({
      viewport: this.currentViewport,
      config: this.config,
      timestamp: Date.now()
    });
  }

  // Charger un état sauvegardé
  loadState(stateData: string): boolean {
    try {
      const state = JSON.parse(stateData);
      
      if (state.viewport) {
        this.currentViewport = state.viewport;
      }
      
      if (state.config) {
        this.config = { ...this.config, ...state.config };
      }
      
      console.log('✅ État de la carte massive restauré');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors du chargement de l\'état:', error);
      return false;
    }
  }

  // Événements pour les interactions utilisateur
  async handleClick(screenX: number, screenY: number): Promise<HexTile | null> {
    // Convertir les coordonnées écran en coordonnées monde
    const worldX = Math.floor(this.currentViewport.minX + (screenX / this.currentViewport.zoom));
    const worldY = Math.floor(this.currentViewport.minY + (screenY / this.currentViewport.zoom));
    
    return await this.getTile(worldX, worldY);
  }

  // Zoom avec contraintes
  setZoom(newZoom: number): void {
    const clampedZoom = Math.max(0.1, Math.min(5, newZoom)); // Limiter entre 0.1x et 5x
    this.updateViewport(this.currentViewport.centerX, this.currentViewport.centerY, clampedZoom);
  }

  // Déplacement fluide
  async pan(deltaX: number, deltaY: number): Promise<void> {
    const newCenterX = Math.max(0, Math.min(this.config.width, this.currentViewport.centerX + deltaX));
    const newCenterY = Math.max(0, Math.min(this.config.height, this.currentViewport.centerY + deltaY));
    
    await this.moveTo(newCenterX, newCenterY);
  }
}