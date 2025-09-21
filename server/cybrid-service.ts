import { TokenCache } from './token-cache';
import { storage } from './storage';
import { CredentialEncryption } from './transak-service';

export interface CybridCustomer {
  guid: string;
  type: string;
  name: string;
  external_customer_id: string;
  bank_guid: string;
  state: string;
  created_at: string;
}

export interface CybridIdentityVerification {
  guid: string;
  type: string;
  method: string;
  customer_guid: string;
  state: string;
  outcome: string;
  created_at: string;
  persona_inquiry_id?: string; // Available when state is "waiting"
}

export interface CybridAccount {
  guid: string;
  type: string;
  customer_guid: string;
  asset: string;
  name: string;
  state: string;
  platform_balance: string;
  platform_available: string;
}

export interface CybridAddress {
  guid: string;
  bank_guid: string;
  customer_guid: string;
  account_guid: string;
  asset: string;
  tag?: string;
  address: string;
  state: string;
  created_at: string;
}

// Cybrid Banking API base URLs
const CYBRID_API_URLS = {
  sandbox: 'https://bank.sandbox.cybrid.app',
  staging: 'https://bank.sandbox.cybrid.app',
  production: 'https://bank.cybrid.app'
};

// Cybrid Identity API base URLs (for customer tokens)
const CYBRID_IDENTITY_URLS = {
  sandbox: 'https://id.sandbox.cybrid.app',
  staging: 'https://id.sandbox.cybrid.app',
  production: 'https://id.cybrid.app'
};

// Cybrid OAuth URLs (separate from API)
const CYBRID_AUTH_URLS = {
  sandbox: 'https://id.sandbox.cybrid.app/oauth/token',
  staging: 'https://id.sandbox.cybrid.app/oauth/token',
  production: 'https://id.cybrid.app/oauth/token'
};

export class CybridService {
  private static readonly CLIENT_ID = process.env.CYBRID_CLIENT_ID;
  private static readonly CLIENT_SECRET = process.env.CYBRID_CLIENT_SECRET;
  private static readonly ENVIRONMENT = process.env.CYBRID_ENVIRONMENT || 'staging';
  private static readonly BASE_URL = CYBRID_API_URLS[CybridService.ENVIRONMENT as keyof typeof CYBRID_API_URLS];

  private static tokenCache = new TokenCache();

  private static async getAccessToken(): Promise<string> {
    const merchantId = 'platform'; // Use platform-level token for admin operations
    const provider = 'cybrid';
    const environment = this.ENVIRONMENT;

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new Error('Cybrid credentials not configured. Please set CYBRID_CLIENT_ID and CYBRID_CLIENT_SECRET environment variables.');
    }

    // Use TokenCache with proper fetcher function
    const tokenFetcher = async () => {
      const authUrl = CYBRID_AUTH_URLS[this.ENVIRONMENT as keyof typeof CYBRID_AUTH_URLS];
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.CLIENT_ID!,
          client_secret: this.CLIENT_SECRET!,
          scope: 'banks:read customers:read customers:write customers:execute accounts:read prices:read quotes:read identity_verifications:read identity_verifications:write identity_verifications:execute persona_sessions:execute'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cybrid OAuth error ${response.status}: ${errorText}`);
      }

      const tokenData = await response.json();
      return {
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in || 3600
      };
    };

    try {
      return await this.tokenCache.getOrRefresh(merchantId, provider, environment, tokenFetcher);
    } catch (error) {
      console.error('Failed to generate Cybrid access token:', error);
      throw new Error(`Failed to authenticate with Cybrid: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAccessToken();
    const url = `${this.BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cybrid API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Make request to Cybrid Identity API (for customer tokens)
  private static async makeIdentityRequest(endpoint: string, options: RequestInit = {}) {
    const token = await this.getAccessToken();
    const identityBaseUrl = CYBRID_IDENTITY_URLS[this.ENVIRONMENT as keyof typeof CYBRID_IDENTITY_URLS];
    const url = `${identityBaseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cybrid API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Create business customer for a merchant
  static async createBusinessCustomer(merchantData: {
    merchantId: string;
    name: string;
    email: string;
  }): Promise<CybridCustomer> {
    try {
      console.log(`Creating Cybrid customer for merchant ${merchantData.merchantId}`);

      // Follow Cybrid documentation: only send type for Platform KYC method
      const customerPayload = {
        type: 'business'
      };

      const customer = await this.makeRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerPayload)
      }) as CybridCustomer;

      console.log(`Cybrid customer created successfully: ${customer.guid}`);

      // Update merchant record with Cybrid customer GUID
      await storage.updateMerchant(merchantData.merchantId, {
        cybridCustomerGuid: customer.guid,
        cybridIntegrationStatus: 'active',
        cybridLastSyncedAt: new Date()
      });

      return customer;

    } catch (error) {
      console.error(`Failed to create Cybrid customer for merchant ${merchantData.merchantId}:`, error);
      
      // Update merchant record with error status
      await storage.updateMerchant(merchantData.merchantId, {
        cybridIntegrationStatus: 'error',
        cybridLastError: error instanceof Error ? error.message : 'Unknown error',
        cybridLastAttemptAt: new Date()
      });

      throw error;
    }
  }

  // Get all customers
  static async getAllCustomers(): Promise<CybridCustomer[]> {
    try {
      const response = await this.makeRequest('/api/customers') as { objects: CybridCustomer[], total: number };
      console.log(`Fetched ${response.objects.length} customers from Cybrid`);
      return response.objects;
    } catch (error) {
      console.error('Failed to fetch all Cybrid customers:', error);
      throw error;
    }
  }

  // Get customer by external ID (our merchant ID)
  static async getCustomerByExternalId(externalId: string): Promise<CybridCustomer | null> {
    try {
      const customers = await this.makeRequest(`/api/customers?external_customer_id=${externalId}`) as { objects: CybridCustomer[] };
      
      // CRITICAL FIX: Cybrid API returns all customers when external ID doesn't exist
      // We must verify the returned customer actually has the external ID we searched for
      if (customers.objects.length > 0) {
        const customer = customers.objects.find(c => c.external_customer_id === externalId);
        return customer || null;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to fetch Cybrid customer for external ID ${externalId}:`, error);
      return null;
    }
  }

  // Get customer by GUID
  static async getCustomer(customerGuid: string): Promise<CybridCustomer> {
    return this.makeRequest(`/api/customers/${customerGuid}`) as Promise<CybridCustomer>;
  }

  // Create customer-scoped JWT token for Banking UI widget
  static async createCustomerToken(customerGuid: string): Promise<{ token: string; expiresIn: number }> {
    try {
      console.log(`Creating customer token for customer: ${customerGuid}`);

      const tokenPayload = {
        customer_guid: customerGuid,
        scopes: [
          "counterparties:read",
          "counterparties:pii:read", 
          "counterparties:write",
          "counterparties:execute",
          "customers:read",
          "customers:pii:read",
          "customers:write",
          "accounts:read",
          "accounts:execute",
          "prices:read",
          "quotes:read", 
          "quotes:execute",
          "trades:read",
          "trades:execute",
          "transfers:read",
          "transfers:write",
          "transfers:execute",
          "external_bank_accounts:read",
          "external_bank_accounts:pii:read",
          "external_bank_accounts:write", 
          "external_bank_accounts:execute",
          "external_wallets:read",
          "external_wallets:execute",
          "workflows:read",
          "workflows:execute",
          "deposit_addresses:read",
          "deposit_addresses:execute",
          "deposit_bank_accounts:read",
          "deposit_bank_accounts:execute",
          "invoices:read",
          "invoices:write",
          "invoices:execute",
          "identity_verifications:read",
          "identity_verifications:pii:read",
          "identity_verifications:write",
          "identity_verifications:execute",
          "persona_sessions:execute"
        ]
      };


      const tokenResponse = await this.makeIdentityRequest('/api/customer_tokens', {
        method: 'POST',
        body: JSON.stringify(tokenPayload)
      }) as any;

      console.log('Customer token created successfully');

      if (!tokenResponse.access_token) {
        console.error('[ERROR] No access_token in Cybrid response!');
        throw new Error('Cybrid returned empty token');
      }

      return {
        token: tokenResponse.access_token,
        expiresIn: 3600 // Default to 1 hour, adjust based on actual response
      };

    } catch (error) {
      console.error('Failed to create customer token:', error);
      throw new Error(`Failed to create customer session token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to poll identity verification until it reaches "waiting" status
  static async pollForPersonaInquiryId(verificationGuid: string, maxAttempts: number = 30): Promise<string> {
    console.log(`Polling for persona inquiry ID for verification: ${verificationGuid}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const verification = await this.makeRequest(`/api/identity_verifications/${verificationGuid}`, {
          method: 'GET'
        }) as CybridIdentityVerification;
        
        console.log(`Poll attempt ${attempt}: state="${verification.state}", persona_inquiry_id="${verification.persona_inquiry_id}"`);
        
        if (verification.state === 'waiting' && verification.persona_inquiry_id) {
          console.log(`Found persona inquiry ID: ${verification.persona_inquiry_id}`);
          return verification.persona_inquiry_id;
        }
        
        if (verification.state === 'completed') {
          console.log(`Verification completed with outcome: ${verification.outcome}`);
          throw new Error(`Identity verification completed with outcome: ${verification.outcome}`);
        }
        
        // Wait 2 seconds before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`Poll attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error(`Failed to get persona inquiry ID after ${maxAttempts} attempts`);
  }

  // Check for existing identity verifications for customer (especially "waiting" ones)
  static async checkExistingVerifications(customerGuid: string): Promise<CybridIdentityVerification | null> {
    try {
      console.log(`Checking existing identity verifications for customer: ${customerGuid}`);
      
      const verifications = await this.makeRequest(`/api/identity_verifications?customer_guid=${customerGuid}`, {
        method: 'GET'
      }) as { objects: CybridIdentityVerification[] };

      console.log(`Found ${verifications.objects.length} existing verifications`);
      console.log('FULL VERIFICATIONS RESPONSE:', JSON.stringify(verifications, null, 2));

      // Look for "waiting" status first (ready for persona session)
      const waitingVerification = verifications.objects.find(v => 
        v.state === 'waiting' && v.type === 'kyc' && v.method === 'document_submission'
      );

      if (waitingVerification) {
        console.log(`Found existing WAITING verification: ${waitingVerification.guid}`);
        return waitingVerification;
      }

      // Look for any incomplete verification that we can continue with
      const pendingVerification = verifications.objects.find(v => 
        v.state !== 'completed' && v.type === 'kyc' && v.method === 'document_submission'
      );

      if (pendingVerification) {
        console.log(`Found existing PENDING verification: ${pendingVerification.guid} (state: ${pendingVerification.state})`);
        return pendingVerification;
      }

      console.log('No existing verifications found that can be reused');
      return null;
    } catch (error) {
      console.error('Failed to check existing verifications:', error);
      return null;
    }
  }

  // Create manual KYC identity verification (for Persona flow)
  static async createManualKycVerification(customerGuid: string): Promise<{
    verificationGuid: string;
    inquiryId: string;
    personaUrl: string;
    redirectUrl?: string;
    clientToken?: string;
  }> {
    try {
      console.log(`Starting manual KYC verification for customer: ${customerGuid}`);
      
      // Step 1: Check for existing identity verifications first
      const existingVerification = await this.checkExistingVerifications(customerGuid);
      
      let verification: CybridIdentityVerification;
      let personaInquiryId: string;

      if (existingVerification) {
        if (existingVerification.state === 'waiting' && existingVerification.persona_inquiry_id) {
          // Perfect! We have a waiting verification with persona_inquiry_id ready
          console.log(`Using existing WAITING verification: ${existingVerification.guid}`);
          verification = existingVerification;
          personaInquiryId = existingVerification.persona_inquiry_id;
        } else {
          // We have a pending verification, need to poll until waiting
          console.log(`Found existing verification ${existingVerification.guid}, polling until ready...`);
          verification = existingVerification;
          personaInquiryId = await this.pollForPersonaInquiryId(verification.guid);
        }
      } else {
        // No existing verification, create a new one
        console.log('No existing verification found, creating new one...');
        
        const verificationPayload = {
          type: 'kyc',
          method: 'document_submission',
          customer_guid: customerGuid
        };

        verification = await this.makeRequest('/api/identity_verifications', {
          method: 'POST',
          body: JSON.stringify(verificationPayload)
        }) as CybridIdentityVerification;

        console.log(`New identity verification created: ${verification.guid}`);
        console.log('FULL CYBRID CREATE RESPONSE:', JSON.stringify(verification, null, 2));

        // Poll the newly created verification until ready
        personaInquiryId = await this.pollForPersonaInquiryId(verification.guid);
      }

      // Step 2: Create the Persona verification URL directly (no persona session needed)
      const personaVerificationUrl = `https://withpersona.com/verify?inquiry-id=${personaInquiryId}&environment-id=sandbox`;
      
      console.log(`Persona verification URL created: ${personaVerificationUrl}`);

      return {
        verificationGuid: verification.guid,
        inquiryId: personaInquiryId,
        personaUrl: personaVerificationUrl,
        redirectUrl: personaVerificationUrl, // Use persona URL as redirect
        clientToken: undefined
      };

    } catch (error) {
      console.error(`Failed to create manual KYC verification for customer ${customerGuid}:`, error);
      throw error;
    }
  }

  // Poll for Persona inquiry ID (required for manual KYC flow)
  static async getVerificationStatus(verificationGuid: string): Promise<{
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
    state: string;
    outcome: string;
  }> {
    try {
      console.log(`Getting verification status for: ${verificationGuid}`);
      
      const verification = await this.getIdentityVerification(verificationGuid);
      
      // Map Cybrid states to our simplified status
      let status: 'pending' | 'in_review' | 'approved' | 'rejected';
      
      if (verification.state === 'completed' && verification.outcome === 'approved') {
        status = 'approved';
      } else if (verification.state === 'completed' && verification.outcome === 'rejected') {
        status = 'rejected';
      } else if (verification.state === 'review' || verification.state === 'pending_review') {
        status = 'in_review';
      } else {
        status = 'pending';
      }
      
      return {
        status,
        state: verification.state,
        outcome: verification.outcome
      };
      
    } catch (error) {
      console.error(`Failed to get verification status for ${verificationGuid}:`, error);
      throw error;
    }
  }

  // Create identity verification session for KYC (legacy method)
  static async createIdentityVerification(customerGuid: string): Promise<CybridIdentityVerification> {
    try {
      // For business customers, use KYB verification instead of KYC
      // Note: In sandbox, KYB may not be fully supported - fallback to KYC if needed
      const verificationPayload = {
        type: 'kyb', // Business verification for merchant customers
        method: 'business_registration',
        customer_guid: customerGuid
      };

      const verification = await this.makeRequest('/api/identity_verifications', {
        method: 'POST',
        body: JSON.stringify(verificationPayload)
      }) as CybridIdentityVerification;

      console.log(`Identity verification created: ${verification.guid} for customer ${customerGuid}`);
      return verification;

    } catch (error) {
      console.error(`Failed to create identity verification for customer ${customerGuid}:`, error);
      throw error;
    }
  }

  // Get identity verification status
  static async getIdentityVerification(verificationGuid: string): Promise<CybridIdentityVerification> {
    return this.makeRequest(`/api/identity_verifications/${verificationGuid}`) as Promise<CybridIdentityVerification>;
  }

  // List all identity verifications for a customer
  static async listIdentityVerifications(customerGuid: string): Promise<CybridIdentityVerification[]> {
    try {
      const response = await this.makeRequest(`/api/identity_verifications?customer_guid=${customerGuid}`) as any;
      return response.objects || [];
    } catch (error) {
      console.error(`Failed to list identity verifications for customer ${customerGuid}:`, error);
      throw error;
    }
  }

  // Get latest KYC status for a customer
  static async getLatestKycStatus(customerGuid: string): Promise<{
    status: 'pending' | 'approved' | 'rejected' | 'in_review';
    verificationGuid?: string;
    outcome?: string;
    state?: string;
  }> {
    try {
      // Skip for test GUIDs
      if (customerGuid.startsWith('test-') || customerGuid.includes('test')) {
        return { status: 'pending' };
      }

      const verifications = await this.listIdentityVerifications(customerGuid);
      
      if (!verifications || verifications.length === 0) {
        return { status: 'pending' };
      }

      // Get the most recent verification
      const latestVerification = verifications
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      // Map Cybrid states to our KYC status
      let status: 'pending' | 'approved' | 'rejected' | 'in_review' = 'pending';
      
      switch (latestVerification.state) {
        case 'storing':
          status = latestVerification.outcome === 'passed' ? 'approved' : 
                   latestVerification.outcome === 'failed' ? 'rejected' : 'in_review';
          break;
        case 'completed':
          status = latestVerification.outcome === 'passed' ? 'approved' : 'rejected';
          break;
        case 'reviewing':
        case 'waiting':
          status = 'in_review';
          break;
        case 'failed':
          status = 'rejected';
          break;
        default:
          status = 'pending';
      }

      return {
        status,
        verificationGuid: latestVerification.guid,
        outcome: latestVerification.outcome,
        state: latestVerification.state
      };

    } catch (error) {
      console.error(`Failed to get KYC status for customer ${customerGuid}:`, error);
      return { status: 'pending' };
    }
  }

  // Create trading accounts for crypto deposits (BTC, ETH, USDC, USDT)
  static async createDepositAddresses(customerGuid: string, currencies: string[] = ['BTC', 'ETH', 'USDC', 'USDT']) {
    const addresses = [];
    const merchant = await storage.getMerchantByCybridGuid(customerGuid);
    
    if (!merchant) {
      throw new Error(`No merchant found for Cybrid customer GUID: ${customerGuid}`);
    }

    try {
      for (const currency of currencies) {
        // First create a trading account for this currency
        const accountPayload = {
          type: 'trading',
          customer_guid: customerGuid,
          asset: currency,
          name: `${currency} Trading Account`
        };

        const account = await this.makeRequest('/api/accounts', {
          method: 'POST',
          body: JSON.stringify(accountPayload)
        }) as CybridAccount;

        console.log(`Created ${currency} trading account: ${account.guid}`);

        // Wait for account to be ready before creating address
        let attempts = 0;
        let accountReady = false;
        
        while (attempts < 10 && !accountReady) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          const accountStatus = await this.makeRequest(`/api/accounts/${account.guid}`) as CybridAccount;
          accountReady = accountStatus.state === 'storing';
          attempts++;
        }

        if (!accountReady) {
          console.warn(`Account ${account.guid} not ready after 20 seconds, skipping address creation`);
          continue;
        }

        // Create deposit address for this trading account
        const addressPayload = {
          account_guid: account.guid
        };

        const address = await this.makeRequest('/api/deposit_addresses', {
          method: 'POST',
          body: JSON.stringify(addressPayload)
        }) as CybridAddress;

        console.log(`Created deposit address for ${currency}: ${address.address}`);

        // Store in our database
        await storage.createMerchantDepositAddress({
          merchantId: merchant.id,
          cybridCustomerGuid: customerGuid,
          cybridAccountGuid: account.guid,
          asset: currency,
          network: currency === 'BTC' ? 'bitcoin' : 'ethereum',
          address: address.address,
          isActive: true
        });

        addresses.push({
          currency,
          network: currency === 'BTC' ? 'bitcoin' : 'ethereum',
          address: address.address,
          accountGuid: account.guid
        });
      }

      // Update merchant record to indicate addresses are created
      await storage.updateMerchant(merchant.id, {
        depositAddressesCreated: true,
        cybridLastSyncedAt: new Date()
      });

      console.log(`Successfully created ${addresses.length} deposit addresses for merchant ${merchant.id}`);
      return addresses;

    } catch (error) {
      console.error(`Failed to create deposit addresses for customer ${customerGuid}:`, error);
      throw error;
    }
  }

  // Sync merchant status with Cybrid (for admin management)
  static async syncMerchantStatus(merchantId: string) {
    try {
      const merchant = await storage.getMerchant(merchantId);
      if (!merchant?.cybridCustomerGuid) {
        throw new Error('Merchant has no Cybrid customer GUID');
      }

      // Get current customer status from Cybrid
      const customer = await this.getCustomer(merchant.cybridCustomerGuid);
      
      // Update our database with current status
      await storage.updateMerchant(merchantId, {
        cybridIntegrationStatus: customer.state === 'storing' ? 'active' : 'pending',
        cybridLastSyncedAt: new Date()
      });

      return {
        customer,
        integrationStatus: customer.state === 'storing' ? 'active' : 'pending'
      };

    } catch (error) {
      console.error(`Failed to sync merchant ${merchantId} with Cybrid:`, error);
      
      await storage.updateMerchant(merchantId, {
        cybridIntegrationStatus: 'error',
        cybridLastError: error instanceof Error ? error.message : 'Unknown error',
        cybridLastAttemptAt: new Date()
      });

      throw error;
    }
  }

  // Ensure customer exists - idempotent customer creation
  static async ensureCustomer(merchantData: {
    merchantId: string;
    name: string;
    email: string;
  }): Promise<CybridCustomer> {
    try {
      // SECONDARY GUARD: Verify merchant is approved before creating customer
      const merchant = await storage.getMerchant(merchantData.merchantId);
      if (!merchant) {
        throw new Error(`Merchant ${merchantData.merchantId} not found`);
      }
      
      if (merchant.status !== 'approved') {
        throw new Error(`Cannot create Cybrid customer for non-approved merchant. Status: ${merchant.status}`);
      }

      // First check if customer already exists by external ID
      const existingCustomer = await this.getCustomerByExternalId(merchantData.merchantId);
      
      if (existingCustomer) {
        console.log(`Cybrid customer already exists: ${existingCustomer.guid}`);
        
        // Update our database with the existing customer GUID
        await storage.updateMerchant(merchantData.merchantId, {
          cybridCustomerGuid: existingCustomer.guid,
          cybridIntegrationStatus: 'active',
          cybridLastSyncedAt: new Date()
        });
        
        return existingCustomer;
      }

      // Create new customer if doesn't exist
      return await this.createBusinessCustomer(merchantData);

    } catch (error) {
      console.error(`Failed to ensure Cybrid customer for merchant ${merchantData.merchantId}:`, error);
      throw error;
    }
  }

  // Bulk sync KYC status for all merchants with Cybrid customers
  static async bulkSyncKycStatus(): Promise<{
    totalMerchants: number;
    updated: number;
    errors: number;
    results: Array<{
      merchantId: string;
      merchantName: string;
      cybridCustomerGuid: string;
      oldStatus: string;
      newStatus: string;
      error?: string;
    }>;
  }> {
    const results: Array<{
      merchantId: string;
      merchantName: string;
      cybridCustomerGuid: string;
      oldStatus: string;
      newStatus: string;
      error?: string;
    }> = [];

    let updated = 0;
    let errors = 0;

    try {
      // Get all merchants with Cybrid customer GUIDs
      const merchants = await storage.getAllMerchants();
      const merchantsWithCybrid = merchants.filter(m => m.cybridCustomerGuid);

      console.log(`🔄 Starting bulk KYC sync for ${merchantsWithCybrid.length} merchants with Cybrid customers`);

      for (const merchant of merchantsWithCybrid) {
        try {
          const oldStatus = merchant.kybStatus || 'pending';
          
          // Get latest KYC status from Cybrid
          const kycStatus = await this.getLatestKycStatus(merchant.cybridCustomerGuid!);
          
          // Only update if status has changed
          if (kycStatus.status !== oldStatus) {
            await storage.updateMerchant(merchant.id, {
              kybStatus: kycStatus.status,
              cybridVerificationGuid: kycStatus.verificationGuid,
              cybridLastSyncedAt: new Date()
            });

            console.log(`✅ Updated ${merchant.name}: ${oldStatus} → ${kycStatus.status}`);
            updated++;
          } else {
            console.log(`⏸️  No change for ${merchant.name}: ${kycStatus.status}`);
          }

          results.push({
            merchantId: merchant.id,
            merchantName: merchant.name,
            cybridCustomerGuid: merchant.cybridCustomerGuid!,
            oldStatus,
            newStatus: kycStatus.status
          });

        } catch (error) {
          console.error(`❌ Failed to sync KYC for merchant ${merchant.name}:`, error);
          errors++;

          results.push({
            merchantId: merchant.id,
            merchantName: merchant.name,
            cybridCustomerGuid: merchant.cybridCustomerGuid!,
            oldStatus: merchant.kybStatus || 'pending',
            newStatus: merchant.kybStatus || 'pending',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`🎯 Bulk KYC sync complete: ${updated} updated, ${errors} errors out of ${merchantsWithCybrid.length} merchants`);

      return {
        totalMerchants: merchantsWithCybrid.length,
        updated,
        errors,
        results
      };

    } catch (error) {
      console.error('Failed to perform bulk KYC sync:', error);
      throw error;
    }
  }
}