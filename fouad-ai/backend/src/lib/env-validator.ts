/**
 * Environment Variable Validation for Production
 *
 * Validates that all required environment variables are set before starting the server.
 * Fails fast in production if critical variables are missing.
 */

interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate required environment variables for production deployment
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`🔍 Validating environment (NODE_ENV=${process.env.NODE_ENV})...`);

  // CRITICAL: Database
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // CRITICAL: Redis (for queues)
  if (!process.env.REDIS_URL) {
    if (isProduction) {
      errors.push('REDIS_URL is required in production');
    } else {
      warnings.push('REDIS_URL not set, using localhost fallback');
    }
  }

  // CRITICAL: Authentication
  if (!process.env.CLERK_SECRET_KEY) {
    errors.push('CLERK_SECRET_KEY is required');
  }

  if (!process.env.CLERK_PUBLISHABLE_KEY) {
    warnings.push('CLERK_PUBLISHABLE_KEY not set');
  }

  // CRITICAL: CORS Configuration
  if (isProduction && !process.env.CORS_ORIGIN && !process.env.FRONTEND_URL) {
    errors.push('CORS_ORIGIN or FRONTEND_URL must be configured in production');
  }

  // CRITICAL: Email Service (Mailgun)
  if (!process.env.MAILGUN_API_KEY) {
    warnings.push('MAILGUN_API_KEY not set - emails will not be sent');
  }

  if (!process.env.MAILGUN_DOMAIN) {
    warnings.push('MAILGUN_DOMAIN not set - emails will not be sent');
  }

  if (!process.env.EMAIL_FROM) {
    warnings.push('EMAIL_FROM not set - using default sender');
  }

  // CRITICAL: File Storage (S3/R2 for production)
  if (isProduction) {
    if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      warnings.push('S3 credentials not configured - file uploads may fail in production');
    }

    if (!process.env.S3_ENDPOINT) {
      warnings.push('S3_ENDPOINT not set - using AWS S3 defaults');
    }

    if (!process.env.S3_BUCKET_EVIDENCE) {
      warnings.push('S3_BUCKET_EVIDENCE not set - using default bucket name');
    }

    if (!process.env.S3_BUCKET_DOCUMENTS) {
      warnings.push('S3_BUCKET_DOCUMENTS not set - using default bucket name');
    }
  }

  // CRITICAL: Frontend URL for email links (required in PRODUCTION only).
  // Without it, getFrontendUrl() silently falls back to the legacy dealguard.org
  // domain in real user emails. Fail loud at boot rather than fail quiet in prod.
  // Development is unaffected (callers default to http://localhost:3000).
  if (isProduction && !process.env.FRONTEND_URL) {
    errors.push('FRONTEND_URL is required in production');
  }

  // CRITICAL: Admin email (required in PRODUCTION only).
  // Without it, admin notifications fall back to the legacy trust@dealguard.org
  // address. Required in prod; optional/defaulted in development.
  if (isProduction && !process.env.ADMIN_EMAIL) {
    errors.push('ADMIN_EMAIL is required in production');
  }

  // Print validation results
  if (errors.length > 0) {
    console.error('\n❌ CRITICAL: Environment validation failed!\n');
    errors.forEach(error => console.error(`   - ${error}`));
    console.error('');
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment warnings:\n');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Environment validation passed\n');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Print environment status summary (safe - doesn't expose secrets)
 */
export function printEnvironmentStatus(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('📋 Environment Configuration Summary:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PORT: ${process.env.PORT || '4000'}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Redis: ${process.env.REDIS_URL ? '✅ Configured' : '⚠️  Using fallback'}`);
  console.log(`   Clerk Auth: ${process.env.CLERK_SECRET_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Mailgun: ${process.env.MAILGUN_API_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
  console.log(`   S3/R2 Storage: ${process.env.S3_ACCESS_KEY_ID ? '✅ Configured' : (isProduction ? '⚠️  Not configured' : '⚠️  Using fallback')}`);
  console.log(`   CORS: ${process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'localhost:3000'}`);
  console.log('');
}
