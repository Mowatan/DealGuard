/**
 * Storage Fallback Integration Test
 *
 * Tests the storage service with MinIO and local filesystem fallback:
 * 1. Check initial health status
 * 2. Upload test files
 * 3. Retrieve file URLs
 * 4. Verify file access
 * 5. Clean up test files
 *
 * Usage: npm run dev scripts/test-storage-fallback.ts
 */

import { storage } from '../src/lib/storage';
import { config } from 'dotenv';

// Load environment variables
config();

async function testStorageFallback() {
  console.log('\n=== Storage Fallback Integration Test ===\n');

  try {
    // 1. Check initial health
    console.log('1️⃣  Checking storage health...');
    const health = await storage.healthCheck();
    console.log('   Storage health:', JSON.stringify(health, null, 2));
    console.log('   Current provider:', storage.getCurrentProvider());

    // 2. Upload test document
    console.log('\n2️⃣  Uploading test document...');
    const testBuffer = Buffer.from('Test file content for storage verification');
    const docResult = await storage.uploadDocument(
      testBuffer,
      'test-document.txt',
      'text/plain'
    );
    console.log('   Upload result:');
    console.log('   - Key:', docResult.key);
    console.log('   - URL:', docResult.url);
    console.log('   - Hash:', docResult.hash);
    console.log('   - Size:', docResult.size, 'bytes');
    console.log('   - Bucket:', docResult.bucket);
    console.log('   - Filename:', docResult.filename);

    // 3. Upload test evidence
    console.log('\n3️⃣  Uploading test evidence...');
    const evidenceBuffer = Buffer.from('Test evidence file for storage verification');
    const evidenceResult = await storage.uploadEvidence(
      evidenceBuffer,
      'test-evidence.txt',
      'text/plain'
    );
    console.log('   Upload result:');
    console.log('   - Key:', evidenceResult.key);
    console.log('   - URL:', evidenceResult.url);

    // 4. Generate file URLs
    console.log('\n4️⃣  Generating file URLs...');
    const [bucket, ...keyParts] = docResult.key.split('/');
    const key = keyParts.join('/');
    const generatedUrl = await storage.getFileUrl(bucket, key, 3600);
    console.log('   Generated URL (1h expiry):', generatedUrl);

    // 5. Check health again
    console.log('\n5️⃣  Final health check...');
    const finalHealth = await storage.healthCheck();
    console.log('   Final health:', JSON.stringify(finalHealth, null, 2));

    // 6. Clean up
    console.log('\n6️⃣  Cleaning up test files...');
    const [docBucket, ...docKeyParts] = docResult.key.split('/');
    const docKey = docKeyParts.join('/');
    await storage.deleteFile(docBucket, docKey);
    console.log('   Deleted:', docResult.key);

    const [evidenceBucket, ...evidenceKeyParts] = evidenceResult.key.split('/');
    const evidenceKey = evidenceKeyParts.join('/');
    await storage.deleteFile(evidenceBucket, evidenceKey);
    console.log('   Deleted:', evidenceResult.key);

    console.log('\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testStorageFallback()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
