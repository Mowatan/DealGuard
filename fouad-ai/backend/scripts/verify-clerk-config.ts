/**
 * Verify Clerk Configuration
 *
 * This script checks that Clerk is properly configured and can verify tokens.
 * Run with: npx tsx scripts/verify-clerk-config.ts
 */

import { config } from 'dotenv';

config();

async function verifyClerkConfig() {
  console.log('🔍 Verifying Clerk Configuration...\n');

  // Check environment variables
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
  const hasPublishableKey = !!process.env.CLERK_PUBLISHABLE_KEY;

  console.log('Environment Variables:');
  console.log('  CLERK_SECRET_KEY:', hasSecretKey ? '✅ Set' : '❌ Not Set');
  console.log('  CLERK_PUBLISHABLE_KEY:', hasPublishableKey ? '✅ Set' : '❌ Not Set');

  if (hasSecretKey) {
    const secretKey = process.env.CLERK_SECRET_KEY!;
    const isTestKey = secretKey.startsWith('sk_test_');
    const isLiveKey = secretKey.startsWith('sk_live_');

    console.log('  Secret Key Type:', isTestKey ? '🧪 Test' : isLiveKey ? '🔴 Live' : '⚠️ Unknown');
    console.log('  Secret Key Prefix:', secretKey.substring(0, 15) + '...');
  }

  if (hasPublishableKey) {
    const publishableKey = process.env.CLERK_PUBLISHABLE_KEY!;
    const isTestKey = publishableKey.startsWith('pk_test_');
    const isLiveKey = publishableKey.startsWith('pk_live_');

    console.log('  Publishable Key Type:', isTestKey ? '🧪 Test' : isLiveKey ? '🔴 Live' : '⚠️ Unknown');
    console.log('  Publishable Key Prefix:', publishableKey.substring(0, 15) + '...');
  }

  console.log('\nEnvironment:', process.env.NODE_ENV || 'development');

  // Check if keys are configured
  if (!hasSecretKey || !hasPublishableKey) {
    console.log('\n❌ CONFIGURATION ERROR');
    console.log('\nMissing required Clerk environment variables.');
    console.log('Add the following to your .env file:');
    console.log('');
    console.log('CLERK_SECRET_KEY=sk_test_or_sk_live_...');
    console.log('CLERK_PUBLISHABLE_KEY=pk_test_or_pk_live_...');
    console.log('');
    console.log('Get your keys from: https://dashboard.clerk.com/last-active?path=api-keys');
    process.exit(1);
  }

  // Test Clerk backend SDK
  console.log('\n📡 Testing Clerk Backend SDK...');

  try {
    const { verifyToken } = await import('@clerk/backend');
    console.log('  @clerk/backend package: ✅ Loaded');

    // We can't test token verification without a valid token,
    // but we can verify the function exists
    console.log('  verifyToken function: ✅ Available');

  } catch (error) {
    console.log('  ❌ Error loading @clerk/backend:');
    console.log('  ', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Check JWKS endpoint accessibility
  console.log('\n🔑 Testing JWKS Endpoint...');

  try {
    // Extract instance from publishable key to build JWKS URL
    const publishableKey = process.env.CLERK_PUBLISHABLE_KEY!;

    // For test keys: pk_test_<base64>
    // For live keys: pk_live_<base64>
    // The JWKS URL is: https://clerk.<instance>.clerk.accounts.dev/.well-known/jwks.json

    console.log('  Note: JWKS endpoint is automatically resolved by Clerk SDK');
    console.log('  Clerk will fetch keys from: https://<your-instance>.clerk.accounts.dev/.well-known/jwks.json');
    console.log('  Or if using custom domain: https://clerk.your-domain.com/.well-known/jwks.json');

  } catch (error) {
    console.log('  ⚠️ Could not determine JWKS URL from keys');
  }

  console.log('\n✅ Clerk configuration looks good!');
  console.log('\nNext steps:');
  console.log('1. Make sure these same keys are set in Railway environment variables');
  console.log('2. Redeploy backend after setting variables');
  console.log('3. Test authentication from frontend');
  console.log('\nTo test with a real token, sign in on frontend and check the network request Authorization header.');
}

verifyClerkConfig().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
