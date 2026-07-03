/**
 * Système de territoire unifié pour Nova Imperium — Façade locale alimentée par le serveur.
 * Mutations : POST /api/territories/claim et POST /api/territories/colonies/found
 * Chargement : loadFromServer() appelée au démarrage (après loadBlockFromDB) et après chaque mutation.
 * Les territoires sont stockés en coordonnées hex (locales), converties depuis les coords monde
 * à l'aide de l'origine passée en paramètre.
 */

import type { TerritoryDTO, ColonyDTO } from "../api/territoriesApi";

export interface Territory {
  id: number;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  // Historique du claimer
  playerId: string;
  playerName: string;
  // Legacy seulement
  factionId?: string;
  factionName?: string;
  claimedDate: number;
  colonyId?: string;
  colonyName?: string;
  controlledByColony?: string;
  // Services réels disponibles sur la case — issus de city_buildings via le DTO serveur
  hasMarket?: boolean;
  hasBank?:   boolean;
  // Phase 12 — Ownership canonique
  ownerType: 'player' | 'faction';
  ownerPlayerId:   string | null;
  ownerPlayerName: string | null;
  ownerFactionId:  string | null;
  ownerFactionName: string | null;
  // Phase 13 — Gouvernorat
  governorUserId: string | null;
  // Rattachement V1 — Colonie gestionnaire
  managingColonyId?:   number | null;
  managingColonyName?: string | null;
  // Exploitation V1 — Colonie exploitante + bâtiment d'exploitation
  exploitingColonyId?:       number | null;
  exploitationBuildingType?: string | null;
  // Dérivé UI uniquement : vrai si exploitationBuildingType != null
  isExploited?: boolean;
  // Bloc P14-A — vrai si cette case porte la colonie capitale (ColonyDTO.isCapital,
  // déjà transmise par le serveur via serverColonies — aucune nouvelle donnée serveur).
  isCapital?: boolean;
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
        id: t.id,
        x: hexX,
        y: hexY,
        worldX: t.worldX,
        worldY: t.worldY,
        playerId: t.playerId,
        playerName: t.playerName,
        factionId:   t.factionId   != null ? String(t.factionId)   : undefined,
        factionName: t.factionName != null ? t.factionName         : undefined,
        claimedDate: new Date(t.claimedAt).getTime(),
        // Phase 12 — ownership canonique
        ownerType:        t.ownerType ?? 'faction',
        ownerPlayerId:    t.ownerPlayerId   ?? null,
        ownerPlayerName:  t.ownerPlayerName ?? null,
        ownerFactionId:   t.ownerFactionId  != null ? String(t.ownerFactionId) : null,
        ownerFactionName: t.ownerFactionName ?? null,
        governorUserId: colony ? (colony.governorUserId ?? null) : null,
        // Rattachement V1 — Colonie gestionnaire
        managingColonyId:   t.managingColonyId   ?? null,
        managingColonyName: t.managingColonyName ?? null,
        // Exploitation V1
        exploitingColonyId:       t.exploitingColonyId       ?? null,
        exploitationBuildingType: t.exploitationBuildingType ?? null,
        isExploited: t.exploitationBuildingType != null,
        ...(colony
          ? {
              colonyId:           String(colony.id),
              colonyName:         colony.name,
              controlledByColony: String(colony.id),
              hasMarket:          colony.hasMarket ?? false,
              hasBank:            colony.hasBank   ?? false,
              isCapital:          colony.isCapital ?? false,
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

  // Phase 12 — Territoires accessibles pour un joueur :
  //   • ownerType='player' && ownerPlayerId === playerId
  //   • ownerType='faction' && ownerFactionId === playerFactionId (si fourni)
  getAccessibleTerritories(playerId: string, playerFactionId?: string | null): Territory[] {
    return Array.from(this.territories.values()).filter(t => {
      if (t.ownerType === 'player' && t.ownerPlayerId === playerId) return true;
      if (t.ownerType === 'faction' && playerFactionId && t.ownerFactionId === playerFactionId) return true;
      return false;
    });
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
      t =>
        t.colonyId === colonyId ||
        t.controlledByColony === colonyId ||
        (t.managingColonyId != null && String(t.managingColonyId) === colonyId)
    );
  }

  getTerritoryCount(): number {
    return this.territories.size;
  }

  // ─── Phase Exploitation V1 : éligibilité client-side (hint UI) ────────────
  // Miroir de la règle serveur — le serveur reste la source de vérité.
  // T exploitable pour une colonie C si :
  //   1. même owner (garantie par contexte appelant)
  //   2. T n'est pas une tuile de colonie (t.colonyId absent)
  //   3. hexDistance(T, C) <= 6 OU BFS sur territoires du même owner
  isTerritoryExploitableClientSide(
    ter: Territory,
    colonyWorldX: number,
    colonyWorldY: number,
  ): { exploitable: boolean; distance: number; connectedByChain: boolean } {
    if (ter.isExploited) return { exploitable: false, distance: 0, connectedByChain: false };
    if (ter.colonyId) return { exploitable: false, distance: 0, connectedByChain: false };

    // Hex distance via cube coords (identique hexUtils.ts serveur)
    function offsetToCube(col: number, row: number) {
      const x = col;
      const z = row - (col - (col & 1)) / 2;
      return { x, z };
    }
    function hexDist(x1: number, y1: number, x2: number, y2: number): number {
      const c1 = offsetToCube(x1, y1);
      const c2 = offsetToCube(x2, y2);
      const dx = Math.abs(c1.x - c2.x);
      const dz = Math.abs(c1.z - c2.z);
      const dy = Math.abs((-c1.x - c1.z) - (-c2.x - c2.z));
      return (dx + dy + dz) / 2;
    }
    function getNeighbors(col: number, row: number): Array<{ col: number; row: number }> {
      const { x, z } = offsetToCube(col, row);
      const dirs = [
        { dx: 1, dz: 0 }, { dx: -1, dz: 0 },
        { dx: 1, dz: -1 }, { dx: -1, dz: 1 },
        { dx: 0, dz: -1 }, { dx: 0, dz: 1 },
      ];
      return dirs.map(({ dx, dz }) => {
        const nx = x + dx;
        const nz = z + dz;
        const nrow = nz + (nx - (nx & 1)) / 2;
        return { col: nx, row: nrow };
      });
    }

    const dist = hexDist(ter.worldX, ter.worldY, colonyWorldX, colonyWorldY);
    if (dist <= 6) return { exploitable: true, distance: dist, connectedByChain: false };

    // BFS sur les territoires du même owner chargés en mémoire
    const ownerSet = new Set<string>();
    for (const t of this.territories.values()) {
      const sameOwner =
        (ter.ownerType === 'player' && t.ownerType === 'player' && t.ownerPlayerId === ter.ownerPlayerId) ||
        (ter.ownerType === 'faction' && t.ownerType === 'faction' && t.ownerFactionId === ter.ownerFactionId && ter.ownerFactionId !== null);
      if (sameOwner) ownerSet.add(`${t.worldX},${t.worldY}`);
    }

    const targetKey = `${ter.worldX},${ter.worldY}`;
    const visited = new Set<string>();
    const queue: Array<{ col: number; row: number }> = [{ col: colonyWorldX, row: colonyWorldY }];
    visited.add(`${colonyWorldX},${colonyWorldY}`);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nb of getNeighbors(cur.col, cur.row)) {
        const key = `${nb.col},${nb.row}`;
        if (visited.has(key)) continue;
        if (!ownerSet.has(key)) continue;
        visited.add(key);
        if (key === targetKey) return { exploitable: true, distance: dist, connectedByChain: true };
        queue.push({ col: nb.col, row: nb.row });
      }
    }

    return { exploitable: false, distance: dist, connectedByChain: false };
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

  // ─── Phase 13 : Colonies accessibles (propriétaire personnel OU gouverneur) ──
  // Remplace getPlayerColoniesWithTerritories pour les vues joueur.
  getAccessibleColoniesWithTerritories(realPlayerId: string): Array<{
    colony: Territory;
    controlledTerritories: Territory[];
    availableTerrains: string[];
  }> {
    const seen = new Set<string>();
    const accessible: Territory[] = [];
    for (const t of this.territories.values()) {
      if (!t.colonyId || seen.has(t.colonyId)) continue;
      const isOwner   = t.ownerType === 'player'  && t.ownerPlayerId  === realPlayerId;
      const isGov     = t.ownerType === 'faction' && t.governorUserId === realPlayerId;
      if (isOwner || isGov) {
        seen.add(t.colonyId);
        accessible.push(t);
      }
    }
    return accessible.map(colony => ({
      colony,
      controlledTerritories: this.getColonyControlledTerritories(colony.colonyId!),
      availableTerrains:     this.getColonyAvailableTerrains(colony.colonyId!),
    }));
  }
}

export const UnifiedTerritorySystem = new UnifiedTerritorySystemClass();
