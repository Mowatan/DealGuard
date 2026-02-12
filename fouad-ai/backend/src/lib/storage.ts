import * as Minio from 'minio';
import { createHash } from 'crypto';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'adminpassword',
});

export interface UploadResult {
  key: string;
  url: string;
  hash: string;
  size: number;
}

export class StorageService {
  private documentsBucket = process.env.MINIO_BUCKET_DOCUMENTS || 'fouad-documents';
  private evidenceBucket = process.env.MINIO_BUCKET_EVIDENCE || 'fouad-evidence';

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
    const timestamp = Date.now();
    const hash = createHash('sha256').update(buffer).digest('hex');
    const key = `${timestamp}-${hash.substring(0, 8)}-${filename}`;

    await minioClient.putObject(bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });

    const url = await minioClient.presignedGetObject(bucket, key, 24 * 60 * 60); // 24h presigned URL

    return {
      key: `${bucket}/${key}`,
      url,
      hash,
      size: buffer.length,
    };
  }

  async getFileUrl(bucket: string, key: string, expirySeconds = 3600): Promise<string> {
    return minioClient.presignedGetObject(bucket, key, expirySeconds);
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await minioClient.removeObject(bucket, key);
  }
}

export const storage = new StorageService();
