import { validateEnvironment } from '../env-validator';

/**
 * Option C regression: FRONTEND_URL and ADMIN_EMAIL must be hard-required in
 * PRODUCTION (fail loud at boot) so the app can never silently fall back to the
 * legacy dealguard.org domain in real user emails — while staying optional in
 * development.
 */
describe('validateEnvironment — production URL/email requirements (Option C)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function setProdBaseline() {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
    process.env.CORS_ORIGIN = 'https://app.example.com';
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.S3_ACCESS_KEY_ID = 'AKIA_test';
    process.env.S3_SECRET_ACCESS_KEY = 'secret_test';
  }

  it('does not flag FRONTEND_URL / ADMIN_EMAIL when both are set in production', () => {
    setProdBaseline();
    const result = validateEnvironment();
    expect(result.errors).not.toContain('FRONTEND_URL is required in production');
    expect(result.errors).not.toContain('ADMIN_EMAIL is required in production');
  });

  it('fails loudly when FRONTEND_URL is missing in production', () => {
    setProdBaseline();
    delete process.env.FRONTEND_URL;
    const result = validateEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('FRONTEND_URL is required in production');
  });

  it('fails loudly when ADMIN_EMAIL is missing in production', () => {
    setProdBaseline();
    delete process.env.ADMIN_EMAIL;
    const result = validateEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('ADMIN_EMAIL is required in production');
  });

  it('does NOT require FRONTEND_URL / ADMIN_EMAIL in development', () => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
    delete process.env.FRONTEND_URL;
    delete process.env.ADMIN_EMAIL;
    const result = validateEnvironment();
    expect(result.errors).not.toContain('FRONTEND_URL is required in production');
    expect(result.errors).not.toContain('ADMIN_EMAIL is required in production');
  });
});

/**
 * Durable-storage fail-loud regression: production must refuse to boot on the
 * ephemeral local-filesystem fallback (which loses uploaded evidence/documents on
 * redeploy). S3/R2 OR MinIO satisfies it; development is exempt.
 */
describe('validateEnvironment — production durable storage (fail-loud)', () => {
  const ORIGINAL_ENV = process.env;
  const STORAGE_ERROR = /Durable storage is required in production/;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // Valid prod env EXCEPT storage — each test opts a provider in.
  function setProdBaselineNoStorage() {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
    process.env.CORS_ORIGIN = 'https://app.example.com';
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_ACCESS_KEY;
  }

  it('fails loudly in production with no durable storage (ephemeral local FS)', () => {
    setProdBaselineNoStorage();
    const result = validateEnvironment();
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => STORAGE_ERROR.test(e))).toBe(true);
  });

  it('accepts S3/R2 credentials as durable storage', () => {
    setProdBaselineNoStorage();
    process.env.S3_ACCESS_KEY_ID = 'AKIA_test';
    process.env.S3_SECRET_ACCESS_KEY = 'secret_test';
    const result = validateEnvironment();
    expect(result.errors.some(e => STORAGE_ERROR.test(e))).toBe(false);
  });

  it('accepts MinIO as durable storage', () => {
    setProdBaselineNoStorage();
    process.env.MINIO_ENDPOINT = 'minio.internal';
    process.env.MINIO_ACCESS_KEY = 'minio_key';
    const result = validateEnvironment();
    expect(result.errors.some(e => STORAGE_ERROR.test(e))).toBe(false);
  });

  it('does NOT require durable storage in development', () => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.CLERK_SECRET_KEY = 'sk_test_x';
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.MINIO_ACCESS_KEY;
    const result = validateEnvironment();
    expect(result.errors.some(e => STORAGE_ERROR.test(e))).toBe(false);
  });
});
