import { z } from "zod";

// Types exportés pour utilisation dans le client et serveur
export type Army = z.infer<typeof armySchema>;
export type MarshalContract = z.infer<typeof marshalContractSchema>;
export type Campaign = z.infer<typeof campaignSchema>;

// Schéma pour les armées
export const armySchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(), // ID du joueur propriétaire
  units: z.array(z.string()), // IDs des unités
  marshalId: z.string().nullable(), // ID du maréchal assigné
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

// Schéma pour les maréchaux
export const marshalSchema = z.object({
  id: z.string(),
  name: z.string(),
  playerId: z.string(), // ID du joueur propriétaire
  assignedArmyId: z.string().nullable(),
  competences: z.object({
    leadership: z.number().min(0).max(5),
    tactics: z.number().min(0).max(5),
    combat: z.number().min(0).max(5),
    logistics: z.number().min(0).max(5),
  }),
  experience: z.number().default(0),
  reputation: z.number().min(0).max(100).default(50),
  hirePrice: z.number(), // Coût d'embauche
  createdAt: z.date(),
  status: z.enum(['available', 'hired', 'in_battle']),
});

// Schéma pour les contrats de maréchal
export const marshalContractSchema = z.object({
  id: z.string(),
  employerId: z.string(), // Joueur qui embauche
  employerName: z.string(),
  marshalId: z.string(), // Joueur qui sert de maréchal
  marshalName: z.string(),
  armyId: z.string(),
  armyName: z.string(),
  terms: z.object({
    payment: z.number(), // Paiement en or
    duration: z.number(), // Durée en tours de jeu
    riskLevel: z.enum(['low', 'medium', 'high']),
    consequences: z.string(), // Description des conséquences en cas de défaite
    bonusOnVictory: z.number().optional() // Bonus en cas de victoire
  }),
  status: z.enum(['proposed', 'active', 'completed', 'breached', 'cancelled']),
  createdAt: z.date(),
  acceptedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  proposalMessage: z.string().optional() // Message personnel du proposant
});

// Schéma pour les événements de bataille
export const battleEventSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  armyIds: z.array(z.string()),
  status: z.enum(['scheduled', 'active', 'completed']),
  phase: z.enum(['preparation', 'engagement', 'resolution']).default('preparation'),
  result: z.object({
    winner: z.string().nullable(),
    casualties: z.record(z.number()), // casualties per army
    loot: z.record(z.number()).optional(),
    marshalFate: z.record(z.enum(['survived', 'wounded', 'captured', 'killed'])) // Sort des maréchaux
  }).nullable(),
  timestamp: z.date(),
  description: z.string(),
  realTimeUpdates: z.array(z.object({
    timestamp: z.date(),
    message: z.string(),
    type: z.enum(['info', 'warning', 'critical'])
  })).default([])
});

// Schéma pour les campagnes militaires
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

// Schémas de validation pour les requêtes API
export const createArmyRequestSchema = z.object({
  name: z.string().min(1).max(50),
  unitIds: z.array(z.string()).min(1),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export const createContractRequestSchema = z.object({
  marshalId: z.string(),
  armyId: z.string(),
  terms: z.object({
    payment: z.number().min(0),
    duration: z.number().min(1).max(100),
    riskLevel: z.enum(['low', 'medium', 'high']),
    consequences: z.string().min(10).max(200),
    bonusOnVictory: z.number().min(0).optional()
  }),
  proposalMessage: z.string().max(500).optional()
});

export const assignMarshalRequestSchema = z.object({
  armyId: z.string(),
  marshalId: z.string() // "self" pour s'assigner soi-même
});

// Types pour WebSocket en temps réel
export const battleUpdateSchema = z.object({
  type: z.enum(['battle_start', 'phase_change', 'casualty_report', 'battle_end']),
  campaignId: z.string(),
  battleId: z.string(),
  data: z.any(), // Données spécifiques selon le type
  timestamp: z.date()
});

// Validation des compétences requises
export const REQUIRED_COMPETENCES = {
  CREATE_CONTRACT: 'connaissance_des_traites', // Niveau 1 minimum
  MARSHAL_ARMY: 'commandement', // Niveau 1 minimum pour diriger une armée
  ADVANCED_TACTICS: 'art_de_la_guerre' // Niveau 2+ pour des tactiques avancées
} as const;

export type BattleUpdate = z.infer<typeof battleUpdateSchema>;

// Types TypeScript dérivés des schémas Zod
export type Marshal = z.infer<typeof marshalSchema>;
export type ArmyContract = z.infer<typeof marshalContractSchema>;
export type BattleEvent = z.infer<typeof battleEventSchema>;