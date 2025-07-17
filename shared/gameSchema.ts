import { z } from "zod";

export const hexTileSchema = z.object({
  x: z.number(),
  y: z.number(),
  terrain: z.enum([
    'grassland', 'plains', 'desert', 'tundra', 'snow', 
    'ocean', 'coast', 'hills', 'mountains', 'forest', 'jungle'
  ]),
  food: z.number(),
  production: z.number(),
  science: z.number(),
  resource: z.string().nullable(),
  hasRiver: z.boolean(),
  hasRoad: z.boolean(),
  improvement: z.string().nullable(),
  isVisible: z.boolean(),
  isExplored: z.boolean()
});

export const unitSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['warrior', 'archer', 'settler', 'scout', 'spearman', 'swordsman', 'catapult']),
  x: z.number(),
  y: z.number(),
  strength: z.number(),
  health: z.number(),
  maxHealth: z.number(),
  movement: z.number(),
  maxMovement: z.number(),
  experience: z.number(),
  abilities: z.array(z.string())
});

export const citySchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  population: z.number(),
  populationCap: z.number(),
  foodPerTurn: z.number(),
  productionPerTurn: z.number(),
  sciencePerTurn: z.number(),
  culturePerTurn: z.number(),
  buildings: z.array(z.string()),
  currentProduction: z.object({
    type: z.enum(['building', 'unit']),
    name: z.string(),
    cost: z.number()
  }).nullable(),
  productionProgress: z.number(),
  workingHexes: z.array(z.object({
    x: z.number(),
    y: z.number()
  }))
});

export const civilizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  isPlayer: z.boolean(),
  isDefeated: z.boolean(),
  cities: z.array(citySchema),
  units: z.array(unitSchema),
  resources: z.object({
    food: z.number(),
    production: z.number(),
    science: z.number(),
    culture: z.number(),
    gold: z.number()
  }),
  researchedTechnologies: z.array(z.string()),
  currentResearch: z.object({
    id: z.string(),
    name: z.string(),
    cost: z.number(),
    description: z.string(),
    prerequisites: z.array(z.string())
  }).nullable(),
  researchProgress: z.number(),
  diplomacy: z.array(z.object({
    civilizationId: z.string(),
    status: z.enum(['war', 'peace', 'alliance']),
    trust: z.number(),
    tradeAgreement: z.boolean(),
    militaryAccess: z.boolean()
  }))
});

export const gameSaveSchema = z.object({
  version: z.string(),
  timestamp: z.number(),
  turn: z.number(),
  civilizations: z.array(civilizationSchema),
  mapData: z.array(z.array(hexTileSchema))
});

export type HexTile = z.infer<typeof hexTileSchema>;
export type Unit = z.infer<typeof unitSchema>;
export type City = z.infer<typeof citySchema>;
export type Civilization = z.infer<typeof civilizationSchema>;
export type GameSave = z.infer<typeof gameSaveSchema>;
