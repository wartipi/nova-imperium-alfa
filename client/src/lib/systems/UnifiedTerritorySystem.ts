/**
 * Système de territoire unifié pour Nova Imperium
 * Remplace les anciens systèmes TerritorySystem et TerritoryClaimPanel
 */

export interface Territory {
  x: number;
  y: number;
  playerId: string;
  playerName: string;
  factionId?: string;
  factionName?: string;
  claimedDate: number;
  colonyId?: string;
  colonyName?: string;
}

class UnifiedTerritorySystemClass {
  private territories: Map<string, Territory> = new Map();

  // Générer la clé unique pour une position
  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // Revendiquer un territoire à la position de l'avatar
  claimTerritory(
    x: number, 
    y: number, 
    playerId: string, 
    playerName: string, 
    factionId?: string, 
    factionName?: string
  ): boolean {
    const key = this.getKey(x, y);
    
    // Vérifier si déjà revendiqué
    if (this.territories.has(key)) {
      console.log(`❌ Territoire (${x},${y}) déjà revendiqué`);
      return false;
    }

    // Créer le nouveau territoire
    const territory: Territory = {
      x,
      y,
      playerId,
      playerName,
      factionId,
      factionName,
      claimedDate: Date.now()
    };

    this.territories.set(key, territory);
    console.log(`✅ Territoire (${x},${y}) revendiqué par ${playerName} pour la faction ${factionName}`);
    return true;
  }

  // Vérifier si un territoire est revendiqué
  isTerritoryClaimed(x: number, y: number): boolean {
    return this.territories.has(this.getKey(x, y));
  }

  // Obtenir les informations d'un territoire
  getTerritory(x: number, y: number): Territory | null {
    return this.territories.get(this.getKey(x, y)) || null;
  }

  // Obtenir tous les territoires d'un joueur
  getPlayerTerritories(playerId: string): Territory[] {
    return Array.from(this.territories.values()).filter(t => t.playerId === playerId);
  }

  // Obtenir tous les territoires d'une faction
  getFactionTerritories(factionId: string): Territory[] {
    return Array.from(this.territories.values()).filter(t => t.factionId === factionId);
  }

  // Obtenir tous les territoires (pour le mode MJ)
  getAllTerritories(): Territory[] {
    return Array.from(this.territories.values());
  }

  // Fonder une colonie sur un territoire revendiqué
  foundColony(x: number, y: number, colonyName: string): boolean {
    const key = this.getKey(x, y);
    const territory = this.territories.get(key);
    
    if (!territory) {
      console.log(`❌ Pas de territoire revendiqué en (${x},${y})`);
      return false;
    }

    if (territory.colonyId) {
      console.log(`❌ Colonie déjà établie en (${x},${y})`);
      return false;
    }

    // Ajouter la colonie au territoire
    territory.colonyId = `colony_${Date.now()}`;
    territory.colonyName = colonyName;
    
    console.log(`🏘️ Colonie "${colonyName}" fondée en (${x},${y})`);
    return true;
  }

  // Nettoyer tous les territoires (pour les tests)
  clearAllTerritories(): void {
    this.territories.clear();
    console.log('🧹 Tous les territoires ont été supprimés');
  }

  // Obtenir le nombre de territoires
  getTerritoryCount(): number {
    return this.territories.size;
  }
}

export const UnifiedTerritorySystem = new UnifiedTerritorySystemClass();