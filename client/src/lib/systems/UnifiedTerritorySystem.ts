/**
 * Système de territoire unifié pour Nova Imperium — Façade locale alimentée par le serveur.
 * Mutations : POST /api/territories/claim et POST /api/territories/colonies/found
 * Chargement : loadFromServer() appelée au démarrage (après loadBlockFromDB) et après chaque mutation.
 * Les territoires sont stockés en coordonnées hex (locales), converties depuis les coords monde
 * à l'aide de l'origine passée en paramètre.
 */

import type { TerritoryDTO, ColonyDTO } from "../api/territoriesApi";

export interface Territory {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  playerId: string;
  playerName: string;
  factionId?: string;
  factionName?: string;
  claimedDate: number;
  colonyId?: string;
  colonyName?: string;
  controlledByColony?: string;
}

class UnifiedTerritorySystemClass {
  private territories: Map<string, Territory> = new Map();

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // ─── Chargement depuis le serveur ─────────────────────────────────────────
  // À appeler après loadBlockFromDB() pour que l'origine soit connue.
  loadFromServer(
    serverTerritories: TerritoryDTO[],
    serverColonies: ColonyDTO[],
    originWorldX: number,
    originWorldY: number
  ): void {
    this.territories.clear();

    // Indexer les colonies par position monde pour lookup O(1)
    const colonyByWorldPos = new Map<string, ColonyDTO>();
    for (const col of serverColonies) {
      colonyByWorldPos.set(this.getKey(col.worldX, col.worldY), col);
    }

    for (const t of serverTerritories) {
      const hexX = t.worldX - originWorldX;
      const hexY = t.worldY - originWorldY;
      const hexKey = this.getKey(hexX, hexY);
      const colony = colonyByWorldPos.get(this.getKey(t.worldX, t.worldY));

      const territory: Territory = {
        x: hexX,
        y: hexY,
        worldX: t.worldX,
        worldY: t.worldY,
        playerId: t.playerId,
        playerName: t.playerName,
        factionId: String(t.factionId),
        factionName: t.factionName,
        claimedDate: new Date(t.claimedAt).getTime(),
        ...(colony
          ? {
              colonyId: String(colony.id),
              colonyName: colony.name,
              controlledByColony: String(colony.id),
            }
          : {}),
      };
      this.territories.set(hexKey, territory);
    }

    console.log(
      `[TerritorySystem] Chargé : ${serverTerritories.length} territoire(s), ${serverColonies.length} colonie(s)` +
      ` | origine monde (${originWorldX}, ${originWorldY})`
    );
  }

  // ─── Lectures synchrones (utilisées par GameEngine, TileInfoPanel, etc.) ───

  isTerritoryClaimed(x: number, y: number): boolean {
    return this.territories.has(this.getKey(x, y));
  }

  getTerritory(x: number, y: number): Territory | null {
    return this.territories.get(this.getKey(x, y)) || null;
  }

  getPlayerTerritories(playerId: string): Territory[] {
    return Array.from(this.territories.values()).filter(t => t.playerId === playerId);
  }

  getFactionTerritories(factionId: string): Territory[] {
    return Array.from(this.territories.values()).filter(t => t.factionId === factionId);
  }

  getAllTerritories(): Territory[] {
    return Array.from(this.territories.values());
  }

  getAllColonies(): Territory[] {
    return Array.from(this.territories.values()).filter(t => Boolean(t.colonyId));
  }

  getColonyMainTerritory(colonyId: string): Territory | null {
    return (
      Array.from(this.territories.values()).find(t => t.colonyId === colonyId) || null
    );
  }

  getColonyControlledTerritories(colonyId: string): Territory[] {
    return Array.from(this.territories.values()).filter(
      t => t.colonyId === colonyId || t.controlledByColony === colonyId
    );
  }

  getTerritoryCount(): number {
    return this.territories.size;
  }

  // ─── Terrains disponibles pour une colonie (lit window.gameEngine.mapData) ──

  getColonyAvailableTerrains(colonyId: string): string[] {
    const controlledTerritories = this.getColonyControlledTerritories(colonyId);
    const terrains = new Set<string>();

    controlledTerritories.forEach(territory => {
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

  // ─── Colonies d'un joueur avec leurs territoires contrôlés ─────────────────

  getPlayerColoniesWithTerritories(playerId: string): Array<{
    colony: Territory;
    controlledTerritories: Territory[];
    availableTerrains: string[];
  }> {
    const playerTerritories = this.getPlayerTerritories(playerId);
    const colonies = playerTerritories.filter(
      t => t.colonyId && t.colonyId === t.controlledByColony
    );

    return colonies.map(colony => ({
      colony,
      controlledTerritories: this.getColonyControlledTerritories(colony.colonyId!),
      availableTerrains: this.getColonyAvailableTerrains(colony.colonyId!),
    }));
  }
}

export const UnifiedTerritorySystem = new UnifiedTerritorySystemClass();
