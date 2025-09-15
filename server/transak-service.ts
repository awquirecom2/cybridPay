import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Transak API integration service
// Documentation: https://docs.transak.com/

export interface TransakCredentials {
  apiKey: string;
  apiSecret: string;
  environment: 'staging' | 'production';
}

// Transak API base URLs
const TRANSAK_API_URLS = {
  staging: 'https://api-stg.transak.com/api/v2',
  production: 'https://api.transak.com/api/v2'
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

  // GET fiat currencies from public endpoint
  static async getFiatCurrencies() {
    const url = `${this.STAGING_BASE_URL}/fiat/public/v1/currencies/fiat-currencies?apiKey=${this.PUBLIC_API_KEY}`;
    return this.makePublicRequest(url);
  }

  // GET countries from public endpoint  
  static async getCountries() {
    const url = `${this.STAGING_BASE_URL}/fiat/public/v1/get/country`;
    return this.makePublicRequest(url);
  }

  // GET verify wallet address - Public endpoint for wallet validation
  static async verifyWalletAddress(cryptoCurrency: string, network: string, walletAddress: string) {
    const url = `${this.STAGING_BASE_URL}/cryptocoverage/api/v1/public/verify-wallet-address?cryptoCurrency=${cryptoCurrency}&network=${network}&walletAddress=${walletAddress}`;
    return this.makePublicRequest(url);
  }
}

export class TransakService {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(credentials: TransakCredentials) {
    this.baseUrl = TRANSAK_API_URLS[credentials.environment];
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
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

  // GET /currencies - Fetch supported crypto/fiat options
  async getCurrencies() {
    return this.makeRequest('/currencies');
  }

  // GET /networks - Fetch blockchain networks
  async getNetworks() {
    return this.makeRequest('/networks');
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
}