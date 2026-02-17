/**
 * Storage Provider Interface
 *
 * Defines the contract that all storage providers (MinIO, Local FS, S3, etc.) must implement.
 * This abstraction allows seamless switching between storage backends without changing
 * dependent services (custody, contracts, evidence, KYC).
 */

export interface UploadResult {
  key: string;      // Storage key in format: bucket/timestamp-hash-filename
  url: string;      // Accessible URL (presigned for MinIO, local path for FS)
  hash: string;     // SHA-256 hash of file contents for integrity verification
  bucket: string;   // Bucket name (e.g., 'fouad-documents', 'fouad-evidence')
  filename: string; // Original filename
  size: number;     // File size in bytes
  mimeType: string; // MIME type of the file
}

export interface StorageProvider {
  /**
   * Upload a document (contract, KYC, etc.) to storage
   * @param buffer File content as Buffer
   * @param filename Original filename
   * @param mimeType MIME type of the file
   * @returns Upload result with storage key and accessible URL
   */
  uploadDocument(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult>;

  /**
   * Upload evidence file (dispute evidence, milestone proof, etc.) to storage
   * @param buffer File content as Buffer
   * @param filename Original filename
   * @param mimeType MIME type of the file
   * @returns Upload result with storage key and accessible URL
   */
  uploadEvidence(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult>;

  /**
   * Get accessible URL for a stored file
   * @param bucket Bucket name (e.g., 'fouad-documents')
   * @param key File key within bucket
   * @param expirySeconds URL expiry time in seconds (for presigned URLs)
   * @returns Accessible URL for the file
   */
  getFileUrl(bucket: string, key: string, expirySeconds?: number): Promise<string>;

  /**
   * Delete a file from storage
   * @param bucket Bucket name
   * @param key File key within bucket
   */
  deleteFile(bucket: string, key: string): Promise<void>;

  /**
   * Check if the storage provider is healthy and accessible
   * @returns true if provider is operational, false otherwise
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get the name of this storage provider (for logging and monitoring)
   * @returns Provider name (e.g., 'MinIO', 'LocalFileSystem')
   */
  getProviderName(): string;
}

export interface StorageHealthStatus {
  current: string;           // Name of currently active provider
  primary: boolean;          // Health status of primary provider (MinIO)
  fallback: boolean | null;  // Health status of fallback provider (null if disabled)
}

export interface StorageConfig {
  // MinIO Configuration
  minioEndpoint: string;
  minioPort: number;
  minioAccessKey: string;
  minioSecretKey: string;
  minioUseSSL: boolean;

  // Local Storage Configuration
  fallbackEnabled: boolean;
  localStoragePath: string;
  publicUrl: string;

  // Bucket names
  documentsBucket: string;
  evidenceBucket: string;
}
