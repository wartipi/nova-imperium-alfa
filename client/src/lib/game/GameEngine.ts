import type { HexTile, Civilization, Unit, City } from "./types";
import { ResourceRevealSystem } from "../systems/ResourceRevealSystem";
import { usePlayer } from "../stores/usePlayer";
import { useGameState } from "../stores/useGameState";
import { useNovaImperium } from "../stores/useNovaImperium";
import { UnifiedTerritorySystem } from "../systems/UnifiedTerritorySystem";

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapData: HexTile[][];
  private civilizations: Civilization[] = [];
  private selectedHex: HexTile | null = null;
  private cameraX = 0;
  private cameraY = 0;
  private hexSize = 20;
  private zoom = 1;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private isHexVisible: ((x: number, y: number) => boolean) | null = null;
  private isHexInCurrentVision: ((x: number, y: number) => boolean) | null = null;
  private avatarPosition: { x: number; y: number; z: number } = { x: 5, y: 0, z: 5 };
  private avatarRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private isAvatarMoving = false;
  private selectedCharacter: any = null;
  private pendingMovement: { x: number; y: number } | null = null;
  public hasInitialCentered: boolean = false;
  setVisionCallbacks(isHexVisible: (x: number, y: number) => boolean, isHexInCurrentVision: (x: number, y: number) => boolean) {
    this.isHexVisible = isHexVisible;
    this.isHexInCurrentVision = isHexInCurrentVision;
  }

  setPendingMovement(destination: { x: number; y: number } | null) {
    this.pendingMovement = destination;
    this.render();
  }

  constructor(canvas: HTMLCanvasElement, mapData: HexTile[][]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mapData = mapData;
    
    this.cameraX = (mapData[0].length * this.hexSize * 1.5) / 2;
    this.cameraY = (mapData.length * this.hexSize * Math.sqrt(3)) / 2;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(3, this.zoom * zoomFactor));
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        this.cameraX -= deltaX / this.zoom;
        this.cameraY -= deltaY / this.zoom;
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        
        this.render();
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
    });

    // Add keyboard controls for camera movement
    this.setupKeyboardControls();
  }

  private setupKeyboardControls() {
    let keysPressed = new Set<string>();
    
    window.addEventListener('keydown', (e) => {
      keysPressed.add(e.key.toLowerCase());
      this.updateCameraFromKeys(keysPressed);
    });

    window.addEventListener('keyup', (e) => {
      keysPressed.delete(e.key.toLowerCase());
    });
  }

  private updateCameraFromKeys(keysPressed: Set<string>) {
    const moveSpeed = 10 / this.zoom;
    
    if (keysPressed.has('w') || keysPressed.has('arrowup')) {
      this.cameraY -= moveSpeed;
    }
    if (keysPressed.has('s') || keysPressed.has('arrowdown')) {
      this.cameraY += moveSpeed;
    }
    if (keysPressed.has('a') || keysPressed.has('arrowleft')) {
      this.cameraX -= moveSpeed;
    }
    if (keysPressed.has('d') || keysPressed.has('arrowright')) {
      this.cameraX += moveSpeed;
    }
    
    // Barre d'espace supprimée - plus de centrage automatique sur avatar
    
    this.render();
  }

  private resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  updateCivilizations(civilizations: Civilization[]) {
    this.civilizations = civilizations;
  }

  setSelectedHex(hex: HexTile | null) {
    this.selectedHex = hex;
  }

  // Public methods to access game data for cartography
  getMapData() {
    return this.mapData;
  }

  getTileAt(x: number, y: number): HexTile | null {
    if (y >= 0 && y < this.mapData.length && x >= 0 && x < this.mapData[y].length) {
      return this.mapData[y][x];
    }
    return null;
  }

  getVisibleHexes(): string[] {
    const visibleHexes: string[] = [];
    if (this.isHexInCurrentVision) {
      const centerX = Math.floor(this.avatarPosition.x / 1.5);
      const centerY = Math.floor(this.avatarPosition.z / (Math.sqrt(3) * 0.5));
      
      // Get all hexes within vision range
      for (let y = Math.max(0, centerY - 1); y <= Math.min(this.mapData.length - 1, centerY + 1); y++) {
        for (let x = Math.max(0, centerX - 1); x <= Math.min(this.mapData[0].length - 1, centerX + 1); x++) {
          if (this.isHexInCurrentVision(x, y)) {
            visibleHexes.push(`${x},${y}`);
          }
        }
      }
    }
    return visibleHexes;
  }

  getAvatarPosition(): { x: number; y: number } {
    return {
      x: Math.floor(this.avatarPosition.x / 1.5),
      y: Math.floor(this.avatarPosition.z / (Math.sqrt(3) * 0.5))
    };
  }

  centerCameraOnPosition(x: number, y: number) {
    const hexHeight = this.hexSize * Math.sqrt(3);
    // Calculer la position monde de l'hexagone
    const worldX = x * (this.hexSize * 1.5);
    const worldY = y * hexHeight + (x % 2) * (hexHeight / 2);
    
    // Centrer la caméra pour que cette position soit au centre de l'écran
    this.cameraX = worldX - (this.canvas.width / 2) / this.zoom;
    this.cameraY = worldY - (this.canvas.height / 2) / this.zoom;
    
    console.log('Camera centrée sur:', { 
      hexPos: { x, y }, 
      worldPos: { worldX, worldY },
      cameraPos: { cameraX: this.cameraX, cameraY: this.cameraY },
      screenCenter: { x: this.canvas.width / 2, y: this.canvas.height / 2 }
    });
    this.render();
  }



  centerCameraOnPlayerStart() {
    // Pas de centrage automatique - laisser la caméra à sa position initiale
    console.log('Démarrage du jeu - caméra libre');
  }

  // Fonction utilitaire pour tester si un point est dans un hexagone (géométrie précise)
  private isPointInHexagon(pointX: number, pointY: number, hexCenterX: number, hexCenterY: number, hexRadius: number): boolean {
    // Utiliser la méthode de test par rayon étendu pour une détection plus fiable
    const distance = Math.sqrt((pointX - hexCenterX) ** 2 + (pointY - hexCenterY) ** 2);
    
    // Test simple par distance - plus permissif que la géométrie exacte
    // Utilise un rayon légèrement élargi pour couvrir toute la zone hexagonale
    const effectiveRadius = hexRadius * 1.1; // 10% de marge
    
    return distance <= effectiveRadius;
  }

  getHexAtPosition(screenX: number, screenY: number): HexTile | null {
    const worldX = (screenX - this.canvas.width / 2) / this.zoom + this.cameraX;
    const worldY = (screenY - this.canvas.height / 2) / this.zoom + this.cameraY;
    
    const hexHeight = this.hexSize * Math.sqrt(3);
    const hexWidth = this.hexSize * 1.5;
    
    // Facteur d'ajustement basé sur le niveau de zoom et la densité de la carte
    let toleranceFactor = 1.15; // Base
    
    if (this.zoom < 0.5) {
      // Vue dézoomée - tolérance plus large
      toleranceFactor = 1.4;
    } else if (this.zoom > 1.5) {
      // Vue zoomée - tolérance plus précise
      toleranceFactor = 1.1;
    } else {
      // Vue normale - ajuster selon la taille des hexagones
      if (this.hexSize < 20) {
        toleranceFactor = 1.3; // Petits hexagones
      } else if (this.hexSize > 40) {
        toleranceFactor = 1.1; // Grands hexagones
      }
    }
    
    // Méthode de conversion coordonnées monde vers hexagones améliorée
    // Utilise la géométrie hexagonale exacte pour une conversion précise
    const q = (Math.sqrt(3)/3 * worldX - 1/3 * worldY) / this.hexSize;
    const r = (2/3 * worldY) / this.hexSize;
    
    // Conversion en coordonnées axiales puis vers offset
    let hexX = Math.round(q + (r - (Math.round(r) & 1)) / 2);
    let hexY = Math.round(r);
    
    // Vérifier que les coordonnées calculées sont dans les limites
    if (hexY >= 0 && hexY < this.mapData.length && 
        hexX >= 0 && hexX < this.mapData[hexY].length) {
      
      // Calculer la position précise de ce hex pour vérification
      const hexCenterX = hexX * hexWidth;
      const hexCenterY = hexY * hexHeight + (hexX % 2) * (hexHeight / 2);
      
      // Vérifier si le point cliqué est dans la zone acceptable de l'hexagone
      const distance = Math.sqrt((worldX - hexCenterX) ** 2 + (worldY - hexCenterY) ** 2);
      
      if (distance <= this.hexSize * toleranceFactor) {
        console.log(`✅ Détection directe réussie: hex(${hexX},${hexY}), distance: ${distance.toFixed(2)}, tolérance: ${toleranceFactor}`);
        return this.mapData[hexY][hexX];
      }
    }
    
    // Méthode de fallback : recherche par distance minimale dans un voisinage restreint
    let bestHex: HexTile | null = null;
    let bestDistance = Infinity;
    
    // Estimation de base pour le fallback
    const estimatedHexX = Math.round(worldX / hexWidth);
    const estimatedHexY = Math.round((worldY - (estimatedHexX % 2) * (hexHeight / 2)) / hexHeight);
    
    // Recherche dans un voisinage plus petit et plus ciblé
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const testHexX = estimatedHexX + dx;
        const testHexY = estimatedHexY + dy;
        
        if (testHexY >= 0 && testHexY < this.mapData.length && 
            testHexX >= 0 && testHexX < this.mapData[testHexY].length) {
          
          const hexCenterX = testHexX * hexWidth;
          const hexCenterY = testHexY * hexHeight + (testHexX % 2) * (hexHeight / 2);
          
          const distance = Math.sqrt((worldX - hexCenterX) ** 2 + (worldY - hexCenterY) ** 2);
          
          if (distance <= this.hexSize * (toleranceFactor + 0.05) && distance < bestDistance) {
            bestDistance = distance;
            bestHex = this.mapData[testHexY][testHexX];
          }
        }
      }
    }
    
    if (bestHex) {
      console.log(`🔄 Détection fallback réussie: hex(${bestHex.x},${bestHex.y}), distance: ${bestDistance.toFixed(2)}`);
    } else {
      console.log(`❌ Aucune tuile détectée au point (${screenX}, ${screenY})`);
    }
    
    return bestHex;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set up camera transform
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(-this.cameraX, -this.cameraY);
    
    // Render map
    this.renderMap();
    
    // Render civilizations
    this.renderCivilizations();
    
    // Render avatar
    this.renderAvatar();
    
    // Render UI elements
    this.renderUIElements();
    
    this.ctx.restore();
  }

  private renderMap() {
    const hexHeight = this.hexSize * Math.sqrt(3);
    const hexWidth = this.hexSize * 2;
    
    for (let y = 0; y < this.mapData.length; y++) {
      for (let x = 0; x < this.mapData[y].length; x++) {
        const hex = this.mapData[y][x];
        const screenX = x * (this.hexSize * 1.5);
        const screenY = y * hexHeight + (x % 2) * (hexHeight / 2);
        
        // Check if hex is visible (use vision system, but ignore if Game Master mode)
        const { isGameMaster } = useGameState.getState();
        const isVisible = isGameMaster || (this.isHexVisible ? this.isHexVisible(x, y) : true);
        const isInCurrentVision = isGameMaster || (this.isHexInCurrentVision ? this.isHexInCurrentVision(x, y) : true);
        
        // Check if this hex is the pending movement destination
        const isPendingDestination = this.pendingMovement && this.pendingMovement.x === x && this.pendingMovement.y === y;
        
        // Draw hex with vision state
        this.drawHex(screenX, screenY, hex, isVisible, isInCurrentVision, isPendingDestination);
        
        // Draw hex outline - different style for visible vs invisible
        if (isVisible) {
          this.ctx.strokeStyle = '#333';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        } else {
          this.ctx.strokeStyle = '#111';
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }
  }

  private drawHex(x: number, y: number, hex: HexTile, isVisible: boolean = true, isInCurrentVision: boolean = true, isPendingDestination: boolean = false) {
    const hexHeight = this.hexSize * Math.sqrt(3);
    
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const hexX = x + this.hexSize * Math.cos(angle);
      const hexY = y + this.hexSize * Math.sin(angle);
      
      if (i === 0) {
        this.ctx.moveTo(hexX, hexY);
      } else {
        this.ctx.lineTo(hexX, hexY);
      }
    }
    this.ctx.closePath();
    
    if (!isVisible) {
      // Not explored - completely dark fog of war
      this.ctx.fillStyle = '#1a1a1a';
      this.ctx.fill();
    } else if (isInCurrentVision) {
      // In current vision - normal colors
      this.ctx.fillStyle = this.getTerrainColor(hex.terrain);
      this.ctx.fill();
      
      // Check and render territory claims using UnifiedTerritorySystem
      const territoryInfo = UnifiedTerritorySystem.getTerritory(hex.x, hex.y);
      if (territoryInfo) {
        // Couleurs par joueur/faction
        const playerColors: { [key: string]: { border: string } } = {
          'gm_faction': { border: '#9932CC' }, // Violet pour MJ
          'player_faction': { border: '#228B22' }, // Vert pour joueur
          'player': { border: '#1E90FF' }, // Bleu pour joueur par défaut
        };
        
        const colors = playerColors[territoryInfo.factionId] || playerColors['player'];
        
        // Dessiner seulement les contours externes des territoires
        this.drawTerritoryBorders(hex.x, hex.y, territoryInfo, colors.border, x, y);
        
        // Marquer les colonies avec un symbole spécial
        if (territoryInfo.colonyId) {
          this.ctx.fillStyle = colors.border;
          this.ctx.font = 'bold 20px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('🏘️', x, y + 5);
          
          // Ajouter un contour pour la visibilité
          this.ctx.strokeStyle = '#FFFFFF';
          this.ctx.lineWidth = 2;
          this.ctx.strokeText('🏘️', x, y + 5);
        }
      }

      // Highlight selected hex
      if (this.selectedHex && this.selectedHex.x === hex.x && this.selectedHex.y === hex.y) {
        this.ctx.strokeStyle = '#FFFF00';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }
      
      // Highlight pending movement destination
      if (isPendingDestination) {
        this.ctx.strokeStyle = '#00FF00';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        
        // Add a moving indicator
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        this.ctx.fill();
        
        // Add arrow pointing to destination
        this.ctx.fillStyle = '#00FF00';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('➤', x, y + 7);
      }
      
      // Système unifié de rendu des ressources avec accès direct au store
      if (hex.resource) {
        // Accès direct au store depuis window
        const gameState = (window as any).gameState || {};
        const playerState = (window as any).playerState || {};
        
        const isGameMaster = gameState.isGameMaster || false;
        const explorationLevel = playerState.getCompetenceLevel?.('exploration') || 0;
        const hexExplored = playerState.isHexExplored?.(hex.x, hex.y) || false;
        
        if (Math.random() < 0.001) {
          console.log(`🔍 Tentative rendu ressource: ${hex.resource} sur (${hex.x},${hex.y}), MJ:${isGameMaster}, exploration:${explorationLevel}, exploré:${hexExplored}`);
        }
        
        // Accès à la nouvelle méthode isResourceDiscovered
        const hexResourceDiscovered = playerState.isResourceDiscovered?.(hex.x, hex.y) || false;
        
        // Ressources visibles si : mode MJ OU (exploration niveau 1+ ET ressources découvertes)
        const isVisible = isGameMaster || (explorationLevel >= 1 && hexResourceDiscovered);
        
        if (isVisible || isGameMaster) {
          // Rendu simple et efficace des ressources
          const resourceMap = {
            wheat: { symbol: '🌾', color: '#FFD700' },
            cattle: { symbol: '🐄', color: '#8B4513' },
            fish: { symbol: '🐟', color: '#4682B4' },
            deer: { symbol: '🦌', color: '#8B4513' },
            fur: { symbol: '🧥', color: '#654321' },
            herbs: { symbol: '🌿', color: '#32CD32' },
            crabs: { symbol: '🦀', color: '#FF6347' },
            whales: { symbol: '🐋', color: '#4169E1' },
            stone: { symbol: '🪨', color: '#708090' },
            copper: { symbol: '🔶', color: '#B87333' },
            iron: { symbol: '⚒️', color: '#C0C0C0' },
            gold: { symbol: '🥇', color: '#FFD700' },
            coal: { symbol: '⚫', color: '#2F2F2F' },
            oil: { symbol: '🛢️', color: '#8B4513' },
            sacred_stones: { symbol: '🔮', color: '#8A2BE2' },
            crystals: { symbol: '💠', color: '#9370DB' },
            ancient_artifacts: { symbol: '📿', color: '#DAA520' },
            sulfur: { symbol: '🟡', color: '#FFFF00' },
            obsidian: { symbol: '⚫', color: '#1C1C1C' }
          };
          
          const resourceInfo = resourceMap[hex.resource as keyof typeof resourceMap];
          if (resourceInfo) {
            this.ctx.fillStyle = resourceInfo.color;
            this.ctx.globalAlpha = isGameMaster ? 0.8 : 0.6;
            this.ctx.fillRect(x - 8, y - 8, 16, 16);
            this.ctx.globalAlpha = 1.0;
            
            this.ctx.font = isGameMaster ? 'bold 14px Arial' : '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(resourceInfo.symbol, x, y + 4);
            
            if (Math.random() < 0.001) {
              console.log(`✅ Ressource rendue: ${resourceInfo.symbol} (${hex.resource}) mode MJ: ${isGameMaster}`);
            }
          } else {

            this.ctx.fillStyle = '#FFFF00';
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillRect(x - 6, y - 6, 12, 12);
            this.ctx.globalAlpha = 1.0;
            
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#000';
            this.ctx.fillText('?', x, y + 4);
          }
        }
      }
      
      // Draw river
      if (hex.hasRiver) {
        this.ctx.strokeStyle = '#0066CC';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - this.hexSize / 2, y);
        this.ctx.lineTo(x + this.hexSize / 2, y);
        this.ctx.stroke();
      }
    } else {
      // Explored but not in current vision - fog of war with dimmed colors
      const baseColor = this.getTerrainColor(hex.terrain);
      const fogColor = this.applyFogOfWar(baseColor);
      this.ctx.fillStyle = fogColor;
      this.ctx.fill();
      
      // Add fog overlay
      this.ctx.fillStyle = 'rgba(50, 50, 50, 0.6)';
      this.ctx.fill();
      
      // Système unifié de rendu des ressources avec effet de brouillard
      if (hex.resource) {
        const { getCompetenceLevel, isHexExplored } = (window as any).usePlayer?.getState() || 
          { getCompetenceLevel: () => 0, isHexExplored: () => false };
        const { isGameMaster } = (window as any).useGameState?.getState() || { isGameMaster: false };
        
        const explorationLevel = getCompetenceLevel('exploration') || 0;
        const hexExplored = isHexExplored(hex.x, hex.y) || false;
        
        // Accès à la nouvelle méthode isResourceDiscovered pour la section fog of war
        const hexResourceDiscovered = (window as any).usePlayer?.getState()?.isResourceDiscovered?.(hex.x, hex.y) || false;
        
        // Ressources visibles si : mode MJ OU (exploration niveau 1+ ET ressources découvertes)
        const isVisible = isGameMaster || (explorationLevel >= 1 && hexResourceDiscovered);
        
        if (isVisible) {
          const effectiveLevel = Math.max(explorationLevel, isGameMaster ? 1 : 0);
          const resourceSymbol = ResourceRevealSystem.getHexResourceSymbol(hex, effectiveLevel);
          const resourceColor = ResourceRevealSystem.getHexResourceColor(hex, effectiveLevel);
          
          if (resourceSymbol && resourceColor) {
            this.ctx.fillStyle = resourceColor;
            this.ctx.globalAlpha = isGameMaster ? 0.6 : 0.3;
            this.ctx.fillRect(x - 8, y - 8, 16, 16);
            
            this.ctx.globalAlpha = isGameMaster ? 0.9 : 0.6;
            this.ctx.font = isGameMaster ? 'bold 14px Arial' : '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#000';
            this.ctx.fillText(resourceSymbol, x, y + 4);
            this.ctx.globalAlpha = 1.0;
          }
        }
      }
      
      // Draw river with fog effect
      if (hex.hasRiver) {
        this.ctx.strokeStyle = 'rgba(0, 102, 204, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - this.hexSize / 2, y);
        this.ctx.lineTo(x + this.hexSize / 2, y);
        this.ctx.stroke();
      }
    }
  }

  private applyFogOfWar(color: string): string {
    // Convert hex color to RGB and darken it
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken and desaturate the color
    const fogR = Math.floor(r * 0.4);
    const fogG = Math.floor(g * 0.4);
    const fogB = Math.floor(b * 0.4);
    
    return `rgb(${fogR}, ${fogG}, ${fogB})`;
  }

  private getTerrainColor(terrain: string): string {
    const colors = {
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
    
    return colors[terrain as keyof typeof colors] || '#808080';
  }

  private renderCivilizations() {
    // Render colonies from Nova Imperium store
    const { novaImperiums } = useNovaImperium.getState();
    
    const totalCities = novaImperiums.reduce((count, ni) => count + ni.cities.length, 0);
    if (totalCities > 0) {
      console.log(`🏰 ${totalCities} colonies:`, 
        novaImperiums.flatMap(ni => ni.cities.map(c => `${c.name} (${c.x},${c.y})`))
      );
    }
    
    novaImperiums.forEach(ni => {
      // Render cities/colonies
      ni.cities.forEach(city => {
        this.drawCity(city, ni.color);
      });
      
      // Render units
      ni.units.forEach(unit => {
        this.drawUnit(unit, ni.color);
      });
    });
    

    this.civilizations.forEach(civ => {
      // Render cities
      civ.cities.forEach(city => {
        this.drawCity(city, civ.color);
      });
      
      // Render units
      civ.units.forEach(unit => {
        this.drawUnit(unit, civ.color);
      });
    });
  }

  private drawCity(city: City, color: string) {
    const hexHeight = this.hexSize * Math.sqrt(3);
    const screenX = city.x * (this.hexSize * 1.5);
    const screenY = city.y * hexHeight + (city.x % 2) * (hexHeight / 2);
    
    // Check if city is within visible area
    const visibleX = (screenX - this.cameraX) * this.zoom + this.canvas.width / 2;
    const visibleY = (screenY - this.cameraY) * this.zoom + this.canvas.height / 2;
    const isInView = visibleX >= -50 && visibleX <= this.canvas.width + 50 && 
                     visibleY >= -50 && visibleY <= this.canvas.height + 50;
    
    // Draw colony/city circle with bright colors for visibility
    const radius = this.hexSize / 2;
    
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = '#FFD700'; // Gold color for high visibility
    this.ctx.fill();
    this.ctx.strokeStyle = '#8B0000'; // Dark red border
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Draw house icon instead of "CITY" text
    this.ctx.fillStyle = '#8B4513';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🏠', screenX, screenY + 6);
    
    // Draw city display name (preferred) or name with background
    const displayName = city.displayName || city.name;
    const nameWidth = Math.max(50, displayName.length * 6);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(screenX - nameWidth/2, screenY - this.hexSize - 5, nameWidth, 12);
    
    this.ctx.fillStyle = '#000000';
    this.ctx.font = 'bold 10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(displayName, screenX, screenY - this.hexSize + 4);
  }

  private drawUnit(unit: Unit, color: string) {
    const hexHeight = this.hexSize * Math.sqrt(3);
    const screenX = unit.x * (this.hexSize * 1.5);
    const screenY = unit.y * hexHeight + (unit.x % 2) * (hexHeight / 2);
    
    // Draw unit square
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX - 8, screenY - 8, 16, 16);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(screenX - 8, screenY - 8, 16, 16);
    
    // Draw unit type indicator
    this.ctx.fillStyle = '#FFF';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    const typeChar = unit.type.charAt(0).toUpperCase();
    this.ctx.fillText(typeChar, screenX, screenY + 3);
  }

  private renderUIElements() {
    // Render any additional UI elements that need to be drawn on the canvas
  }

  // Avatar methods
  updateAvatar(position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number }, isMoving: boolean, selectedCharacter: any, isHexVisible?: (x: number, y: number) => boolean, isHexInCurrentVision?: (x: number, y: number) => boolean, pendingMovement?: { x: number; y: number } | null) {
    this.avatarPosition = position;
    this.avatarRotation = rotation;
    this.isAvatarMoving = isMoving;
    this.selectedCharacter = selectedCharacter;
    if (isHexVisible) {
      this.isHexVisible = isHexVisible;
    }
    if (isHexInCurrentVision) {
      this.isHexInCurrentVision = isHexInCurrentVision;
    }
    this.pendingMovement = pendingMovement || null;
  }

  private renderAvatar() {
    // Always render avatar, even without character selected for debugging
    const hexHeight = this.hexSize * Math.sqrt(3);
    // Convert avatar world position to screen position using proper hex coordinates
    const avatarHexX = Math.round(this.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(this.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    // Use the same coordinate system as the map rendering
    const screenX = avatarHexX * (this.hexSize * 1.5);
    const screenY = avatarHexY * hexHeight + (avatarHexX % 2) * (hexHeight / 2);
    
    // Create 8-bit avatar sprite
    const avatarSprite = this.createAvatarSprite();
    
    // Draw avatar with proper scaling
    const spriteSize = 48; // Increased size for better visibility
    this.ctx.save();
    
    // Handle rotation
    if (this.avatarRotation.y !== 0) {
      this.ctx.translate(screenX, screenY);
      this.ctx.rotate(this.avatarRotation.y);
      this.ctx.translate(-screenX, -screenY);
    }
    
    // Draw avatar shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(screenX - spriteSize/2, screenY + spriteSize/2 - 4, spriteSize, 8);
    
    // Draw avatar sprite with pixel-perfect scaling
    this.ctx.imageSmoothingEnabled = false; // Preserve pixel art style
    this.ctx.drawImage(avatarSprite, screenX - spriteSize/2, screenY - spriteSize/2, spriteSize, spriteSize);
    
    // Draw movement indicator if moving
    if (this.isAvatarMoving) {
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, spriteSize/2 + 8, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    // Draw selection indicator (subtle glow)
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, spriteSize/2 + 4, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private createAvatarSprite(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 16;
    canvas.height = 16;
    
    // Get character colors based on selected character
    const getCharacterColors = () => {
      if (!this.selectedCharacter) return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
      
      switch (this.selectedCharacter?.id) {
        case 'knight': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#C0C0C0' };
        case 'wizard': return { skin: '#FFDBAC', hair: '#FFFFFF', clothes: '#800080' };
        case 'archer': return { skin: '#FFDBAC', hair: '#228B22', clothes: '#8B4513' };
        case 'priest': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#FFFFFF' };
        case 'rogue': return { skin: '#FFDBAC', hair: '#000000', clothes: '#2F4F4F' };
        case 'merchant': return { skin: '#FFDBAC', hair: '#DAA520', clothes: '#8B0000' };
        case 'scholar': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#000080' };
        case 'noble': return { skin: '#FFDBAC', hair: '#FFD700', clothes: '#8B008B' };
        case 'peasant': return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#654321' };
        default: return { skin: '#FFDBAC', hair: '#8B4513', clothes: '#4169E1' };
      }
    };
    
    const colors = getCharacterColors();
    
    // Draw 8-bit character sprite
    ctx.fillStyle = colors.skin;
    ctx.fillRect(6, 2, 4, 4); // Head
    
    ctx.fillStyle = colors.hair;
    ctx.fillRect(5, 1, 6, 3); // Hair
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(6, 3, 1, 1); // Left eye
    ctx.fillRect(9, 3, 1, 1); // Right eye
    
    ctx.fillStyle = colors.clothes;
    ctx.fillRect(6, 6, 4, 6); // Body
    
    ctx.fillStyle = colors.skin;
    ctx.fillRect(4, 7, 2, 4); // Left arm
    ctx.fillRect(10, 7, 2, 4); // Right arm
    
    // Animated legs if moving
    if (this.isAvatarMoving) {
      const frame = Math.floor(Date.now() / 200) % 2;
      const legOffset = frame === 0 ? 0 : 1;
      ctx.fillRect(6, 12 + legOffset, 1, 3 - legOffset);
      ctx.fillRect(9, 12 - legOffset, 1, 3 + legOffset);
    } else {
      ctx.fillRect(6, 12, 1, 3); // Left leg
      ctx.fillRect(9, 12, 1, 3); // Right leg
    }
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(5, 15, 2, 1); // Left foot
    ctx.fillRect(9, 15, 2, 1); // Right foot
    
    return canvas;
  }

  // Method to move avatar to hex position
  moveAvatarToHex(hexX: number, hexY: number) {
    const oldX = this.avatarPosition.x;
    const oldZ = this.avatarPosition.z;
    
    const worldX = hexX * 1.5;
    const worldZ = hexY * Math.sqrt(3) * 0.5;
    
    this.avatarPosition = { x: worldX, y: 0, z: worldZ };
    this.isAvatarMoving = true;
    
    // Calculate rotation to face movement direction
    const deltaX = worldX - oldX;
    const deltaZ = worldZ - oldZ;
    this.avatarRotation.y = Math.atan2(deltaX, deltaZ);
    
    console.log('Avatar moved to:', hexX, hexY, 'World pos:', worldX, worldZ);
    
    // Instant movement for testing - no animation delay
    this.isAvatarMoving = false;
    this.render(); // Re-render immediately
  }

  // Check if a click is on the avatar
  isClickOnAvatar(mouseX: number, mouseY: number): boolean {
    const hexHeight = this.hexSize * Math.sqrt(3);
    const avatarHexX = Math.round(this.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(this.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    const screenX = avatarHexX * (this.hexSize * 1.5);
    const screenY = avatarHexY * hexHeight + (avatarHexX % 2) * (hexHeight / 2);
    
    // Transform avatar world position to screen coordinates
    const avatarScreenX = (screenX - this.cameraX) * this.zoom + this.canvas.width / 2;
    const avatarScreenY = (screenY - this.cameraY) * this.zoom + this.canvas.height / 2;
    
    const spriteSize = 48;
    const distance = Math.sqrt(
      Math.pow(mouseX - avatarScreenX, 2) + 
      Math.pow(mouseY - avatarScreenY, 2)
    );
    
    return distance <= spriteSize / 2;
  }

  // Get avatar screen position for menu positioning
  getAvatarScreenPosition(): { x: number; y: number } {
    const hexHeight = this.hexSize * Math.sqrt(3);
    const avatarHexX = Math.round(this.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(this.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    const screenX = avatarHexX * (this.hexSize * 1.5);
    const screenY = avatarHexY * hexHeight + (avatarHexX % 2) * (hexHeight / 2);
    
    // Transform to screen coordinates
    const x = (screenX - this.cameraX) * this.zoom + this.canvas.width / 2;
    const y = (screenY - this.cameraY) * this.zoom + this.canvas.height / 2;
    
    return { x, y };
  }

  // Center camera on avatar
  centerCameraOnAvatar() {
    // Utiliser la position actuelle de l'avatar dans le GameEngine
    const avatarHexX = Math.round(this.avatarPosition.x / 1.5);
    const avatarHexY = Math.round(this.avatarPosition.z / (Math.sqrt(3) * 0.5));
    
    console.log('Centrage caméra sur avatar:', { avatarHexX, avatarHexY, worldPos: this.avatarPosition });
    this.centerCameraOnPosition(avatarHexX, avatarHexY);
  }

  // Move camera by offset
  moveCamera(deltaX: number, deltaY: number) {
    this.cameraX += deltaX / this.zoom;
    this.cameraY += deltaY / this.zoom;
    this.render();
  }

  // Set camera position
  setCameraPosition(x: number, y: number) {
    this.cameraX = x;
    this.cameraY = y;
    this.render();
  }

  // Get camera position
  getCameraPosition(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY };
  }

  // Dessiner les contours externes des territoires
  private drawTerritoryBorders(hexX: number, hexY: number, territoryInfo: any, borderColor: string, screenX: number, screenY: number) {
    const factionId = territoryInfo.factionId;
    
    // Vérifier chaque côté de l'hexagone pour voir s'il est une bordure externe
    const hexSides = [
      { dx: 0, dy: -1 }, // Nord
      { dx: 1, dy: hexX % 2 === 0 ? -1 : 0 }, // Nord-Est
      { dx: 1, dy: hexX % 2 === 0 ? 0 : 1 }, // Sud-Est
      { dx: 0, dy: 1 }, // Sud
      { dx: -1, dy: hexX % 2 === 0 ? 0 : 1 }, // Sud-Ouest
      { dx: -1, dy: hexX % 2 === 0 ? -1 : 0 } // Nord-Ouest
    ];

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([]);

    // Pour chaque côté de l'hexagone
    for (let i = 0; i < 6; i++) {
      const side = hexSides[i];
      const neighborX = hexX + side.dx;
      const neighborY = hexY + side.dy;
      
      // Vérifier si le voisin appartient à la même faction
      const neighborTerritory = UnifiedTerritorySystem.isTerritoryClaimed(neighborX, neighborY);
      const isSameFaction = neighborTerritory && neighborTerritory.factionId === factionId;
      
      // Si ce n'est pas la même faction, dessiner ce côté
      if (!isSameFaction) {
        this.drawHexSide(screenX, screenY, i);
      }
    }
  }

  // Dessiner un côté spécifique d'un hexagone
  private drawHexSide(centerX: number, centerY: number, sideIndex: number) {
    const angle1 = (sideIndex * Math.PI) / 3;
    const angle2 = ((sideIndex + 1) * Math.PI) / 3;
    
    const x1 = centerX + this.hexSize * Math.cos(angle1);
    const y1 = centerY + this.hexSize * Math.sin(angle1);
    const x2 = centerX + this.hexSize * Math.cos(angle2);
    const y2 = centerY + this.hexSize * Math.sin(angle2);
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }
}
