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
  lastAppliedStep: integer("last_applied_step"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPlayerActionSchema = createInsertSchema(playerActions);
export type PlayerAction = typeof playerActions.$inferSelect;
export type InsertPlayerAction = z.infer<typeof insertPlayerActionSchema>;

// ─── Tables Phase 3 : territoires revendiqués et colonies ─────────────────────

export const territories = pgTable("territories", {
  id:              serial("id").primaryKey(),
  worldX:          integer("world_x").notNull(),
  worldY:          integer("world_y").notNull(),
  // Historique du joueur qui a physiquement posé le claim — jamais utilisé comme gate de permission
  playerId:        text("player_id").notNull(),
  playerName:      text("player_name").notNull(),
  // Legacy / compatibilité uniquement — ne sert plus de gate de permission dans le nouveau code
  factionId:       integer("faction_id").references(() => factions.id),
  factionName:     text("faction_name"),
  claimedAt:       timestamp("claimed_at").notNull().defaultNow(),
  // Phase 12 — Ownership canonique polymorphe (mutable)
  ownerType:       text("owner_type").notNull().default("faction"),
  ownerPlayerId:   text("owner_player_id"),
  ownerPlayerName: text("owner_player_name"),
  ownerFactionId:  integer("owner_faction_id"),
  ownerFactionName: text("owner_faction_name"),
  // Phase rattachement V1 — Colonie gestionnaire déterministe (calcul automatique par proximité)
  managingColonyId: integer("managing_colony_id").references(() => colonies.id),
  // Phase Exploitation V1 — Colonie exploitante + type de bâtiment d'exploitation
  // Un territoire est "exploité" si exploitationBuildingType != null.
  // V1 : valeur autorisée = "exploitation_post". Max 1 bâtiment par territoire.
  exploitingColonyId:      integer("exploiting_colony_id").references(() => colonies.id),
  exploitationBuildingType: text("exploitation_building_type"),
}, (table) => ({
  uniquePos: unique("territories_world_pos_unique").on(table.worldX, table.worldY),
}));

export const colonies = pgTable("colonies", {
  id:              serial("id").primaryKey(),
  name:            text("name").notNull(),
  worldX:          integer("world_x").notNull(),
  worldY:          integer("world_y").notNull(),
  founderId:       text("founder_id").notNull(),
  founderName:     text("founder_name").notNull(),
  factionId:       integer("faction_id").references(() => factions.id),
  factionName:     text("faction_name"),
  foundedAt:       timestamp("founded_at").notNull().defaultNow(),
  isCapital:       boolean("is_capital").notNull().default(false),
  // Phase 11 — Ownership canonique (mutable, transférable)
  // ownerType est toujours NOT NULL : DEFAULT 'faction' couvre les lignes existantes au db:push
  ownerType:       text("owner_type").notNull().default("faction"),
  ownerPlayerId:   text("owner_player_id"),
  ownerPlayerName: text("owner_player_name"),
  ownerFactionId:  integer("owner_faction_id"),
  ownerFactionName: text("owner_faction_name"),
  // Phase 13 — Gouvernorat : joueur responsable de la gestion d'une colonie de faction
  // Initialisé à founderId lors de la fondation si ownerType='faction', null sinon.
  governorUserId:   text("governor_user_id"),
}, (table) => ({
  uniquePos: unique("colonies_world_pos_unique").on(table.worldX, table.worldY),
}));

export type TerritoryRecord = typeof territories.$inferSelect;
export type ColonyRecord    = typeof colonies.$inferSelect;

// ─── Tables Phase 6 : villes persistées ───────────────────────────────────────
// Invariant : une colonie possède exactement une ville (UNIQUE colony_id).
// display_name : persisté et lu — non modifiable via API en Phase 6.
// La ville est créée atomiquement lors de la fondation de la colonie.
export const cities = pgTable("cities", {
  id:               serial("id").primaryKey(),
  colonyId:         integer("colony_id").notNull().unique().references(() => colonies.id, { onDelete: "cascade" }),
  name:             text("name").notNull(),
  displayName:      text("display_name"),
  population:       integer("population").notNull().default(1),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  // Phase 8 : valeurs économiques calculées côté serveur (base + bonus bâtiments)
  foodPerTurn:      integer("food_per_turn").notNull().default(2),
  productionPerTurn: integer("production_per_turn").notNull().default(1),
  // Phase 9 : or par tour — dépend uniquement des bâtiments (v1), DEFAULT 0
  goldPerTurn:      integer("gold_per_turn").notNull().default(0),
  // Tier 1 matériaux bruts par tour (alimentés par les bâtiments d'exploitation)
  woodPerTurn:      integer("wood_per_turn").notNull().default(0),
  stonePerTurn:     integer("stone_per_turn").notNull().default(0),
  ironPerTurn:      integer("iron_per_turn").notNull().default(0),
  copperPerTurn:    integer("copper_per_turn").notNull().default(0),
  coalPerTurn:      integer("coal_per_turn").notNull().default(0),
  oilPerTurn:       integer("oil_per_turn").notNull().default(0),
  herbsPerTurn:     integer("herbs_per_turn").notNull().default(0),
  furPerTurn:       integer("fur_per_turn").notNull().default(0),
});

export type CityRecord = typeof cities.$inferSelect;

// ─── Tables Phase 7 : bâtiments et production persistés ───────────────────────
// city_buildings : état final des constructions terminées.
// UNIQUE(city_id, building) garantit l'idempotence des insertions (ON CONFLICT DO NOTHING).
export const cityBuildings = pgTable("city_buildings", {
  id:       serial("id").primaryKey(),
  cityId:   integer("city_id").notNull().references(() => cities.id, { onDelete: "cascade" }),
  building: text("building").notNull(),
  level:    integer("level").notNull().default(1),
  builtAt:  timestamp("built_at").notNull().defaultNow(),
}, (table) => ({
  uniq: unique("city_buildings_city_id_building_key").on(table.cityId, table.building),
}));

// city_production : file de production courante (0 ou 1 ligne par ville).
// UNIQUE(city_id) garantit qu'une ville n'a qu'une seule production active.
// productionProgress mis à jour à chaque tick (via PUT /api/cities/:cityId/production).
export const cityProduction = pgTable("city_production", {
  id:                 serial("id").primaryKey(),
  cityId:             integer("city_id").notNull().unique().references(() => cities.id, { onDelete: "cascade" }),
  productionType:     text("production_type").notNull(),
  productionName:     text("production_name").notNull(),
  productionCost:     integer("production_cost").notNull(),
  productionProgress: integer("production_progress").notNull().default(0),
  startedAt:          timestamp("started_at").notNull().defaultNow(),
  queuedByPlayerId:   text("queued_by_player_id"),
});

export type CityBuildingRecord  = typeof cityBuildings.$inferSelect;
export type CityProductionRecord = typeof cityProduction.$inferSelect;

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

// ─── Tables Phase 9 : économie globale de faction ─────────────────────────────
// Une ligne par faction — stocks persistés (gold, food) mis à jour au tick de tour.
// lastProcessedTurn : garde d'idempotence — empêche un double tick sur le même tour.
export const factionEconomy = pgTable("faction_economy", {
  id:                 serial("id").primaryKey(),
  factionId:          integer("faction_id").notNull().unique().references(() => factions.id),
  gold:               integer("gold").notNull().default(0),
  food:               integer("food").notNull().default(0),
  lastProcessedTurn:  integer("last_processed_turn").notNull().default(0),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export type FactionEconomyRecord = typeof factionEconomy.$inferSelect;

// ─── player_bank ──────────────────────────────────────────────────────────────
// Réserve personnelle du joueur.
// Alimentée par les villes ayant une banque à chaque tick de production.
// lastProductionTurn : garde d'idempotence du tick de production par-ville.
export const playerBank = pgTable("player_bank", {
  playerId:           text("player_id").primaryKey(),
  gold:               integer("gold").notNull().default(0),
  food:               integer("food").notNull().default(0),
  wood:               integer("wood").notNull().default(0),
  stone:              integer("stone").notNull().default(0),
  iron:               integer("iron").notNull().default(0),
  copper:             integer("copper").notNull().default(0),
  coal:               integer("coal").notNull().default(0),
  oil:                integer("oil").notNull().default(0),
  herbs:              integer("herbs").notNull().default(0),
  fur:                integer("fur").notNull().default(0),
  lastProductionTurn: integer("last_production_turn").notNull().default(0),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export type PlayerBankRecord = typeof playerBank.$inferSelect;

// ─── city_pending_harvest ─────────────────────────────────────────────────────
// Production en attente pour les villes sans banque.
// Accumulée à chaque tick. Transférée vers city_inventory à la collecte.
export const cityPendingHarvest = pgTable("city_pending_harvest", {
  cityId:    integer("city_id").primaryKey().references(() => cities.id),
  gold:      integer("gold").notNull().default(0),
  food:      integer("food").notNull().default(0),
  wood:      integer("wood").notNull().default(0),
  stone:     integer("stone").notNull().default(0),
  iron:      integer("iron").notNull().default(0),
  copper:    integer("copper").notNull().default(0),
  coal:      integer("coal").notNull().default(0),
  oil:       integer("oil").notNull().default(0),
  herbs:     integer("herbs").notNull().default(0),
  fur:       integer("fur").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CityPendingHarvestRecord = typeof cityPendingHarvest.$inferSelect;

// ─── city_inventory ───────────────────────────────────────────────────────────
// Stocks physiques d'une ville après collecte.
// Alimenté par l'action collect_harvest (pending_harvest → city_inventory).
export const cityInventory = pgTable("city_inventory", {
  cityId:    integer("city_id").primaryKey().references(() => cities.id),
  gold:      integer("gold").notNull().default(0),
  food:      integer("food").notNull().default(0),
  wood:      integer("wood").notNull().default(0),
  stone:     integer("stone").notNull().default(0),
  iron:      integer("iron").notNull().default(0),
  copper:    integer("copper").notNull().default(0),
  coal:      integer("coal").notNull().default(0),
  oil:       integer("oil").notNull().default(0),
  herbs:     integer("herbs").notNull().default(0),
  fur:       integer("fur").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CityInventoryRecord = typeof cityInventory.$inferSelect;

// ─── player_transport ─────────────────────────────────────────────────────────
// Ressources physiquement portées par le joueur (inventaire de transport).
// Alimenté par l'action transfer_bank_to_player à complétion.
// Capacité max : 50 unités totales (gold + food + wood + stone + iron cumulés).
export const playerTransport = pgTable("player_transport", {
  playerId:  text("player_id").primaryKey(),
  gold:      integer("gold").notNull().default(0),
  food:      integer("food").notNull().default(0),
  wood:      integer("wood").notNull().default(0),
  stone:     integer("stone").notNull().default(0),
  iron:      integer("iron").notNull().default(0),
  copper:    integer("copper").notNull().default(0),
  coal:      integer("coal").notNull().default(0),
  oil:       integer("oil").notNull().default(0),
  herbs:     integer("herbs").notNull().default(0),
  fur:       integer("fur").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PlayerTransportRecord = typeof playerTransport.$inferSelect;

// ─── Tables Phase 10.1 : unités persistées ────────────────────────────────────
// Une ligne par unité produite — ownership explicite via ownerPlayerId.
// strength non persisté : dérivé du catalogue serveur (UNIT_CATALOG) à l'hydratation.
export const units = pgTable("units", {
  id:                serial("id").primaryKey(),
  ownerPlayerId:     text("owner_player_id").notNull(),
  cityId:            integer("city_id").notNull().references(() => cities.id),
  unitType:          text("unit_type").notNull(),
  name:              text("name").notNull(),
  worldX:            integer("world_x").notNull(),
  worldY:            integer("world_y").notNull(),
  attack:            integer("attack").notNull(),
  defense:           integer("defense").notNull(),
  health:            integer("health").notNull(),
  maxHealth:         integer("max_health").notNull(),
  movement:          integer("movement").notNull(),          // capacité maximale
  movementRemaining: integer("movement_remaining").notNull(), // restant du tour courant
  experience:        integer("experience").notNull().default(0),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
});

export type UnitRecord = typeof units.$inferSelect;

// ─── market_guilds ────────────────────────────────────────────────────────────
// Une ligne par ville ayant le bâtiment guilde_des_marchands.
// Créée lazily à la première requête sur ce marché.
// Le propriétaire est DÉRIVÉ via cities → colonies (ownership canonique Phase 11).
// Jamais stocké ici pour éviter la duplication.
export const marketGuilds = pgTable("market_guilds", {
  cityId:                    integer("city_id").primaryKey().references(() => cities.id),
  tier:                      integer("tier").notNull().default(1),
  activeFeeBps:              integer("active_fee_bps").notNull().default(0),
  pendingFeeBps:             integer("pending_fee_bps"),
  pendingFeeAppliesAt:       timestamp("pending_fee_applies_at"),
  lastFeeChangeRequestedAt:  timestamp("last_fee_change_requested_at"),
  createdAt:                 timestamp("created_at").notNull().defaultNow(),
});

export type MarketGuildRecord = typeof marketGuilds.$inferSelect;

// ─── market_orders ────────────────────────────────────────────────────────────
// Carnet d'ordres du marché des ressources.
// side = 'buy' | 'sell'
// resourceType ∈ food|wood|stone|iron|copper|coal|oil|herbs|fur
// status = 'open' | 'filled' | 'cancelled'
// quantityRemaining : décrémenté à chaque fill partiel.
export const marketOrders = pgTable("market_orders", {
  id:                serial("id").primaryKey(),
  cityId:            integer("city_id").notNull().references(() => cities.id),
  playerId:          text("player_id").notNull(),
  playerName:        text("player_name").notNull(),
  side:              text("side").notNull(),
  resourceType:      text("resource_type").notNull(),
  pricePerUnit:      integer("price_per_unit").notNull(),
  quantityTotal:     integer("quantity_total").notNull(),
  quantityRemaining: integer("quantity_remaining").notNull(),
  status:            text("status").notNull().default("open"),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

export type MarketOrderRecord = typeof marketOrders.$inferSelect;

// ─── market_trades ────────────────────────────────────────────────────────────
// Journal des transactions exécutées sur le marché des ressources.
// feeBpsApplied : fee actif au moment du fill (post lazy-promotion éventuelle).
// feeAmount     : floor(totalGold × feeBpsApplied / 10000)
export const marketTrades = pgTable("market_trades", {
  id:           serial("id").primaryKey(),
  cityId:       integer("city_id").notNull().references(() => cities.id),
  buyOrderId:   integer("buy_order_id").notNull().references(() => marketOrders.id),
  sellOrderId:  integer("sell_order_id").notNull().references(() => marketOrders.id),
  buyerId:      text("buyer_id").notNull(),
  sellerId:     text("seller_id").notNull(),
  resourceType: text("resource_type").notNull(),
  quantity:     integer("quantity").notNull(),
  pricePerUnit: integer("price_per_unit").notNull(),
  totalGold:    integer("total_gold").notNull(),
  feeBpsApplied:integer("fee_bps_applied").notNull(),
  feeAmount:    integer("fee_amount").notNull(),
  executedAt:   timestamp("executed_at").notNull().defaultNow(),
});

export type MarketTradeRecord = typeof marketTrades.$inferSelect;
