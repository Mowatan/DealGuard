/**
 * Test Clerk Token Verification
 *
 * This script tests if a Clerk JWT token can be verified with current backend config.
 * Helps diagnose key mismatch issues between frontend and backend.
 *
 * Usage:
 *   1. Sign in on frontend (https://dealguard.org)
 *   2. Open DevTools → Network tab
 *   3. Find any API request → Copy Authorization header value
 *   4. Run: npx tsx scripts/test-token-verify.ts "Bearer eyJhbGci..."
 *      Or: npx tsx scripts/test-token-verify.ts "eyJhbGci..." (Bearer prefix optional)
 */

import { verifyToken } from '@clerk/backend';
import { config } from 'dotenv';

config();

async function testToken(token: string) {
  console.log('🔍 Testing Clerk Token Verification\n');
  console.log('=' .repeat(60));

  // Check backend configuration
  console.log('\n📋 Backend Configuration:');
  const hasSecretKey = !!process.env.CLERK_SECRET_KEY;
  const hasPublishableKey = !!process.env.CLERK_PUBLISHABLE_KEY;

  if (!hasSecretKey) {
    console.log('❌ CLERK_SECRET_KEY: NOT SET');
    console.log('\nError: Cannot verify tokens without CLERK_SECRET_KEY');
    console.log('Add CLERK_SECRET_KEY to .env file or Railway variables');
    process.exit(1);
  }

  console.log('✅ CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY?.substring(0, 15) + '...');

  if (hasPublishableKey) {
    console.log('✅ CLERK_PUBLISHABLE_KEY:', process.env.CLERK_PUBLISHABLE_KEY?.substring(0, 15) + '...');
  } else {
    console.log('⚠️  CLERK_PUBLISHABLE_KEY: Not set (optional but recommended)');
  }

  // Determine key type
  const secretKey = process.env.CLERK_SECRET_KEY!;
  const isTestKey = secretKey.startsWith('sk_test_');
  const isLiveKey = secretKey.startsWith('sk_live_');

  console.log('🔑 Key Type:', isTestKey ? 'TEST' : isLiveKey ? 'LIVE' : 'UNKNOWN');

  // Parse token (remove Bearer prefix if present)
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

  if (!cleanToken) {
    console.log('\n❌ Error: No token provided');
    console.log('Usage: npx tsx scripts/test-token-verify.ts YOUR_TOKEN');
    process.exit(1);
  }

  // Decode token header to check algorithm (without verification)
  try {
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      console.log('\n❌ Error: Invalid token format (should have 3 parts separated by dots)');
      process.exit(1);
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    console.log('\n📝 Token Info (unverified):');
    console.log('  Algorithm:', header.alg);
    console.log('  Type:', header.typ);
    console.log('  Issuer:', payload.iss);
    console.log('  Subject (User ID):', payload.sub);
    console.log('  Issued At:', new Date(payload.iat * 1000).toISOString());
    console.log('  Expires At:', new Date(payload.exp * 1000).toISOString());

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp < now;
    console.log('  Expired:', isExpired ? '❌ YES' : '✅ NO');

    if (isExpired) {
      console.log('\n⚠️  WARNING: Token is expired!');
      console.log('   Sign in again to get a fresh token.');
    }
  } catch (error) {
    console.log('\n⚠️  Could not decode token header (will try to verify anyway)');
  }

  // Verify token with Clerk
  console.log('\n' + '='.repeat(60));
  console.log('\n🔐 Verifying Token with Clerk...\n');

  try {
    const verifyOptions: any = {
      secretKey: process.env.CLERK_SECRET_KEY,
    };

    if (process.env.CLERK_PUBLISHABLE_KEY) {
      verifyOptions.publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    }

    if (process.env.CLERK_API_URL) {
      verifyOptions.apiUrl = process.env.CLERK_API_URL;
    }

    if (process.env.CLERK_JWKS_URL) {
      verifyOptions.jwksUrl = process.env.CLERK_JWKS_URL;
    }

    const startTime = Date.now();
    const payload = await verifyToken(cleanToken, verifyOptions);
    const duration = Date.now() - startTime;

    console.log('✅ TOKEN VERIFIED SUCCESSFULLY!\n');
    console.log('Verification took:', duration + 'ms');
    console.log('\n📋 Verified Claims:');
    console.log('  User ID (sub):', payload.sub);
    console.log('  Issuer (iss):', (payload as any).iss);
    console.log('  Authorized Party:', (payload as any).azp);

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 SUCCESS!');
    console.log('\nYour backend configuration is correct and can verify tokens.');
    console.log('If API calls are still failing:');
    console.log('  1. Make sure frontend is using the same Clerk keys');
    console.log('  2. Check CORS configuration');
    console.log('  3. Verify Authorization header is being sent correctly');
    console.log('\n' + '='.repeat(60));

  } catch (error: any) {
    console.log('❌ TOKEN VERIFICATION FAILED!\n');
    console.log('Error:', error.message);

    if (error.message.includes('JWK')) {
      console.log('\n🔍 Diagnosis: JWK Resolution Failed');
      console.log('  Problem: Backend cannot fetch public keys from Clerk');
      console.log('  Possible causes:');
      console.log('    1. Network issue (backend cannot reach Clerk)');
      console.log('    2. Key mismatch (frontend and backend using different Clerk instances)');
      console.log('    3. Custom domain not configured correctly');
      console.log('\n  Solutions:');
      console.log('    - Verify CLERK_SECRET_KEY matches frontend\'s Clerk instance');
      console.log('    - Check Railway can access external HTTPS (Clerk JWKS endpoint)');
      console.log('    - See: CLERK_BACKEND_JWK_FIX.md');
    } else if (error.message.includes('signature')) {
      console.log('\n🔍 Diagnosis: Invalid Signature');
      console.log('  Problem: Token was signed with different secret key');
      console.log('  Possible causes:');
      console.log('    1. Frontend using different Clerk instance than backend');
      console.log('    2. Frontend using test keys, backend using live keys (or vice versa)');
      console.log('    3. Keys are from different Clerk accounts');
      console.log('\n  Solutions:');
      console.log('    - Get BOTH keys from SAME Clerk dashboard');
      console.log('    - Update frontend (Vercel) with matching keys');
      console.log('    - Update backend (Railway) with matching keys');
      console.log('    - Redeploy both, sign out, sign in again');
      console.log('    - See: CLERK_KEY_MISMATCH_DEBUG.md');
    } else if (error.message.includes('expired')) {
      console.log('\n🔍 Diagnosis: Token Expired');
      console.log('  Problem: Token is too old (usually 1 hour lifetime)');
      console.log('  Solution: Sign in again to get a fresh token');
    } else {
      console.log('\n🔍 Diagnosis: Unknown Error');
      console.log('  Full error:', error);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n❌ VERIFICATION FAILED');
    console.log('\nRecommended Actions:');
    console.log('  1. Check CLERK_SECRET_KEY in Railway matches Clerk instance');
    console.log('  2. Verify frontend and backend use keys from SAME Clerk account');
    console.log('  3. Ensure both are test keys OR both are live keys (not mixed)');
    console.log('  4. Check Railway logs for more error details');
    console.log('\nDocumentation:');
    console.log('  - CLERK_KEY_MISMATCH_DEBUG.md (key mismatch issues)');
    console.log('  - CLERK_BACKEND_JWK_FIX.md (JWK resolution issues)');
    console.log('\n' + '='.repeat(60));

    process.exit(1);
  }
}

// Get token from command line
const args = process.argv.slice(2);
const token = args.join(' '); // Allow tokens with spaces (though they shouldn't have any)

if (!token) {
  console.log('❌ Error: No token provided\n');
  console.log('Usage:');
  console.log('  npx tsx scripts/test-token-verify.ts YOUR_TOKEN');
  console.log('  npx tsx scripts/test-token-verify.ts "Bearer YOUR_TOKEN"');
  console.log('\nHow to get a token:');
  console.log('  1. Sign in on https://dealguard.org');
  console.log('  2. Open DevTools (F12) → Network tab');
  console.log('  3. Make any API request (create deal, view deals, etc.)');
  console.log('  4. Click on the request → Headers tab');
  console.log('  5. Copy the "Authorization" header value');
  console.log('  6. Run this script with that value');
  console.log('\nExample:');
  console.log('  npx tsx scripts/test-token-verify.ts "eyJhbGciOiJSUzI1NiIsImtpZCI6Imluc..."');
  process.exit(1);
}

testToken(token);
