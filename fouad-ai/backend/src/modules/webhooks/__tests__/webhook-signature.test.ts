import crypto from 'crypto';
import { verifyMailgunSignature } from '../webhook.routes';

const SIGNING_KEY = 'test-signing-key';

function sign(timestamp: string, token: string, key = SIGNING_KEY): string {
  return crypto.createHmac('sha256', key).update(`${timestamp}${token}`).digest('hex');
}

function freshTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

describe('verifyMailgunSignature', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, INBOUND_EMAIL_WEBHOOK_SECRET: SIGNING_KEY };
    delete process.env.MAILGUN_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('accepts a valid, fresh, flat signature', () => {
    const timestamp = freshTimestamp();
    const token = 'abc123';
    expect(
      verifyMailgunSignature({ timestamp, token, signature: sign(timestamp, token) })
    ).toBe(true);
  });

  it('accepts a valid signature nested under a signature object', () => {
    const timestamp = freshTimestamp();
    const token = 'nested-token';
    expect(
      verifyMailgunSignature({
        signature: { timestamp, token, signature: sign(timestamp, token) },
        'event-data': {},
      })
    ).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const timestamp = freshTimestamp();
    const token = 'abc123';
    const valid = sign(timestamp, token);
    // Deterministically flip the first hex char so the signature always differs.
    const tampered = (valid[0] === '0' ? '1' : '0') + valid.slice(1);
    expect(verifyMailgunSignature({ timestamp, token, signature: tampered })).toBe(false);
  });

  it('rejects a signature made with the wrong key', () => {
    const timestamp = freshTimestamp();
    const token = 'abc123';
    expect(
      verifyMailgunSignature({ timestamp, token, signature: sign(timestamp, token, 'wrong-key') })
    ).toBe(false);
  });

  it('rejects a stale timestamp (replay protection)', () => {
    const staleTimestamp = (Math.floor(Date.now() / 1000) - 3600).toString(); // 1h old
    const token = 'abc123';
    expect(
      verifyMailgunSignature({
        timestamp: staleTimestamp,
        token,
        signature: sign(staleTimestamp, token),
      })
    ).toBe(false);
  });

  it('rejects when required fields are missing', () => {
    expect(verifyMailgunSignature({})).toBe(false);
    expect(verifyMailgunSignature({ timestamp: freshTimestamp(), token: 'x' })).toBe(false);
  });

  it('fails closed when no signing key is configured', () => {
    delete process.env.INBOUND_EMAIL_WEBHOOK_SECRET;
    delete process.env.MAILGUN_API_KEY;
    const timestamp = freshTimestamp();
    const token = 'abc123';
    expect(
      verifyMailgunSignature({ timestamp, token, signature: sign(timestamp, token) })
    ).toBe(false);
  });

  it('rejects a non-hex signature without throwing', () => {
    const timestamp = freshTimestamp();
    const token = 'abc123';
    expect(
      verifyMailgunSignature({ timestamp, token, signature: 'not-hex-!!!' })
    ).toBe(false);
  });
});
