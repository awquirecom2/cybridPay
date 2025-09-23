import { type User, type InsertUser, type Merchant, type InsertMerchant, type Admin, type InsertAdmin, type MerchantCredentials, type InsertMerchantCredentials, type MerchantDepositAddress, type InsertMerchantDepositAddress, type PaymentLink, type InsertPaymentLink, type WebhookEvent, users, merchants, admins, merchantCredentials, merchantDepositAddresses, webhookEvents } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Merchant methods
  getMerchant(id: string): Promise<Merchant | undefined>;
  getMerchantByUsername(username: string): Promise<Merchant | undefined>;
  getMerchantByEmail(email: string): Promise<Merchant | undefined>;
  getAllMerchants(): Promise<Merchant[]>;
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: string, updates: Partial<InsertMerchant>): Promise<Merchant | undefined>;
  deleteMerchant(id: string): Promise<boolean>;
  
  // Admin methods
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAllAdmins(): Promise<Admin[]>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(id: string, updates: Partial<InsertAdmin>): Promise<Admin | undefined>;
  updateAdminLastLogin(id: string): Promise<void>;
  deleteAdmin(id: string): Promise<boolean>;
  
  // Admin password reset methods
  updateAdminResetToken(id: string, resetTokenHash: string, resetTokenExpiry: Date): Promise<Admin | undefined>;
  getAdminByResetTokenHash(resetTokenHash: string): Promise<Admin | undefined>;
  clearAdminResetToken(id: string): Promise<Admin | undefined>;

  // Merchant credentials methods
  getMerchantCredentials(merchantId: string, provider: string): Promise<MerchantCredentials | undefined>;
  getAllMerchantCredentials(merchantId: string): Promise<MerchantCredentials[]>;
  createMerchantCredentials(credentials: InsertMerchantCredentials): Promise<MerchantCredentials>;
  updateMerchantCredentials(merchantId: string, provider: string, updates: Partial<InsertMerchantCredentials>): Promise<MerchantCredentials | undefined>;
  deleteMerchantCredentials(merchantId: string, provider: string): Promise<boolean>;

  // Cybrid-specific merchant methods
  getMerchantByCybridGuid(cybridCustomerGuid: string): Promise<Merchant | undefined>;

  // Merchant deposit address methods  
  getMerchantDepositAddresses(merchantId: string): Promise<MerchantDepositAddress[]>;
  createMerchantDepositAddress(address: InsertMerchantDepositAddress): Promise<MerchantDepositAddress>;

  // Webhook event methods for idempotency
  getWebhookEvent(eventId: string): Promise<any | undefined>;
  createWebhookEvent(event: { eventId: string; eventType: string; payload: any }): Promise<any>;
  
  // Payment link methods
  createPaymentLink(paymentLink: InsertPaymentLink): Promise<PaymentLink>;
  getPaymentLink(id: string): Promise<PaymentLink | undefined>;
  deletePaymentLink(id: string): Promise<boolean>;
  cleanupExpiredPaymentLinks(): Promise<void>;
  
  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private paymentLinks: Map<string, PaymentLink> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
    
    // Run cleanup every 30 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredPaymentLinks();
    }, 30 * 60 * 1000);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Merchant methods
  async getMerchant(id: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.id, id));
    return result[0];
  }

  async getMerchantByUsername(username: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.username, username));
    return result[0];
  }

  async getMerchantByEmail(email: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants).where(eq(merchants.email, email));
    return result[0];
  }

  async getAllMerchants(): Promise<Merchant[]> {
    return await db.select().from(merchants);
  }

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    const result = await db.insert(merchants).values(merchant).returning();
    return result[0];
  }

  async updateMerchant(id: string, updates: Partial<InsertMerchant>): Promise<Merchant | undefined> {
    const result = await db.update(merchants)
      .set(updates)
      .where(eq(merchants.id, id))
      .returning();
    return result[0];
  }

  async deleteMerchant(id: string): Promise<boolean> {
    const result = await db.delete(merchants).where(eq(merchants.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Admin methods
  async getAdmin(id: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.id, id));
    return result[0];
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.username, username));
    return result[0];
  }

  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.email, email));
    return result[0];
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins);
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const result = await db.insert(admins).values(admin).returning();
    return result[0];
  }

  async updateAdmin(id: string, updates: Partial<InsertAdmin>): Promise<Admin | undefined> {
    const result = await db.update(admins)
      .set(updates)
      .where(eq(admins.id, id))
      .returning();
    return result[0];
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, id));
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Admin password reset methods
  async updateAdminResetToken(id: string, resetTokenHash: string, resetTokenExpiry: Date): Promise<Admin | undefined> {
    const result = await db.update(admins)
      .set({ 
        resetToken: resetTokenHash,
        resetTokenExpiry: resetTokenExpiry 
      })
      .where(eq(admins.id, id))
      .returning();
    return result[0];
  }

  async getAdminByResetTokenHash(resetTokenHash: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins)
      .where(and(
        eq(admins.resetToken, resetTokenHash),
        sql`${admins.resetTokenExpiry} > NOW()`
      ));
    return result[0];
  }

  async clearAdminResetToken(id: string): Promise<Admin | undefined> {
    const result = await db.update(admins)
      .set({ 
        resetToken: null,
        resetTokenExpiry: null 
      })
      .where(eq(admins.id, id))
      .returning();
    return result[0];
  }

  // Merchant credentials methods
  async getMerchantCredentials(merchantId: string, provider: string): Promise<MerchantCredentials | undefined> {
    const result = await db.select().from(merchantCredentials)
      .where(and(
        eq(merchantCredentials.merchantId, merchantId),
        eq(merchantCredentials.provider, provider)
      ));
    return result[0];
  }

  async getAllMerchantCredentials(merchantId: string): Promise<MerchantCredentials[]> {
    return await db.select().from(merchantCredentials)
      .where(eq(merchantCredentials.merchantId, merchantId));
  }

  async createMerchantCredentials(credentials: InsertMerchantCredentials): Promise<MerchantCredentials> {
    const result = await db.insert(merchantCredentials).values(credentials).returning();
    return result[0];
  }

  async updateMerchantCredentials(merchantId: string, provider: string, updates: Partial<InsertMerchantCredentials>): Promise<MerchantCredentials | undefined> {
    const result = await db.update(merchantCredentials)
      .set(updates)
      .where(and(
        eq(merchantCredentials.merchantId, merchantId),
        eq(merchantCredentials.provider, provider)
      ))
      .returning();
    return result[0];
  }

  async deleteMerchantCredentials(merchantId: string, provider: string): Promise<boolean> {
    const result = await db.delete(merchantCredentials)
      .where(and(
        eq(merchantCredentials.merchantId, merchantId),
        eq(merchantCredentials.provider, provider)
      ));
    return (result.rowCount || 0) > 0;
  }

  // Payment link methods - using in-memory storage as per guidelines
  async createPaymentLink(paymentLinkData: InsertPaymentLink): Promise<PaymentLink> {
    const id = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const paymentLink: PaymentLink = {
      id,
      sessionUrl: paymentLinkData.sessionUrl,
      merchantId: paymentLinkData.merchantId,
      createdAt: now,
      expiresAt
    };
    
    this.paymentLinks.set(id, paymentLink);
    return paymentLink;
  }

  async getPaymentLink(id: string): Promise<PaymentLink | undefined> {
    const paymentLink = this.paymentLinks.get(id);
    
    // Check if expired
    if (paymentLink && paymentLink.expiresAt < new Date()) {
      this.paymentLinks.delete(id);
      return undefined;
    }
    
    return paymentLink;
  }

  async deletePaymentLink(id: string): Promise<boolean> {
    return this.paymentLinks.delete(id);
  }

  async cleanupExpiredPaymentLinks(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;
    
    // Convert to array to avoid iterator issues
    const entries = Array.from(this.paymentLinks.entries());
    for (const [id, paymentLink] of entries) {
      if (paymentLink.expiresAt < now) {
        this.paymentLinks.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired payment links`);
    }
  }

  // Cybrid-specific merchant methods
  async getMerchantByCybridGuid(cybridCustomerGuid: string): Promise<Merchant | undefined> {
    const result = await db.select().from(merchants)
      .where(eq(merchants.cybridCustomerGuid, cybridCustomerGuid));
    return result[0];
  }

  // Merchant deposit address methods
  async getMerchantDepositAddresses(merchantId: string): Promise<MerchantDepositAddress[]> {
    return await db.select().from(merchantDepositAddresses)
      .where(eq(merchantDepositAddresses.merchantId, merchantId));
  }

  async createMerchantDepositAddress(address: InsertMerchantDepositAddress): Promise<MerchantDepositAddress> {
    const result = await db.insert(merchantDepositAddresses).values(address).returning();
    return result[0];
  }

  // Webhook event methods for idempotency
  async getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined> {
    const result = await db.select().from(webhookEvents)
      .where(eq(webhookEvents.eventId, eventId))
      .limit(1);
    return result[0];
  }

  async createWebhookEvent(event: { eventId: string; eventType: string; payload: any }): Promise<WebhookEvent> {
    const result = await db.insert(webhookEvents).values({
      eventId: event.eventId,
      eventType: event.eventType,
      payload: event.payload
    }).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
