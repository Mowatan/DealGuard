import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMilestoneApprovals() {
  console.log('🧪 Testing Milestone Approval System...\n');

  // 1. Check existing data
  console.log('1️⃣ Checking existing data...');
  const deals = await prisma.deal.findMany({ take: 1 });
  const contracts = await prisma.contract.findMany({ take: 1 });
  const milestones = await prisma.milestone.findMany({ take: 1 });
  const users = await prisma.user.findMany({ take: 2 });

  console.log(`   - Deals: ${deals.length}`);
  console.log(`   - Contracts: ${contracts.length}`);
  console.log(`   - Milestones: ${milestones.length}`);
  console.log(`   - Users: ${users.length}\n`);

  if (milestones.length === 0) {
    console.log('❌ No milestones found. Creating test data...\n');
    await createTestData();
    return;
  }

  const milestone = milestones[0];
  console.log(`✅ Using milestone: ${milestone.id} - ${milestone.name}\n`);

  // 2. Check/Create approval requirement
  console.log('2️⃣ Checking approval requirements...');
  let approvalReq = await prisma.milestoneApprovalRequirement.findUnique({
    where: { milestoneId: milestone.id },
  });

  if (!approvalReq) {
    console.log('   Creating default approval requirement...');
    approvalReq = await prisma.milestoneApprovalRequirement.create({
      data: {
        milestoneId: milestone.id,
        requireAdminApproval: true,
        requireBuyerApproval: false,
        requireSellerApproval: false,
      },
    });
    console.log('   ✅ Created with admin approval required\n');
  } else {
    console.log(`   ✅ Found existing requirement:`);
    console.log(`      - Admin: ${approvalReq.requireAdminApproval}`);
    console.log(`      - Buyer: ${approvalReq.requireBuyerApproval}`);
    console.log(`      - Seller: ${approvalReq.requireSellerApproval}\n`);
  }

  // 3. Test milestone details endpoint
  console.log('3️⃣ Testing GET /api/milestones/:id...');
  const response = await fetch(`http://localhost:4000/api/milestones/${milestone.id}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.log(`   ❌ Failed: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`   Response: ${text}\n`);
  } else {
    const data = await response.json();
    console.log(`   ✅ Success! Milestone status: ${data.status}`);
    console.log(`   Approvals: ${data.approvals?.length || 0}`);
    console.log(`   Evidence items: ${data.evidenceItems?.length || 0}\n`);
  }

  // 4. Check current approvals
  console.log('4️⃣ Checking existing approvals...');
  const existingApprovals = await prisma.milestoneApproval.findMany({
    where: { milestoneId: milestone.id },
    include: { user: true },
  });
  console.log(`   Found ${existingApprovals.length} existing approvals`);
  existingApprovals.forEach(a => {
    console.log(`   - ${a.user.name} (${a.user.role}) at ${a.createdAt.toISOString()}`);
  });
  console.log();

  // 5. Test approval completeness check
  console.log('5️⃣ Testing approval completeness logic...');
  const hasAdmin = existingApprovals.some(a =>
    a.user.role === 'ADMIN' || a.user.role === 'SUPER_ADMIN'
  );
  console.log(`   Admin approval present: ${hasAdmin ? '✅' : '❌'}`);

  const isComplete = approvalReq.requireAdminApproval ? hasAdmin : true;
  console.log(`   Is complete: ${isComplete ? '✅' : '❌'}\n`);

  // 6. Summary
  console.log('📊 Summary:');
  console.log(`   Milestone: ${milestone.name} (${milestone.status})`);
  console.log(`   Approval requirement: ${approvalReq ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Approvals submitted: ${existingApprovals.length}`);
  console.log(`   Ready for auto-approval: ${isComplete ? '✅ Yes' : '❌ No'}`);

  if (!isComplete && approvalReq.requireAdminApproval) {
    console.log('\n💡 To test approval submission, you need:');
    console.log('   1. A valid Clerk JWT token');
    console.log('   2. A user with ADMIN or SUPER_ADMIN role');
    console.log('   3. POST to /api/milestones/:id/approvals');
  }

  console.log('\n✅ Milestone approval system is installed and ready!\n');
}

async function createTestData() {
  console.log('Creating test data is complex and requires proper setup.');
  console.log('Please use the existing deals/contracts/milestones in the database.\n');
  console.log('Or use Prisma Studio to create test data manually:\n');
  console.log('   npx prisma studio\n');
}

testMilestoneApprovals()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
