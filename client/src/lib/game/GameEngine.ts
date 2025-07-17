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

  constructor(canvas: HTMLCanvasElement, mapData: HexTile[][]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mapData = mapData;
    
    // Set up canvas
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Set up mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.5, Math.min(2, this.zoom * zoomFactor));
      this.render();
    });
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
        
        // Draw hex
        this.drawHex(screenX, screenY, hex);
        
        // Draw hex outline
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  private drawHex(x: number, y: number, hex: HexTile) {
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
    
    // Fill with terrain color
    this.ctx.fillStyle = this.getTerrainColor(hex.terrain);
    this.ctx.fill();
    
    // Highlight selected hex
    if (this.selectedHex && this.selectedHex.x === hex.x && this.selectedHex.y === hex.y) {
      this.ctx.strokeStyle = '#FFFF00';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
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
  }

  private getTerrainColor(terrain: string): string {
    const colors = {
      grassland: '#90EE90',
      plains: '#DEB887',
      desert: '#F4A460',
      tundra: '#B0C4DE',
      snow: '#FFFAFA',
      ocean: '#4682B4',
      coast: '#87CEEB',
      hills: '#8B7355',
      mountains: '#696969',
      forest: '#228B22',
      jungle: '#006400'
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
}
