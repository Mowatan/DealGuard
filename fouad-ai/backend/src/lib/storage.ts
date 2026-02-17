/**
 * Storage Service Orchestrator
 *
 * Manages storage providers with automatic failover. Supports multiple backends:
 * - S3/R2 (production - primary when credentials available)
 * - MinIO (development/staging)
 * - Local FS (fallback)
 *
 * Key features:
 * - Automatic provider selection based on available credentials
 * - Automatic failover between providers on failures
 * - Health monitoring of all providers
 * - Transparent operation (callers don't need to know about provider)
 * - Comprehensive logging for monitoring and debugging
 */

import { StorageProvider, UploadResult, StorageHealthStatus, StorageConfig } from './storage/types';
import { S3StorageProvider } from './storage/s3-provider';
import { MinioStorageProvider } from './storage/minio-provider';
import { LocalStorageProvider } from './storage/local-provider';

// Re-export types for backward compatibility
export { UploadResult } from './storage/types';

export class StorageService {
  private s3Provider: S3StorageProvider | null = null;
  private minioProvider: MinioStorageProvider | null = null;
  private localProvider: LocalStorageProvider | null = null;
  private currentProvider!: StorageProvider; // Definite assignment - set in constructor before use
  private fallbackEnabled: boolean;

  constructor() {
    // Load configuration from environment
    const config: StorageConfig = {
      minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
      minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
      minioAccessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      minioSecretKey: process.env.MINIO_SECRET_KEY || 'adminpassword',
      minioUseSSL: process.env.MINIO_USE_SSL === 'true',
      fallbackEnabled: process.env.STORAGE_FALLBACK_ENABLED !== 'false', // Default to true
      localStoragePath: process.env.STORAGE_LOCAL_PATH || '/app/uploads',
      publicUrl: process.env.PUBLIC_URL || 'http://localhost:4000',
      documentsBucket: process.env.MINIO_BUCKET_DOCUMENTS || 'fouad-documents',
      evidenceBucket: process.env.MINIO_BUCKET_EVIDENCE || 'fouad-evidence',
    };

    this.fallbackEnabled = config.fallbackEnabled;

    // Priority 1: Try S3/R2 if credentials are available
    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      try {
        this.s3Provider = new S3StorageProvider(config);
        this.currentProvider = this.s3Provider;
        console.log('✅ Storage: Using S3/R2 as primary provider');
      } catch (error) {
        console.error('❌ Failed to initialize S3/R2 provider:', error);
      }
    }

    // Priority 2: MinIO (if S3 not available)
    if (!this.s3Provider) {
      try {
        this.minioProvider = new MinioStorageProvider(config);
        this.currentProvider = this.minioProvider;
        console.log('✅ Storage: Using MinIO as primary provider');
      } catch (error) {
        console.error('❌ Failed to initialize MinIO provider:', error);
      }
    }

    // Priority 3: Local storage fallback (always available)
    if (this.fallbackEnabled) {
      this.localProvider = new LocalStorageProvider(config);
      if (!this.s3Provider && !this.minioProvider) {
        this.currentProvider = this.localProvider;
        console.log('✅ Storage: Using LocalStorage as primary provider');
      }
    }

    // Ensure we have at least one provider
    if (!this.currentProvider) {
      throw new Error('No storage provider available. Please configure S3, MinIO, or enable local storage fallback.');
    }

    // Run health checks on startup
    this.initializeProviders();
  }

  /**
   * Initialize providers and determine which one to use based on health checks
   */
  private async initializeProviders(): Promise<void> {
    try {
      const currentHealthy = await this.currentProvider.healthCheck();

      if (currentHealthy) {
        console.log(`✅ Storage: ${this.currentProvider.getProviderName()} is healthy`);
      } else {
        console.warn(`⚠️  Storage: ${this.currentProvider.getProviderName()} health check failed`);
        // Try to switch to next available provider
        await this.tryFallbackProviders();
      }
    } catch (error) {
      console.error('Storage initialization error:', error);
      await this.tryFallbackProviders();
    }
  }

  /**
   * Try to switch to next available healthy provider
   */
  private async tryFallbackProviders(): Promise<void> {
    // Try providers in order: S3/R2 -> MinIO -> Local
    const providers: Array<StorageProvider | null> = [
      this.s3Provider,
      this.minioProvider,
      this.localProvider,
    ];

    for (const provider of providers) {
      if (!provider || provider === this.currentProvider) continue;

      try {
        const healthy = await provider.healthCheck();
        if (healthy) {
          this.currentProvider = provider;
          console.log(`✅ Storage: Switched to ${provider.getProviderName()}`);
          return;
        }
      } catch (error) {
        console.error(`❌ ${provider.getProviderName()} health check failed:`, error);
      }
    }

    console.error('❌ Storage: No healthy providers available');
  }

  /**
   * Execute a storage operation with automatic fallback on failure
   * @param operation Function that performs the storage operation
   * @param operationName Name of the operation (for logging)
   * @returns Result of the operation
   */
  private async executeWithFallback<T>(
    operation: (provider: StorageProvider) => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      // Try with current provider
      return await operation(this.currentProvider);
    } catch (error) {
      console.error(
        `Storage operation failed (${operationName}) with ${this.currentProvider.getProviderName()}:`,
        error
      );

      // Try all other available providers
      const providers: Array<StorageProvider | null> = [
        this.s3Provider,
        this.minioProvider,
        this.localProvider,
      ];

      for (const provider of providers) {
        if (!provider || provider === this.currentProvider) continue;

        console.log(`⚠️  Attempting ${operationName} with ${provider.getProviderName()}...`);

        try {
          const result = await operation(provider);
          // Success! Switch to this provider for future operations
          this.currentProvider = provider;
          console.log(`✅ Storage: Switched to ${provider.getProviderName()} for future operations`);
          return result;
        } catch (fallbackError) {
          console.error(`❌ ${provider.getProviderName()} also failed:`, fallbackError);
        }
      }

      // All providers failed
      throw error;
    }
  }

  /**
   * Upload a document to storage
   */
  async uploadDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    return this.executeWithFallback(
      (provider) => provider.uploadDocument(buffer, filename, mimeType),
      'uploadDocument'
    );
  }

  /**
   * Upload evidence file to storage
   */
  async uploadEvidence(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    return this.executeWithFallback(
      (provider) => provider.uploadEvidence(buffer, filename, mimeType),
      'uploadEvidence'
    );
  }

  /**
   * Get accessible URL for a stored file
   */
  async getFileUrl(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
    return this.executeWithFallback(
      (provider) => provider.getFileUrl(bucket, key, expirySeconds),
      'getFileUrl'
    );
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    return this.executeWithFallback(
      (provider) => provider.deleteFile(bucket, key),
      'deleteFile'
    );
  }

  /**
   * Get health status of all storage providers
   * @returns Health status object showing current provider and health of all providers
   */
  async healthCheck(): Promise<StorageHealthStatus> {
    const providers: any = {};

    // Check S3/R2
    if (this.s3Provider) {
      try {
        providers.s3 = await this.s3Provider.healthCheck();
      } catch (error) {
        providers.s3 = false;
      }
    }

    // Check MinIO
    if (this.minioProvider) {
      try {
        providers.minio = await this.minioProvider.healthCheck();
      } catch (error) {
        providers.minio = false;
      }
    }

    // Check Local
    if (this.localProvider) {
      try {
        providers.local = await this.localProvider.healthCheck();
      } catch (error) {
        providers.local = false;
      }
    }

    // Legacy compatibility: use first available provider as "primary"
    const primary = providers.s3 ?? providers.minio ?? false;
    const fallback = providers.local ?? null;

    return {
      current: this.currentProvider.getProviderName(),
      providers,
      primary,
      fallback,
    };
  }

  /**
   * Get the name of the currently active provider
   * @returns Provider name (e.g., 'MinIO', 'LocalFileSystem')
   */
  getCurrentProvider(): string {
    return this.currentProvider.getProviderName();
  }
}

// Export singleton instance for use throughout the application
export const storage = new StorageService();
