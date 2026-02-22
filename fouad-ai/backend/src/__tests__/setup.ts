/**
 * Jest Test Setup
 * Runs before all tests
 */

import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Mock Prisma Client for unit tests
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock console methods to reduce noise in tests (will be overridden in global scope)
