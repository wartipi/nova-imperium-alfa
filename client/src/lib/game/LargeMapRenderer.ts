/**
 * Moteur de Rendu Optimisé pour Cartes Massives - Nova Imperium
 * Système de rendu par niveau de détail (LOD) pour cartes 10000x3000
 */

import type { HexTile } from "./types";

export interface RenderChunk {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tiles: HexTile[];
  canvas?: HTMLCanvasElement;
  lastRendered: number;
  lodLevel: number; // 0 = haute qualité, 1 = moyenne, 2 = faible
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  zoom: number;
}

export class LargeMapRenderer {
  private static readonly CHUNK_SIZE = 100;
  private static readonly MAX_RENDER_DISTANCE = 1000;
  private static readonly LOD_DISTANCES = [200, 500, 1000]; // Distances pour LOD 0, 1, 2
  
  private renderChunks: Map<string, RenderChunk> = new Map();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Canvas hors écran pour le pré-rendu
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  // Rendu principal avec optimisations LOD
  render(mapData: HexTile[][], viewport: ViewportBounds): void {
    const startTime = performance.now();
    
    // Effacer le canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Déterminer les chunks visibles
    const visibleChunks = this.getVisibleChunks(viewport);
    
    // Rendu par niveau de détail
    for (const chunkId of visibleChunks) {
      this.renderChunk(chunkId, mapData, viewport);
    }
    
    // Statistiques de performance
    const renderTime = performance.now() - startTime;
    if (renderTime > 16) { // Plus de 16ms (60 FPS)
      console.log(`⚠️ Rendu lent: ${Math.round(renderTime)}ms pour ${visibleChunks.length} chunks`);
    }
  }

  // Déterminer les chunks visibles selon le viewport
  private getVisibleChunks(viewport: ViewportBounds): string[] {
    const visibleChunks: string[] = [];
    const chunkSize = LargeMapRenderer.CHUNK_SIZE;
    
    const minChunkX = Math.floor(viewport.minX / chunkSize);
    const maxChunkX = Math.ceil(viewport.maxX / chunkSize);
    const minChunkY = Math.floor(viewport.minY / chunkSize);
    const maxChunkY = Math.ceil(viewport.maxY / chunkSize);
    
    for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
      for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
        const chunkId = `${chunkX},${chunkY}`;
        visibleChunks.push(chunkId);
      }
    }
    
    return visibleChunks;
  }

  // Rendu d'un chunk avec LOD adaptatif
  private renderChunk(chunkId: string, mapData: HexTile[][], viewport: ViewportBounds): void {
    const [chunkXStr, chunkYStr] = chunkId.split(',');
    const chunkX = parseInt(chunkXStr);
    const chunkY = parseInt(chunkYStr);
    
    const chunkCenterX = (chunkX + 0.5) * LargeMapRenderer.CHUNK_SIZE;
    const chunkCenterY = (chunkY + 0.5) * LargeMapRenderer.CHUNK_SIZE;
    
    // Calculer la distance au centre du viewport
    const distance = Math.sqrt(
      Math.pow(chunkCenterX - viewport.centerX, 2) + 
      Math.pow(chunkCenterY - viewport.centerY, 2)
    );
    
    // Déterminer le niveau de détail
    let lodLevel = 2; // Par défaut: faible qualité
    if (distance < LargeMapRenderer.LOD_DISTANCES[0]) {
      lodLevel = 0; // Haute qualité
    } else if (distance < LargeMapRenderer.LOD_DISTANCES[1]) {
      lodLevel = 1; // Qualité moyenne
    }
    
    // Optimisation: ne pas rendre les chunks trop éloignés
    if (distance > LargeMapRenderer.MAX_RENDER_DISTANCE) {
      return;
    }
    
    // Rendu selon le niveau de détail
    switch (lodLevel) {
      case 0:
        this.renderHighDetailChunk(chunkX, chunkY, mapData, viewport);
        break;
      case 1:
        this.renderMediumDetailChunk(chunkX, chunkY, mapData, viewport);
        break;
      case 2:
        this.renderLowDetailChunk(chunkX, chunkY, mapData, viewport);
        break;
    }
  }

  // Rendu haute qualité (hexagones détaillés)
  private renderHighDetailChunk(chunkX: number, chunkY: number, mapData: HexTile[][], viewport: ViewportBounds): void {
    const chunkSize = LargeMapRenderer.CHUNK_SIZE;
    const startX = chunkX * chunkSize;
    const startY = chunkY * chunkSize;
    const endX = Math.min(startX + chunkSize, mapData[0]?.length || 0);
    const endY = Math.min(startY + chunkSize, mapData.length);
    
    const hexSize = this.getHexSizeForZoom(viewport.zoom);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (mapData[y] && mapData[y][x]) {
          this.renderDetailedHex(mapData[y][x], viewport, hexSize);
        }
      }
    }
  }

  // Rendu qualité moyenne (hexagones simplifiés)
  private renderMediumDetailChunk(chunkX: number, chunkY: number, mapData: HexTile[][], viewport: ViewportBounds): void {
    const chunkSize = LargeMapRenderer.CHUNK_SIZE;
    const startX = chunkX * chunkSize;
    const startY = chunkY * chunkSize;
    const endX = Math.min(startX + chunkSize, mapData[0]?.length || 0);
    const endY = Math.min(startY + chunkSize, mapData.length);
    
    const hexSize = this.getHexSizeForZoom(viewport.zoom) * 0.8;
    const step = 2; // Rendre un hexagone sur deux
    
    for (let y = startY; y < endY; y += step) {
      for (let x = startX; x < endX; x += step) {
        if (mapData[y] && mapData[y][x]) {
          this.renderSimpleHex(mapData[y][x], viewport, hexSize);
        }
      }
    }
  }

  // Rendu faible qualité (rectangles de couleur)
  private renderLowDetailChunk(chunkX: number, chunkY: number, mapData: HexTile[][], viewport: ViewportBounds): void {
    const chunkSize = LargeMapRenderer.CHUNK_SIZE;
    const startX = chunkX * chunkSize;
    const startY = chunkY * chunkSize;
    const endX = Math.min(startX + chunkSize, mapData[0]?.length || 0);
    const endY = Math.min(startY + chunkSize, mapData.length);
    
    // Échantillonner le terrain dominant du chunk
    const terrainCount: Record<string, number> = {};
    let sampleCount = 0;
    
    for (let y = startY; y < endY; y += 10) { // Échantillonner tous les 10 hexagones
      for (let x = startX; x < endX; x += 10) {
        if (mapData[y] && mapData[y][x]) {
          const terrain = mapData[y][x].terrain;
          terrainCount[terrain] = (terrainCount[terrain] || 0) + 1;
          sampleCount++;
        }
      }
    }
    
    // Trouver le terrain dominant
    let dominantTerrain = 'deep_water';
    let maxCount = 0;
    for (const [terrain, count] of Object.entries(terrainCount)) {
      if (count > maxCount) {
        maxCount = count;
        dominantTerrain = terrain;
      }
    }
    
    // Rendre un rectangle de couleur pour tout le chunk
    const color = this.getTerrainColor(dominantTerrain);
    const screenStartX = this.worldToScreenX(startX, viewport);
    const screenStartY = this.worldToScreenY(startY, viewport);
    const screenEndX = this.worldToScreenX(endX, viewport);
    const screenEndY = this.worldToScreenY(endY, viewport);
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      screenStartX, 
      screenStartY, 
      screenEndX - screenStartX, 
      screenEndY - screenStartY
    );
  }

  // Rendu détaillé d'un hexagone
  private renderDetailedHex(tile: HexTile, viewport: ViewportBounds, hexSize: number): void {
    const screenX = this.worldToScreenX(tile.x, viewport);
    const screenY = this.worldToScreenY(tile.y, viewport);
    
    // Vérifier si l'hexagone est visible à l'écran
    if (screenX < -hexSize || screenX > this.canvas.width + hexSize ||
        screenY < -hexSize || screenY > this.canvas.height + hexSize) {
      return;
    }
    
    // Dessiner l'hexagone avec tous les détails
    this.drawHexagon(screenX, screenY, hexSize, this.getTerrainColor(tile.terrain));
    
    // Ajouter les détails (ressources, améliorations, etc.)
    if (tile.resource) {
      this.drawResource(screenX, screenY, tile.resource, hexSize * 0.3);
    }
    
    if (tile.improvement) {
      this.drawImprovement(screenX, screenY, tile.improvement, hexSize * 0.4);
    }
  }

  // Rendu simplifié d'un hexagone
  private renderSimpleHex(tile: HexTile, viewport: ViewportBounds, hexSize: number): void {
    const screenX = this.worldToScreenX(tile.x, viewport);
    const screenY = this.worldToScreenY(tile.y, viewport);
    
    // Dessiner seulement la couleur de base
    this.drawHexagon(screenX, screenY, hexSize, this.getTerrainColor(tile.terrain));
  }

  // Utilitaires de rendu
  private drawHexagon(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hexX = x + size * Math.cos(angle);
      const hexY = y + size * Math.sin(angle);
      
      if (i === 0) {
        this.ctx.moveTo(hexX, hexY);
      } else {
        this.ctx.lineTo(hexX, hexY);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawResource(x: number, y: number, resource: string, size: number): void {
    const resourceColors: Record<string, string> = {
      'gold': '#FFD700',
      'iron': '#B87333',
      'wood': '#8B4513',
      'stone': '#708090',
      'fish': '#4169E1',
      'wheat': '#DAA520'
    };
    
    this.ctx.fillStyle = resourceColors[resource] || '#666';
    this.ctx.fillRect(x - size/2, y - size/2, size, size);
  }

  private drawImprovement(x: number, y: number, improvement: string, size: number): void {
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(x - size/2, y - size/2, size, size);
  }

  // Conversions de coordonnées
  private worldToScreenX(worldX: number, viewport: ViewportBounds): number {
    return (worldX - viewport.minX) * viewport.zoom;
  }

  private worldToScreenY(worldY: number, viewport: ViewportBounds): number {
    return (worldY - viewport.minY) * viewport.zoom;
  }

  private getHexSizeForZoom(zoom: number): number {
    return Math.max(2, 10 * zoom); // Taille minimale de 2 pixels
  }

  private getTerrainColor(terrain: string): string {
    const colors: Record<string, string> = {
      'deep_water': '#191970',
      'shallow_water': '#87CEEB',
      'fertile_land': '#90EE90',
      'forest': '#228B22',
      'mountains': '#708090',
      'hills': '#D2B48C',
      'desert': '#FFD700',
      'swamp': '#556B2F',
      'wasteland': '#F5F5DC',
      'volcano': '#B22222',
      'ancient_ruins': '#8B7355',
      'sacred_plains': '#F0E68C',
      'enchanted_meadow': '#50C878'
    };
    
    return colors[terrain] || '#333333';
  }

  // Gestion de la mémoire
  clearCache(): void {
    this.renderChunks.clear();
  }

  // Statistiques
  getStats(): { chunksInMemory: number; totalMemoryMB: number } {
    const chunksInMemory = this.renderChunks.size;
    const totalMemoryMB = chunksInMemory * 0.1; // Estimation
    
    return { chunksInMemory, totalMemoryMB };
  }
}