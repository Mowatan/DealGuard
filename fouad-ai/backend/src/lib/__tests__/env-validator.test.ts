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
