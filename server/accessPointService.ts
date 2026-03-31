import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { playerPositions, cities, colonies, cityBuildings } from "../shared/schema";
import { resolveMarketContext } from "./marketService";

// ─── PlayerCityResult ────────────────────────────────────────────────────────
export interface PlayerCityResult {
  cityId:   number;
  cityName: string;
  worldX:   number;
  worldY:   number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ServiceType = "market" | "bank";

const SERVICE_BUILDINGS: Record<ServiceType, string> = {
  market: "guilde_des_marchands",
  bank:   "bank",
};

const SERVICE_LABELS: Record<ServiceType, string> = {
  market: "Guilde des Marchands",
  bank:   "Banque",
};

export interface AccessPointResult {
  cityId:   number;
  hasGuild: boolean;
  feeBps:   number;
}

// ─── resolveAccessPoint ───────────────────────────────────────────────────────
// Vérifie la présence physique du joueur sur une case contenant le bâtiment requis.
// Retourne le cityId + contexte de frais (market) ou throw 403 explicite.
export async function resolveAccessPoint(
  playerId:    string,
  serviceType: ServiceType,
): Promise<AccessPointResult> {
  // 1. Position réelle du joueur (source de vérité : DB)
  const [pos] = await db
    .select({ worldX: playerPositions.worldX, worldY: playerPositions.worldY })
    .from(playerPositions)
    .where(eq(playerPositions.playerId, playerId))
    .limit(1);

  if (!pos) {
    throw Object.assign(
      new Error("Position introuvable — déplacez votre avatar avant d'accéder à ce service"),
      { status: 403 }
    );
  }

  // 2. Chercher une ville à cette position contenant le bâtiment requis
  const required = SERVICE_BUILDINGS[serviceType];

  const rows = await db
    .select({ cityId: cities.id })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .innerJoin(
      cityBuildings,
      and(eq(cityBuildings.cityId, cities.id), eq(cityBuildings.building, required)),
    )
    .where(and(eq(colonies.worldX, pos.worldX), eq(colonies.worldY, pos.worldY)))
    .limit(1);

  if (rows.length === 0) {
    const label = SERVICE_LABELS[serviceType];
    throw Object.assign(
      new Error(
        `Accès refusé — votre position actuelle (${pos.worldX}, ${pos.worldY}) ne contient pas de ${label}`,
      ),
      { status: 403 }
    );
  }

  const { cityId } = rows[0];

  if (serviceType === "market") {
    const ctx = await resolveMarketContext(cityId);
    return { cityId, hasGuild: ctx.hasGuild, feeBps: ctx.feeBps };
  }

  return { cityId, hasGuild: false, feeBps: 0 };
}

// ─── checkAccessPoint ─────────────────────────────────────────────────────────
// Version non-throwing pour les routes d'info côté UI.
export async function checkAccessPoint(
  playerId:    string,
  serviceType: ServiceType,
): Promise<
  | { allowed: true;  cityId: number; hasGuild: boolean; feeBps: number }
  | { allowed: false; reason: string }
> {
  try {
    const result = await resolveAccessPoint(playerId, serviceType);
    return { allowed: true, ...result };
  } catch (e: any) {
    return { allowed: false, reason: e.message ?? "Accès refusé" };
  }
}

// ─── resolvePlayerCity ────────────────────────────────────────────────────────
// Vérifie que le joueur est physiquement sur une case de ville.
// Lit la position DB du joueur et cherche une colonie+ville à cette position.
// Retourne PlayerCityResult ou throw 403 si absent/hors ville.
export async function resolvePlayerCity(playerId: string): Promise<PlayerCityResult> {
  // 1. Position réelle du joueur (source de vérité : DB)
  const [pos] = await db
    .select({ worldX: playerPositions.worldX, worldY: playerPositions.worldY })
    .from(playerPositions)
    .where(eq(playerPositions.playerId, playerId))
    .limit(1);

  if (!pos) {
    throw Object.assign(
      new Error("Position introuvable — déplacez votre avatar avant de déposer"),
      { status: 403 },
    );
  }

  // 2. Chercher une colonie à cette position exacte, avec sa ville liée.
  const rows = await db
    .select({ cityId: cities.id, cityName: cities.name, worldX: colonies.worldX, worldY: colonies.worldY })
    .from(cities)
    .innerJoin(colonies, eq(cities.colonyId, colonies.id))
    .where(and(eq(colonies.worldX, pos.worldX), eq(colonies.worldY, pos.worldY)))
    .limit(1);

  if (rows.length === 0) {
    throw Object.assign(
      new Error(
        `Dépôt impossible — votre position (${pos.worldX}, ${pos.worldY}) n'est pas une ville`,
      ),
      { status: 403 },
    );
  }

  return rows[0];
}

// ─── checkPlayerCity ──────────────────────────────────────────────────────────
// Version non-throwing de resolvePlayerCity.
export async function checkPlayerCity(
  playerId: string,
): Promise<{ allowed: true; city: PlayerCityResult } | { allowed: false; reason: string }> {
  try {
    const city = await resolvePlayerCity(playerId);
    return { allowed: true, city };
  } catch (e: any) {
    return { allowed: false, reason: e.message ?? "Hors ville" };
  }
}
