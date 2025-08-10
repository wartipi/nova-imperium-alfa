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

// Schémas pour la mécanique de maréchaux
export const armySchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(), // ID du joueur propriétaire
  units: z.array(unitSchema),
  marshalId: z.string().nullable(), // ID du maréchal assigné (peut être le propriétaire ou un autre joueur)
  marshalName: z.string().nullable(),
  status: z.enum(['idle', 'training', 'marching', 'in_battle', 'returning']),
  composition: z.object({
    infantry: z.number(),
    cavalry: z.number(),
    archers: z.number(),
    siege: z.number()
  }),
  totalStrength: z.number(),
  morale: z.number().min(0).max(100),
  experience: z.number().default(0),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).nullable(),
  createdAt: z.date(),
  lastActivity: z.date()
});

export const marshalContractSchema = z.object({
  id: z.string(),
  employerId: z.string(), // Joueur qui embauche
  marshalId: z.string(), // Joueur qui sert de maréchal
  armyId: z.string(),
  terms: z.object({
    payment: z.number(), // Paiement en or
    duration: z.number(), // Durée en tours de jeu
    riskLevel: z.enum(['low', 'medium', 'high']),
    consequences: z.string() // Description des conséquences en cas de défaite
  }),
  status: z.enum(['proposed', 'active', 'completed', 'breached', 'cancelled']),
  createdAt: z.date(),
  acceptedAt: z.date().nullable(),
  expiresAt: z.date().nullable()
});

export const battleEventSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  armyIds: z.array(z.string()),
  status: z.enum(['scheduled', 'active', 'completed']),
  result: z.object({
    winner: z.string().nullable(),
    casualties: z.record(z.number()), // casualties per army
    loot: z.record(z.number()).optional()
  }).nullable(),
  timestamp: z.date(),
  description: z.string()
});

export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  organizerId: z.string(), // Game Master ou organisateur
  participatingArmies: z.array(z.string()),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']),
  startDate: z.date(),
  endDate: z.date().nullable(),
  battleEvents: z.array(battleEventSchema),
  rules: z.object({
    allowMercenaries: z.boolean(),
    maxArmySize: z.number(),
    terrain: z.string(),
    specialConditions: z.array(z.string())
  })
});

export const civilizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  isPlayer: z.boolean(),
  isDefeated: z.boolean(),
  cities: z.array(citySchema),
  units: z.array(unitSchema),
  armies: z.array(armySchema), // Nouvelle propriété pour les armées
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
