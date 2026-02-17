/**
 * S3-Compatible Storage Provider
 *
 * Implements the StorageProvider interface using AWS SDK v3 for S3-compatible storage.
 * Supports both Cloudflare R2 and AWS S3.
 *
 * Configuration:
 * - S3_ENDPOINT: Optional custom endpoint (required for R2)
 * - S3_REGION: AWS region or 'auto' for R2
 * - S3_ACCESS_KEY_ID: Access key
 * - S3_SECRET_ACCESS_KEY: Secret key
 * - S3_FORCE_PATH_STYLE: Use path-style URLs (true for R2)
 * - S3_BUCKET_DOCUMENTS: Bucket for KYC, contracts, custody documents
 * - S3_BUCKET_EVIDENCE: Bucket for evidence files
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';
import { StorageProvider, UploadResult, StorageConfig } from './types';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private documentsBucket: string;
  private evidenceBucket: string;

  constructor(config: StorageConfig) {
    // Configure S3 client for R2 or AWS S3
    const clientConfig: any = {
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    };

    // Add custom endpoint for R2
    if (process.env.S3_ENDPOINT) {
      clientConfig.endpoint = process.env.S3_ENDPOINT;
    }

    // Force path-style URLs for R2 compatibility
    if (process.env.S3_FORCE_PATH_STYLE === 'true') {
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);

    // Use S3-specific bucket names or fall back to MinIO names
    this.documentsBucket = process.env.S3_BUCKET_DOCUMENTS || config.documentsBucket;
    this.evidenceBucket = process.env.S3_BUCKET_EVIDENCE || config.evidenceBucket;

    console.log('✅ S3StorageProvider initialized');
    console.log(`   Region: ${clientConfig.region}`);
    console.log(`   Endpoint: ${clientConfig.endpoint || 'AWS S3 default'}`);
    console.log(`   Documents bucket: ${this.documentsBucket}`);
    console.log(`   Evidence bucket: ${this.evidenceBucket}`);
  }

  getProviderName(): string {
    return process.env.S3_ENDPOINT?.includes('r2.cloudflarestorage.com') ? 'Cloudflare R2' : 'AWS S3';
  }

  async uploadDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    return this.upload(this.documentsBucket, buffer, filename, mimeType);
  }

  async uploadEvidence(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    return this.upload(this.evidenceBucket, buffer, filename, mimeType);
  }

  private async upload(
    bucket: string,
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    // Generate timestamp and hash for unique key (matching MinIO pattern)
    const timestamp = Date.now();
    const hash = createHash('sha256').update(buffer).digest('hex');
    const key = `${timestamp}-${hash.substring(0, 8)}-${filename}`;

    // Upload to S3/R2
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    });

    await this.client.send(command);

    // Generate presigned URL (24h expiry by default, matching MinIO behavior)
    const url = await this.getFileUrl(bucket, key, 24 * 60 * 60);

    return {
      key: `${bucket}/${key}`, // Store in format: bucket/key
      url,
      hash,
      bucket,
      filename,
      size: buffer.length,
      mimeType,
    };
  }

  async getFileUrl(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expirySeconds });
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.client.send(command);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test access to both buckets
      await Promise.all([
        this.client.send(new HeadBucketCommand({ Bucket: this.documentsBucket })),
        this.client.send(new HeadBucketCommand({ Bucket: this.evidenceBucket })),
      ]);
      return true;
    } catch (error: any) {
      console.error('S3/R2 health check failed:', error.message);
      return false;
    }
  }
}
