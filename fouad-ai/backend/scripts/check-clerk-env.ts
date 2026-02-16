/**
 * Quick Clerk Environment Check
 *
 * Run this to quickly verify Clerk environment variables are set correctly.
 * Usage: npx tsx scripts/check-clerk-env.ts
 */

import { config } from 'dotenv';

config();

console.log('🔍 Checking Clerk Environment Variables...\n');

const checks = {
  CLERK_SECRET_KEY: {
    value: process.env.CLERK_SECRET_KEY,
    required: true,
    expectedPrefix: ['sk_live_', 'sk_test_'],
  },
  CLERK_PUBLISHABLE_KEY: {
    value: process.env.CLERK_PUBLISHABLE_KEY,
    required: true,
    expectedPrefix: ['pk_live_', 'pk_test_'],
  },
  CLERK_API_URL: {
    value: process.env.CLERK_API_URL,
    required: false,
    expectedPrefix: ['https://'],
  },
  CLERK_JWKS_URL: {
    value: process.env.CLERK_JWKS_URL,
    required: false,
    expectedPrefix: ['https://'],
  },
};

let hasErrors = false;
let hasWarnings = false;

// Check each variable
Object.entries(checks).forEach(([name, config]) => {
  const isSet = !!config.value;
  const prefix = config.value?.substring(0, 10);

  if (config.required && !isSet) {
    console.log(`❌ ${name}: NOT SET (REQUIRED)`);
    hasErrors = true;
  } else if (config.required && isSet) {
    const hasValidPrefix = config.expectedPrefix.some(p => config.value!.startsWith(p));
    if (hasValidPrefix) {
      console.log(`✅ ${name}: Set (${prefix}...)`);
    } else {
      console.log(`⚠️  ${name}: Set but unexpected format (${prefix}...)`);
      console.log(`   Expected to start with: ${config.expectedPrefix.join(' or ')}`);
      hasWarnings = true;
    }
  } else if (!config.required && isSet) {
    console.log(`✅ ${name}: Set (${prefix}...)`);
  } else {
    console.log(`ℹ️  ${name}: Not set (optional)`);
  }
});

console.log('\n---');

// Summary
if (hasErrors) {
  console.log('\n❌ ERRORS FOUND');
  console.log('\nThe backend will return:');
  console.log('  "Authentication service not configured" (HTTP 500)');
  console.log('\nFix:');
  console.log('  1. Add missing variables to Railway → Backend → Variables');
  console.log('  2. Get keys from: https://dashboard.clerk.com → API Keys');
  console.log('  3. Use PRODUCTION keys (sk_live_... / pk_live_...)');
  console.log('\nSee: CLERK_AUTH_NOT_CONFIGURED_FIX.md');
  process.exit(1);
} else if (hasWarnings) {
  console.log('\n⚠️  WARNINGS');
  console.log('\nConfiguration may work but has unexpected values.');
  console.log('Verify the keys are correct in Clerk dashboard.');
} else {
  console.log('\n✅ ALL CHECKS PASSED');
  console.log('\nClerk authentication should work correctly.');
  console.log('\nNext steps:');
  console.log('  1. Make sure these same keys are in Railway');
  console.log('  2. Redeploy backend if you just added them');
  console.log('  3. Test: curl https://api.dealguard.org/api/users/me');
  console.log('     Expected: 401 Unauthorized (not 500)');
}

// Check key type consistency
const secretKey = process.env.CLERK_SECRET_KEY;
const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;

if (secretKey && publishableKey) {
  const secretIsLive = secretKey.startsWith('sk_live_');
  const secretIsTest = secretKey.startsWith('sk_test_');
  const publishableIsLive = publishableKey.startsWith('pk_live_');
  const publishableIsTest = publishableKey.startsWith('pk_test_');

  console.log('\nKey Type Check:');
  if (secretIsLive && publishableIsLive) {
    console.log('  ✅ Both keys are LIVE (production)');
  } else if (secretIsTest && publishableIsTest) {
    console.log('  ⚠️  Both keys are TEST (development)');
    console.log('     Use LIVE keys for production!');
  } else {
    console.log('  ❌ KEY MISMATCH!');
    console.log(`     Secret: ${secretIsLive ? 'LIVE' : 'TEST'}`);
    console.log(`     Publishable: ${publishableIsLive ? 'LIVE' : 'TEST'}`);
    console.log('     Both must be same type (both LIVE or both TEST)');
    hasErrors = true;
  }
}

// Check NODE_ENV
console.log('\nEnvironment:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

if (process.env.NODE_ENV === 'production') {
  if (secretKey?.startsWith('sk_test_') || publishableKey?.startsWith('pk_test_')) {
    console.log('  ⚠️  WARNING: Using TEST keys in production environment!');
    console.log('     Switch to LIVE keys for production.');
  }
}

console.log('\n---\n');
