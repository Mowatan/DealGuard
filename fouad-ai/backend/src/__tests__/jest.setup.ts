/**
 * Jest Global Setup
 * This file runs BEFORE the test framework is initialized
 */

// Mock Prisma before any imports
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';
