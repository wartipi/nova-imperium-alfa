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
  // Indique quelle colonie contrôle cette case (peut être différent de colonyId)
  controlledByColony?: string;
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
    const colonyId = `colony_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    territory.colonyId = colonyId;
    territory.colonyName = colonyName;
    territory.controlledByColony = colonyId; // La case du centre est contrôlée par la colonie
    
    console.log(`🏘️ Colonie "${colonyName}" fondée en (${x},${y})`);
    return true;
  }

  // Vérifier si une case est adjacente à une position donnée
  private isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    
    // Dans un système hexagonal, les cases adjacentes ont des patterns spécifiques
    if (dx === 0 && dy === 1) return true; // Nord/Sud
    if (dy === 0 && dx === 1) return true; // Est/Ouest
    if (dx === 1 && dy === 1) {
      // Diagonales dans un système hexagonal
      if (x1 % 2 === 0) {
        return y2 === y1 - 1; // Pour colonnes paires
      } else {
        return y2 === y1 + 1; // Pour colonnes impaires
      }
    }
    return false;
  }

  // Étendre le territoire d'une colonie en revendiquant une case adjacente
  expandColonyTerritory(
    colonyId: string, 
    newX: number, 
    newY: number, 
    playerId: string, 
    playerName: string, 
    factionId?: string, 
    factionName?: string
  ): boolean {
    // Vérifier que la colonie existe
    const colonyTerritory = this.getColonyMainTerritory(colonyId);
    if (!colonyTerritory) {
      console.log(`❌ Colonie ${colonyId} introuvable`);
      return false;
    }

    // Vérifier que la nouvelle case n'est pas déjà revendiquée
    const newKey = this.getKey(newX, newY);
    if (this.territories.has(newKey)) {
      console.log(`❌ Case (${newX},${newY}) déjà revendiquée`);
      return false;
    }

    // Vérifier l'adjacence avec une case contrôlée par la colonie
    const colonyControlledTerritories = this.getColonyControlledTerritories(colonyId);
    const isAdjacentToColony = colonyControlledTerritories.some(territory => 
      this.isAdjacent(territory.x, territory.y, newX, newY)
    );

    if (!isAdjacentToColony) {
      console.log(`❌ Case (${newX},${newY}) doit être adjacente au territoire de la colonie`);
      return false;
    }

    // Créer le nouveau territoire contrôlé par la colonie
    const territory: Territory = {
      x: newX,
      y: newY,
      playerId,
      playerName,
      factionId,
      factionName,
      claimedDate: Date.now(),
      controlledByColony: colonyId
    };

    this.territories.set(newKey, territory);
    console.log(`✅ Case (${newX},${newY}) ajoutée au territoire de la colonie ${colonyTerritory.colonyName}`);
    return true;
  }

  // Obtenir le territoire principal d'une colonie (où elle est fondée)
  getColonyMainTerritory(colonyId: string): Territory | null {
    return Array.from(this.territories.values()).find(t => t.colonyId === colonyId) || null;
  }

  // Obtenir toutes les cases contrôlées par une colonie
  getColonyControlledTerritories(colonyId: string): Territory[] {
    return Array.from(this.territories.values()).filter(t => 
      t.colonyId === colonyId || t.controlledByColony === colonyId
    );
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

  // Obtenir les terrains disponibles pour une colonie (pour déterminer les constructions possibles)
  getColonyAvailableTerrains(colonyId: string): string[] {
    const controlledTerritories = this.getColonyControlledTerritories(colonyId);
    const terrains = new Set<string>();
    
    // Récupérer les types de terrain de chaque case contrôlée
    controlledTerritories.forEach(territory => {
      // Ici on devrait récupérer le type de terrain depuis la carte du jeu
      // Pour l'instant on simule avec le gameEngine global
      const gameEngine = (window as any).gameEngine;
      if (gameEngine && gameEngine.mapData) {
        const hex = gameEngine.mapData[territory.y]?.[territory.x];
        if (hex && hex.terrain) {
          terrains.add(hex.terrain);
        }
      }
    });

    return Array.from(terrains);
  }

  // Obtenir les colonies d'un joueur avec leurs territoires contrôlés
  getPlayerColoniesWithTerritories(playerId: string): Array<{
    colony: Territory;
    controlledTerritories: Territory[];
    availableTerrains: string[];
  }> {
    const playerTerritories = this.getPlayerTerritories(playerId);
    const colonies = playerTerritories.filter(t => t.colonyId && t.colonyId === t.controlledByColony);
    
    return colonies.map(colony => ({
      colony,
      controlledTerritories: this.getColonyControlledTerritories(colony.colonyId!),
      availableTerrains: this.getColonyAvailableTerrains(colony.colonyId!)
    }));
  }
}

export const UnifiedTerritorySystem = new UnifiedTerritorySystemClass();