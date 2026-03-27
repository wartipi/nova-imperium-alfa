import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { territories, colonies, cities, factionMembers, factions, mapTiles } from "../shared/schema";
import { hexDistance } from "./hexUtils";

export interface TerritoryDTO {
  id: number;
  worldX: number;
  worldY: number;
  // Historique du claimer — ne sert pas de gate de permission
  playerId: string;
  playerName: string;
  // Legacy seulement
  factionId: number | null;
  factionName: string | null;
  claimedAt: string;
  // Phase 12 — Ownership canonique
  ownerType: 'player' | 'faction';
  ownerPlayerId:   string | null;
  ownerPlayerName: string | null;
  ownerFactionId:  number | null;
  ownerFactionName: string | null;
}

export interface ColonyDTO {
  id: number;
  name: string;
  worldX: number;
  worldY: number;
  founderId: string;
  founderName: string;
  factionId: number | null;
  factionName: string | null;
  foundedAt: string;
  isCapital: boolean;
  // Phase 12 — Ownership canonique
  ownerType: 'player' | 'faction';
  ownerPlayerId:   string | null;
  ownerPlayerName: string | null;
  ownerFactionId:  number | null;
  ownerFactionName: string | null;
}

function mapTerritory(row: typeof territories.$inferSelect): TerritoryDTO {
  return {
    id: row.id,
    worldX: row.worldX,
    worldY: row.worldY,
    playerId: row.playerId,
    playerName: row.playerName,
    factionId: row.factionId ?? null,
    factionName: row.factionName ?? null,
    claimedAt: row.claimedAt.toISOString(),
    ownerType: (row.ownerType ?? 'faction') as 'player' | 'faction',
    ownerPlayerId:   row.ownerPlayerId   ?? null,
    ownerPlayerName: row.ownerPlayerName ?? null,
    ownerFactionId:  row.ownerFactionId  ?? null,
    ownerFactionName: row.ownerFactionName ?? null,
  };
}

// ─── Backfill idempotent Phase 12 ─────────────────────────────────────────────
// Remplit ownerType/ownerFaction* pour les territoires existants sans ownership canonique.
export async function backfillTerritoryOwnership(): Promise<void> {
  const rows = await db
    .select({ id: territories.id, factionId: territories.factionId, factionName: territories.factionName })
    .from(territories)
    .where(sql`${territories.ownerType} IS NULL OR ${territories.ownerFactionId} IS NULL`);

  if (rows.length === 0) {
    console.log('[backfillTerritoryOwnership] Tous les territoires ont déjà un owner canonique — skip');
    return;
  }

  for (const row of rows) {
    if (row.factionId != null) {
      await db
        .update(territories)
        .set({
          ownerType:        'faction',
          ownerFactionId:   row.factionId,
          ownerFactionName: row.factionName ?? '',
          ownerPlayerId:    null,
          ownerPlayerName:  null,
        })
        .where(eq(territories.id, row.id));
    }
  }
  console.log(`[backfillTerritoryOwnership] Backfill terminé : ${rows.length} territoire(s) mis à jour`);
}

function mapColony(row: typeof colonies.$inferSelect): ColonyDTO {
  return {
    id: row.id,
    name: row.name,
    worldX: row.worldX,
    worldY: row.worldY,
    founderId: row.founderId,
    founderName: row.founderName,
    factionId: row.factionId ?? null,
    factionName: row.factionName ?? null,
    foundedAt: row.foundedAt.toISOString(),
    isCapital: row.isCapital,
    ownerType: (row.ownerType ?? 'faction') as 'player' | 'faction',
    ownerPlayerId:   row.ownerPlayerId   ?? null,
    ownerPlayerName: row.ownerPlayerName ?? null,
    ownerFactionId:  row.ownerFactionId  ?? null,
    ownerFactionName: row.ownerFactionName ?? null,
  };
}

export async function getAllTerritories(): Promise<TerritoryDTO[]> {
  const rows = await db.select().from(territories);
  return rows.map(mapTerritory);
}

export async function getAllColonies(): Promise<ColonyDTO[]> {
  const rows = await db.select().from(colonies);
  return rows.map(mapColony);
}

export async function claimTerritory(
  playerId: string,
  playerName: string,
  worldX: number,
  worldY: number,
  ownerType: 'player' | 'faction'
): Promise<{ territory: TerritoryDTO } | { error: string; status: number }> {
  // 1. Résoudre la faction du joueur (optionnelle selon ownerType)
  let factionId:   number | null = null;
  let factionName: string | null = null;

  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length > 0) {
    const fId = memberRows[0].factionId;
    const factionRows = await db
      .select({ name: factions.name, isActive: factions.isActive })
      .from(factions)
      .where(eq(factions.id, fId));

    if (factionRows.length > 0 && factionRows[0].isActive) {
      factionId   = fId;
      factionName = factionRows[0].name;
    }
  }

  // 2. Valider ownerType selon présence faction
  if (ownerType === 'faction' && factionId === null) {
    return { error: "Vous devez appartenir à une faction active pour revendiquer au nom d'une faction", status: 403 };
  }

  // 3. Case non déjà revendiquée
  const existing = await db
    .select({ id: territories.id })
    .from(territories)
    .where(and(eq(territories.worldX, worldX), eq(territories.worldY, worldY)));

  if (existing.length > 0) {
    return { error: "Ce territoire est déjà revendiqué", status: 409 };
  }

  // 4. Case walkable
  const tileRows = await db
    .select({ isWalkable: mapTiles.isWalkable })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));

  if (tileRows.length === 0 || !tileRows[0].isWalkable) {
    return { error: "Cette case n'est pas revendiquable", status: 422 };
  }

  // 5. Construire l'ownership canonique
  const ownerFields = ownerType === 'faction'
    ? { ownerType: 'faction' as const, ownerFactionId: factionId, ownerFactionName: factionName, ownerPlayerId: null, ownerPlayerName: null }
    : { ownerType: 'player' as const, ownerPlayerId: playerId, ownerPlayerName: playerName, ownerFactionId: null, ownerFactionName: null };

  // 6. Insertion
  const inserted = await db
    .insert(territories)
    .values({ worldX, worldY, playerId, playerName, factionId, factionName, ...ownerFields })
    .returning();

  return { territory: mapTerritory(inserted[0]) };
}

export async function foundColony(
  playerId: string,
  playerName: string,
  worldX: number,
  worldY: number,
  name: string
): Promise<{ colony: ColonyDTO } | { error: string; status: number }> {
  // 1. Résoudre la faction du joueur de façon optionnelle (pas de gate dur)
  let factionId:   number | null = null;
  let factionName: string | null = null;

  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length > 0) {
    const fId = memberRows[0].factionId;
    const factionRows = await db
      .select({ name: factions.name, isActive: factions.isActive })
      .from(factions)
      .where(eq(factions.id, fId));
    if (factionRows.length > 0 && factionRows[0].isActive) {
      factionId   = fId;
      factionName = factionRows[0].name;
    }
  }

  // 2. Nom présent
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { error: "Le nom de la colonie est requis", status: 400 };
  }

  // 3. Case existante et walkable
  const tileRows = await db
    .select({ isWalkable: mapTiles.isWalkable })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));

  if (tileRows.length === 0) {
    return { error: "Position invalide (case inexistante)", status: 422 };
  }
  if (!tileRows[0].isWalkable) {
    return { error: "Impossible de fonder une ville sur ce terrain (case non praticable)", status: 422 };
  }

  // 4. Pas de colonie déjà présente à cette position
  const existingColony = await db
    .select({ id: colonies.id })
    .from(colonies)
    .where(and(eq(colonies.worldX, worldX), eq(colonies.worldY, worldY)));

  if (existingColony.length > 0) {
    return { error: "Une colonie existe déjà sur ce territoire", status: 409 };
  }

  // 5. Aucune autre colonie dans un rayon de 6 (distance minimale autorisée : 7)
  const allColonies = await db.select({ worldX: colonies.worldX, worldY: colonies.worldY }).from(colonies);
  for (const col of allColonies) {
    const dist = hexDistance(worldX, worldY, col.worldX, col.worldY);
    if (dist <= 6) {
      return {
        error: `Trop proche d'une colonie existante (distance : ${dist} hexagone${dist > 1 ? "s" : ""}, minimum requis : 7)`,
        status: 422,
      };
    }
  }

  // 6. Lookup du territoire existant sur la case — ownership canonique hérité si présent
  const territoryRows = await db
    .select({
      ownerType:        territories.ownerType,
      ownerPlayerId:    territories.ownerPlayerId,
      ownerFactionId:   territories.ownerFactionId,
      ownerFactionName: territories.ownerFactionName,
      ownerPlayerName:  territories.ownerPlayerName,
    })
    .from(territories)
    .where(and(eq(territories.worldX, worldX), eq(territories.worldY, worldY)));

  // Ownership canonique de la future colonie
  let ownerType:        'player' | 'faction';
  let ownerPlayerId:    string | null;
  let ownerPlayerName:  string | null;
  let ownerFactionId:   number | null;
  let ownerFactionName: string | null;

  if (territoryRows.length > 0) {
    const ter = territoryRows[0];
    // Vérification d'accès : le joueur doit être propriétaire du territoire
    if (ter.ownerType === 'player') {
      if (ter.ownerPlayerId !== playerId) {
        return { error: "Ce territoire appartient à un autre joueur", status: 403 };
      }
    } else {
      // ownerType === 'faction'
      if (!ter.ownerFactionId || ter.ownerFactionId !== factionId) {
        return { error: "Ce territoire appartient à une autre faction", status: 403 };
      }
    }
    // Héritage de l'ownership canonique du territoire
    ownerType        = (ter.ownerType ?? 'faction') as 'player' | 'faction';
    ownerPlayerId    = ter.ownerPlayerId    ?? null;
    ownerPlayerName  = ter.ownerPlayerName  ?? null;
    ownerFactionId   = ter.ownerFactionId   ?? null;
    ownerFactionName = ter.ownerFactionName ?? null;
  } else {
    // Pas de territoire : ownership dérivé de la présence d'une faction active
    if (factionId !== null) {
      ownerType        = 'faction';
      ownerFactionId   = factionId;
      ownerFactionName = factionName;
      ownerPlayerId    = null;
      ownerPlayerName  = null;
    } else {
      ownerType        = 'player';
      ownerPlayerId    = playerId;
      ownerPlayerName  = playerName;
      ownerFactionId   = null;
      ownerFactionName = null;
    }
  }

  // 7. is_capital : première colonie de cet owner (joueur ou faction)
  const capitalCountRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(colonies)
    .where(
      ownerType === 'faction'
        ? eq(colonies.ownerFactionId, ownerFactionId!)
        : eq(colonies.ownerPlayerId,  ownerPlayerId!)
    );

  const isCapital = Number(capitalCountRows[0].count) === 0;

  // 8. Transaction atomique : colonie + ville liée
  // Invariant : pas de colonie sans ville, pas de ville sans colonie.
  return await db.transaction(async (tx) => {
    const [insertedColony] = await tx
      .insert(colonies)
      .values({
        name: trimmedName, worldX, worldY,
        founderId: playerId, founderName: playerName,
        factionId, factionName,
        isCapital,
        ownerType,
        ownerFactionId,
        ownerFactionName,
        ownerPlayerId,
        ownerPlayerName,
      })
      .returning();

    await tx
      .insert(cities)
      .values({
        colonyId:    insertedColony.id,
        name:        trimmedName,
        displayName: null,
        population:  1,
      });

    console.log(`[foundColony] Transaction OK: colonie #${insertedColony.id} (${ownerType}) + ville créées (${worldX},${worldY})`);
    return { colony: mapColony(insertedColony) };
  });
}
