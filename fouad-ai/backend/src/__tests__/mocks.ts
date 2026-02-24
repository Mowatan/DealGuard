/**
 * Mock Infrastructure Services
 * Mock all external dependencies to prevent real connections during tests
 */

// Mock BullMQ Queue
export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
};

// Mock Redis
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn().mockReturnThis(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
};

// Mock Email Service
export const mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendTemplateEmail: jest.fn().mockResolvedValue({ success: true }),
};

// Mock Storage Service
export const mockStorage = {
  uploadFile: jest.fn().mockResolvedValue({ url: 'https://example.com/file.pdf', key: 'mock-key' }),
  uploadDocument: jest.fn().mockResolvedValue({ key: 'mock-document-key', hash: 'mock-hash-123' }),
  deleteFile: jest.fn().mockResolvedValue(true),
  getSignedUrl: jest.fn().mockResolvedValue('https://example.com/signed-url'),
};

// Mock Clerk
export const mockClerk = {
  verifyToken: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
  users: {
    getUser: jest.fn().mockResolvedValue({
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    }),
  },
};

// Mock Blockchain
export const mockBlockchain = {
  anchorHash: jest.fn().mockResolvedValue({ txHash: 'mock-tx-hash' }),
};
