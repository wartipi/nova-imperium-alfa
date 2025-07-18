import type { HexTile, Civilization, Unit, City } from "./types";

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
  // Player avatar properties
  private avatarPosition: { x: number; y: number; z: number } = { x: 5, y: 0, z: 5 };
  private avatarRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private isAvatarMoving = false;
  private selectedCharacter: any = null;
  // Vision system
  private isHexVisible: ((x: number, y: number) => boolean) | null = null;
  private isHexInCurrentVision: ((x: number, y: number) => boolean) | null = null;
  // Movement preview
  private pendingMovement: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, mapData: HexTile[][]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mapData = mapData;
    
    // Set initial camera position to center of map
    this.cameraX = (mapData[0].length * this.hexSize * 1.5) / 2;
    this.cameraY = (mapData.length * this.hexSize * Math.sqrt(3)) / 2;
    
    // Set up canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Set up mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(3, this.zoom * zoomFactor));
      this.render();
    });

    // Add mouse drag controls for camera movement
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
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

  centerCameraOnPosition(x: number, y: number) {
    const hexHeight = this.hexSize * Math.sqrt(3);
    this.cameraX = x * (this.hexSize * 1.5);
    this.cameraY = y * hexHeight + (x % 2) * (hexHeight / 2);
    this.render();
  }

  centerCameraOnPlayerStart() {
    const playerCiv = this.civilizations.find(civ => civ.isPlayer);
    if (playerCiv && playerCiv.cities.length > 0) {
      const capital = playerCiv.cities[0];
      this.centerCameraOnPosition(capital.x, capital.y);
    }
  }

  getHexAtPosition(screenX: number, screenY: number): HexTile | null {
    const worldX = (screenX - this.canvas.width / 2) / this.zoom + this.cameraX;
    const worldY = (screenY - this.canvas.height / 2) / this.zoom + this.cameraY;
    
    // Convert world coordinates to hex coordinates
    const hexX = Math.floor(worldX / (this.hexSize * 1.5));
    const hexY = Math.floor(worldY / (this.hexSize * Math.sqrt(3)));
    
    if (hexY >= 0 && hexY < this.mapData.length && 
        hexX >= 0 && hexX < this.mapData[hexY].length) {
      return this.mapData[hexY][hexX];
    }
    
    return null;
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
        
        // Check if hex is visible (use vision system)
        const isVisible = this.isHexVisible ? this.isHexVisible(x, y) : true;
        const isInCurrentVision = this.isHexInCurrentVision ? this.isHexInCurrentVision(x, y) : true;
        
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
      
      // Draw resource
      if (hex.resource) {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(x - 3, y - 3, 6, 6);
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
      
      // Draw resource with fog effect
      if (hex.resource) {
        this.ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        this.ctx.fillRect(x - 3, y - 3, 6, 6);
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
    
    // Draw city circle
    this.ctx.beginPath();
    this.ctx.arc(screenX, screenY, this.hexSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw city name
    this.ctx.fillStyle = '#000';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(city.name, screenX, screenY - this.hexSize);
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
    const screenX = this.avatarPosition.x * (this.hexSize * 1.5);
    const screenY = this.avatarPosition.z * hexHeight + (Math.floor(this.avatarPosition.x) % 2) * (hexHeight / 2);
    
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
    const screenX = this.avatarPosition.x * (this.hexSize * 1.5);
    const screenY = this.avatarPosition.z * hexHeight + (Math.floor(this.avatarPosition.x) % 2) * (hexHeight / 2);
    
    // Transform to screen coordinates
    const x = (screenX - this.cameraX) * this.zoom + this.canvas.width / 2;
    const y = (screenY - this.cameraY) * this.zoom + this.canvas.height / 2;
    
    return { x, y };
  }
}
