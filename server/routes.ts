import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initAuthCore, requireAdmin, requireMerchant } from "./auth-core";
import { setupMerchantAuth, hashPassword, generateMerchantCredentials } from "./merchant-auth";
import { setupAdminAuth, hashPassword as hashAdminPassword, generateAdminCredentials } from "./admin-auth";
import { adminCreateMerchantSchema, insertAdminSchema, transakCredentialsSchema, createTransakSessionSchema } from "@shared/schema";
import { TransakService, CredentialEncryption, PublicTransakService } from "./transak-service";

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
  app.post("/api/merchant/transak/pricing-quote", requireMerchant, async (req, res) => {
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
  app.post("/api/merchant/transak/create-session", requireMerchant, async (req, res) => {
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
  app.post("/api/merchant/transak/offramp-pricing-quote", requireMerchant, async (req, res) => {
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
        partnerOrderId: `offramp_order_${Date.now()}`,
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

  // POST /create-offramp-session - Create Transak widget session for offramp processing
  app.post("/api/merchant/transak/create-offramp-session", requireMerchant, async (req, res) => {
    try {
      // Validate request body - reuse the existing schema but modify for SELL operation
      const validatedData = createTransakSessionSchema.parse(req.body);

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

      // Return normalized response format with masked URL
      res.json({
        success: true,
        widgetUrl: maskedUrl
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

  const httpServer = createServer(app);

  return httpServer;
}
