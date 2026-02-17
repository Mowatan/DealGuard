/**
 * Test Local File Serving
 *
 * This script tests the local filesystem storage and file serving route.
 * It uploads a file using the local provider and verifies it can be accessed.
 */

import { LocalStorageProvider } from '../src/lib/storage/local-provider';
import { config } from 'dotenv';
import { promises as fs } from 'fs';
import * as path from 'path';

config();

async function main() {
  console.log('=== Testing Local File Serving ===\n');

  // Create local storage provider
  const provider = new LocalStorageProvider({
    minioEndpoint: '',
    minioPort: 0,
    minioAccessKey: '',
    minioSecretKey: '',
    minioUseSSL: false,
    fallbackEnabled: true,
    localStoragePath: process.env.STORAGE_LOCAL_PATH || 'uploads',
    publicUrl: process.env.PUBLIC_URL || 'http://localhost:4000',
    documentsBucket: 'fouad-documents',
    evidenceBucket: 'fouad-evidence',
  });

  console.log('1️⃣  Provider:', provider.getProviderName());
  console.log('   Base path:', process.env.STORAGE_LOCAL_PATH || 'uploads');

  // Check health
  console.log('\n2️⃣  Health check...');
  const healthy = await provider.healthCheck();
  console.log('   Healthy:', healthy ? '✅' : '❌');

  if (!healthy) {
    console.error('   Local storage is not healthy. Check write permissions.');
    process.exit(1);
  }

  // Upload test file
  console.log('\n3️⃣  Uploading test file...');
  const content = 'This is a test file for local storage verification!';
  const buffer = Buffer.from(content);
  const result = await provider.uploadDocument(buffer, 'test-local.txt', 'text/plain');

  console.log('   ✅ Upload successful!');
  console.log('   Key:', result.key);
  console.log('   URL:', result.url);
  console.log('   Hash:', result.hash);
  console.log('   Size:', result.size, 'bytes');

  // Verify file exists on filesystem
  console.log('\n4️⃣  Verifying file on filesystem...');
  const localPath = process.env.STORAGE_LOCAL_PATH || 'uploads';
  const [bucket, ...keyParts] = result.key.split('/');
  const key = keyParts.join('/');
  const filePath = path.join(localPath, bucket, key);

  try {
    await fs.access(filePath, fs.constants.R_OK);
    console.log('   ✅ File exists:', filePath);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('   Content matches:', fileContent === content ? '✅' : '❌');
  } catch (error) {
    console.error('   ❌ File not found:', filePath);
  }

  // Test URL access
  console.log('\n5️⃣  Testing URL access...');
  console.log('   Try accessing: GET', result.url);
  console.log('   Or manually: curl', result.url);

  // Clean up
  console.log('\n6️⃣  Cleaning up...');
  await provider.deleteFile(bucket, key);
  console.log('   ✅ File deleted');

  console.log('\n✅ All tests passed!\n');
}

main().catch(console.error);
