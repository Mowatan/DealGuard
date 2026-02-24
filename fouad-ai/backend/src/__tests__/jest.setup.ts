/**
 * Jest Global Setup
 * This file runs BEFORE the test framework is initialized
 * ALL MOCKS MUST BE DEFINED HERE BEFORE ANY MODULE IMPORTS
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { mockQueue, mockRedis, mockEmailService, mockStorage, mockClerk } from './mocks';

// Set test environment variables FIRST
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.REDIS_URL = 'redis://localhost:6379'; // Will be mocked

// Mock Prisma Client
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

// Mock Queue (BullMQ)
jest.mock('../lib/queue', () => ({
  __esModule: true,
  emailSendingQueue: mockQueue,
  blockchainAnchorQueue: mockQueue,
  evidenceProcessingQueue: mockQueue,
  aiSuggestionQueue: mockQueue,
  redisConnection: mockRedis,
}));

// Mock Email Service
jest.mock('../lib/email.service', () => ({
  __esModule: true,
  sendEmail: mockEmailService.sendEmail,
  sendTemplateEmail: mockEmailService.sendTemplateEmail,
}));

// Mock Storage
jest.mock('../lib/storage', () => ({
  __esModule: true,
  storage: mockStorage,
}));

// Mock Clerk
jest.mock('@clerk/backend', () => ({
  __esModule: true,
  clerkClient: mockClerk,
}));

// Mock console to reduce noise (keep error for debugging)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
};
