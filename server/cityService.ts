import { eq } from "drizzle-orm";
import { db } from "./db";
import { cities, colonies, factionMembers } from "../shared/schema";

export interface CityDTO {
  id: number;
  colonyId: number;
  name: string;
  displayName: string | null;
  population: number;
  worldX: number;
  worldY: number;
  factionId: number;
  factionName: string;
  founderName: string;
  createdAt: string;
}

function mapCity(
  city: typeof cities.$inferSelect,
  colony: typeof colonies.$inferSelect
): CityDTO {
  return {
    id: city.id,
    colonyId: city.colonyId,
    name: city.name,
    displayName: city.displayName,
    population: city.population,
    worldX: colony.worldX,
    worldY: colony.worldY,
    factionId: colony.factionId,
    factionName: colony.factionName,
    founderName: colony.founderName,
    createdAt: city.createdAt.toISOString(),
  };
}

// Retourne les villes des colonies appartenant à la faction du joueur.
export async function getMyCities(playerId: string): Promise<CityDTO[]> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) return [];

  const factionId = memberRows[0].factionId;

  const rows = await db
    .select({
      city: cities,
      colony: colonies,
    })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(colonies.factionId, factionId));

  return rows.map((r) => mapCity(r.city, r.colony));
}

// Retourne la ville d'une colonie donnée, si elle appartient à la faction du joueur.
export async function getCityByColony(
  playerId: string,
  colonyId: number
): Promise<CityDTO | null | { error: string; status: number }> {
  const memberRows = await db
    .select({ factionId: factionMembers.factionId })
    .from(factionMembers)
    .where(eq(factionMembers.playerId, playerId));

  if (memberRows.length === 0) {
    return { error: "Vous n'appartenez à aucune faction", status: 403 };
  }

  const factionId = memberRows[0].factionId;

  const rows = await db
    .select({ city: cities, colony: colonies })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(eq(cities.colonyId, colonyId));

  if (rows.length === 0) return null;

  const { city, colony } = rows[0];

  if (colony.factionId !== factionId) {
    return { error: "Cette colonie n'appartient pas à votre faction", status: 403 };
  }

  return mapCity(city, colony);
}
