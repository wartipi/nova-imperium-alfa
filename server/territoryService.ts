import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { territories, colonies, cities, factionMembers, factions, mapTiles } from "../shared/schema";
import { hexDistance } from "./hexUtils";

export interface TerritoryDTO {
  id: number;
  worldX: number;
  worldY: number;
  playerId: string;
  playerName: string;
  factionId: number;
  factionName: string;
  claimedAt: string;
}

export interface ColonyDTO {
  id: number;
  name: string;
  worldX: number;
  worldY: number;
  founderId: string;
  founderName: string;
  factionId: number;
  factionName: string;
  foundedAt: string;
  isCapital: boolean;
}

function mapTerritory(row: typeof territories.$inferSelect): TerritoryDTO {
  return {
    id: row.id,
    worldX: row.worldX,
    worldY: row.worldY,
    playerId: row.playerId,
    playerName: row.playerName,
    factionId: row.factionId,
    factionName: row.factionName,
    claimedAt: row.claimedAt.toISOString(),
  };
}

function mapColony(row: typeof colonies.$inferSelect): ColonyDTO {
  return {
    id: row.id,
    name: row.name,
    worldX: row.worldX,
    worldY: row.worldY,
    founderId: row.founderId,
    founderName: row.founderName,
    factionId: row.factionId,
    factionName: row.factionName,
    foundedAt: row.foundedAt.toISOString(),
    isCapital: row.isCapital,
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
  worldY: number
): Promise<{ territory: TerritoryDTO } | { error: string; status: number }> {
  // 1. Joueur membre d'une faction active
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) {
    return { error: "Vous devez appartenir à une faction pour revendiquer un territoire", status: 403 };
  }

  const factionId = memberRows[0].factionId;

  const factionRows = await db
    .select({ name: factions.name, isActive: factions.isActive })
    .from(factions)
    .where(eq(factions.id, factionId));

  if (factionRows.length === 0 || !factionRows[0].isActive) {
    return { error: "Votre faction n'est pas active", status: 403 };
  }

  const factionName = factionRows[0].name;

  // 2. Case non déjà revendiquée
  const existing = await db
    .select({ id: territories.id })
    .from(territories)
    .where(and(eq(territories.worldX, worldX), eq(territories.worldY, worldY)));

  if (existing.length > 0) {
    return { error: "Ce territoire est déjà revendiqué", status: 409 };
  }

  // 3. Case walkable dans map_tiles
  const tileRows = await db
    .select({ isWalkable: mapTiles.isWalkable })
    .from(mapTiles)
    .where(and(eq(mapTiles.worldX, worldX), eq(mapTiles.worldY, worldY)));

  if (tileRows.length === 0 || !tileRows[0].isWalkable) {
    return { error: "Cette case n'est pas revendiquable", status: 422 };
  }

  // 4. Insertion
  const inserted = await db
    .insert(territories)
    .values({ worldX, worldY, playerId, playerName, factionId, factionName })
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
  // 1. Joueur membre d'une faction active
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) {
    return { error: "Vous devez appartenir à une faction", status: 403 };
  }

  const factionId = memberRows[0].factionId;

  const factionRows = await db
    .select({ name: factions.name, isActive: factions.isActive })
    .from(factions)
    .where(eq(factions.id, factionId));

  if (factionRows.length === 0 || !factionRows[0].isActive) {
    return { error: "Votre faction n'est pas active", status: 403 };
  }

  const factionName = factionRows[0].name;

  // 2. Nom présent
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return { error: "Le nom de la colonie est requis", status: 400 };
  }

  // 3. Case existante et walkable (validation directe — remplace l'ancienne exigence de territoire revendiqué)
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

  // 6. is_capital si première colonie de la faction
  const colonyCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(colonies)
    .where(eq(colonies.ownerFactionId, factionId));

  const isCapital = Number(colonyCount[0].count) === 0;

  // 7 + 8. Transaction atomique : colonie + ville liée
  // Invariant : pas de colonie sans ville, pas de ville sans colonie.
  // Phase 11 : ownership canonique initialisé en ownerType='faction' à la création.
  return await db.transaction(async (tx) => {
    const [insertedColony] = await tx
      .insert(colonies)
      .values({
        name: trimmedName, worldX, worldY,
        founderId: playerId, founderName: playerName,
        factionId, factionName,
        isCapital,
        ownerType:        "faction",
        ownerFactionId:   factionId,
        ownerFactionName: factionName,
        ownerPlayerId:    null,
        ownerPlayerName:  null,
      })
      .returning();

    // Création atomique de la ville liée à la colonie
    await tx
      .insert(cities)
      .values({
        colonyId:    insertedColony.id,
        name:        trimmedName,
        displayName: null,   // non modifiable via API en Phase 6
        population:  1,
      });

    console.log(`[foundColony] Transaction OK: colonie #${insertedColony.id} + ville créées (${worldX},${worldY})`);
    return { colony: mapColony(insertedColony) };
  });
}
