import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupMerchantAuth, hashPassword, generateMerchantCredentials } from "./merchant-auth";
import { adminCreateMerchantSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup merchant authentication
  setupMerchantAuth(app);

  // Utility function to sanitize merchant data (remove password)
  const sanitizeMerchant = (merchant: any) => {
    const { password, ...sanitized } = merchant;
    return sanitized;
  };

  // Admin routes for merchant management
  app.get("/api/admin/merchants", async (req, res) => {
    try {
      const merchants = await storage.getAllMerchants();
      // Remove password hashes from response
      const sanitizedMerchants = merchants.map(sanitizeMerchant);
      res.json(sanitizedMerchants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch merchants" });
    }
  });

  app.post("/api/admin/merchants", async (req, res) => {
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

  app.put("/api/admin/merchants/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const merchant = await storage.updateMerchant(id, updates);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      res.json(merchant);
    } catch (error) {
      console.error("Error updating merchant:", error);
      res.status(400).json({ error: "Failed to update merchant" });
    }
  });

  app.delete("/api/admin/merchants/:id", async (req, res) => {
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

  // Merchant portal routes (protected by authentication middleware)
  app.get("/api/merchant/dashboard", async (req, res) => {
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
