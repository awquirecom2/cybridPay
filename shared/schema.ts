import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, serial, json } from "drizzle-orm/pg-core";
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
  // Cybrid customer mapping fields
  cybridCustomerGuid: text("cybrid_customer_guid"), // Maps to Cybrid customer GUID
  cybridCustomerType: text("cybrid_customer_type").default("business"), // business or individual
  cybridVerificationGuid: text("cybrid_verification_status"), // Tracks KYC verification status
  cybridIntegrationStatus: text("cybrid_integration_status").default("pending"), // pending, active, error
  cybridLastError: text("cybrid_last_error"), // Store last error message
  cybridLastAttemptAt: timestamp("cybrid_last_attempt_at"), // Last integration attempt
  cybridLastSyncedAt: timestamp("cybrid_last_synced_at"), // Last successful sync
  depositAddressesCreated: boolean("deposit_addresses_created").default(false),
  // Trade account tracking fields
  cybridTradeAccountGuid: text("cybrid_trade_account_guid"), // Cybrid trade account GUID
  tradeAccountStatus: text("trade_account_status").default("none"), // none, pending, created, error
  tradeAccountAsset: text("trade_account_asset"), // USDC, BTC, etc.
  tradeAccountCreatedAt: timestamp("trade_account_created_at"), // When trade account was created
  // Deposit address tracking fields
  depositAddressGuid: text("deposit_address_guid"), // Cybrid deposit address GUID
  depositAddress: text("deposit_address"), // The actual deposit address
  depositAddressStatus: text("deposit_address_status").default("no_address"), // no_address, pending, created, error
  depositAddressAsset: text("deposit_address_asset"), // USDC, BTC, etc.
  depositAddressCreatedAt: timestamp("deposit_address_created_at"), // When deposit address was created
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
}).extend({
  cybridCustomerType: z.enum(["business", "individual"], {
    required_error: "Customer type is required",
    invalid_type_error: "Customer type must be either 'business' or 'individual'"
  }).default("business")
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
  // Password reset fields
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
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

// Merchant credentials table for storing encrypted API keys and secrets
export const merchantCredentials = pgTable("merchant_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'transak', 'cybrid', etc.
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptedApiSecret: text("encrypted_api_secret"),
  environment: text("environment").notNull().default("staging"), // 'staging', 'production'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`)
});

export const insertMerchantCredentialsSchema = createInsertSchema(merchantCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Transak credential input schema (before encryption)
export const transakCredentialsSchema = z.object({
  apiKey: z.string().min(1, "API Key is required"),
  apiSecret: z.string().min(1, "API Secret is required"),
  environment: z.enum(["staging", "production"]).default("staging")
});

// Transak session creation request schema
export const createTransakSessionSchema = z.object({
  quoteData: z.object({
    fiatAmount: z.number().positive().optional(),
    cryptoAmount: z.number().positive().optional(),
    cryptoCurrency: z.string().min(1, "Crypto currency is required"),
    fiatCurrency: z.string().min(1, "Fiat currency is required"),
    network: z.string().min(1, "Network is required"),
    paymentMethod: z.string().min(1, "Payment method is required")
  }).refine(data => data.fiatAmount || data.cryptoAmount, {
    message: "Either fiatAmount or cryptoAmount must be provided"
  }),
  walletAddress: z.string().min(1, "Wallet address is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  referrerDomain: z.string().optional(),
  redirectURL: z.string().url().optional(),
  themeColor: z.string().regex(/^[0-9a-fA-F]{6}$/, "Theme color must be a valid hex color (6 characters)").optional()
});

export type InsertMerchantCredentials = z.infer<typeof insertMerchantCredentialsSchema>;
export type TransakCredentials = z.infer<typeof transakCredentialsSchema>;
export type CreateTransakSession = z.infer<typeof createTransakSessionSchema>;
export type MerchantCredentials = typeof merchantCredentials.$inferSelect;

// Payment Link types for URL masking
export interface PaymentLink {
  id: string;
  sessionUrl: string;
  merchantId: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface InsertPaymentLink {
  sessionUrl: string;
  merchantId: string;
}

// Merchant deposit addresses table for storing crypto deposit addresses
export const merchantDepositAddresses = pgTable("merchant_deposit_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  merchantId: varchar("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }),
  cybridCustomerGuid: text("cybrid_customer_guid").notNull(), // Link to Cybrid customer
  cybridAccountGuid: text("cybrid_account_guid"), // Cybrid trading account GUID
  asset: text("asset").notNull(), // BTC, ETH, USDC, USDT (aligned with Cybrid terminology)
  network: text("network").notNull(), // bitcoin, ethereum
  address: text("address").notNull(), // Deposit address
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`NOW()`)
});

export const insertMerchantDepositAddressSchema = createInsertSchema(merchantDepositAddresses).omit({
  id: true,
  createdAt: true
});

export type InsertMerchantDepositAddress = z.infer<typeof insertMerchantDepositAddressSchema>;
export type MerchantDepositAddress = typeof merchantDepositAddresses.$inferSelect;

// Validation schemas for Cybrid admin routes
export const cybridCustomerParamsSchema = z.object({
  id: z.string().min(1, "Merchant ID is required")
});

export const cybridCustomerCreateSchema = z.object({
  type: z.enum(["individual", "business"], {
    required_error: "Customer type is required",
    invalid_type_error: "Customer type must be either 'individual' or 'business'"
  }).default("business")
});

export const cybridDepositAddressSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  network: z.string().optional()
});

export const createTradeAccountSchema = z.object({
  asset: z.enum(["USDC"], {
    required_error: "Asset is required",
    invalid_type_error: "Only USDC trading accounts are currently supported"
  }).default("USDC")
});

// Webhook events table for idempotency tracking
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  eventId: varchar("event_id").notNull().unique(),
  eventType: varchar("event_type").notNull(),
  payload: json("payload"),
  processedAt: timestamp("processed_at").default(sql`NOW()`)
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;

// Signup tokens table for admin-generated merchant registration links
export const signupTokens = pgTable("signup_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  usedByMerchantId: varchar("used_by_merchant_id").references(() => merchants.id),
  createdByAdminId: varchar("created_by_admin_id").references(() => admins.id),
  cybridCustomerType: text("cybrid_customer_type").notNull().default("individual"), // Configure customer type per signup link
  notes: text("notes"), // Optional admin notes about the link
  createdAt: timestamp("created_at").default(sql`NOW()`),
  usedAt: timestamp("used_at")
});

export const insertSignupTokenSchema = createInsertSchema(signupTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true
});

// Admin schema for creating signup tokens
export const createSignupTokenSchema = z.object({
  expirationHours: z.number().min(1).max(720).default(168), // 1 hour to 30 days, default 7 days
  cybridCustomerType: z.enum(["business", "individual"], {
    required_error: "Customer type is required",
    invalid_type_error: "Customer type must be either 'business' or 'individual'"
  }).default("individual"),
  notes: z.string().optional()
});

// Public registration schema for merchants using signup tokens
export const publicMerchantRegistrationSchema = z.object({
  token: z.string().min(1, "Registration token is required"),
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Valid email is required").min(1, "Email is required"),
  businessType: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  cybridCustomerType: z.enum(["business", "individual"], {
    required_error: "Customer type is required",
    invalid_type_error: "Customer type must be either 'business' or 'individual'"
  }).default("business")
});

export type InsertSignupToken = z.infer<typeof insertSignupTokenSchema>;
export type CreateSignupToken = z.infer<typeof createSignupTokenSchema>;
export type PublicMerchantRegistration = z.infer<typeof publicMerchantRegistrationSchema>;
export type SignupToken = typeof signupTokens.$inferSelect;
