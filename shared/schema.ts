import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Merchants table for merchant portal authentication and management
export const merchants = pgTable("merchants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  businessType: text("business_type"),
  website: text("website"),
  phone: text("phone"),
  address: text("address"),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, approved, suspended
  kybStatus: text("kyb_status").notNull().default("pending"), // pending, review, verified, failed
  customFeeEnabled: boolean("custom_fee_enabled").default(false),
  customFeePercentage: text("custom_fee_percentage").default("2.5"),
  customFlatFee: text("custom_flat_fee").default("0.30"),
  payoutMethod: text("payout_method").default("bank_transfer"),
  bankAccountNumber: text("bank_account_number"),
  bankRoutingNumber: text("bank_routing_number"),
  notes: text("notes"),
  volume: text("volume").default("$0"),
  integrations: text("integrations").array().default([]),
  dateOnboarded: timestamp("date_onboarded").default(sql`NOW()`),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
});

export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  dateOnboarded: true
});

// Admin schema for creating merchants (excludes auto-generated fields)
export const adminCreateMerchantSchema = insertMerchantSchema.omit({
  username: true,
  password: true,
  status: true,
  kybStatus: true
});

export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type AdminCreateMerchant = z.infer<typeof adminCreateMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;

// Admins table for admin portal authentication and management
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("admin"), // admin, super_admin
  status: text("status").notNull().default("active"), // active, suspended
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
});

export const insertAdminSchema = createInsertSchema(admins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true
});

// Admin login schema (only username/password needed for login)
export const adminLoginSchema = insertAdminSchema.pick({
  username: true,
  password: true
});

export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type Admin = typeof admins.$inferSelect;
