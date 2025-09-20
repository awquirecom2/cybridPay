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
          scope: 'banks:read customers:read customers:write customers:execute accounts:read prices:read quotes:read identity_verifications:read identity_verifications:write'
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
        cybridLastSyncedAt: new Date(),
        cybridEnvironment: this.ENVIRONMENT
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
      console.log('[DEBUG] Token response from Cybrid:', JSON.stringify(tokenResponse, null, 2));

      if (!tokenResponse.token) {
        console.error('[ERROR] No token in Cybrid response!');
        throw new Error('Cybrid returned empty token');
      }

      return {
        token: tokenResponse.token,
        expiresIn: 3600 // Default to 1 hour, adjust based on actual response
      };

    } catch (error) {
      console.error('Failed to create customer token:', error);
      throw new Error(`Failed to create customer session token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create identity verification session for KYC
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
          currency: currency,
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
}