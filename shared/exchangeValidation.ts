import { z } from 'zod';

export const createTradeRoomSchema = z.object({
  treatyId: z.string().min(1, "Treaty ID is required"),
  participants: z.array(z.string().min(1)).min(2, "At least 2 participants required")
});

export const createExchangeOfferSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  fromPlayer: z.string().min(1, "From player is required"),
  toPlayer: z.string().min(1, "To player is required"),
  resourcesOffered: z.record(z.string(), z.number().min(0)).default({}),
  resourcesRequested: z.record(z.string(), z.number().min(0)).default({}),
  uniqueItemsOffered: z.array(z.string()).default([]),
  uniqueItemsRequested: z.array(z.string()).default([]),
  message: z.string().optional()
});

export const acceptRejectOfferSchema = z.object({
  playerId: z.string().min(1, "Player ID is required")
});

export const discoverRegionSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  centerX: z.number().int(),
  centerY: z.number().int(),
  radius: z.number().int().min(1).max(50),
  name: z.string().min(1, "Region name is required")
});

export const startCartographyProjectSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  regionId: z.string().min(1, "Region ID is required"),
  tools: z.array(z.string()).default([]),
  assistants: z.array(z.string()).default([])
});

export const progressProjectSchema = z.object({
  actionPoints: z.number().int().min(1, "At least 1 action point required")
});

export const transferMapSchema = z.object({
  fromPlayerId: z.string().min(1, "From player ID is required"),
  toPlayerId: z.string().min(1, "To player ID is required")
});

export const createMessageSchema = z.object({
  from: z.string().min(1, "From is required"),
  to: z.string().min(1, "To is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(['message', 'alliance', 'trade', 'warning']).default('message'),
  read: z.boolean().default(false)
});

export const createTreatySchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    'alliance_militaire',
    'accord_commercial',
    'pacte_non_agression',
    'acces_militaire',
    'echange_ressources',
    'defense_mutuelle'
  ]),
  parties: z.array(z.string().min(1)).min(2, "At least 2 parties required"),
  terms: z.string().min(1, "Terms are required"),
  createdBy: z.string().min(1, "Created by is required"),
  properties: z.record(z.string(), z.any()).optional()
});

export const signTreatySchema = z.object({
  playerId: z.string().min(1, "Player ID is required")
});

export const createArmySchema = z.object({
  name: z.string().min(1, "Army name is required"),
  ownerId: z.string().min(1, "Owner ID is required"),
  units: z.array(z.string()).default([]),
  composition: z.object({
    infantry: z.number().int().min(0).default(0),
    cavalry: z.number().int().min(0).default(0),
    archers: z.number().int().min(0).default(0),
    siege: z.number().int().min(0).default(0)
  }),
  totalStrength: z.number().int().min(1),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
});

export const createContractSchema = z.object({
  employerId: z.string().min(1, "Employer ID is required"),
  employerName: z.string().min(1, "Employer name is required"),
  marshalId: z.string().min(1, "Marshal ID is required"),
  marshalName: z.string().min(1, "Marshal name is required"),
  armyId: z.string().min(1, "Army ID is required"),
  armyName: z.string().min(1, "Army name is required"),
  terms: z.object({
    payment: z.number().min(0),
    duration: z.number().int().min(1),
    riskLevel: z.enum(['low', 'medium', 'high']),
    consequences: z.string().optional(),
    bonusOnVictory: z.number().min(0).optional()
  }),
  proposalMessage: z.string().optional()
});

export const acceptContractSchema = z.object({
  marshalId: z.string().min(1, "Marshal ID is required")
});

export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  organizerId: z.string().min(1, "Organizer ID is required"),
  participatingArmies: z.array(z.string()).default([]),
  startDate: z.string().transform(s => new Date(s)),
  rules: z.object({
    allowMercenaries: z.boolean().default(true),
    maxArmySize: z.number().int().min(1).optional(),
    terrain: z.string().optional(),
    specialConditions: z.array(z.string()).default([])
  })
});

export const joinCampaignSchema = z.object({
  armyId: z.string().min(1, "Army ID is required")
});

export const createBattleEventSchema = z.object({
  campaignId: z.string().min(1, "Campaign ID is required"),
  armyIds: z.array(z.string().min(1)).min(2, "At least 2 armies required"),
  description: z.string().min(1, "Description is required")
});

export const updateBattleSchema = z.object({
  type: z.enum(['battle_start', 'phase_change', 'casualty_report', 'battle_end']),
  message: z.string().min(1, "Message is required"),
  data: z.any().optional()
});

export const createUniqueItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  type: z.string().min(1, "Item type is required"),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  description: z.string().min(1, "Description is required"),
  ownerId: z.string().min(1, "Owner ID is required"),
  effects: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  value: z.number().min(0).default(100),
  metadata: z.record(z.string(), z.any()).optional()
});

export const marketplaceSellSchema = z.object({
  sellerId: z.string().min(1, "Seller ID is required"),
  sellerName: z.string().min(1, "Seller name is required"),
  itemType: z.enum(['resource', 'unique_item']),
  price: z.number().min(1, "Price must be at least 1"),
  resourceType: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  uniqueItemId: z.string().optional(),
  uniqueItem: z.any().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export const marketplaceBidSchema = z.object({
  bidderId: z.string().min(1, "Bidder ID is required"),
  bidderName: z.string().min(1, "Bidder name is required"),
  amount: z.number().min(1, "Bid amount must be at least 1")
});

export const marketplaceBuySchema = z.object({
  buyerId: z.string().min(1, "Buyer ID is required"),
  buyerName: z.string().min(1, "Buyer name is required")
});

export type CreateTradeRoomInput = z.infer<typeof createTradeRoomSchema>;
export type CreateExchangeOfferInput = z.infer<typeof createExchangeOfferSchema>;
export type AcceptRejectOfferInput = z.infer<typeof acceptRejectOfferSchema>;
export type DiscoverRegionInput = z.infer<typeof discoverRegionSchema>;
export type StartCartographyProjectInput = z.infer<typeof startCartographyProjectSchema>;
export type ProgressProjectInput = z.infer<typeof progressProjectSchema>;
export type TransferMapInput = z.infer<typeof transferMapSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateTreatyInput = z.infer<typeof createTreatySchema>;
export type SignTreatyInput = z.infer<typeof signTreatySchema>;
export type CreateArmyInput = z.infer<typeof createArmySchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type AcceptContractInput = z.infer<typeof acceptContractSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type JoinCampaignInput = z.infer<typeof joinCampaignSchema>;
export type CreateBattleEventInput = z.infer<typeof createBattleEventSchema>;
export type UpdateBattleInput = z.infer<typeof updateBattleSchema>;
export type CreateUniqueItemInput = z.infer<typeof createUniqueItemSchema>;
export type MarketplaceSellInput = z.infer<typeof marketplaceSellSchema>;
export type MarketplaceBidInput = z.infer<typeof marketplaceBidSchema>;
export type MarketplaceBuyInput = z.infer<typeof marketplaceBuySchema>;
