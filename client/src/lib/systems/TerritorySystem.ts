/**
 * Système de revendication et de gestion du territoire pour Nova Imperium
 * Permet aux joueurs avec des factions de revendiquer des cases et y établir des colonies
 */

import type { HexTile, TerrainType } from '../game/types';

export interface ClaimedTerritory {
  x: number;
  y: number;
  factionId: string;
  factionName: string;
  claimedBy: string; // Player ID
  claimedByName: string; // Player name
  claimedDate: number;
  colonyId?: string; // If a colony is established here
}

export interface Colony {
  id: string;
  name: string;
  x: number;
  y: number;
  foundedBy: string; // Player ID
  foundedByName: string; // Player name
  factionId: string;
  factionName: string;
  foundedDate: number;
  population: number;
  controlledTerritory: { x: number; y: number }[]; // Hexes controlled by this colony
  buildings: string[]; // Building IDs
  isCapital: boolean;
}

export interface BuildingRequirement {
  buildingId: string;
  name: string;
  requiredTerrain: TerrainType[];
  description: string;
  category: string;
  icon: string;
  cost: Record<string, number>;
  constructionTime: number;
}

export class TerritorySystem {
  private static claimedTerritories: ClaimedTerritory[] = [];
  private static colonies: Colony[] = [];

  // Requirements pour revendiquer un territoire
  static canClaimTerritory(playerId: string, playerInfluenceLevel: number, playerFactionId: string | null, isGameMaster: boolean = false): boolean {
    // En mode MJ, pas de prérequis
    if (isGameMaster) {
      console.log('✅ [MODE MJ] Revendication autorisée (aucun prérequis)');
      return true;
    }

    // Prérequis : Influence locale niveau 1 minimum
    if (playerInfluenceLevel < 1) {
      console.log('❌ Revendication impossible: Influence locale niveau 1 requis');
      return false;
    }

    // Prérequis : Avoir une faction ou être membre d'une faction
    if (!playerFactionId) {
      console.log('❌ Revendication impossible: Faction requise');
      return false;
    }

    return true;
  }

  // Revendiquer une case
  static claimTerritory(
    x: number, 
    y: number, 
    playerId: string, 
    playerName: string, 
    factionId: string, 
    factionName: string
  ): boolean {
    // Vérifier si la case est déjà revendiquée
    const existingClaim = this.claimedTerritories.find(claim => claim.x === x && claim.y === y);
    if (existingClaim) {
      console.log('❌ Case déjà revendiquée par', existingClaim.factionName);
      return false;
    }

    const newClaim: ClaimedTerritory = {
      x,
      y,
      factionId,
      factionName,
      claimedBy: playerId,
      claimedByName: playerName,
      claimedDate: Date.now()
    };

    this.claimedTerritories.push(newClaim);
    console.log(`✅ Territoire revendiqué en (${x},${y}) par ${factionName}`);
    return true;
  }

  // Vérifier si une case est revendiquée
  static isTerritoryClaimed(x: number, y: number): ClaimedTerritory | null {
    return this.claimedTerritories.find(claim => claim.x === x && claim.y === y) || null;
  }

  // Récupérer tous les territoires revendiqués par une faction
  static getTerritoriesByFaction(factionId: string): ClaimedTerritory[] {
    return this.claimedTerritories.filter(claim => claim.factionId === factionId);
  }

  // Récupérer tous les territoires revendiqués (pour le mode MJ)
  static getAllTerritories(): ClaimedTerritory[] {
    return [...this.claimedTerritories];
  }

  // Obtenir les informations d'un territoire spécifique
  static getTerritoryInfo(x: number, y: number): ClaimedTerritory | null {
    return this.isTerritoryClaimed(x, y);
  }

  // Fonder une colonie sur un territoire revendiqué
  static foundColony(
    x: number, 
    y: number, 
    colonyName: string, 
    playerId: string, 
    playerName: string, 
    factionId: string, 
    factionName: string
  ): Colony | null {
    // Vérifier que le territoire est revendiqué par la même faction
    const claim = this.isTerritoryClaimed(x, y);
    if (!claim || claim.factionId !== factionId) {
      console.log('❌ Impossible de fonder une colonie: territoire non revendiqué par votre faction');
      return null;
    }

    // Vérifier qu'il n'y a pas déjà une colonie ici
    if (claim.colonyId) {
      console.log('❌ Une colonie existe déjà sur ce territoire');
      return null;
    }

    const newColony: Colony = {
      id: `colony_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: colonyName,
      x,
      y,
      foundedBy: playerId,
      foundedByName: playerName,
      factionId,
      factionName,
      foundedDate: Date.now(),
      population: 100, // Population de départ
      controlledTerritory: [{ x, y }], // Contrôle initiale de la case
      buildings: [],
      isCapital: this.colonies.length === 0 // Première colonie = capitale
    };

    this.colonies.push(newColony);

    // Lier la colonie au territoire revendiqué
    const claimIndex = this.claimedTerritories.findIndex(c => c.x === x && c.y === y);
    if (claimIndex !== -1) {
      this.claimedTerritories[claimIndex].colonyId = newColony.id;
    }

    console.log(`✅ Colonie "${colonyName}" fondée en (${x},${y}) par ${factionName}`);
    return newColony;
  }

  // Obtenir toutes les colonies d'un joueur
  static getPlayerColonies(playerId: string): Colony[] {
    return this.colonies.filter(colony => colony.foundedBy === playerId);
  }

  // Obtenir toutes les colonies d'une faction
  static getFactionColonies(factionId: string): Colony[] {
    return this.colonies.filter(colony => colony.factionId === factionId);
  }

  // Vérifier si un joueur peut accéder au menu de construction
  static canAccessConstructionMenu(playerId: string, isGameMaster: boolean = false): boolean {
    // En mode MJ, accès direct
    if (isGameMaster) {
      console.log('✅ [MODE MJ] Accès construction autorisé');
      return true;
    }

    const playerColonies = this.getPlayerColonies(playerId);
    return playerColonies.length > 0;
  }

  // Vérifier si une colonie contrôle un type de terrain requis pour un bâtiment
  static colonyControlsTerrain(colonyId: string, requiredTerrain: TerrainType[], mapData: HexTile[][]): boolean {
    const colony = this.colonies.find(c => c.id === colonyId);
    if (!colony) return false;

    // Vérifier dans tous les territoires contrôlés par la colonie
    for (const territory of colony.controlledTerritory) {
      const hex = mapData[territory.x]?.[territory.y];
      if (hex && requiredTerrain.includes(hex.terrain)) {
        return true;
      }
    }

    return false;
  }

  // Étendre le territoire contrôlé par une colonie (pour croissance future)
  static expandColonyTerritory(colonyId: string, x: number, y: number): boolean {
    const colony = this.colonies.find(c => c.id === colonyId);
    if (!colony) return false;

    // Vérifier que le territoire est adjacent et revendiqué par la même faction
    const claim = this.isTerritoryClaimed(x, y);
    if (!claim || claim.factionId !== colony.factionId) {
      return false;
    }

    // Ajouter à la liste des territoires contrôlés
    if (!colony.controlledTerritory.find(t => t.x === x && t.y === y)) {
      colony.controlledTerritory.push({ x, y });
      console.log(`✅ Territoire (${x},${y}) ajouté au contrôle de ${colony.name}`);
      return true;
    }

    return false;
  }

  // Obtenir les statistiques des territoires
  static getTerritoryStats() {
    return {
      totalClaimedTerritories: this.claimedTerritories.length,
      totalColonies: this.colonies.length,
      coloniesWithCapital: this.colonies.filter(c => c.isCapital).length,
      factionTerritories: this.claimedTerritories.reduce((acc, claim) => {
        acc[claim.factionId] = (acc[claim.factionId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  // Pour le débogage et l'administration
  static getAllClaimedTerritories(): ClaimedTerritory[] {
    return [...this.claimedTerritories];
  }

  static getAllColonies(): Colony[] {
    return [...this.colonies];
  }

  // Reset pour les tests
  static resetAll(): void {
    this.claimedTerritories = [];
    this.colonies = [];
  }
}