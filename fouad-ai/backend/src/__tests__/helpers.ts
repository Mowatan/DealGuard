/**
 * Test Helpers
 * Utilities for creating test data and mocking (no external dependencies)
 */

import { User, Deal, Party, Milestone, Contract, DealStatus, InvitationStatus, MilestoneStatus } from '@prisma/client';

let idCounter = 0;

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${idCounter++}`;
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  const id = generateTestId();
  return {
    id,
    clerkId: `clerk-${id}`,
    email: `test-${id}@example.com`,
    name: `Test User ${id}`,
    role: 'PARTY_USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock deal for testing
 */
export function createMockDeal(overrides?: Partial<Deal>): Deal {
  const id = generateTestId();
  const dealNumber = `DEAL-${new Date().getFullYear()}-${String(idCounter).padStart(4, '0')}`;

  return {
    id,
    dealNumber,
    title: `Test Deal ${id}`,
    description: `This is a test deal for automated testing`,
    status: DealStatus.CREATED,
    transactionType: 'SIMPLE',
    currency: 'USD',
    totalAmount: null,
    serviceTier: 'GOVERNANCE_ADVISORY',
    estimatedValue: null,
    serviceFee: null,
    emailAddress: `deal-${id}@fouad.ai`,
    creatorId: generateTestId(),
    allPartiesConfirmed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    closedAt: null,
    ...overrides,
  };
}

/**
 * Create a mock party for testing
 */
export function createMockParty(overrides?: Partial<Party>): Party {
  const id = generateTestId();
  return {
    id,
    dealId: generateTestId(),
    role: 'BUYER',
    name: `Test Party ${id}`,
    isOrganization: true,
    organizationId: null,
    contactEmail: `party-${id}@example.com`,
    contactPhone: '+1234567890',
    invitationToken: `token-${id}`,
    invitationStatus: InvitationStatus.PENDING,
    invitedAt: new Date(),
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock contract for testing
 */
export function createMockContract(overrides?: Partial<Contract>): Contract {
  const id = generateTestId();
  return {
    id,
    dealId: generateTestId(),
    version: 1,
    content: `This is a test contract for automated testing`,
    isEffective: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock milestone for testing
 */
export function createMockMilestone(overrides?: Partial<Milestone>): Milestone {
  const id = generateTestId();
  return {
    id,
    contractId: generateTestId(),
    order: 1,
    title: `Test Milestone ${id}`,
    description: `This is a test milestone`,
    amount: 10000,
    currency: 'USD',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    status: MilestoneStatus.PENDING,
    triggerType: 'MANUAL',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

/**
 * Generate a test JWT token
 */
export function generateTestToken(userId: string, role: string = 'PARTY_USER'): string {
  return Buffer.from(JSON.stringify({ userId, role })).toString('base64');
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a complete test deal setup with parties and milestones
 */
export function createTestDealSetup() {
  const user = createMockUser();
  const deal = createMockDeal({ creatorId: user.id });
  const party1 = createMockParty({ dealId: deal.id, role: 'BUYER' });
  const party2 = createMockParty({ dealId: deal.id, role: 'SELLER' });
  const contract = createMockContract({ dealId: deal.id });
  const milestone1 = createMockMilestone({ contractId: contract.id, order: 1 });
  const milestone2 = createMockMilestone({ contractId: contract.id, order: 2 });

  return {
    user,
    deal,
    parties: [party1, party2],
    contract,
    milestones: [milestone1, milestone2],
  };
}
