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
  parties: z.array(z.string().min(1)).min(2, "At least 2 parties required"),
  type: z.string().min(1, "Treaty type is required"),
  terms: z.array(z.string()).default([]),
  duration: z.number().int().min(1).optional()
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
