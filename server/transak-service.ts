import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { tokenCache, type TokenFetcher } from './token-cache';

// Transak API integration service
// Documentation: https://docs.transak.com/

export interface TransakCredentials {
  apiKey: string;
  apiSecret: string;
  environment: 'staging' | 'production';
}

export interface CreateSessionParams {
  quoteData: {
    fiatAmount?: number;
    cryptoAmount?: number;
    cryptoCurrency: string;
    fiatCurrency: string;
    network: string;
    paymentMethod: string;
    partnerOrderId: string;
  };
  walletAddress: string;
  customerEmail: string;
  referrerDomain?: string;
  redirectURL?: string;
  themeColor?: string;
}

// Transak API base URLs
const TRANSAK_API_URLS = {
  staging: 'https://api-stg.transak.com/api/v2',
  production: 'https://api.transak.com/api/v2'
};

// Transak gateway URLs for session creation
const TRANSAK_GATEWAY_URLS = {
  staging: 'https://api-gateway-stg.transak.com/api/v2/auth/session',
  production: 'https://api-gateway.transak.com/api/v2/auth/session'
};

// Encryption utilities for storing credentials securely
export class CredentialEncryption {
  private static getEncryptionKey(): string {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
      throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 64-character hex string');
    }
    return key;
  }

  static encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.getEncryptionKey(), 'hex');
    const iv = randomBytes(16);
    
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(this.getEncryptionKey(), 'hex');
    
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Public Transak API service for public endpoints (no authentication needed)
export class PublicTransakService {
  private static readonly STAGING_BASE_URL = 'https://api-stg.transak.com';
  
  // Public API key from the curl example (for fiat currencies)
  private static readonly PUBLIC_API_KEY = 'c90712f1-d492-420a-adea-08396cc922cd';

  private static async makePublicRequest(url: string) {
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transak Public API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // GET crypto currencies from public endpoint
  static async getCryptoCurrencies() {
    const url = `${this.STAGING_BASE_URL}/cryptocoverage/api/v1/public/crypto-currencies`;
    return this.makePublicRequest(url);
  }

  // GET fiat currencies from public endpoint - using exact user-specified endpoint
  static async getFiatCurrencies() {
    const url = 'https://api-stg.transak.com/fiat/public/v1/currencies/fiat-currencies';
    const options = {method: 'GET', headers: {accept: 'application/json'}};
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transak Fiat Currencies API error ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }



  // Note: /getcurrencies endpoint doesn't exist in Transak API
  // Use getCryptoCurrencies() instead which has all the network and image data

  // GET verify wallet address - Using correct Transak public API endpoint from documentation
  static async verifyWalletAddress(cryptoCurrency: string, network: string, walletAddress: string) {
    const url = `https://api-stg.transak.com/cryptocoverage/api/v1/public/verify-wallet-address?cryptoCurrency=${cryptoCurrency}&network=${network}&walletAddress=${walletAddress}`;
    return this.makePublicRequest(url);
  }

  // GET pricing quote using platform-wide credentials from environment
  static async getPricingQuote(params: {
    cryptoAmount: string;
    cryptoCurrency: string;
    fiatCurrency: string;
    network: string;
    paymentMethod: string;
  }) {
    const apiKey = process.env.TRANSAK_API_KEY;
    const environment = process.env.TRANSAK_ENVIRONMENT || 'staging';
    
    if (!apiKey) {
      throw new Error('TRANSAK_API_KEY environment variable is required');
    }

    const baseUrl = environment === 'production' 
      ? 'https://api.transak.com/api/v1' 
      : 'https://api-stg.transak.com/api/v1';
      
    const url = `${baseUrl}/pricing/public/quotes?${new URLSearchParams({
      partnerApiKey: apiKey,
      fiatCurrency: params.fiatCurrency,
      cryptoCurrency: params.cryptoCurrency,
      isBuyOrSell: 'BUY',
      network: params.network,
      paymentMethod: params.paymentMethod,
      cryptoAmount: params.cryptoAmount
    })}`;
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transak pricing API error ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }

  // GET offramp pricing quote using platform-wide credentials from environment for SELL operations
  static async getOfframpPricingQuote(params: {
    cryptoAmount: string;
    cryptoCurrency: string;
    fiatCurrency: string;
    network: string;
    paymentMethod: string;
  }) {
    const apiKey = process.env.TRANSAK_API_KEY;
    const environment = process.env.TRANSAK_ENVIRONMENT || 'staging';
    
    if (!apiKey) {
      throw new Error('TRANSAK_API_KEY environment variable is required');
    }

    const baseUrl = environment === 'production' 
      ? 'https://api.transak.com/api/v1' 
      : 'https://api-stg.transak.com/api/v1';
      
    const url = `${baseUrl}/pricing/public/quotes?${new URLSearchParams({
      partnerApiKey: apiKey,
      fiatCurrency: params.fiatCurrency,
      cryptoCurrency: params.cryptoCurrency,
      isBuyOrSell: 'SELL',
      network: params.network,
      paymentMethod: params.paymentMethod,
      cryptoAmount: params.cryptoAmount
    })}`;
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transak offramp pricing API error ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }
}

export class TransakService {
  private baseUrl: string;
  private gatewayUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private environment: 'staging' | 'production';
  private merchantId: string;

  constructor(credentials: TransakCredentials, merchantId?: string) {
    this.baseUrl = TRANSAK_API_URLS[credentials.environment];
    this.gatewayUrl = TRANSAK_GATEWAY_URLS[credentials.environment];
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.environment = credentials.environment;
    this.merchantId = merchantId || 'default';
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
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
      throw new Error(`Transak API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }



  // POST /pricing - Get real-time pricing
  async getPricing(params: {
    fiatCurrency: string;
    cryptoCurrency: string;
    fiatAmount?: number;
    cryptoAmount?: number;
    paymentMethod?: string;
    countryCode?: string;
  }) {
    return this.makeRequest('/pricing', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // POST /quote - Create transaction quote
  async createQuote(params: {
    fiatCurrency: string;
    cryptoCurrency: string;
    fiatAmount?: number;
    cryptoAmount?: number;
    paymentMethod: string;
    countryCode: string;
    network?: string;
  }) {
    return this.makeRequest('/quote', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // POST /validate-wallet - Validate wallet addresses
  async validateWallet(params: {
    walletAddress: string;
    cryptoCurrency: string;
    network?: string;
  }) {
    return this.makeRequest('/validate-wallet', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // POST /partners/api/v2/refresh-token - Generate access token using stored credentials
  async generateAccessToken(): Promise<{ accessToken: string; expiresIn: number }> {
    // Use environment-specific base URL for token generation
    const tokenBaseUrl = this.environment === 'production' 
      ? 'https://api.transak.com' 
      : 'https://api-stg.transak.com';
    const url = `${tokenBaseUrl}/partners/api/v2/refresh-token`;

    const requestBody = {
      apiKey: this.apiKey
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-secret': this.apiSecret,
        'content-type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TransakService] Token generation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`Transak access token generation failed ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    const accessToken = result.data?.accessToken || result.accessToken || result.access_token;
    const expiresIn = result.data?.expiresAt ? 
      Math.max(0, Math.floor((result.data.expiresAt * 1000 - Date.now()) / 1000)) :
      (result.expiresIn || result.expires_in || 3600);

    if (!accessToken) {
      console.error('[TransakService] No access token found in response:', result);
      throw new Error('Token generation response missing access token');
    }

    return {
      accessToken,
      expiresIn
    };
  }

  // Get cached access token or refresh if needed
  async getCachedAccessToken(): Promise<string> {
    const fetcher: TokenFetcher = async () => {
      return this.generateAccessToken();
    };

    return tokenCache.getOrRefresh(this.merchantId, 'transak', this.environment, fetcher);
  }

  // Invalidate cached token (call on 401/403 errors)
  invalidateCachedToken(): void {
    tokenCache.invalidate(this.merchantId, 'transak', this.environment);
  }

  // POST /api/v2/auth/session - Create widget session for payment processing
  async createSession(params: CreateSessionParams): Promise<{ widgetUrl: string }> {
    // Get cached access token (or refresh if needed)
    let accessToken: string;
    try {
      accessToken = await this.getCachedAccessToken();
    } catch (error) {
      console.error('[TransakService] Failed to get access token:', error);
      throw new Error('Authentication failed: Unable to obtain access token');
    }
    
    // Construct widget parameters according to Transak API
    // Handle both fiatAmount and cryptoAmount based on what's provided in quote
    const widgetParams = {
      apiKey: this.apiKey,
      referrerDomain: params.referrerDomain || "cryptopay.replit.app",
      productsAvailed: "BUY",
      ...(params.quoteData.fiatAmount && { fiatAmount: params.quoteData.fiatAmount }),
      ...(params.quoteData.cryptoAmount && { cryptoAmount: params.quoteData.cryptoAmount }),
      cryptoCurrencyCode: params.quoteData.cryptoCurrency, // Use cryptoCurrencyCode for consistency with Transak API
      fiatCurrency: params.quoteData.fiatCurrency,
      network: params.quoteData.network,
      walletAddress: params.walletAddress,
      disableWalletAddressForm: true,
      hideExchangeScreen: true,
      hideMenu: true,
      isFeeCalculationHidden: false,
      email: params.customerEmail,
      isAutoFillUserData: true,
      themeColor: params.themeColor || "1f4a8c",
      partnerOrderId: params.quoteData.partnerOrderId,
      redirectURL: params.redirectURL || "https://cryptopay.replit.app/transaction-complete",
      paymentMethod: params.quoteData.paymentMethod
    };

    // Use environment-based gateway URL instead of hard-coded staging
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': accessToken
      },
      body: JSON.stringify({ widgetParams })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TransakService] Session creation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      // If unauthorized, invalidate cached token and retry once
      if (response.status === 401 || response.status === 403) {
        console.warn(`[TransakService] Token authentication failed (${response.status}), invalidating cache and retrying`);
        this.invalidateCachedToken();
        
        try {
          // Retry with fresh token
          const freshToken = await this.getCachedAccessToken();
          const retryResponse = await fetch(this.gatewayUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'access-token': freshToken
            },
            body: JSON.stringify({ widgetParams })
          });
          
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(`Transak session creation failed after retry ${retryResponse.status}: ${retryErrorText}`);
          }
          
          // Continue with retry response
          const rawResponse = await retryResponse.json();
          return this.parseSessionResponse(rawResponse);
        } catch (retryError) {
          throw new Error(`Transak session creation failed after token refresh: ${retryError}`);
        }
      }
      
      throw new Error(`Transak session creation failed ${response.status}: ${errorText}`);
    }

    const rawResponse = await response.json();
    return this.parseSessionResponse(rawResponse);
  }

  // POST /api/v2/auth/session - Create offramp widget session for SELL operations
  async createOfframpSession(params: CreateSessionParams): Promise<{ widgetUrl: string }> {
    // Get cached access token (or refresh if needed)
    let accessToken: string;
    try {
      accessToken = await this.getCachedAccessToken();
    } catch (error) {
      console.error('[TransakService] Failed to get access token for offramp:', error);
      throw new Error('Authentication failed: Unable to obtain access token');
    }
    
    // Construct widget parameters for SELL operation according to your sample curl structure
    const widgetParams = {
      apiKey: this.apiKey,
      referrerDomain: params.referrerDomain || "cryptopay.replit.app", 
      productsAvailed: "SELL",
      cryptoAmount: params.quoteData.cryptoAmount,
      cryptoCurrencyCode: params.quoteData.cryptoCurrency,
      fiatCurrency: params.quoteData.fiatCurrency,
      network: params.quoteData.network,
      walletAddress: params.walletAddress,
      disableWalletAddressForm: true,
      hideExchangeScreen: true,
      hideMenu: true,
      isFeeCalculationHidden: false,
      email: params.customerEmail,
      isAutoFillUserData: true,
      themeColor: params.themeColor || "1f4a8c",
      partnerOrderId: params.quoteData.partnerOrderId,
      partnerCustomerId: params.customerEmail ? `cryptopay_customer_${Buffer.from(params.customerEmail).toString('base64').slice(0, 8)}` : `cryptopay_customer_${Date.now()}`,
      redirectURL: params.redirectURL || "https://cryptopay.replit.app/transaction-complete"
    };

    // Use environment-based gateway URL
    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access-token': accessToken
      },
      body: JSON.stringify({ widgetParams })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TransakService] Offramp session creation failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      // If unauthorized, invalidate cached token and retry once
      if (response.status === 401 || response.status === 403) {
        console.warn(`[TransakService] Token authentication failed for offramp (${response.status}), invalidating cache and retrying`);
        this.invalidateCachedToken();
        
        try {
          // Retry with fresh token
          const freshToken = await this.getCachedAccessToken();
          const retryResponse = await fetch(this.gatewayUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'access-token': freshToken
            },
            body: JSON.stringify({ widgetParams })
          });
          
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(`Transak offramp session creation failed after retry ${retryResponse.status}: ${retryErrorText}`);
          }
          
          // Continue with retry response
          const rawResponse = await retryResponse.json();
          return this.parseSessionResponse(rawResponse);
        } catch (retryError) {
          throw new Error(`Transak offramp session creation failed after token refresh: ${retryError}`);
        }
      }
      
      throw new Error(`Transak offramp session creation failed ${response.status}: ${errorText}`);
    }

    const rawResponse = await response.json();
    return this.parseSessionResponse(rawResponse);
  }

  // Helper method to parse session response and extract widget URL
  private parseSessionResponse(rawResponse: any): { widgetUrl: string } {
    // Normalize response format - extract widgetUrl from various possible response structures
    const widgetUrl = rawResponse.data?.widgetUrl ||          // Current Transak API format
                      rawResponse.widgetUrl || 
                      rawResponse.sessionData?.widgetUrl || 
                      rawResponse.sessionData?.url ||
                      rawResponse.url;
    
    if (!widgetUrl) {
      console.error('Transak session response:', rawResponse);
      throw new Error('No widget URL received from Transak session response');
    }

    // Decode HTML entities in the URL (&amp; -> &)
    const decodedWidgetUrl = widgetUrl.replace(/&amp;/g, '&');

    // Return normalized response format that frontend expects
    return { widgetUrl: decodedWidgetUrl };
  }
}