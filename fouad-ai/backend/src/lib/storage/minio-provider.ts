/**
 * MinIO Storage Provider
 *
 * Implements the StorageProvider interface using MinIO object storage.
 * This is the primary/production storage backend.
 */

import * as Minio from 'minio';
import { createHash } from 'crypto';
import { StorageProvider, UploadResult, StorageConfig } from './types';

export class MinioStorageProvider implements StorageProvider {
  private client: Minio.Client;
  private documentsBucket: string;
  private evidenceBucket: string;

  constructor(config: StorageConfig) {
    this.client = new Minio.Client({
      endPoint: config.minioEndpoint,
      port: config.minioPort,
      useSSL: config.minioUseSSL,
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    });

    this.documentsBucket = config.documentsBucket;
    this.evidenceBucket = config.evidenceBucket;
  }

  getProviderName(): string {
    return 'MinIO';
  }

  async uploadDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    await this.ensureBucketExists(this.documentsBucket);
    return this.upload(this.documentsBucket, buffer, filename, mimeType);
  }

  async uploadEvidence(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    await this.ensureBucketExists(this.evidenceBucket);
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

    await this.client.putObject(bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    // Generate presigned URL (24h expiry by default)
    const url = await this.client.presignedGetObject(bucket, key, 24 * 60 * 60);

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

  async getFileUrl(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(bucket, key, expirySeconds);
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Attempt to list buckets to verify connectivity
      await this.client.listBuckets();
      return true;
    } catch (error) {
      console.error('MinIO health check failed:', error);
      return false;
    }
  }

  /**
   * Ensure a bucket exists, creating it if necessary
   * @param bucket Bucket name to check/create
   */
  private async ensureBucketExists(bucket: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, '');
        console.log(`✅ Created MinIO bucket: ${bucket}`);
      }
    } catch (error) {
      console.error(`Failed to ensure bucket exists: ${bucket}`, error);
      throw error;
    }
  }
}
