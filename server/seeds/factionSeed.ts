import { sql } from "drizzle-orm";
import { db } from "../db";
import { factions } from "../../shared/schema";

export async function seedFactions(): Promise<void> {
  const existing = await db
    .select({ id: factions.id })
    .from(factions)
    .where(sql`LOWER(${factions.name}) = 'guilde de pandem'`);

  if (existing.length === 0) {
    await db.insert(factions).values({
      name: "Guilde de Pandem",
      description:
        "La seule faction fixe et omniprésente. Ses prêtres guident, ses soldats observent, et ses rituels façonnent les âmes.",
      charter:
        "Guider les âmes vers la lumière et maintenir l'équilibre du monde.",
      emblem: "⚡",
      structure: "Hiérarchie divine avec prêtres, soldats et rituels sacrés.",
      type: "religious",
      recruitment: "restricted",
      founderId: "system",
      founderName: "Système",
      color: "#4A148C",
      banner: "⚡",
      motto: "Omnipotentia et Misericordia",
      isActive: true,
    });
    console.log("[Seed] Guilde de Pandem créée");
  } else {
    console.log("[Seed] Guilde de Pandem déjà présente (id=" + existing[0].id + ")");
  }
}
