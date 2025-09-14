import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initAuthCore, requireAdmin, requireMerchant } from "./auth-core";
import { setupMerchantAuth, hashPassword, generateMerchantCredentials } from "./merchant-auth";
import { setupAdminAuth, hashPassword as hashAdminPassword, generateAdminCredentials } from "./admin-auth";
import { adminCreateMerchantSchema, insertAdminSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Utility functions to sanitize data (remove passwords)
  const sanitizeMerchant = (merchant: any) => {
    const { password, ...sanitized } = merchant;
    return sanitized;
  };

  const sanitizeAdmin = (admin: any) => {
    const { password, ...sanitized } = admin;
    return sanitized;
  };

  // Bootstrap route to create first admin (must be defined BEFORE admin auth middleware)
  app.post("/api/admin/bootstrap", async (req, res) => {
    try {
      const existingAdmins = await storage.getAllAdmins();
      if (existingAdmins.length > 0) {
        return res.status(403).json({ error: "Admin bootstrap not allowed - admins already exist" });
      }

      const adminData = insertAdminSchema.parse(req.body);
      const hashedPassword = await hashAdminPassword(adminData.password);

      const admin = await storage.createAdmin({
        ...adminData,
        password: hashedPassword
      });

      res.status(201).json({
        success: true,
        admin: sanitizeAdmin(admin)
      });
    } catch (error) {
      console.error("Error bootstrapping admin:", error);
      res.status(400).json({ error: "Failed to create admin" });
    }
  });

  // Initialize authentication core (session, passport) FIRST
  initAuthCore(app);
  
  // Setup authentication systems (AFTER auth core)
  setupMerchantAuth(app);
  setupAdminAuth(app);

  // Development-only test account seeding endpoint
  app.post("/api/dev/seed-test-accounts", async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: "Seeding not allowed in production" });
    }

    // Require secret header for additional security
    const seedSecret = req.headers['x-seed-secret'];
    if (!seedSecret || seedSecret !== (process.env.SEED_SECRET || 'dev-seed-secret')) {
      return res.status(403).json({ error: "Invalid seed secret" });
    }

    try {
      const results = {
        admins: [] as any[],
        merchants: [] as any[],
        message: "Test accounts seeded successfully"
      };

      // Create admin test accounts
      const adminAccounts = [
        {
          username: "admin.alice",
          password: "Admin!Pass123",
          email: "alice.admin@example.com",
          firstName: "Alice",
          lastName: "Administrator",
          role: "super_admin",
          status: "active"
        },
        {
          username: "admin.bob", 
          password: "Admin!Pass456",
          email: "bob.admin@example.com",
          firstName: "Bob",
          lastName: "Manager",
          role: "admin",
          status: "active"
        }
      ];

      for (const adminData of adminAccounts) {
        // Check if admin already exists
        const existingAdmin = await storage.getAdminByUsername(adminData.username);
        if (!existingAdmin) {
          const hashedPassword = await hashAdminPassword(adminData.password);
          const admin = await storage.createAdmin({
            ...adminData,
            password: hashedPassword
          });
          results.admins.push({
            username: adminData.username,
            password: adminData.password, // Return plaintext for testing
            email: adminData.email,
            role: adminData.role,
            id: admin.id
          });
        } else {
          results.admins.push({
            username: adminData.username,
            password: adminData.password, // Return plaintext for testing
            message: "Already exists"
          });
        }
      }

      // Create merchant test accounts  
      const merchantAccounts = [
        {
          username: "merchant.delta",
          password: "Merchant!Pass123", 
          email: "delta@example.com",
          name: "Delta Tech",
          businessType: "Technology",
          status: "approved",
          kybStatus: "verified"
        },
        {
          username: "merchant.echo",
          password: "Merchant!Pass456",
          email: "echo@example.com", 
          name: "Echo Commerce",
          businessType: "E-commerce",
          status: "approved",
          kybStatus: "verified"
        }
      ];

      for (const merchantData of merchantAccounts) {
        // Check if merchant already exists
        const existingMerchant = await storage.getMerchantByUsername(merchantData.username);
        if (!existingMerchant) {
          const hashedPassword = await hashPassword(merchantData.password);
          const merchant = await storage.createMerchant({
            ...merchantData,
            password: hashedPassword
          });
          results.merchants.push({
            username: merchantData.username,
            password: merchantData.password, // Return plaintext for testing
            email: merchantData.email,
            name: merchantData.name,
            status: merchantData.status,
            id: merchant.id
          });
        } else {
          results.merchants.push({
            username: merchantData.username,
            password: merchantData.password, // Return plaintext for testing
            message: "Already exists"
          });
        }
      }

      res.status(200).json(results);
    } catch (error) {
      console.error("Error seeding test accounts:", error);
      res.status(500).json({ error: "Failed to seed test accounts" });
    }
  });

  // Admin routes for merchant management (require admin authentication)
  app.get("/api/admin/merchants", requireAdmin, async (req, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      // Remove password hashes from response
      const sanitizedMerchants = merchants.map(sanitizeMerchant);
      res.json(sanitizedMerchants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch merchants" });
    }
  });

  app.post("/api/admin/merchants", requireAdmin, async (req, res) => {
    try {
      // Use admin-specific schema that doesn't require username/password
      const merchantData = adminCreateMerchantSchema.parse(req.body);
      
      // Generate merchant credentials
      const credentials = generateMerchantCredentials();
      const hashedPassword = await hashPassword(credentials.password);

      // Create merchant with credentials
      const merchant = await storage.createMerchant({
        ...merchantData,
        username: credentials.username,
        password: hashedPassword,
        status: "pending",
        kybStatus: "pending"
      });

      // Return sanitized merchant info along with generated credentials
      res.status(201).json({
        merchant: sanitizeMerchant(merchant),
        credentials: {
          username: credentials.username,
          password: credentials.password // Plain text password for admin to share
        }
      });
    } catch (error) {
      console.error("Error creating merchant:", error);
      res.status(400).json({ error: "Failed to create merchant" });
    }
  });

  app.put("/api/admin/merchants/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const merchant = await storage.updateMerchant(id, updates);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      res.json(sanitizeMerchant(merchant));
    } catch (error) {
      console.error("Error updating merchant:", error);
      res.status(400).json({ error: "Failed to update merchant" });
    }
  });

  app.delete("/api/admin/merchants/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteMerchant(id);
      
      if (!success) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting merchant:", error);
      res.status(500).json({ error: "Failed to delete merchant" });
    }
  });

  // Merchant portal routes (require merchant authentication)
  app.get("/api/merchant/dashboard", requireMerchant, async (req, res) => {
    // Return merchant-specific dashboard data
    res.json({
      transactions: [],
      balance: "$0.00",
      integrations: req.user?.integrations || []
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
