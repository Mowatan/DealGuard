import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fouad.ai' },
    update: {},
    create: {
      email: 'admin@fouad.ai',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: UserRole.ADMIN,
    },
  });

  const caseOfficer = await prisma.user.upsert({
    where: { email: 'officer@fouad.ai' },
    update: {},
    create: {
      email: 'officer@fouad.ai',
      passwordHash: adminPassword,
      name: 'Case Officer',
      role: UserRole.CASE_OFFICER,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      email: 'buyer@example.com',
      passwordHash: userPassword,
      name: 'Ahmed Hassan',
      role: UserRole.PARTY_USER,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: {},
    create: {
      email: 'seller@example.com',
      passwordHash: userPassword,
      name: 'Fatima Ali',
      role: UserRole.PARTY_USER,
    },
  });

  console.log('✅ Created users');

  // Create sample organization
  const org = await prisma.organization.create({
    data: {
      name: 'Real Estate Corp',
      registrationNo: 'CR-2024-001',
      contactEmail: 'info@realestatecorp.eg',
      contactPhone: '+20 2 1234 5678',
    },
  });

  console.log('✅ Created organization');

  // Create sample deal
  const deal = await prisma.deal.create({
    data: {
      dealNumber: 'DEAL-2024-0001',
      title: 'Property Sale - Villa in New Cairo',
      description: 'Sale of residential villa with 3 bedrooms, 2 bathrooms, 300 sqm',
      emailAddress: 'deal-sample-001@fouad.ai',
      status: 'DRAFT',
      parties: {
        create: [
          {
            role: 'BUYER',
            name: 'Ahmed Hassan',
            isOrganization: false,
            contactEmail: 'buyer@example.com',
            members: {
              create: {
                userId: buyer.id,
                isPrimaryContact: true,
              },
            },
          },
          {
            role: 'SELLER',
            name: 'Real Estate Corp',
            isOrganization: true,
            organizationId: org.id,
            contactEmail: 'seller@example.com',
            members: {
              create: {
                userId: seller.id,
                isPrimaryContact: true,
              },
            },
          },
        ],
      },
    },
    include: {
      parties: true,
    },
  });

  console.log('✅ Created sample deal');

  // Create sample contract with milestones
  const contract = await prisma.contract.create({
    data: {
      dealId: deal.id,
      version: 1,
      termsJson: {
        parties: ['Ahmed Hassan (Buyer)', 'Real Estate Corp (Seller)'],
        property: 'Villa at New Cairo, Plot 123',
        price: { amount: 3000000, currency: 'EGP' },
        paymentTerms: 'Down payment 30%, balance on transfer',
      },
      milestones: {
        create: [
          {
            title: 'Down Payment',
            description: 'Buyer to pay 30% down payment (900,000 EGP)',
            sequence: 1,
            releaseAmount: 900000,
            currency: 'EGP',
            evidenceChecklistJson: {
              required: ['Bank transfer receipt', 'Payment confirmation'],
            },
          },
          {
            title: 'Title Verification',
            description: 'Verify clear title and no encumbrances',
            sequence: 2,
            evidenceChecklistJson: {
              required: ['Title deed copy', 'Registry confirmation'],
            },
          },
          {
            title: 'Property Inspection',
            description: 'Buyer inspection and acceptance',
            sequence: 3,
            evidenceChecklistJson: {
              required: ['Inspection report', 'Buyer acceptance letter'],
            },
          },
          {
            title: 'Final Payment & Transfer',
            description: 'Final payment and property transfer completion',
            sequence: 4,
            releaseAmount: 2100000,
            currency: 'EGP',
            evidenceChecklistJson: {
              required: [
                'Final payment receipt',
                'Transfer deed',
                'Registry confirmation',
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ Created sample contract with milestones');

  console.log('\n🎉 Seeding complete!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@fouad.ai / admin123');
  console.log('Case Officer: officer@fouad.ai / admin123');
  console.log('Buyer: buyer@example.com / user123');
  console.log('Seller: seller@example.com / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
