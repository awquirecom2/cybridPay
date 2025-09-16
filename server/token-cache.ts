// Token caching service for managing access tokens with TTL and concurrency control
// Provides per-merchant, environment-scoped token caching with automatic refresh

export interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp
  isRefreshing?: boolean;
}

export interface TokenFetcher {
  (): Promise<{ accessToken: string; expiresIn: number }>;
}

// In-memory token cache with TTL and per-key locking
export class TokenCache {
  private cache = new Map<string, CachedToken>();
  private refreshPromises = new Map<string, Promise<string>>();
  
  // Buffer time before expiry to refresh token (2 minutes)
  private readonly REFRESH_BUFFER_SECONDS = 120;
  
  // Cleanup interval for expired tokens (5 minutes)
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  
  constructor() {
    // Start cleanup timer for expired tokens
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Get cache key for merchant-specific token
   */
  private getCacheKey(merchantId: string, provider: string, environment: string): string {
    return `${merchantId}|${provider}|${environment}`;
  }

  /**
   * Get or refresh token with concurrency control
   */
  async getOrRefresh(
    merchantId: string, 
    provider: string, 
    environment: string, 
    fetcher: TokenFetcher
  ): Promise<string> {
    const key = this.getCacheKey(merchantId, provider, environment);
    const now = Math.floor(Date.now() / 1000);
    
    const cached = this.cache.get(key);
    
    // Return cached token if still valid (with buffer)
    if (cached && now < (cached.expiresAt - this.REFRESH_BUFFER_SECONDS)) {
      return cached.token;
    }
    
    // Check if refresh is already in progress to avoid duplicate requests
    const existingRefresh = this.refreshPromises.get(key);
    if (existingRefresh) {
      return existingRefresh;
    }
    
    // Start new refresh
    const refreshPromise = this.refreshToken(key, fetcher);
    this.refreshPromises.set(key, refreshPromise);
    
    try {
      const token = await refreshPromise;
      return token;
    } finally {
      // Clean up refresh promise
      this.refreshPromises.delete(key);
    }
  }

  /**
   * Refresh token and update cache
   */
  private async refreshToken(key: string, fetcher: TokenFetcher): Promise<string> {
    try {
      const tokenData = await fetcher();
      const now = Math.floor(Date.now() / 1000);
      
      // Cache with actual expiry time
      const expiresAt = now + tokenData.expiresIn;
      
      this.cache.set(key, {
        token: tokenData.accessToken,
        expiresAt,
        isRefreshing: false
      });
      
      console.log(`Token cached for key: ${key.split('|')[0]}|***|${key.split('|')[2]}, expires at: ${new Date(expiresAt * 1000).toISOString()}`);
      
      return tokenData.accessToken;
    } catch (error) {
      console.error(`Token refresh failed for key: ${key.split('|')[0]}|***|${key.split('|')[2]}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate token (e.g., on 401/403 responses)
   */
  invalidate(merchantId: string, provider: string, environment: string): void {
    const key = this.getCacheKey(merchantId, provider, environment);
    this.cache.delete(key);
    this.refreshPromises.delete(key);
    console.log(`Token invalidated for key: ${merchantId}|***|${environment}`);
  }

  /**
   * Clean up expired tokens
   */
  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    let cleanedCount = 0;
    
    // Convert to array to avoid iterator issues
    const entries = Array.from(this.cache.entries());
    for (const [key, cached] of entries) {
      if (now >= cached.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired tokens from cache`);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { totalTokens: number; activeRefreshes: number } {
    return {
      totalTokens: this.cache.size,
      activeRefreshes: this.refreshPromises.size
    };
  }

  /**
   * Clear all cached tokens (for testing/debugging)
   */
  clear(): void {
    this.cache.clear();
    this.refreshPromises.clear();
  }
}

// Global token cache instance
export const tokenCache = new TokenCache();