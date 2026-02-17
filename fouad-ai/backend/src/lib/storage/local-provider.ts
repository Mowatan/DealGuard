/**
 * Local Filesystem Storage Provider
 *
 * Implements the StorageProvider interface using local filesystem storage.
 * This serves as a fallback when MinIO is unavailable, or for local development.
 *
 * Files are stored in: {basePath}/{bucket}/{timestamp}-{hash}-{filename}
 * Files are served via: {publicUrl}/files/{bucket}/{key}
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { StorageProvider, UploadResult, StorageConfig } from './types';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private publicUrl: string;
  private documentsBucket: string;
  private evidenceBucket: string;

  constructor(config: StorageConfig) {
    this.basePath = config.localStoragePath;
    this.publicUrl = config.publicUrl;
    this.documentsBucket = config.documentsBucket;
    this.evidenceBucket = config.evidenceBucket;
  }

  getProviderName(): string {
    return 'LocalFileSystem';
  }

  async uploadDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    await this.ensureDirectoryExists(this.documentsBucket);
    return this.upload(this.documentsBucket, buffer, filename, mimeType);
  }

  async uploadEvidence(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    await this.ensureDirectoryExists(this.evidenceBucket);
    return this.upload(this.evidenceBucket, buffer, filename, mimeType);
  }

  private async upload(
    bucket: string,
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    const hash = createHash('sha256').update(buffer).digest('hex');
    const key = `${timestamp}-${hash.substring(0, 8)}-${filename}`;

    // Write file to local filesystem
    const bucketPath = path.join(this.basePath, bucket);
    const filePath = path.join(bucketPath, key);
    await fs.writeFile(filePath, buffer);

    // Generate public URL for accessing the file
    const url = `${this.publicUrl}/files/${bucket}/${key}`;

    return {
      key: `${bucket}/${key}`,
      url,
      hash,
      bucket,
      filename,
      size: buffer.length,
      mimeType,
    };
  }

  async getFileUrl(bucket: string, key: string, expirySeconds?: number): Promise<string> {
    // Local filesystem URLs don't expire (expirySeconds ignored)
    // In production, you'd add authentication middleware to the /files route
    return `${this.publicUrl}/files/${bucket}/${key}`;
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    const filePath = path.join(this.basePath, bucket, key);
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        // Ignore "file not found" errors, throw others
        throw error;
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Verify base path exists and is writable
      await fs.access(this.basePath, fs.constants.W_OK);

      // Try writing a test file
      const testPath = path.join(this.basePath, '.health-check');
      await fs.writeFile(testPath, 'ok');
      await fs.unlink(testPath);

      return true;
    } catch (error) {
      console.error('Local storage health check failed:', error);
      return false;
    }
  }

  /**
   * Ensure a directory exists for the bucket, creating it if necessary
   * @param bucket Bucket name (directory name)
   */
  private async ensureDirectoryExists(bucket: string): Promise<void> {
    const bucketPath = path.join(this.basePath, bucket);
    try {
      await fs.mkdir(bucketPath, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory for bucket: ${bucket}`, error);
      throw error;
    }
  }
}
