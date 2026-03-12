import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, unique } from "drizzle-orm/pg-core";
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

// Tables pour la carte monde segmentée
export const mapSegments = pgTable("map_segments", {
  id: serial("id").primaryKey(),
  segmentX: integer("segment_x").notNull(),
  segmentY: integer("segment_y").notNull(),
  width: integer("width").notNull().default(50),
  height: integer("height").notNull().default(30),
  name: text("name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueCoords: unique("map_segments_coords_unique").on(table.segmentX, table.segmentY)
}));

export const mapTiles = pgTable("map_tiles", {
  id: serial("id").primaryKey(),
  segmentId: integer("segment_id").notNull(),
  localX: integer("local_x").notNull(),
  localY: integer("local_y").notNull(),
  worldX: integer("world_x").notNull(),
  worldY: integer("world_y").notNull(),
  terrainType: text("terrain_type").notNull().default("plains"),
  resourceType: text("resource_type"),
  elevation: real("elevation"),
  isWalkable: boolean("is_walkable").notNull().default(true),
  movementCost: integer("movement_cost").notNull().default(1),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  uniqueLocalCoords: unique("map_tiles_local_coords_unique").on(table.segmentId, table.localX, table.localY),
  uniqueWorldCoords: unique("map_tiles_world_coords_unique").on(table.worldX, table.worldY)
}));

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

export const insertMapSegmentSchema = createInsertSchema(mapSegments).pick({
  segmentX: true,
  segmentY: true,
  width: true,
  height: true,
  name: true,
  isActive: true
});

export const insertMapTileSchema = createInsertSchema(mapTiles).pick({
  segmentId: true,
  localX: true,
  localY: true,
  worldX: true,
  worldY: true,
  terrainType: true,
  resourceType: true,
  elevation: true,
  isWalkable: true,
  movementCost: true,
  metadata: true
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
export type MapSegment = typeof mapSegments.$inferSelect;
export type InsertMapSegment = z.infer<typeof insertMapSegmentSchema>;
export type MapTile = typeof mapTiles.$inferSelect;
export type InsertMapTile = z.infer<typeof insertMapTileSchema>;

// Table de persistance de la position joueur dans le monde
export const playerPositions = pgTable("player_positions", {
  playerId: text("player_id").primaryKey(),
  worldX: integer("world_x").notNull(),
  worldY: integer("world_y").notNull(),
  segmentX: integer("segment_x").notNull(),
  segmentY: integer("segment_y").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlayerPositionSchema = createInsertSchema(playerPositions);
export type PlayerPosition = typeof playerPositions.$inferSelect;
export type InsertPlayerPosition = z.infer<typeof insertPlayerPositionSchema>;

// Table de persistance de l'état joueur (progression, compétences, PA)
export const playerState = pgTable("player_state", {
  playerId: text("player_id").primaryKey(),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  totalExperience: integer("total_experience").notNull().default(0),
  actionPoints: integer("action_points").notNull().default(25),
  maxActionPoints: integer("max_action_points").notNull().default(100),
  competencePoints: integer("competence_points").notNull().default(3),
  competences: jsonb("competences").notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlayerStateSchema = createInsertSchema(playerState);
export type PlayerStateRecord = typeof playerState.$inferSelect;
export type InsertPlayerState = z.infer<typeof insertPlayerStateSchema>;

// Tables pour le système de factions persisté
export const factions = pgTable("factions", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull().unique(),
  description: text("description").notNull(),
  charter:     text("charter").notNull(),
  emblem:      text("emblem").notNull(),
  structure:   text("structure").notNull(),
  type:        text("type").notNull(),
  recruitment: text("recruitment").notNull().default("open"),
  founderId:   text("founder_id").notNull(),
  founderName: text("founder_name").notNull(),
  color:       text("color").notNull().default("#888888"),
  banner:      text("banner").notNull().default("⚑"),
  motto:       text("motto").notNull().default(""),
  isActive:    boolean("is_active").notNull().default(true),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const factionMembers = pgTable("faction_members", {
  id:         serial("id").primaryKey(),
  factionId:  integer("faction_id").notNull().references(() => factions.id),
  playerId:   text("player_id").notNull().unique(),
  playerName: text("player_name").notNull(),
  memberRole: text("member_role").notNull().default("member"),
  joinedAt:   timestamp("joined_at").notNull().defaultNow(),
});

export const insertFactionSchema = createInsertSchema(factions).pick({
  name: true, description: true, charter: true, emblem: true,
  structure: true, type: true, recruitment: true,
  founderId: true, founderName: true,
  color: true, banner: true, motto: true,
});

export const insertFactionMemberSchema = createInsertSchema(factionMembers).pick({
  factionId: true, playerId: true, playerName: true, memberRole: true,
});

export type FactionRecord = typeof factions.$inferSelect;
export type InsertFaction = z.infer<typeof insertFactionSchema>;
export type FactionMemberRecord = typeof factionMembers.$inferSelect;
export type InsertFactionMember = z.infer<typeof insertFactionMemberSchema>;

// Étape d'un chemin de déplacement
export interface PathStep {
  worldX: number;
  worldY: number;
  terrain: string;
  cost: number;
}

// Table des actions persistantes joueur
// Sprint 1 : uniquement type='move', statuts in_progress/completed/cancelled
export const playerActions = pgTable("player_actions", {
  id: serial("id").primaryKey(),
  playerId: text("player_id").notNull(),
  type: text("type").notNull().default("move"),
  status: text("status").notNull().default("in_progress"),
  startWorldX: integer("start_world_x").notNull(),
  startWorldY: integer("start_world_y").notNull(),
  endWorldX: integer("end_world_x").notNull(),
  endWorldY: integer("end_world_y").notNull(),
  path: jsonb("path").notNull().default([]),
  totalCost: integer("total_cost").notNull(),
  startTime: timestamp("start_time").notNull(),
  expectedEndTime: timestamp("expected_end_time").notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlayerActionSchema = createInsertSchema(playerActions);
export type PlayerAction = typeof playerActions.$inferSelect;
export type InsertPlayerAction = z.infer<typeof insertPlayerActionSchema>;

// ─── Tables Phase 3 : territoires revendiqués et colonies ─────────────────────

export const territories = pgTable("territories", {
  id:          serial("id").primaryKey(),
  worldX:      integer("world_x").notNull(),
  worldY:      integer("world_y").notNull(),
  playerId:    text("player_id").notNull(),
  playerName:  text("player_name").notNull(),
  factionId:   integer("faction_id").notNull().references(() => factions.id),
  factionName: text("faction_name").notNull(),
  claimedAt:   timestamp("claimed_at").notNull().defaultNow(),
}, (table) => ({
  uniquePos: unique("territories_world_pos_unique").on(table.worldX, table.worldY),
}));

export const colonies = pgTable("colonies", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  worldX:      integer("world_x").notNull(),
  worldY:      integer("world_y").notNull(),
  founderId:   text("founder_id").notNull(),
  founderName: text("founder_name").notNull(),
  factionId:   integer("faction_id").notNull().references(() => factions.id),
  factionName: text("faction_name").notNull(),
  foundedAt:   timestamp("founded_at").notNull().defaultNow(),
  isCapital:   boolean("is_capital").notNull().default(false),
}, (table) => ({
  uniquePos: unique("colonies_world_pos_unique").on(table.worldX, table.worldY),
}));

export type TerritoryRecord = typeof territories.$inferSelect;
export type ColonyRecord    = typeof colonies.$inferSelect;

// ─── Tables Phase 4 : traités diplomatiques entre factions ────────────────────

export const treaties = pgTable("treaties", {
  id:                 text("id").primaryKey(),
  title:              text("title").notNull(),
  type:               text("type").notNull(),
  terms:              text("terms").notNull(),
  status:             text("status").notNull().default("proposed"),
  createdBy:          text("created_by").notNull(),
  createdByFactionId: integer("created_by_faction_id").notNull().references(() => factions.id),
  properties:         jsonb("properties").notNull().default({}),
  createdAt:          timestamp("created_at").notNull().defaultNow(),
  expiresAt:          timestamp("expires_at"),
});

export const treatyFactions = pgTable("treaty_factions", {
  id:        serial("id").primaryKey(),
  treatyId:  text("treaty_id").notNull().references(() => treaties.id, { onDelete: "cascade" }),
  factionId: integer("faction_id").notNull().references(() => factions.id),
}, (table) => ({
  uniq: unique("treaty_factions_uniq").on(table.treatyId, table.factionId),
}));

export const treatySignatures = pgTable("treaty_signatures", {
  id:        serial("id").primaryKey(),
  treatyId:  text("treaty_id").notNull().references(() => treaties.id, { onDelete: "cascade" }),
  factionId: integer("faction_id").notNull().references(() => factions.id),
  signedBy:  text("signed_by").notNull(),
  signedAt:  timestamp("signed_at").notNull().defaultNow(),
}, (table) => ({
  uniq: unique("treaty_signatures_uniq").on(table.treatyId, table.factionId),
}));

export type TreatyRecord          = typeof treaties.$inferSelect;
export type TreatyFactionRecord   = typeof treatyFactions.$inferSelect;
export type TreatySignatureRecord = typeof treatySignatures.$inferSelect;
