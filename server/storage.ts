import { type User, type InsertUser, type Merchant, type InsertMerchant, users, merchants } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq } from "drizzle-orm";
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
  
  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
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
}

export const storage = new DatabaseStorage();
