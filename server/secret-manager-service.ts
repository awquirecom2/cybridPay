import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export class SecretManagerService {
  private client: SecretManagerServiceClient;
  private projectId: string;

  constructor() {
    // Parse the service account credentials from environment
    const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (!credentials) {
      throw new Error('GOOGLE_CLOUD_CREDENTIALS environment variable is not set');
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is not set');
    }
    this.projectId = projectId;

    try {
      const parsedCredentials = JSON.parse(credentials);
      this.client = new SecretManagerServiceClient({
        credentials: parsedCredentials,
        projectId: this.projectId,
      });
    } catch (error) {
      throw new Error(`Failed to initialize Secret Manager client: ${error}`);
    }
  }

  /**
   * Store or update a secret in Google Secret Manager
   * @param secretName - Unique identifier for the secret (e.g., "merchant-123-transak-apikey")
   * @param secretValue - The actual secret value to store
   */
  async storeSecret(secretName: string, secretValue: string): Promise<void> {
    const parent = `projects/${this.projectId}`;
    const secretPath = `${parent}/secrets/${secretName}`;

    try {
      // Check if secret exists
      try {
        await this.client.getSecret({ name: secretPath });
        
        // Secret exists, add a new version
        await this.client.addSecretVersion({
          parent: secretPath,
          payload: {
            data: Buffer.from(secretValue, 'utf8'),
          },
        });
      } catch (error: any) {
        if (error.code === 5) { // NOT_FOUND
          // Secret doesn't exist, create it
          const [secret] = await this.client.createSecret({
            parent,
            secretId: secretName,
            secret: {
              replication: {
                automatic: {},
              },
            },
          });

          // Add the first version
          await this.client.addSecretVersion({
            parent: secret.name,
            payload: {
              data: Buffer.from(secretValue, 'utf8'),
            },
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new Error(`Failed to store secret ${secretName}: ${error}`);
    }
  }

  /**
   * Retrieve a secret value from Google Secret Manager
   * @param secretName - Unique identifier for the secret
   * @returns The secret value as a string
   */
  async getSecret(secretName: string): Promise<string> {
    const name = `projects/${this.projectId}/secrets/${secretName}/versions/latest`;

    try {
      const [version] = await this.client.accessSecretVersion({ name });
      
      if (!version.payload?.data) {
        throw new Error('Secret payload is empty');
      }

      return version.payload.data.toString('utf8');
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        throw new Error(`Secret ${secretName} not found`);
      }
      throw new Error(`Failed to retrieve secret ${secretName}: ${error}`);
    }
  }

  /**
   * Delete a secret from Google Secret Manager
   * @param secretName - Unique identifier for the secret to delete
   */
  async deleteSecret(secretName: string): Promise<void> {
    const name = `projects/${this.projectId}/secrets/${secretName}`;

    try {
      await this.client.deleteSecret({ name });
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        // Secret doesn't exist, consider it deleted
        return;
      }
      throw new Error(`Failed to delete secret ${secretName}: ${error}`);
    }
  }

  /**
   * Check if a secret exists
   * @param secretName - Unique identifier for the secret
   * @returns true if secret exists, false otherwise
   */
  async secretExists(secretName: string): Promise<boolean> {
    const name = `projects/${this.projectId}/secrets/${secretName}`;

    try {
      await this.client.getSecret({ name });
      return true;
    } catch (error: any) {
      if (error.code === 5) { // NOT_FOUND
        return false;
      }
      throw new Error(`Failed to check secret existence ${secretName}: ${error}`);
    }
  }

  /**
   * Store JSON credentials object as a secret
   * @param secretName - Unique identifier for the secret
   * @param credentials - Object to store as JSON
   */
  async storeJsonCredentials(secretName: string, credentials: any): Promise<void> {
    const jsonString = JSON.stringify(credentials);
    await this.storeSecret(secretName, jsonString);
  }

  /**
   * Retrieve and parse JSON credentials from a secret
   * @param secretName - Unique identifier for the secret
   * @returns Parsed JSON object
   */
  async getJsonCredentials<T = any>(secretName: string): Promise<T> {
    const jsonString = await this.getSecret(secretName);
    return JSON.parse(jsonString);
  }

  /**
   * Generate secret name for merchant credentials (single JSON secret)
   */
  static getMerchantCredentialsSecretName(merchantId: string): string {
    return `merchant-${merchantId}-transak`;
  }

  /**
   * @deprecated Use getMerchantCredentialsSecretName for single JSON secret
   * Generate secret names for merchant credentials
   */
  static getMerchantSecretNames(merchantId: string, provider: string) {
    return {
      apiKey: `merchant-${merchantId}-${provider}-apikey`,
      apiSecret: `merchant-${merchantId}-${provider}-apisecret`,
    };
  }
}
