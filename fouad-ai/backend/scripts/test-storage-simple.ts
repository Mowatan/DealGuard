/**
 * Simple Storage Test
 * Quick test to verify storage operations work
 */

import { storage } from '../src/lib/storage';

async function main() {
  console.log('Testing storage...\n');

  // Check health
  const health = await storage.healthCheck();
  console.log('Health:', JSON.stringify(health, null, 2));
  console.log('Current provider:', storage.getCurrentProvider());

  // Upload a test file
  console.log('\nUploading test file...');
  const buffer = Buffer.from('Hello from storage test!');
  const result = await storage.uploadDocument(buffer, 'test.txt', 'text/plain');
  console.log('Upload successful!');
  console.log('Key:', result.key);
  console.log('URL:', result.url);

  // Get file URL
  const [bucket, ...keyParts] = result.key.split('/');
  const key = keyParts.join('/');
  const url = await storage.getFileUrl(bucket, key, 300);
  console.log('Generated URL:', url);

  // Clean up
  await storage.deleteFile(bucket, key);
  console.log('\nCleaned up test file');
  console.log('✅ Test complete!');
}

main().catch(console.error);
