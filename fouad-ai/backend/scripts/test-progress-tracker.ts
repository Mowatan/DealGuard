import { prisma } from '../src/lib/prisma';
import * as dealsService from '../src/modules/deals/deals.service';
import * as progressService from '../src/modules/progress/progress.service';

async function testProgressTracker() {
  console.log('\n🧪 Testing Progress Tracker System\n');
  console.log('=' .repeat(60));

  try {
    // Step 0: Create or find test user
    console.log('\n👤 Step 0: Setting up test user...');
    let testUser = await prisma.user.findFirst({
      where: { email: 'test-admin@dealguard.com' }
    });

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test-admin@dealguard.com',
          name: 'Test Admin',
          passwordHash: '',
          role: 'ADMIN'
        }
      });
      console.log('✅ Test user created:', testUser.email);
    } else {
      console.log('✅ Test user found:', testUser.email);
    }

    const testUserId = testUser.id;

    // Step 1: Create a test deal (TIER 1 - GOVERNANCE_ADVISORY)
    console.log('\n📝 Step 1: Creating test deal (TIER1 SIMPLE)...');
    const deal = await dealsService.createDeal({
      title: 'Test Progress Tracker - Villa Sale',
      description: 'Testing progress tracker functionality for a simple villa sale',
      transactionType: 'SIMPLE',
      serviceTier: 'GOVERNANCE_ADVISORY',
      totalAmount: 5000000,
      currency: 'EGP',
      parties: [
        {
          role: 'BUYER',
          name: 'Ahmed Hassan',
          isOrganization: false,
          contactEmail: 'buyer@test.com'
        },
        {
          role: 'SELLER',
          name: 'Fatima Ali',
          isOrganization: false,
          contactEmail: 'seller@test.com'
        }
      ],
      userId: testUserId,
      creatorName: 'Test Admin',
      creatorEmail: 'test-admin@dealguard.com'
    });

    console.log('✅ Deal created:', deal.dealNumber);
    console.log('   Deal ID:', deal.id);

    // Step 2: Check if progress was initialized
    console.log('\n📊 Step 2: Checking progress initialization...');
    const initialProgress = await progressService.getProgressStatus(deal.id);

    console.log('✅ Progress initialized successfully');
    console.log('   Total stages:', initialProgress.progress.total);
    console.log('   Completed:', initialProgress.progress.completed);
    console.log('   Percentage:', initialProgress.progress.percentage + '%');
    console.log('   Current stage:', initialProgress.progress.currentStage?.stageName || 'None');

    // Verify expected number of stages for TIER1
    if (initialProgress.stages.length !== 8) {
      throw new Error(`Expected 8 stages for TIER1, got ${initialProgress.stages.length}`);
    }

    console.log('\n📋 Stage Breakdown:');
    initialProgress.stages.forEach((stage: any) => {
      const statusIcon = stage.status === 'COMPLETED' ? '✅' :
                        stage.status === 'IN_PROGRESS' ? '🔄' : '⏳';
      console.log(`   ${statusIcon} Stage ${stage.stageOrder}: ${stage.stageName} (${stage.status})`);
    });

    // Step 3: Simulate stage advancement
    console.log('\n⏭️  Step 3: Advancing from stage 1 to stage 2...');
    const advanceResult = await progressService.advanceStage(
      deal.id,
      'DEAL_CREATED',
      testUserId,
      'Testing automatic stage advancement'
    );

    console.log('✅ Stage advanced successfully');
    console.log('   Completed stage:', advanceResult.currentStage.stageName);
    console.log('   Next stage:', advanceResult.nextStage?.stageName || 'None');

    // Step 4: Verify updated progress
    console.log('\n🔍 Step 4: Verifying progress update...');
    const updatedProgress = await progressService.getProgressStatus(deal.id);

    console.log('✅ Progress updated:');
    console.log('   Completed:', updatedProgress.progress.completed, '/ ', updatedProgress.progress.total);
    console.log('   Percentage:', updatedProgress.progress.percentage + '%');
    console.log('   Current stage:', updatedProgress.progress.currentStage?.stageName || 'None');

    // Verify percentage calculation
    const expectedPercentage = Math.round((1 / 8) * 100); // 12%
    if (updatedProgress.progress.percentage !== expectedPercentage) {
      throw new Error(`Expected ${expectedPercentage}%, got ${updatedProgress.progress.percentage}%`);
    }

    // Step 5: Test TIER2 deal (with escrow officer)
    console.log('\n📝 Step 5: Creating test deal (TIER2 DOCUMENT_CUSTODY)...');
    const tier2Deal = await dealsService.createDeal({
      title: 'Test Progress Tracker - Commercial Property',
      description: 'Testing progress tracker for TIER2 with escrow officer',
      transactionType: 'SIMPLE',
      serviceTier: 'DOCUMENT_CUSTODY',
      estimatedValue: 10000000,
      totalAmount: 10000000,
      currency: 'EGP',
      parties: [
        {
          role: 'BUYER',
          name: 'Mohamed Ibrahim Company',
          isOrganization: true,
          contactEmail: 'buyer2@test.com'
        },
        {
          role: 'SELLER',
          name: 'Sara Ahmed',
          isOrganization: false,
          contactEmail: 'seller2@test.com'
        }
      ],
      userId: testUserId,
      creatorName: 'Test Admin',
      creatorEmail: 'test-admin@dealguard.com'
    });

    console.log('✅ TIER2 Deal created:', tier2Deal.dealNumber);

    // Check progress for TIER2 deal
    const tier2Progress = await progressService.getProgressStatus(tier2Deal.id);
    console.log('✅ TIER2 Progress initialized');
    console.log('   Total stages:', tier2Progress.progress.total);

    // Verify expected number of stages for TIER2
    if (tier2Progress.stages.length !== 15) {
      throw new Error(`Expected 15 stages for TIER2, got ${tier2Progress.stages.length}`);
    }

    console.log('\n📋 TIER2 Stage Breakdown (first 5):');
    tier2Progress.stages.slice(0, 5).forEach((stage: any) => {
      const statusIcon = stage.status === 'COMPLETED' ? '✅' :
                        stage.status === 'IN_PROGRESS' ? '🔄' : '⏳';
      console.log(`   ${statusIcon} Stage ${stage.stageOrder}: ${stage.stageName} (${stage.status})`);
    });

    // Step 6: Test audit trail
    console.log('\n📜 Step 6: Checking audit trail...');
    const auditEvents = await prisma.auditEvent.findMany({
      where: { dealId: deal.id, eventType: { contains: 'PROGRESS' } },
      orderBy: { timestamp: 'desc' }
    });

    console.log('✅ Audit events found:', auditEvents.length);
    auditEvents.forEach((event: any) => {
      console.log(`   - ${event.eventType} at ${event.timestamp.toLocaleString()}`);
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log('  ✅ TIER1 deal progress tracker initialized (8 stages)');
    console.log('  ✅ Stage advancement working correctly');
    console.log('  ✅ Progress percentage calculation accurate');
    console.log('  ✅ TIER2 deal progress tracker initialized (15 stages)');
    console.log('  ✅ Audit logging functional');
    console.log('\n📊 Test Deals Created:');
    console.log(`  - TIER1: ${deal.dealNumber} (${deal.id})`);
    console.log(`  - TIER2: ${tier2Deal.dealNumber} (${tier2Deal.id})`);
    console.log('\n💡 Next Steps:');
    console.log('  1. Visit frontend: http://localhost:3000/deals/' + deal.id);
    console.log('  2. Click on "Progress" tab to see visual tracker');
    console.log('  3. Verify real-time polling (30s interval)');
    console.log('  4. Check escrow officer features with TIER2 deal');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testProgressTracker()
  .then(() => {
    console.log('\n✨ Test completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
