import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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
