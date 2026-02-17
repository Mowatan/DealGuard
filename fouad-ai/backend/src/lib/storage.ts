/**
 * Storage Service Orchestrator
 *
 * Manages storage providers (MinIO primary, Local FS fallback) and handles
 * automatic failover between them. This service maintains backward compatibility
 * with existing code while adding resilience.
 *
 * Key features:
 * - Automatic fallback from MinIO to Local FS on failures
 * - Health monitoring of both providers
 * - Transparent operation (callers don't need to know about fallback)
 * - Comprehensive logging for monitoring and debugging
 */

import { StorageProvider, UploadResult, StorageHealthStatus, StorageConfig } from './storage/types';
import { MinioStorageProvider } from './storage/minio-provider';
import { LocalStorageProvider } from './storage/local-provider';

// Re-export types for backward compatibility
export { UploadResult } from './storage/types';

export class StorageService {
  private primaryProvider: MinioStorageProvider;
  private fallbackProvider: LocalStorageProvider | null = null;
  private currentProvider: StorageProvider;
  private fallbackEnabled: boolean;

  constructor() {
    // Load configuration from environment
    const config: StorageConfig = {
      minioEndpoint: process.env.MINIO_ENDPOINT || 'localhost',
      minioPort: parseInt(process.env.MINIO_PORT || '9000', 10),
      minioAccessKey: process.env.MINIO_ACCESS_KEY || 'admin',
      minioSecretKey: process.env.MINIO_SECRET_KEY || 'adminpassword',
      minioUseSSL: process.env.MINIO_USE_SSL === 'true',
      fallbackEnabled: process.env.STORAGE_FALLBACK_ENABLED === 'true',
      localStoragePath: process.env.STORAGE_LOCAL_PATH || '/app/uploads',
      publicUrl: process.env.PUBLIC_URL || 'http://localhost:4000',
      documentsBucket: process.env.MINIO_BUCKET_DOCUMENTS || 'fouad-documents',
      evidenceBucket: process.env.MINIO_BUCKET_EVIDENCE || 'fouad-evidence',
    };

    this.fallbackEnabled = config.fallbackEnabled;

    // Initialize primary provider (MinIO)
    this.primaryProvider = new MinioStorageProvider(config);
    this.currentProvider = this.primaryProvider;

    // Initialize fallback provider if enabled
    if (this.fallbackEnabled) {
      this.fallbackProvider = new LocalStorageProvider(config);
    }

    // Run health checks on startup
    this.initializeProviders();
  }

  /**
   * Initialize providers and determine which one to use based on health checks
   */
  private async initializeProviders(): Promise<void> {
    try {
      const primaryHealthy = await this.primaryProvider.healthCheck();

      if (primaryHealthy) {
        console.log('✅ Storage: MinIO is healthy');
        this.currentProvider = this.primaryProvider;
      } else if (this.fallbackEnabled && this.fallbackProvider) {
        console.log('⚠️  Storage: MinIO unavailable, checking fallback...');
        const fallbackHealthy = await this.fallbackProvider.healthCheck();

        if (fallbackHealthy) {
          this.currentProvider = this.fallbackProvider;
          console.log('✅ Storage: Now using LocalFileSystem fallback');
        } else {
          console.error('❌ Storage: Both primary and fallback providers are unavailable');
        }
      } else {
        console.error('❌ Storage: MinIO unavailable and fallback is disabled');
      }
    } catch (error) {
      console.error('Storage initialization error:', error);
    }
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

      // If fallback is available and we're not already using it, try to switch
      if (
        this.fallbackEnabled &&
        this.fallbackProvider &&
        this.currentProvider !== this.fallbackProvider
      ) {
        console.log(`⚠️  Attempting to switch to fallback for operation: ${operationName}`);
        const switched = await this.switchToFallback(`Operation ${operationName} failed`);

        if (switched) {
          // Retry operation with fallback provider
          try {
            return await operation(this.currentProvider);
          } catch (fallbackError) {
            console.error(
              `Storage operation failed (${operationName}) with fallback provider:`,
              fallbackError
            );
            throw fallbackError;
          }
        }
      }

      // No fallback available or fallback also failed
      throw error;
    }
  }

  /**
   * Switch to fallback provider if available and healthy
   * @param reason Reason for switching (for logging)
   * @returns true if switch was successful, false otherwise
   */
  private async switchToFallback(reason: string): Promise<boolean> {
    if (!this.fallbackEnabled || !this.fallbackProvider) {
      console.log('⚠️  Fallback is not enabled or available');
      return false;
    }

    try {
      const fallbackHealthy = await this.fallbackProvider.healthCheck();

      if (fallbackHealthy) {
        this.currentProvider = this.fallbackProvider;
        console.log(`✅ Storage: Switched to fallback (${this.fallbackProvider.getProviderName()}). Reason: ${reason}`);
        return true;
      } else {
        console.error('❌ Storage: Fallback provider is not healthy');
        return false;
      }
    } catch (error) {
      console.error('Error checking fallback health:', error);
      return false;
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
    const primaryHealthy = await this.primaryProvider.healthCheck();
    let fallbackHealthy: boolean | null = null;

    if (this.fallbackEnabled && this.fallbackProvider) {
      fallbackHealthy = await this.fallbackProvider.healthCheck();
    }

    return {
      current: this.currentProvider.getProviderName(),
      primary: primaryHealthy,
      fallback: fallbackHealthy,
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
