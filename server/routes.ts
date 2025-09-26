import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initAuthCore, requireAdmin, requireMerchant, requireMerchantAuthenticated, requireMerchantKycVerified } from "./auth-core";
import { setupMerchantAuth, hashPassword, generateMerchantCredentials } from "./merchant-auth";
import { setupAdminAuth, hashPassword as hashAdminPassword, generateAdminCredentials } from "./admin-auth";
import { adminCreateMerchantSchema, insertAdminSchema, transakCredentialsSchema, createTransakSessionSchema, cybridCustomerParamsSchema, cybridCustomerCreateSchema, cybridDepositAddressSchema, insertMerchantDepositAddressSchema, createTradeAccountSchema, createSignupTokenSchema, publicMerchantRegistrationSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import { TransakService, CredentialEncryption, PublicTransakService } from "./transak-service";
import { CybridService } from "./cybrid-service";

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
  
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  });

  // Public merchant self-registration endpoint
  app.post("/api/public/register", async (req, res) => {
    try {
      const registrationData = publicMerchantRegistrationSchema.parse(req.body);
      
      // Verify the signup token
      const signupToken = await storage.getSignupToken(registrationData.token);
      if (!signupToken) {
        return res.status(400).json({ error: "Invalid or expired registration token" });
      }

      // Check if token is expired
      if (signupToken.expiresAt < new Date()) {
        return res.status(400).json({ error: "Registration token has expired" });
      }

      // Check if token is already used
      if (signupToken.used) {
        return res.status(400).json({ error: "Registration token has already been used" });
      }

      // Check if email already exists
      const existingMerchant = await storage.getMerchantByEmail(registrationData.email);
      if (existingMerchant) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Generate merchant credentials
      const credentials = generateMerchantCredentials();
      const hashedPassword = await hashPassword(credentials.password);

      // Create merchant with self-registration data
      const merchant = await storage.createMerchant({
        name: registrationData.name,
        email: registrationData.email,
        username: credentials.username,
        password: hashedPassword,
        businessType: registrationData.businessType || null,
        website: registrationData.website || null,
        phone: registrationData.phone || null,
        address: registrationData.address || null,
        description: registrationData.description || null,
        status: "pending",
        kybStatus: "pending",
        cybridCustomerType: signupToken.cybridCustomerType, // Use customer type from signup token
        // Set defaults for other fields
        customFeeEnabled: false,
        customFeePercentage: "2.5",
        customFlatFee: "0.30",
        payoutMethod: "bank_transfer",
        bankAccountNumber: null,
        bankRoutingNumber: null,
        notes: null,
        volume: "$0",
        integrations: [],
        cybridCustomerGuid: null,
        cybridVerificationGuid: null,
        cybridIntegrationStatus: "pending",
        cybridLastError: null,
        cybridLastAttemptAt: null,
        cybridLastSyncedAt: null,
        depositAddressesCreated: false,
        cybridTradeAccountGuid: null,
        tradeAccountStatus: "none",
        tradeAccountAsset: null,
        tradeAccountCreatedAt: null,
        depositAddressGuid: null,
        depositAddress: null,
        depositAddressStatus: "no_address",
        depositAddressAsset: null,
        depositAddressCreatedAt: null
      });

      // Mark the signup token as used
      await storage.markSignupTokenUsed(registrationData.token, merchant.id);

      console.log(`✅ Merchant self-registered successfully: ${merchant.name} (${merchant.email})`);

      // 🚀 NEW: Automatically create Cybrid customer without admin approval
      let cybridResult = null;
      try {
        console.log(`🎯 Creating Cybrid customer for self-registered merchant: ${merchant.name} (${merchant.id}) with type: ${signupToken.cybridCustomerType}`);
        
        // Create Cybrid customer directly using the type from signup token (with environment fallback)
        const customerType = (signupToken.cybridCustomerType || process.env.DEFAULT_SELF_REGISTRATION_CUSTOMER_TYPE || 'individual') as 'business' | 'individual';
        const cybridCustomer = await CybridService.createCustomer({
          merchantId: merchant.id,
          name: merchant.name,
          email: merchant.email
        }, customerType);

        // 🔧 CRITICAL FIX: Persist Cybrid customer GUID and status to merchant record
        await storage.updateMerchant(merchant.id, {
          cybridCustomerGuid: cybridCustomer.guid,
          cybridIntegrationStatus: 'active',
          cybridLastSyncedAt: new Date(),
          cybridLastAttemptAt: new Date()
        });

        cybridResult = {
          success: true,
          customerGuid: cybridCustomer.guid,
          customerType: customerType,
          message: `Cybrid ${customerType} customer created successfully`
        };

        console.log(`✅ Auto-created Cybrid customer for self-registered merchant ${merchant.id}: ${cybridCustomer.guid}`);

      } catch (cybridError) {
        console.error(`❌ Failed to auto-create Cybrid customer for self-registered merchant ${merchant.id}:`, cybridError);
        
        // 🔧 CRITICAL FIX: Persist error state to merchant record  
        await storage.updateMerchant(merchant.id, {
          cybridIntegrationStatus: 'error',
          cybridLastError: cybridError instanceof Error ? cybridError.message : 'Unknown Cybrid error',
          cybridLastAttemptAt: new Date()
        });
        
        cybridResult = {
          success: false,
          customerGuid: null,
          customerType: (signupToken.cybridCustomerType || process.env.DEFAULT_SELF_REGISTRATION_CUSTOMER_TYPE || 'individual'),
          error: cybridError instanceof Error ? cybridError.message : 'Unknown Cybrid error'
        };
      }

      // Return the credentials for the user to save
      const response: any = {
        success: true,
        message: "Registration successful! Please save your login credentials:",
        credentials: {
          username: credentials.username,
          password: credentials.password
        },
        merchant: sanitizeMerchant(merchant)
      };

      // Include Cybrid result in response
      if (cybridResult) {
        response.cybrid = cybridResult;
      }

      res.status(201).json(response);

    } catch (error) {
      console.error("Error in merchant self-registration:", error);
      res.status(400).json({ 
        error: error instanceof Error ? error.message : "Failed to register merchant"
      });
    }
  });

  // Public endpoint to validate signup token
  app.get("/api/signup/validate/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Get the signup token
      const signupToken = await storage.getSignupToken(token);
      if (!signupToken) {
        return res.status(400).json({ error: "Invalid registration token" });
      }

      // Check if token is expired
      if (signupToken.expiresAt < new Date()) {
        return res.status(400).json({ error: "Registration token has expired" });
      }

      // Check if token is already used
      if (signupToken.used) {
        return res.status(400).json({ error: "Registration token has already been used" });
      }

      // Token is valid
      res.json({
        success: true,
        message: "Registration token is valid",
        expiresAt: signupToken.expiresAt
      });

    } catch (error) {
      console.error("Error validating signup token:", error);
      res.status(500).json({ 
        error: "Failed to validate token"
      });
    }
  });

  // Merchant endpoint to get their deposit addresses
  app.get("/api/merchant/deposit-addresses", requireMerchant, requireMerchantKycVerified, async (req, res) => {
    try {
      const merchantId = req.user.id;
      console.log(`Fetching deposit addresses for merchant: ${merchantId}`);
      
      // Fetch deposit addresses using Cybrid service (KYC already verified by middleware)
      const addresses = await CybridService.getCustomerDepositAddresses(req.user.cybridCustomerGuid);
      
      res.json({
        success: true,
        addresses
      });
    } catch (error) {
      console.error('Merchant deposit address endpoint error:', error);
      res.status(500).json({
        error: "Failed to fetch deposit addresses",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

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

      // Prepare response object - no immediate Cybrid customer creation
      const response = {
        merchant: sanitizeMerchant(merchant),
        credentials: {
          username: credentials.username,
          password: credentials.password // Plain text password for admin to share
        },
        cybrid: {
          status: 'pending_approval', // Will be created when merchant is approved
          customerGuid: null,
          error: null
        }
      };

      console.log(`✅ Merchant created successfully: ${merchant.name} (${merchant.id}). Cybrid customer will be created upon approval.`);

      // Always return success - merchant creation succeeded
      res.status(201).json(response);
      
    } catch (error) {
      console.error("Error creating merchant:", error);
      res.status(400).json({ error: "Failed to create merchant" });
    }
  });

  app.put("/api/admin/merchants/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Get current merchant state before update
      const currentMerchant = await storage.getMerchant(id);
      if (!currentMerchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }
      
      const merchant = await storage.updateMerchant(id, updates);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // DELAYED TRIGGER: Create Cybrid customer when status changes to "approved"
      const isBeingApproved = currentMerchant.status !== 'approved' && updates.status === 'approved';
      let cybridResult = null;

      if (isBeingApproved) {
        try {
          console.log(`🎯 Merchant approved! Creating delayed Cybrid customer for: ${merchant.name} (${merchant.id})`);
          
          const cybridCustomer = await CybridService.ensureCustomer({
            merchantId: merchant.id,
            name: merchant.name,
            email: merchant.email,
            type: (merchant as any).cybridCustomerType || 'business' // Use stored customer type or default to business
          });

          cybridResult = {
            success: true,
            customerGuid: cybridCustomer.guid,
            message: `Cybrid customer created successfully: ${cybridCustomer.guid}`
          };

          console.log(`✅ Delayed Cybrid customer creation successful for merchant ${merchant.id}`);

        } catch (cybridError) {
          console.error(`❌ Delayed Cybrid customer creation failed for merchant ${merchant.id}:`, cybridError);
          
          cybridResult = {
            success: false,
            customerGuid: null,
            error: cybridError instanceof Error ? cybridError.message : 'Unknown Cybrid error'
          };
        }
      }

      // Include Cybrid result in response if customer creation was triggered
      const response: any = { 
        merchant: sanitizeMerchant(merchant)
      };

      if (cybridResult) {
        response.cybrid = cybridResult;
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error updating merchant:", error);
      res.status(400).json({ error: "Failed to update merchant" });
    }
  });

  // Generate signup link for merchant self-registration
  app.post("/api/admin/signup-links", requireAdmin, async (req, res) => {
    try {
      const tokenData = createSignupTokenSchema.parse(req.body);
      
      // Generate a unique token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + tokenData.expirationHours * 60 * 60 * 1000);
      
      const signupToken = await storage.createSignupToken({
        token,
        expiresAt,
        used: false,
        usedByMerchantId: null,
        createdByAdminId: (req.user as any)?.id || null,
        cybridCustomerType: tokenData.cybridCustomerType || process.env.DEFAULT_SELF_REGISTRATION_CUSTOMER_TYPE || 'individual',
        notes: tokenData.notes || null
      });

      // Generate the signup URL
      const baseUrl = process.env.BASE_URL || `http://localhost:5000`;
      const signupUrl = `${baseUrl}/signup/${token}`;

      res.status(201).json({
        success: true,
        token: signupToken,
        signupUrl,
        expiresAt: signupToken.expiresAt
      });
    } catch (error) {
      console.error("Error creating signup token:", error);
      res.status(400).json({ error: "Failed to create signup link" });
    }
  });

  // Get all signup tokens for admin
  app.get("/api/admin/signup-links", requireAdmin, async (req, res) => {
    try {
      const tokens = await storage.getAllSignupTokens();
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching signup tokens:", error);
      res.status(500).json({ error: "Failed to fetch signup links" });
    }
  });

  // Reset merchant credentials endpoint
  app.post("/api/admin/merchants/:id/reset-credentials", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the merchant to verify it exists and get the name
      const merchant = await storage.getMerchant(id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Generate new credentials
      const newCredentials = generateMerchantCredentials();
      const hashedPassword = await hashPassword(newCredentials.password);

      // Update merchant with new credentials
      const updatedMerchant = await storage.updateMerchant(id, {
        username: newCredentials.username,
        password: hashedPassword
      });

      if (!updatedMerchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      console.log(`🔑 Credentials reset for merchant: ${merchant.name} (${merchant.id})`);

      // Return the new credentials (plaintext for admin to share)
      res.json({
        success: true,
        merchantName: merchant.name,
        credentials: {
          username: newCredentials.username,
          password: newCredentials.password // Plain text password for admin to share
        }
      });

    } catch (error) {
      console.error("Error resetting merchant credentials:", error);
      res.status(400).json({ error: "Failed to reset credentials" });
    }
  });

  // Bulk sync KYC status for all merchants
  app.post("/api/admin/merchants/sync-kyc", requireAdmin, async (req, res) => {
    try {
      console.log('🔄 Admin triggered bulk KYC sync');
      
      const syncResults = await CybridService.bulkSyncKycStatus();
      
      res.json({
        success: true,
        message: `KYC sync completed: ${syncResults.updated} merchants updated, ${syncResults.errors} errors`,
        results: syncResults
      });

    } catch (error) {
      console.error("Error performing bulk KYC sync:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to sync KYC statuses",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sync customer types from Cybrid to merchant records
  app.post("/api/admin/merchants/sync-customer-types", requireAdmin, async (req, res) => {
    try {
      console.log('🔄 Admin triggered customer type sync from Cybrid');
      
      const syncResults = await CybridService.syncCustomerTypes();
      
      res.json({
        success: true,
        message: `Customer type sync completed: ${syncResults.updated} merchants updated, ${syncResults.errors} errors out of ${syncResults.totalCustomers} Cybrid customers`,
        results: syncResults
      });

    } catch (error) {
      console.error("Error performing customer type sync:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to sync customer types",
        message: error instanceof Error ? error.message : 'Unknown error'
      });
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

  // Cybrid customer management routes for admins
  app.post("/api/admin/merchants/:id/cybrid-customer", requireAdmin, async (req, res) => {
    try {
      const { id } = cybridCustomerParamsSchema.parse(req.params);
      const { type } = cybridCustomerCreateSchema.parse(req.body);
      const merchant = await storage.getMerchant(id);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // APPROVAL GATE: Only create Cybrid customers for approved merchants
      if (merchant.status !== 'approved') {
        return res.status(400).json({ 
          error: "Cannot create Cybrid customer for non-approved merchant",
          merchantStatus: merchant.status,
          message: "Merchant must be approved before creating Cybrid customer"
        });
      }

      // Skip if customer already exists
      if (merchant.cybridCustomerGuid) {
        return res.json({
          success: true,
          message: "Cybrid customer already exists",
          customer: {
            guid: merchant.cybridCustomerGuid,
            alreadyExists: true
          }
        });
      }

      // Create or ensure Cybrid customer exists with specified type
      const cybridCustomer = await CybridService.ensureCustomer({
        merchantId: merchant.id,
        name: merchant.name,
        email: merchant.email,
        type: type
      });

      res.json({
        success: true,
        customer: {
          guid: cybridCustomer.guid,
          name: cybridCustomer.name,
          state: cybridCustomer.state,
          type: cybridCustomer.type
        }
      });

    } catch (error) {
      console.error("Error creating Cybrid customer:", error);
      res.status(500).json({ error: "Failed to create Cybrid customer" });
    }
  });

  app.get("/api/admin/merchants/:id/cybrid-status", requireAdmin, async (req, res) => {
    try {
      const { id } = cybridCustomerParamsSchema.parse(req.params);
      const merchant = await storage.getMerchant(id);
      
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      if (!merchant.cybridCustomerGuid) {
        return res.json({
          hasCustomer: false,
          cybridCustomerGuid: null,
          integrationStatus: merchant.cybridIntegrationStatus || 'none'
        });
      }

      // Get current Cybrid customer data
      try {
        const customer = await CybridService.getCustomer(merchant.cybridCustomerGuid);
        
        res.json({
          hasCustomer: true,
          cybridCustomerGuid: merchant.cybridCustomerGuid,
          integrationStatus: merchant.cybridIntegrationStatus,
          customer: {
            guid: customer.guid,
            name: customer.name,
            state: customer.state,
            type: customer.type
          }
        });
      } catch (cybridError) {
        res.json({
          hasCustomer: true,
          cybridCustomerGuid: merchant.cybridCustomerGuid,
          integrationStatus: 'error',
          error: 'Failed to fetch Cybrid customer data'
        });
      }

    } catch (error) {
      console.error("Error fetching Cybrid status:", error);
      res.status(500).json({ error: "Failed to fetch Cybrid status" });
    }
  });

  app.get("/api/admin/merchants/:id/deposit-addresses", requireAdmin, async (req, res) => {
    try {
      const { id } = cybridCustomerParamsSchema.parse(req.params);
      const addresses = await storage.getMerchantDepositAddresses(id);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching deposit addresses:", error);
      res.status(500).json({ error: "Failed to fetch deposit addresses" });
    }
  });

  // Create trade account for KYC-completed merchant
  app.post("/api/admin/merchants/:id/create-trade-account", requireAdmin, async (req, res) => {
    try {
      const { id } = cybridCustomerParamsSchema.parse(req.params);
      const { asset } = createTradeAccountSchema.parse(req.body);
      
      // Get merchant and validate requirements
      const merchant = await storage.getMerchant(id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Validate merchant is approved
      if (merchant.status !== 'approved') {
        return res.status(400).json({ 
          error: "Merchant must be approved before creating trade account",
          merchantStatus: merchant.status
        });
      }

      // Validate merchant has Cybrid customer
      if (!merchant.cybridCustomerGuid) {
        return res.status(400).json({ 
          error: "Merchant must have Cybrid customer before creating trade account",
          message: "Create Cybrid customer first"
        });
      }

      // Check KYC status through Cybrid
      try {
        const kycStatus = await CybridService.getLatestKycStatus(merchant.cybridCustomerGuid);
        if (kycStatus.status !== 'approved') {
          return res.status(400).json({
            error: "Merchant KYC must be approved before creating trade account",
            kycStatus: kycStatus.status
          });
        }
      } catch (kycError) {
        return res.status(400).json({
          error: "Unable to verify KYC status",
          message: "KYC status check failed"
        });
      }

      // Check for existing trade account
      if (merchant.cybridTradeAccountGuid && merchant.tradeAccountAsset === asset) {
        return res.status(400).json({
          error: "Trade account already exists for this asset",
          existingAccount: {
            guid: merchant.cybridTradeAccountGuid,
            asset: merchant.tradeAccountAsset,
            status: merchant.tradeAccountStatus
          }
        });
      }

      // Update status to pending
      await storage.updateMerchant(id, {
        tradeAccountStatus: 'pending'
      });

      try {
        // Create trade account via Cybrid
        const tradeAccount = await CybridService.createTradeAccount(merchant.cybridCustomerGuid, asset);
        
        // Update merchant with successful trade account creation
        await storage.updateMerchant(id, {
          cybridTradeAccountGuid: tradeAccount.guid,
          tradeAccountStatus: 'created',
          tradeAccountAsset: asset,
          tradeAccountCreatedAt: new Date()
        });

        console.log(`✅ Successfully created ${asset} trade account for merchant ${merchant.name}: ${tradeAccount.guid}`);

        res.json({
          success: true,
          tradeAccount: {
            guid: tradeAccount.guid,
            asset: asset,
            name: tradeAccount.name,
            status: 'created',
            createdAt: new Date().toISOString()
          }
        });

      } catch (cybridError) {
        // Update status to error
        await storage.updateMerchant(id, {
          tradeAccountStatus: 'error',
          cybridLastError: cybridError instanceof Error ? cybridError.message : 'Unknown error'
        });

        console.error(`Failed to create trade account for merchant ${merchant.name}:`, cybridError);
        
        res.status(500).json({
          error: "Failed to create trade account",
          details: cybridError instanceof Error ? cybridError.message : 'Unknown error'
        });
      }

    } catch (error) {
      console.error("Error in trade account creation:", error);
      res.status(500).json({ error: "Failed to create trade account" });
    }
  });

  // Cybrid customer token endpoint for merchant KYC widget authentication  
  app.get("/api/cybrid/token", requireMerchantAuthenticated, async (req, res) => {
    try {
      const merchant = req.user as any;
      
      // Ensure merchant has a Cybrid customer GUID
      if (!merchant.cybridCustomerGuid) {
        return res.status(400).json({ 
          error: "Merchant account not linked to verification system. Please contact support." 
        });
      }

      // Create customer-scoped JWT token (NOT platform token - security fix!)
      const customerToken = await CybridService.createCustomerToken(merchant.cybridCustomerGuid);
      
      res.json({
        accessToken: customerToken.token,
        expiresIn: customerToken.expiresIn
      });
    } catch (error) {
      console.error("Failed to generate Cybrid customer token for merchant:", error);
      res.status(500).json({ 
        error: "Failed to authenticate with verification system" 
      });
    }
  });

  // Start manual KYC verification process
  app.post("/api/cybrid/start-manual-kyc", requireMerchantAuthenticated, async (req, res) => {
    try {
      const merchant = req.user as any;
      
      // Auto-create Cybrid customer for individual merchants if missing
      let cybridCustomerGuid = merchant.cybridCustomerGuid;
      
      if (!cybridCustomerGuid) {
        // For individual merchants, auto-create Cybrid customer to start KYC
        if (merchant.cybridCustomerType === 'individual') {
          console.log(`Auto-creating Cybrid customer for individual merchant ${merchant.id}`);
          
          const cybridCustomer = await CybridService.ensureCustomer({
            merchantId: merchant.id,
            name: merchant.name,
            email: merchant.email,
            type: 'individual'
          });
          
          cybridCustomerGuid = cybridCustomer.guid;
          console.log(`Created Cybrid customer ${cybridCustomerGuid} for individual merchant ${merchant.id}`);
        } else {
          // Business merchants need admin approval first
          return res.status(400).json({ 
            error: "Business merchant account requires admin approval before KYC verification. Please contact support." 
          });
        }
      }

      console.log(`Starting manual KYC for merchant ${merchant.id} with Cybrid customer ${cybridCustomerGuid}`);

      // Create identity verification and persona session
      const result = await CybridService.createManualKycVerification(merchant.cybridCustomerGuid);
      
      // Update merchant with verification GUID for tracking
      await storage.updateMerchant(merchant.id, {
        cybridVerificationGuid: result.verificationGuid,
        kybStatus: 'in_review',
        cybridLastSyncedAt: new Date()
      });
      
      res.json({
        success: true,
        verificationGuid: result.verificationGuid,
        inquiryId: result.inquiryId,
        redirectUrl: result.redirectUrl,
        clientToken: result.clientToken
      });
      
    } catch (error) {
      console.error("Failed to start manual KYC:", error);
      res.status(500).json({ 
        error: "Failed to start identity verification. Please try again." 
      });
    }
  });

  // Get KYC verification status using list endpoint for enhanced reliability
  app.get("/api/cybrid/kyc-status", requireMerchantAuthenticated, async (req, res) => {
    try {
      const merchant = req.user as any;
      
      if (!merchant.cybridCustomerGuid) {
        return res.json({ status: 'pending' });
      }

      // Use list endpoint approach to get latest KYC status for customer
      const statusResult = await CybridService.getLatestKycStatus(merchant.cybridCustomerGuid);
      
      // Update merchant record if status changed
      if (statusResult.status !== merchant.kybStatus) {
        const updateData: any = {
          kybStatus: statusResult.status,
          cybridLastSyncedAt: new Date()
        };
        
        // Update verification GUID if available
        if (statusResult.verificationGuid) {
          updateData.cybridVerificationGuid = statusResult.verificationGuid;
        }
        
        await storage.updateMerchant(merchant.id, updateData);
      }
      
      res.json({
        status: statusResult.status,
        state: statusResult.state,
        outcome: statusResult.outcome,
        verificationGuid: statusResult.verificationGuid,
        personaUrl: statusResult.personaUrl
      });
      
    } catch (error) {
      console.error("Failed to get KYC status:", error);
      res.status(500).json({ 
        error: "Failed to get verification status" 
      });
    }
  });

  // Cybrid webhook endpoint for receiving verification status updates  
  app.post("/api/webhooks/cybrid", async (req: any, res) => {
    try {
      const signature = req.headers['x-cybrid-signature'] as string;
      const timestamp = req.headers['x-cybrid-timestamp'] as string;
      const body = req.rawBody || req.body;

      // Verify required webhook headers
      if (!signature || !timestamp) {
        console.warn('Cybrid webhook missing required headers');
        return res.status(400).json({ error: 'Missing required webhook headers' });
      }

      // Verify webhook signature with HMAC (includes timestamp to prevent replay)
      const webhookSecret = process.env.CYBRID_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('CYBRID_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook secret not configured' });
      }

      const crypto = require('crypto');
      // Include timestamp in signature calculation to prevent replay attacks
      const signedData = `${timestamp}.${body}`;
      const expectedSignature = crypto.createHmac('sha256', webhookSecret)
        .update(signedData)
        .digest('hex');
      
      // Validate signature format and remove prefix
      if (!signature.startsWith('sha256=')) {
        console.warn('Invalid Cybrid webhook signature format');
        return res.status(401).json({ error: 'Invalid signature format' });
      }
      
      const receivedSignature = signature.replace('sha256=', '');
      
      // Validate signature lengths before comparison
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(receivedSignature, 'hex');
      
      if (expectedBuffer.length !== receivedBuffer.length) {
        console.warn('Cybrid webhook signature length mismatch');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
        console.warn('Cybrid webhook signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Check timestamp to prevent replay attacks (5 minute window)
      const webhookTimestamp = parseInt(timestamp, 10);
      if (isNaN(webhookTimestamp)) {
        console.warn('Invalid Cybrid webhook timestamp format');
        return res.status(400).json({ error: 'Invalid timestamp format' });
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - webhookTimestamp) > 300) {
        console.warn('Cybrid webhook timestamp too old or too far in future');
        return res.status(400).json({ error: 'Invalid timestamp' });
      }

      // Parse the webhook payload
      let payload;
      try {
        payload = JSON.parse(body.toString());
      } catch (error) {
        console.error('Failed to parse Cybrid webhook payload:', error);
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }

      console.log(`Received Cybrid webhook: ${payload.type} for ${payload.object?.guid}`);

      // Check for event ID to prevent duplicate processing (use payload data only, not headers)
      const eventId = payload.id || payload.event_id || crypto.createHash('sha256').update(body).digest('hex').slice(0, 16);
      
      // Check if we've already processed this event
      const existingEvent = await storage.getWebhookEvent(eventId);
      if (existingEvent) {
        console.log(`Webhook event ${eventId} already processed, returning success`);
        return res.status(200).json({ received: true, type: payload.type, status: 'duplicate' });
      }

      // Store webhook event for idempotency
      await storage.createWebhookEvent({
        eventId: eventId,
        eventType: payload.type,
        payload: payload
      });

      // Handle different webhook event types
      switch (payload.type) {
        case 'identity_verification.completed':
        case 'identity_verification.passed':
          await handleIdentityVerificationCompleted(payload.object);
          break;
        case 'identity_verification.failed':
        case 'identity_verification.rejected':
          await handleIdentityVerificationFailed(payload.object);
          break;
        case 'customer.storing':
          await handleCustomerStoring(payload.object);
          break;
        default:
          console.log(`Unhandled Cybrid webhook event type: ${payload.type}`);
      }

      // Return success response to Cybrid
      res.status(200).json({ received: true, type: payload.type });

    } catch (error) {
      console.error('Error processing Cybrid webhook:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Webhook handler functions for Cybrid events
  async function handleIdentityVerificationCompleted(verificationData: any) {
    try {
      const customerGuid = verificationData.customer_guid;
      const verificationGuid = verificationData.guid;
      const outcome = verificationData.outcome;

      console.log(`Identity verification completed: ${verificationGuid} with outcome: ${outcome}`);

      // Find merchant by Cybrid customer GUID
      const merchant = await storage.getMerchantByCybridGuid(customerGuid);
      if (!merchant) {
        console.error(`No merchant found for Cybrid customer GUID: ${customerGuid}`);
        return;
      }

      // Update merchant verification status based on outcome
      let kybStatus = 'pending';
      let cybridIntegrationStatus = 'active';
      
      if (outcome === 'passed') {
        kybStatus = 'approved';
        
        // AUTOMATED SEQUENCE: Create trade account first, then deposit wallet
        console.log(`🚀 Starting automated account creation for verified merchant ${merchant.id}`);
        
        try {
          // Step 1: Create USDC trade account automatically
          console.log(`Step 1: Creating USDC trade account for customer ${customerGuid}`);
          const tradeAccount = await CybridService.createTradeAccount(customerGuid, 'USDC');
          
          // Update merchant with trade account details
          await storage.updateMerchant(merchant.id, {
            cybridTradeAccountGuid: tradeAccount.guid,
            tradeAccountAsset: 'USDC',
            tradeAccountStatus: 'created',
            cybridLastSyncedAt: new Date()
          });
          
          console.log(`✅ Step 1 complete: USDC trade account created: ${tradeAccount.guid}`);
          
          // Step 2: Create deposit address for the trade account
          console.log(`Step 2: Creating deposit address for trade account ${tradeAccount.guid}`);
          const depositAddress = await CybridService.createDepositAddress(tradeAccount.guid, 'USDC');
          
          // Update merchant with deposit address details
          await storage.updateMerchant(merchant.id, {
            depositAddressGuid: depositAddress.guid,
            depositAddress: depositAddress.address,
            depositAddressAsset: 'USDC',
            depositAddressStatus: 'created',
            cybridLastSyncedAt: new Date()
          });
          
          console.log(`✅ Step 2 complete: Deposit address created: ${depositAddress.address}`);
          console.log(`🎉 AUTOMATION SUCCESS: Trade account and deposit wallet created for merchant ${merchant.id}`);
          
        } catch (automationError) {
          console.error(`❌ AUTOMATION FAILED for merchant ${merchant.id}:`, automationError);
          
          // Update merchant record to indicate automation failure
          await storage.updateMerchant(merchant.id, {
            tradeAccountStatus: 'error',
            depositAddressStatus: 'error',
            cybridLastError: automationError instanceof Error ? automationError.message : 'Account creation failed',
            cybridLastSyncedAt: new Date()
          });
        }
        
      } else if (outcome === 'failed') {
        kybStatus = 'rejected';
        cybridIntegrationStatus = 'error';
      }

      // Update merchant record with verification results
      await storage.updateMerchant(merchant.id, {
        kybStatus: kybStatus,
        cybridIntegrationStatus: cybridIntegrationStatus,
        cybridVerificationGuid: verificationGuid,
        cybridLastSyncedAt: new Date()
      });

      console.log(`Updated merchant ${merchant.id} with verification status: ${kybStatus}`);

    } catch (error) {
      console.error('Error handling identity verification completed:', error);
    }
  }

  async function handleIdentityVerificationFailed(verificationData: any) {
    try {
      const customerGuid = verificationData.customer_guid;
      const verificationGuid = verificationData.guid;

      console.log(`Identity verification failed: ${verificationGuid}`);

      // Find merchant by Cybrid customer GUID
      const merchant = await storage.getMerchantByCybridGuid(customerGuid);
      if (!merchant) {
        console.error(`No merchant found for Cybrid customer GUID: ${customerGuid}`);
        return;
      }

      // Update merchant record with failure status
      await storage.updateMerchant(merchant.id, {
        kybStatus: 'rejected',
        cybridIntegrationStatus: 'error',
        cybridVerificationGuid: verificationGuid,
        cybridLastError: verificationData.failure_reason || 'Verification failed',
        cybridLastSyncedAt: new Date()
      });

      console.log(`Updated merchant ${merchant.id} with failed verification status`);

    } catch (error) {
      console.error('Error handling identity verification failed:', error);
    }
  }

  async function handleCustomerStoring(customerData: any) {
    try {
      const customerGuid = customerData.guid;
      
      console.log(`Customer storing state reached: ${customerGuid}`);

      // Find merchant by Cybrid customer GUID
      const merchant = await storage.getMerchantByCybridGuid(customerGuid);
      if (!merchant) {
        console.error(`No merchant found for Cybrid customer GUID: ${customerGuid}`);
        return;
      }

      // Update merchant integration status to active when customer reaches storing state
      await storage.updateMerchant(merchant.id, {
        cybridIntegrationStatus: 'active',
        cybridLastSyncedAt: new Date()
      });

      console.log(`Updated merchant ${merchant.id} integration status to active`);

    } catch (error) {
      console.error('Error handling customer storing:', error);
    }
  }

  // Merchant portal routes (require merchant authentication)
  app.get("/api/merchant/dashboard", requireMerchant, async (req, res) => {
    // Return merchant-specific dashboard data
    res.json({
      transactions: [],
      balance: "$0.00",
      integrations: req.user?.integrations || []
    });
  });

  // Merchant credential management routes
  // Get all credentials for a merchant
  app.get("/api/merchant/credentials", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.user!.id;
      const credentials = await storage.getAllMerchantCredentials(merchantId);
      
      // Return credentials without sensitive data
      const safeCreds = credentials.map(cred => ({
        id: cred.id,
        provider: cred.provider,
        environment: cred.environment,
        isActive: cred.isActive,
        createdAt: cred.createdAt,
        hasApiKey: !!cred.encryptedApiKey,
        hasApiSecret: !!cred.encryptedApiSecret
      }));
      
      res.json(safeCreds);
    } catch (error) {
      console.error("Error fetching merchant credentials:", error);
      res.status(500).json({ error: "Failed to fetch credentials" });
    }
  });

  // Get specific Transak credentials for a merchant (for form pre-population)
  app.get("/api/merchant/credentials/transak", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.user!.id;
      const credentials = await storage.getMerchantCredentials(merchantId, 'transak');
      
      if (!credentials) {
        return res.json({
          provider: 'transak',
          environment: 'staging',
          hasApiKey: false,
          hasApiSecret: false,
          isActive: false
        });
      }
      
      // Return credentials without sensitive data but with environment for form
      res.json({
        provider: 'transak',
        environment: credentials.environment,
        hasApiKey: !!credentials.encryptedApiKey,
        hasApiSecret: !!credentials.encryptedApiSecret,
        isActive: credentials.isActive,
        createdAt: credentials.createdAt
      });
    } catch (error) {
      console.error("Error fetching Transak credentials:", error);
      res.status(500).json({ error: "Failed to fetch Transak credentials" });
    }
  });

  // Save/update Transak credentials
  app.post("/api/merchant/credentials/transak", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.user!.id;
      const { apiKey, apiSecret, environment } = transakCredentialsSchema.parse(req.body);

      // Encrypt credentials
      const encryptedApiKey = CredentialEncryption.encrypt(apiKey);
      const encryptedApiSecret = CredentialEncryption.encrypt(apiSecret);

      // Check if credentials already exist
      const existing = await storage.getMerchantCredentials(merchantId, 'transak');
      
      let result;
      if (existing) {
        // Update existing credentials
        result = await storage.updateMerchantCredentials(merchantId, 'transak', {
          encryptedApiKey,
          encryptedApiSecret,
          environment,
          isActive: true
        });
      } else {
        // Create new credentials
        result = await storage.createMerchantCredentials({
          merchantId,
          provider: 'transak',
          encryptedApiKey,
          encryptedApiSecret,
          environment,
          isActive: true
        });
      }

      res.json({
        success: true,
        provider: 'transak',
        environment: result?.environment,
        hasApiKey: true,
        hasApiSecret: true
      });
    } catch (error) {
      console.error("Error saving Transak credentials:", error);
      res.status(400).json({ error: "Failed to save credentials" });
    }
  });

  // Delete credentials
  app.delete("/api/merchant/credentials/:provider", requireMerchant, async (req, res) => {
    try {
      const merchantId = req.user!.id;
      const { provider } = req.params;
      
      const success = await storage.deleteMerchantCredentials(merchantId, provider);
      
      if (!success) {
        return res.status(404).json({ error: "Credentials not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting credentials:", error);
      res.status(500).json({ error: "Failed to delete credentials" });
    }
  });

  // Helper function to get Transak service using platform-level credentials
  const getTransakService = async (merchantId: string): Promise<TransakService> => {
    const apiKey = process.env.TRANSAK_API_KEY;
    const apiSecret = process.env.TRANSAK_API_SECRET;
    const environment = (process.env.TRANSAK_ENVIRONMENT || 'staging') as 'staging' | 'production';
    
    if (!apiKey) {
      throw new Error('Platform Transak credentials not configured: TRANSAK_API_KEY environment variable is required');
    }

    if (!apiSecret) {
      throw new Error('Platform Transak credentials not configured: TRANSAK_API_SECRET environment variable is required');
    }

    return new TransakService({
      apiKey,
      apiSecret,
      environment
    }, merchantId);
  };

  // Transak API endpoints


  // POST /pricing - Get real-time pricing
  app.post("/api/transak/pricing", requireMerchant, async (req, res) => {
    try {
      const transak = await getTransakService(req.user!.id);
      const pricing = await transak.getPricing(req.body);
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching pricing:", error);
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

  // POST /quote - Create transaction quote
  app.post("/api/transak/quote", requireMerchant, async (req, res) => {
    try {
      const transak = await getTransakService(req.user!.id);
      const quote = await transak.createQuote(req.body);
      res.json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // POST /validate-wallet - Validate wallet addresses
  app.post("/api/transak/validate-wallet", requireMerchant, async (req, res) => {
    try {
      const transak = await getTransakService(req.user!.id);
      const validation = await transak.validateWallet(req.body);
      res.json(validation);
    } catch (error) {
      console.error("Error validating wallet:", error);
      res.status(500).json({ error: "Failed to validate wallet" });
    }
  });

  // POST /access-token - Generate access token for Transak API using stored credentials
  app.post("/api/transak/access-token", requireMerchant, async (req, res) => {
    try {
      const transak = await getTransakService(req.user!.id);
      const tokenData = await transak.generateAccessToken();
      res.json({
        success: true,
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expiresIn
      });
    } catch (error) {
      console.error("Error generating access token:", error);
      res.status(500).json({ error: "Failed to generate access token" });
    }
  });


  // POST /pricing-quote - Get pricing quote using platform-wide credentials
  app.post("/api/merchant/transak/pricing-quote", requireMerchant, requireMerchantKycVerified, async (req, res) => {
    try {
      const { cryptoAmount, cryptoNetworkCombined, fiatCurrency, paymentMethod } = req.body;

      // Validate required fields
      if (!cryptoAmount || !cryptoNetworkCombined || !fiatCurrency || !paymentMethod) {
        return res.status(400).json({ 
          error: "Missing required fields: cryptoAmount, cryptoNetworkCombined, fiatCurrency, paymentMethod" 
        });
      }

      // Parse crypto and network from combined value (e.g., "USDC-ethereum")
      const [cryptoCurrency, network] = cryptoNetworkCombined.split('-');
      
      if (!cryptoCurrency || !network) {
        return res.status(400).json({ 
          error: "Invalid cryptoNetworkCombined format. Expected format: 'CRYPTO-network'" 
        });
      }

      // Debug logging - explicitly log to ensure visibility
      console.error(`[DEBUG] PaymentMethod attempted: "${paymentMethod}"`);
      console.error(`[DEBUG] Full pricing request:`, JSON.stringify({
        cryptoAmount,
        cryptoCurrency,
        fiatCurrency,
        network,
        paymentMethod
      }, null, 2));

      // Call Transak pricing API using platform-wide credentials
      const transakResponse = await PublicTransakService.getPricingQuote({
        cryptoAmount,
        cryptoCurrency,
        fiatCurrency,
        network,
        paymentMethod
      });

      // Extract the actual quote data from Transak's nested response structure
      const quote = transakResponse.response;
      
      if (!quote) {
        throw new Error("Invalid response structure from Transak API");
      }

      // Format response for frontend with real Transak data
      const formattedQuote = {
        id: quote.quoteId,
        partnerOrderId: `order_${Date.now()}`,
        cryptoAmount: quote.cryptoAmount,
        cryptoCurrency: quote.cryptoCurrency,
        fiatAmount: quote.fiatAmount,
        fiatCurrency: quote.fiatCurrency,
        paymentMethod: quote.paymentMethod,
        network: quote.network,
        conversionRate: quote.conversionPrice,
        marketRate: quote.marketConversionPrice,
        slippage: quote.slippage,
        totalFee: quote.totalFee,
        feeBreakdown: quote.feeBreakdown || [],
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min from now
        isBuyOrSell: quote.isBuyOrSell,
        nonce: quote.nonce
      };

      res.json(formattedQuote);
    } catch (error) {
      console.error("Error fetching pricing quote:", error);
      res.status(500).json({ error: "Failed to fetch pricing quote" });
    }
  });

  // POST /create-session - Create Transak widget session for payment processing
  app.post("/api/merchant/transak/create-session", requireMerchant, requireMerchantKycVerified, async (req, res) => {
    try {
      // Validate request body using Zod schema
      const validatedData = createTransakSessionSchema.parse(req.body);

      // Get Transak service instance for the merchant
      const transak = await getTransakService(req.user!.id);
      
      // Create session using the Transak service (now returns normalized { widgetUrl } response)
      const sessionResponse = await transak.createSession(validatedData);

      // Store the Transak session URL and create a masked payment link
      const paymentLink = await storage.createPaymentLink({
        sessionUrl: sessionResponse.widgetUrl,
        merchantId: req.user!.id
      });

      // Create the masked URL - use the request's host to create a proper URL
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const maskedUrl = `${protocol}://${host}/pay/${paymentLink.id}`;

      // Return normalized response format with masked URL
      res.json({
        success: true,
        widgetUrl: maskedUrl
      });
    } catch (error) {
      console.error("Error creating Transak session:", error);
      
      // Handle validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: (error as any).issues
        });
      }
      
      // Handle Transak API errors
      if (error instanceof Error && error.message.includes('Transak')) {
        return res.status(502).json({ 
          error: "Payment provider error", 
          details: error.message 
        });
      }
      
      // Generic error fallback
      res.status(500).json({ error: "Failed to create payment session" });
    }
  });

  // POST /offramp-pricing-quote - Get pricing quote for SELL operations using platform-wide credentials
  app.post("/api/merchant/transak/offramp-pricing-quote", requireMerchant, requireMerchantKycVerified, async (req, res) => {
    try {
      const { cryptoAmount, cryptoNetworkCombined, fiatCurrency, payoutMethod, walletAddress } = req.body;

      // Validate required fields
      if (!cryptoAmount || !cryptoNetworkCombined || !fiatCurrency || !payoutMethod) {
        return res.status(400).json({ 
          error: "Missing required fields: cryptoAmount, cryptoNetworkCombined, fiatCurrency, payoutMethod" 
        });
      }

      // Parse crypto and network from combined value (e.g., "USDC-ethereum")
      const [cryptoCurrency, network] = cryptoNetworkCombined.split('-');
      
      if (!cryptoCurrency || !network) {
        return res.status(400).json({ 
          error: "Invalid cryptoNetworkCombined format. Expected format: 'CRYPTO-network'" 
        });
      }

      // Debug logging
      console.error(`[DEBUG] Offramp PaymentMethod attempted: "${payoutMethod}"`);
      console.error(`[DEBUG] Full offramp pricing request:`, JSON.stringify({
        cryptoAmount,
        cryptoCurrency,
        fiatCurrency,
        network,
        payoutMethod,
        walletAddress
      }, null, 2));

      // Call Transak pricing API for SELL operations using platform-wide credentials
      const transakResponse = await PublicTransakService.getOfframpPricingQuote({
        cryptoAmount,
        cryptoCurrency,
        fiatCurrency,
        network,
        paymentMethod: payoutMethod
      });

      // Extract the actual quote data from Transak's nested response structure
      const quote = transakResponse.response;
      
      if (!quote) {
        throw new Error("Invalid response structure from Transak API");
      }

      // Format response for frontend with real Transak data
      const formattedQuote = {
        id: quote.quoteId,
        cryptoAmount: quote.cryptoAmount,
        cryptoCurrency: quote.cryptoCurrency,
        fiatAmount: quote.fiatAmount,
        fiatCurrency: quote.fiatCurrency,
        payoutMethod: quote.paymentMethod,
        network: quote.network,
        conversionRate: quote.conversionPrice,
        marketRate: quote.marketConversionPrice,
        slippage: quote.slippage,
        totalFee: quote.totalFee,
        feeBreakdown: quote.feeBreakdown || [],
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min from now
        isBuyOrSell: 'SELL',
        nonce: quote.nonce
      };

      res.json(formattedQuote);
    } catch (error) {
      console.error("Error fetching offramp pricing quote:", error);
      res.status(500).json({ error: "Failed to fetch offramp pricing quote" });
    }
  });

  // POST /demo-session - Public demo endpoint to create a Transak session with dummy data
  app.post("/api/public/transak/demo-session", async (req, res) => {
    try {
      console.log('[DEBUG] Creating demo Transak session with dummy data...');
      
      // Use platform-wide Transak credentials for demo
      const apiKey = process.env.TRANSAK_API_KEY;
      const apiSecret = process.env.TRANSAK_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: "Transak credentials not configured" });
      }

      // Create demo session data with dummy parameters
      const demoSessionData = {
        walletAddress: "0x742d35Cc9Cf6aB6a8B8f8E8D0e97e3f7b6a5c4d3",
        customerEmail: "test@example.com",
        referrerDomain: "google.com",
        themeColor: "1f4a8c",
        redirectURL: "https://cryptopay.replit.app/transaction-complete",
        quoteData: {
          cryptoAmount: 100,
          cryptoCurrency: "USDC",
          fiatCurrency: "USD",
          network: "ethereum",
          paymentMethod: "credit_debit_card",
          isBuyOrSell: 'SELL' as const
        }
      };

      // Create Transak service instance with platform credentials
      const transak = new TransakService({
        apiKey,
        apiSecret,
        environment: 'staging'
      }, 'demo');
      
      // Create demo offramp session
      const sessionResponse = await transak.createOfframpSession(demoSessionData);

      console.log('[DEBUG] Demo session created successfully:', sessionResponse);

      // Return the session URL directly
      res.json({
        success: true,
        sessionUrl: sessionResponse.widgetUrl,
        dummyData: demoSessionData,
        message: "Demo Transak session created with dummy parameters"
      });
    } catch (error) {
      console.error("[DEBUG] Error creating demo Transak session:", error);
      res.status(500).json({ 
        error: "Failed to create demo Transak session", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /test-offramp-session - Test endpoint to create a SELL session with sample data
  app.post("/api/merchant/transak/test-offramp-session", requireMerchant, requireMerchantKycVerified, async (req, res) => {
    try {
      console.log('[DEBUG] Creating test offramp session...');
      
      // Create test session data matching your curl structure
      const testSessionData = {
        walletAddress: "0x1234567890123456789012345678901234567890",
        customerEmail: "test@cryptopay.com",
        referrerDomain: "google.com",
        themeColor: "1f4a8c",
        redirectURL: "https://cryptopay.replit.app/transaction-complete",
        quoteData: {
          cryptoAmount: 150,
          cryptoCurrency: "USDC",
          fiatCurrency: "USD",
          network: "ethereum",
          paymentMethod: "credit_debit_card",
          isBuyOrSell: 'SELL' as const
        }
      };

      // Get Transak service instance for the merchant
      const transak = await getTransakService(req.user!.id);
      
      // Create test offramp session
      const sessionResponse = await transak.createOfframpSession(testSessionData);

      console.log('[DEBUG] Test session created successfully:', sessionResponse);

      // Return the session URL directly for testing
      res.json({
        success: true,
        widgetUrl: sessionResponse.widgetUrl,
        testData: testSessionData
      });
    } catch (error) {
      console.error("[DEBUG] Error creating test offramp session:", error);
      res.status(500).json({ 
        error: "Failed to create test offramp session", 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // POST /create-offramp-session - Create Transak widget session for offramp processing
  app.post("/api/merchant/transak/create-offramp-session", requireMerchant, requireMerchantKycVerified, async (req, res) => {
    try {
      console.log('[DEBUG] Raw request body for offramp session:', JSON.stringify(req.body, null, 2));
      // Validate request body - reuse the existing schema but modify for SELL operation
      const validatedData = createTransakSessionSchema.parse(req.body);
      console.log('[DEBUG] Validated data:', JSON.stringify(validatedData, null, 2));

      // Override isBuyOrSell to SELL for offramp operations
      const offrampSessionData = {
        ...validatedData,
        quoteData: {
          ...validatedData.quoteData,
          isBuyOrSell: 'SELL' as const
        }
      };

      // Get Transak service instance for the merchant
      const transak = await getTransakService(req.user!.id);
      
      // Create offramp session using the Transak service
      const sessionResponse = await transak.createOfframpSession(offrampSessionData);

      // Store the Transak session URL and create a masked payment link
      const paymentLink = await storage.createPaymentLink({
        sessionUrl: sessionResponse.widgetUrl,
        merchantId: req.user!.id
      });

      // Create the masked URL - use the request's host to create a proper URL
      const protocol = req.secure ? 'https' : 'http';
      const host = req.get('host');
      const maskedUrl = `${protocol}://${host}/pay/${paymentLink.id}`;

      // Return both masked URL and direct Transak URL for flexibility
      res.json({
        success: true,
        widgetUrl: maskedUrl, // Masked payment link for security
        directTransakUrl: sessionResponse.widgetUrl // Direct unmasked Transak URL
      });
    } catch (error) {
      console.error("Error creating Transak offramp session:", error);
      
      // Handle validation errors specifically
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: (error as any).issues
        });
      }
      
      // Handle Transak API errors
      if (error instanceof Error && error.message.includes('Transak')) {
        return res.status(502).json({ 
          error: "Payment provider error", 
          details: error.message 
        });
      }
      
      // Generic error fallback
      res.status(500).json({ error: "Failed to create offramp session" });
    }
  });

  // Public Transak API endpoints (no authentication required)
  // GET crypto currencies - Public endpoint for Receive Crypto page
  app.get("/api/public/transak/crypto-currencies", async (req, res) => {
    try {
      const cryptoCurrencies = await PublicTransakService.getCryptoCurrencies();
      res.json(cryptoCurrencies);
    } catch (error) {
      console.error("Error fetching crypto currencies:", error);
      res.status(500).json({ error: "Failed to fetch crypto currencies" });
    }
  });

  // GET fiat currencies - Public endpoint for Receive Crypto page
  app.get("/api/public/transak/fiat-currencies", async (req, res) => {
    try {
      const fiatCurrencies = await PublicTransakService.getFiatCurrencies();
      res.json(fiatCurrencies);
    } catch (error) {
      console.error("Error fetching fiat currencies:", error);
      res.status(500).json({ error: "Failed to fetch fiat currencies" });
    }
  });



  // Note: /getcurrencies endpoint doesn't exist in Transak API
  // The crypto-currencies endpoint already has all needed data including networks and images

  // GET verify wallet address - Public endpoint for wallet validation
  app.get("/api/public/transak/verify-wallet-address", async (req, res) => {
    try {
      const { cryptoCurrency, network = 'mainnet', walletAddress } = req.query;
      
      if (!cryptoCurrency || !walletAddress) {
        return res.status(400).json({ error: "cryptoCurrency and walletAddress are required" });
      }

      try {
        const validation = await PublicTransakService.verifyWalletAddress(
          cryptoCurrency as string,
          network as string,
          walletAddress as string
        );
        
        // If successful, return the validation result
        // Transak returns {response: true, success: true} for valid addresses
        res.json({
          isValid: validation?.response === true && validation?.success === true,
          ...validation
        });
      } catch (validationError: any) {
        // If validation fails due to invalid address, return isValid: false with 200 status
        console.log("Wallet address validation failed:", validationError.message);
        res.json({ 
          isValid: false,
          error: "Invalid wallet address format or unsupported network"
        });
      }
    } catch (error) {
      console.error("Error verifying wallet address:", error);
      res.status(500).json({ error: "Failed to verify wallet address" });
    }
  });

  // Payment link redirect endpoint - redirects masked payment URLs to actual Transak sessions
  app.get("/pay/:linkId", async (req, res) => {
    try {
      const { linkId } = req.params;
      
      if (!linkId) {
        return res.status(400).json({ error: "Link ID is required" });
      }
      
      // Retrieve the payment link from storage
      const paymentLink = await storage.getPaymentLink(linkId);
      
      if (!paymentLink) {
        return res.status(404).json({ 
          error: "Payment link not found or expired",
          message: "This payment link is either invalid or has expired. Please request a new payment link."
        });
      }
      
      // Redirect to the actual Transak session URL
      res.redirect(302, paymentLink.sessionUrl);
      
    } catch (error) {
      console.error("Error redirecting payment link:", error);
      res.status(500).json({ error: "Failed to process payment link" });
    }
  });

  // Create deposit address for a merchant's trade account (admin only)
  app.post('/api/admin/merchants/:id/create-deposit-address', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { asset = 'USDC' } = req.body;

      // Validate request body
      const validatedBody = createTradeAccountSchema.parse({ asset });

      // Get merchant details
      const merchant = await storage.getMerchant(id);
      if (!merchant) {
        return res.status(404).json({ error: "Merchant not found" });
      }

      // Check if merchant is approved
      if (merchant.status !== 'approved') {
        return res.status(400).json({
          error: "Merchant must be approved before creating deposit addresses",
          merchantStatus: merchant.status
        });
      }

      // Check if merchant has Cybrid customer
      if (!merchant.cybridCustomerGuid) {
        return res.status(400).json({
          error: "Merchant must have a Cybrid customer account",
          message: "Create Cybrid customer first"
        });
      }

      // Check if merchant has active trade account for this asset
      if (!merchant.cybridTradeAccountGuid || merchant.tradeAccountAsset !== asset || merchant.tradeAccountStatus !== 'created') {
        return res.status(400).json({
          error: "Merchant must have an active trade account for this asset",
          message: `Create a ${asset} trade account first`,
          tradeAccountStatus: merchant.tradeAccountStatus
        });
      }

      // Check for existing deposit address for this asset
      if (merchant.depositAddressGuid && merchant.depositAddressAsset === asset) {
        return res.status(400).json({
          error: "Deposit address already exists for this asset",
          existingAddress: {
            guid: merchant.depositAddressGuid,
            address: merchant.depositAddress,
            asset: merchant.depositAddressAsset,
            status: merchant.depositAddressStatus
          }
        });
      }

      // Update status to pending
      await storage.updateMerchant(id, {
        depositAddressStatus: 'pending'
      });

      try {
        // Create deposit address via Cybrid
        const depositAddress = await CybridService.createDepositAddress(merchant.cybridTradeAccountGuid, asset);
        
        // Update merchant with successful deposit address creation
        await storage.updateMerchant(id, {
          depositAddressGuid: depositAddress.guid,
          depositAddress: depositAddress.address,
          depositAddressStatus: 'created',
          depositAddressAsset: asset,
          depositAddressCreatedAt: new Date()
        });

        console.log(`✅ Successfully created ${asset} deposit address for merchant ${merchant.name}: ${depositAddress.address}`);

        res.json({
          success: true,
          depositAddress: {
            guid: depositAddress.guid,
            address: depositAddress.address,
            asset: asset,
            status: 'created',
            createdAt: new Date().toISOString()
          }
        });

      } catch (cybridError) {
        // Update status to error
        await storage.updateMerchant(id, {
          depositAddressStatus: 'error',
          cybridLastError: cybridError instanceof Error ? cybridError.message : 'Unknown error'
        });

        console.error(`Failed to create deposit address for merchant ${merchant.name}:`, cybridError);
        
        // Parse Cybrid error for specific error handling
        const errorMessage = cybridError instanceof Error ? cybridError.message : 'Unknown error';
        
        // Check for specific Cybrid error conditions
        if (errorMessage.includes('unverified_customer') || errorMessage.includes('Customer has not been verified')) {
          return res.status(400).json({
            error: "Customer verification required",
            message: "The Cybrid customer account must be verified before creating deposit addresses. Please complete the KYC verification process in Cybrid first.",
            details: errorMessage
          });
        }
        
        if (errorMessage.includes('422')) {
          return res.status(400).json({
            error: "Invalid request",
            message: "The deposit address creation request was invalid. Please check the account status and try again.",
            details: errorMessage
          });
        }
        
        res.status(500).json({
          error: "Failed to create deposit address",
          details: errorMessage
        });
      }

    } catch (error) {
      console.error("Error in deposit address creation:", error);
      res.status(500).json({ error: "Failed to create deposit address" });
    }
  });

  // DEVELOPMENT: Test endpoint to simulate KYC completion webhook for automation testing
    app.post('/api/test/simulate-kyc-completion', requireAdmin, async (req, res) => {
      try {
        const { merchantId, outcome = 'passed' } = req.body;
        
        if (!merchantId) {
          return res.status(400).json({ error: 'merchantId required' });
        }
        
        // Get merchant details
        const merchant = await storage.getMerchant(merchantId);
        if (!merchant) {
          return res.status(404).json({ error: 'Merchant not found' });
        }
        
        if (!merchant.cybridCustomerGuid) {
          return res.status(400).json({ error: 'Merchant has no Cybrid customer GUID' });
        }
        
        console.log(`🧪 TEST: Simulating KYC completion for merchant ${merchantId} with outcome: ${outcome}`);
        
        // Simulate the webhook payload
        const mockVerificationData = {
          customer_guid: merchant.cybridCustomerGuid,
          guid: `test-verification-${Date.now()}`,
          outcome: outcome,
          state: 'completed'
        };
        
        // Call the same handler that processes real webhooks
        await handleIdentityVerificationCompleted(mockVerificationData);
        
        res.json({
          success: true,
          message: `Simulated KYC completion for merchant ${merchant.name}`,
          merchantId: merchantId,
          outcome: outcome,
          automationTriggered: outcome === 'passed'
        });
        
      } catch (error) {
        console.error('Error in KYC simulation:', error);
        res.status(500).json({ error: 'Simulation failed' });
      }
    });
  }

  const httpServer = createServer(app);

  return httpServer;
}
