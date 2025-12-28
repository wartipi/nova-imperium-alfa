import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Tables pour la mécanique de maréchaux
export const armies = pgTable("armies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  units: jsonb("units").notNull(), // Array d'IDs d'unités
  marshalId: text("marshal_id"),
  marshalName: text("marshal_name"),
  status: text("status").notNull().default('idle'), // 'idle', 'training', 'marching', 'in_battle', 'returning'
  composition: jsonb("composition").notNull(), // { infantry, cavalry, archers, siege }
  totalStrength: integer("total_strength").notNull(),
  morale: real("morale").notNull().default(100),
  experience: integer("experience").notNull().default(0),
  position: jsonb("position"), // { x, y }
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActivity: timestamp("last_activity").notNull().defaultNow()
});

export const marshalContracts = pgTable("marshal_contracts", {
  id: text("id").primaryKey(),
  employerId: text("employer_id").notNull(),
  employerName: text("employer_name").notNull(),
  marshalId: text("marshal_id").notNull(),
  marshalName: text("marshal_name").notNull(),
  armyId: text("army_id").notNull(),
  armyName: text("army_name").notNull(),
  terms: jsonb("terms").notNull(), // { payment, duration, riskLevel, consequences, bonusOnVictory }
  status: text("status").notNull().default('proposed'), // 'proposed', 'active', 'completed', 'breached', 'cancelled'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  expiresAt: timestamp("expires_at"),
  proposalMessage: text("proposal_message")
});

export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  organizerId: text("organizer_id").notNull(),
  participatingArmies: jsonb("participating_armies").notNull(), // Array d'IDs d'armées
  status: text("status").notNull().default('planning'), // 'planning', 'active', 'completed', 'cancelled'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  rules: jsonb("rules").notNull(), // { allowMercenaries, maxArmySize, terrain, specialConditions }
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const battleEvents = pgTable("battle_events", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),
  armyIds: jsonb("army_ids").notNull(), // Array d'IDs d'armées
  status: text("status").notNull().default('scheduled'), // 'scheduled', 'active', 'completed'
  phase: text("phase").notNull().default('preparation'), // 'preparation', 'engagement', 'resolution'
  result: jsonb("result"), // { winner, casualties, loot, marshalFate }
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  description: text("description").notNull(),
  realTimeUpdates: jsonb("real_time_updates").notNull().default('[]') // Array de mises à jour temps réel
});

// Tables pour les événements publics (Journal du monde)
export const publicEvents = pgTable("public_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // alliance_signed, war_declared, etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  participants: jsonb("participants").notNull(), // Array de noms de joueurs/factions
  location: jsonb("location"), // { x, y, regionName }
  priority: text("priority").notNull().default('medium'), // low, medium, high, critical
  turn: integer("turn").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  isVisible: boolean("is_visible").notNull().default(true),
  icon: text("icon").notNull(),
  consequences: jsonb("consequences"), // Array de conséquences
  relatedEvents: jsonb("related_events"), // Array d'IDs d'événements liés
  metadata: jsonb("metadata") // Données spécifiques au type d'événement
});

// Tables pour la cartographie
export const mapRegions = pgTable("map_regions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  centerX: integer("center_x").notNull(),
  centerY: integer("center_y").notNull(),
  radius: integer("radius").notNull(),
  tiles: jsonb("tiles").notNull(), // Array de { x, y, terrain, resources }
  exploredBy: text("explored_by").notNull(), // ID du joueur qui a exploré
  explorationLevel: integer("exploration_level").notNull().default(25), // 0-100%
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const mapDocuments = pgTable("map_documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  regionId: text("region_id").notNull(), // Référence à mapRegions
  cartographer: text("cartographer").notNull(), // ID du joueur créateur
  quality: text("quality").notNull().default('rough'), // 'rough', 'detailed', 'masterwork'
  accuracy: integer("accuracy").notNull().default(60), // 0-100%
  hiddenSecrets: jsonb("hidden_secrets").notNull().default('[]'), // Array de secrets
  tradingValue: integer("trading_value").notNull().default(0),
  uniqueFeatures: jsonb("unique_features").notNull().default('[]'), // Array de caractéristiques
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  isUnique: boolean("is_unique").notNull().default(true)
});

export const cartographyProjects = pgTable("cartography_projects", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  regionId: text("region_id").notNull(), // Référence à mapRegions
  progress: integer("progress").notNull().default(0), // 0-100%
  requiredActionPoints: integer("required_action_points").notNull(),
  spentActionPoints: integer("spent_action_points").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  estimatedCompletion: timestamp("estimated_completion"),
  tools: jsonb("tools").notNull().default('[]'), // Array d'outils utilisés
  assistants: jsonb("assistants").notNull().default('[]') // Array d'assistants
});

// Table pour les compétences des joueurs
export const playerSkills = pgTable("player_skills", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  skillName: text("skill_name").notNull(), // 'leadership', 'tactics', 'strategy', 'logistics', 'treaty_knowledge'
  level: integer("level").notNull().default(0),
  experience: integer("experience").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Tables pour le système d'échange
export const tradeRooms = pgTable("trade_rooms", {
  id: text("id").primaryKey(),
  participants: jsonb("participants").notNull(), // Array de playerIds
  treatyId: text("treaty_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const exchangeOffers = pgTable("exchange_offers", {
  id: text("id").primaryKey(),
  roomId: text("room_id"),
  fromPlayer: text("from_player").notNull(),
  toPlayer: text("to_player").notNull(),
  resourcesOffered: jsonb("resources_offered").notNull().default('{}'),
  resourcesRequested: jsonb("resources_requested").notNull().default('{}'),
  itemsOffered: jsonb("items_offered").notNull().default('[]'), // Array d'IDs
  itemsRequested: jsonb("items_requested").notNull().default('[]'), // Array d'IDs
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected', 'expired'
  offerType: text("offer_type").notNull().default('resources'), // 'resources', 'unique_items', 'mixed'
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull()
});

export const uniqueItems = pgTable("unique_items", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'carte', 'objet_magique', 'artefact', 'relique', 'document', 'equipement_legendaire'
  rarity: text("rarity").notNull(), // 'commun', 'rare', 'epique', 'legendaire', 'mythique'
  description: text("description").notNull(),
  effects: jsonb("effects").notNull().default('[]'),
  requirements: jsonb("requirements").notNull().default('[]'),
  value: integer("value").notNull().default(100),
  tradeable: boolean("tradeable").notNull().default(true),
  ownerId: text("owner_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Table pour les ressources des joueurs
export const playerResources = pgTable("player_resources", {
  id: text("id").primaryKey(),
  playerId: text("player_id").notNull(),
  resourceType: text("resource_type").notNull(), // 'gold', 'wood', 'stone', 'iron', 'food', etc.
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Table pour les traités
export const treaties = pgTable("treaties", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'alliance_militaire', 'accord_commercial', 'pacte_non_agression', 'acces_militaire', 'echange_ressources', 'defense_mutuelle'
  parties: jsonb("parties").notNull(), // Array de playerIds
  terms: text("terms").notNull(),
  status: text("status").notNull().default('proposed'), // 'draft', 'proposed', 'active', 'expired', 'broken'
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  signatures: jsonb("signatures").notNull().default('[]'), // Array de { playerId, signedAt }
  properties: jsonb("properties").notNull().default('{}'),
  actionPointsCost: integer("action_points_cost").notNull().default(15)
});

// Table pour les messages
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  fromPlayer: text("from_player").notNull(),
  toPlayer: text("to_player").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default('private'), // 'private', 'system', 'treaty', 'trade'
  isRead: boolean("is_read").notNull().default(false),
  timestamp: timestamp("timestamp").notNull().defaultNow()
});

// Table pour le marketplace
export const marketplaceItems = pgTable("marketplace_items", {
  id: text("id").primaryKey(),
  sellerId: text("seller_id").notNull(),
  sellerName: text("seller_name").notNull(),
  itemType: text("item_type").notNull(), // 'resource', 'unique_item', 'map', 'service'
  saleType: text("sale_type").notNull(), // 'direct_sale', 'auction'
  status: text("status").notNull().default('active'), // 'active', 'sold', 'cancelled', 'expired'
  fixedPrice: integer("fixed_price"),
  startingBid: integer("starting_bid"),
  currentBid: integer("current_bid"),
  highestBidderId: text("highest_bidder_id"),
  highestBidderName: text("highest_bidder_name"),
  minBidIncrement: integer("min_bid_increment").default(10),
  bids: jsonb("bids").notNull().default('[]'), // Array de { bidderId, bidderName, amount, timestamp }
  endTurn: integer("end_turn"),
  resourceType: text("resource_type"),
  quantity: integer("quantity"),
  uniqueItemId: text("unique_item_id"),
  uniqueItem: jsonb("unique_item"),
  description: text("description"),
  tags: jsonb("tags").default('[]'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  soldAt: timestamp("sold_at"),
  buyerId: text("buyer_id"),
  buyerName: text("buyer_name")
});

// Schémas d'insertion pour validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertArmySchema = createInsertSchema(armies).pick({
  name: true,
  ownerId: true,
  units: true,
  composition: true,
  totalStrength: true,
  position: true
});

export const insertMarshalContractSchema = createInsertSchema(marshalContracts).pick({
  employerId: true,
  employerName: true,
  marshalId: true,
  marshalName: true,
  armyId: true,
  armyName: true,
  terms: true,
  proposalMessage: true
});

export const insertCampaignSchema = createInsertSchema(campaigns).pick({
  name: true,
  organizerId: true,
  participatingArmies: true,
  startDate: true,
  rules: true
});

export const insertBattleEventSchema = createInsertSchema(battleEvents).pick({
  campaignId: true,
  armyIds: true,
  description: true
});

export const insertPublicEventSchema = createInsertSchema(publicEvents).pick({
  type: true,
  title: true,
  description: true,
  participants: true,
  location: true,
  priority: true,
  turn: true,
  icon: true,
  consequences: true,
  relatedEvents: true,
  metadata: true
});

export const insertMapRegionSchema = createInsertSchema(mapRegions).pick({
  name: true,
  centerX: true,
  centerY: true,
  radius: true,
  tiles: true,
  exploredBy: true,
  explorationLevel: true
});

export const insertMapDocumentSchema = createInsertSchema(mapDocuments).pick({
  name: true,
  regionId: true,
  cartographer: true,
  quality: true,
  accuracy: true,
  hiddenSecrets: true,
  tradingValue: true,
  uniqueFeatures: true,
  isUnique: true
});

export const insertCartographyProjectSchema = createInsertSchema(cartographyProjects).pick({
  playerId: true,
  regionId: true,
  requiredActionPoints: true,
  tools: true,
  assistants: true
});

export const insertPlayerSkillSchema = createInsertSchema(playerSkills).pick({
  playerId: true,
  skillName: true,
  level: true,
  experience: true
});

export const insertTradeRoomSchema = createInsertSchema(tradeRooms).pick({
  participants: true,
  treatyId: true
});

export const insertExchangeOfferSchema = createInsertSchema(exchangeOffers).pick({
  roomId: true,
  fromPlayer: true,
  toPlayer: true,
  resourcesOffered: true,
  resourcesRequested: true,
  itemsOffered: true,
  itemsRequested: true,
  offerType: true,
  message: true,
  expiresAt: true
});

export const insertUniqueItemSchema = createInsertSchema(uniqueItems).pick({
  name: true,
  type: true,
  rarity: true,
  description: true,
  effects: true,
  requirements: true,
  value: true,
  tradeable: true,
  ownerId: true,
  metadata: true
});

export const insertPlayerResourceSchema = createInsertSchema(playerResources).pick({
  playerId: true,
  resourceType: true,
  quantity: true
});

export const insertTreatySchema = createInsertSchema(treaties).pick({
  title: true,
  type: true,
  parties: true,
  terms: true,
  createdBy: true,
  expiresAt: true,
  properties: true
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  fromPlayer: true,
  toPlayer: true,
  content: true,
  type: true
});

export const insertMarketplaceItemSchema = createInsertSchema(marketplaceItems).pick({
  sellerId: true,
  sellerName: true,
  itemType: true,
  saleType: true,
  fixedPrice: true,
  startingBid: true,
  endTurn: true,
  resourceType: true,
  quantity: true,
  uniqueItemId: true,
  uniqueItem: true,
  description: true,
  tags: true
});

// Types TypeScript
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Army = typeof armies.$inferSelect;
export type InsertArmy = z.infer<typeof insertArmySchema>;
export type MarshalContract = typeof marshalContracts.$inferSelect;
export type InsertMarshalContract = z.infer<typeof insertMarshalContractSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type BattleEvent = typeof battleEvents.$inferSelect;
export type InsertBattleEvent = z.infer<typeof insertBattleEventSchema>;
export type PublicEvent = typeof publicEvents.$inferSelect;
export type InsertPublicEvent = z.infer<typeof insertPublicEventSchema>;
export type MapRegion = typeof mapRegions.$inferSelect;
export type InsertMapRegion = z.infer<typeof insertMapRegionSchema>;
export type MapDocument = typeof mapDocuments.$inferSelect;
export type InsertMapDocument = z.infer<typeof insertMapDocumentSchema>;
export type CartographyProject = typeof cartographyProjects.$inferSelect;
export type InsertCartographyProject = z.infer<typeof insertCartographyProjectSchema>;
export type PlayerSkill = typeof playerSkills.$inferSelect;
export type InsertPlayerSkill = z.infer<typeof insertPlayerSkillSchema>;
export type TradeRoom = typeof tradeRooms.$inferSelect;
export type InsertTradeRoom = z.infer<typeof insertTradeRoomSchema>;
export type ExchangeOffer = typeof exchangeOffers.$inferSelect;
export type InsertExchangeOffer = z.infer<typeof insertExchangeOfferSchema>;
export type UniqueItem = typeof uniqueItems.$inferSelect;
export type InsertUniqueItem = z.infer<typeof insertUniqueItemSchema>;
export type PlayerResource = typeof playerResources.$inferSelect;
export type InsertPlayerResource = z.infer<typeof insertPlayerResourceSchema>;
export type Treaty = typeof treaties.$inferSelect;
export type InsertTreaty = z.infer<typeof insertTreatySchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MarketplaceItem = typeof marketplaceItems.$inferSelect;
export type InsertMarketplaceItem = z.infer<typeof insertMarketplaceItemSchema>;
