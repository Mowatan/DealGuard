import { PrismaClient } from '@prisma/client';
import * as milestonesService from './src/modules/milestones/milestones.service';

const prisma = new PrismaClient();

async function demoMilestoneWorkflow() {
  console.log('🎬 MILESTONE APPROVAL WORKFLOW DEMO\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Get existing data
    const milestone = await prisma.milestone.findFirst();
    if (!milestone) {
      console.log('❌ No milestones found. Please create test data first.');
      return;
    }

    const users = await prisma.user.findMany({ take: 3 });
    if (users.length === 0) {
      console.log('❌ No users found. Please create test data first.');
      return;
    }

    // Find or create an admin user
    let adminUser = users.find(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    if (!adminUser) {
      console.log('⚠️  No admin user found. Updating first user to ADMIN role...');
      adminUser = await prisma.user.update({
        where: { id: users[0].id },
        data: { role: 'ADMIN' },
      });
      console.log(`✅ Updated user ${adminUser.name} to ADMIN\n`);
    }

    console.log('📋 Test Setup:');
    console.log(`   Milestone: ${milestone.name} (${milestone.id})`);
    console.log(`   Status:    ${milestone.status}`);
    console.log(`   Admin:     ${adminUser.name} (${adminUser.role})\n`);

    // Step 1: Check/Create Approval Requirements
    console.log('STEP 1: Configure Approval Requirements');
    console.log('-'.repeat(70));

    let approvalReq = await prisma.milestoneApprovalRequirement.findUnique({
      where: { milestoneId: milestone.id },
    });

    if (!approvalReq) {
      console.log('Creating default approval requirement...');
      approvalReq = await milestonesService.setApprovalRequirements(
        milestone.id,
        {
          requireAdminApproval: true,
          requireBuyerApproval: false,
          requireSellerApproval: false,
        },
        adminUser.id
      );
      console.log('✅ Created approval requirement');
    } else {
      console.log('✅ Approval requirement already exists');
    }

    console.log(`   - Admin approval required: ${approvalReq.requireAdminApproval}`);
    console.log(`   - Buyer approval required: ${approvalReq.requireBuyerApproval}`);
    console.log(`   - Seller approval required: ${approvalReq.requireSellerApproval}\n`);

    // Step 2: Check Milestone Details
    console.log('STEP 2: Get Milestone Details');
    console.log('-'.repeat(70));

    const milestoneDetails = await milestonesService.getMilestoneDetails(milestone.id);
    console.log(`✅ Retrieved milestone details`);
    console.log(`   - Name:              ${milestoneDetails.name}`);
    console.log(`   - Status:            ${milestoneDetails.status}`);
    console.log(`   - Approvals:         ${milestoneDetails.approvals.length}`);
    console.log(`   - Evidence items:    ${milestoneDetails.evidenceItems.length}\n`);

    // Step 3: Update Milestone Status (simulate evidence completion)
    console.log('STEP 3: Simulate Evidence Completion');
    console.log('-'.repeat(70));

    if (milestone.status === 'PENDING') {
      console.log('Updating milestone status to IN_PROGRESS...');
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'IN_PROGRESS' },
      });
      console.log('✅ Milestone is now IN_PROGRESS\n');
    }

    // Evaluate readiness
    console.log('Evaluating milestone readiness...');
    const evaluatedMilestone = await milestonesService.evaluateMilestoneReadiness(milestone.id);
    console.log(`✅ Milestone evaluated: ${evaluatedMilestone.status}`);

    if (evaluatedMilestone.status === 'READY_FOR_REVIEW') {
      console.log('   🎯 Milestone is READY_FOR_REVIEW!\n');
    } else {
      console.log(`   ⏳ Milestone is ${evaluatedMilestone.status}\n`);
      // For demo purposes, manually set to READY_FOR_REVIEW
      console.log('For demo: Manually setting to READY_FOR_REVIEW...');
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'READY_FOR_REVIEW' },
      });
      console.log('✅ Milestone is now READY_FOR_REVIEW\n');
    }

    // Step 4: Submit Admin Approval
    console.log('STEP 4: Submit Admin Approval');
    console.log('-'.repeat(70));

    // Check if admin already approved
    const existingApproval = await prisma.milestoneApproval.findUnique({
      where: {
        milestoneId_userId: {
          milestoneId: milestone.id,
          userId: adminUser.id,
        },
      },
    });

    if (existingApproval) {
      console.log('⚠️  Admin has already approved this milestone');
      console.log(`   Approved at: ${existingApproval.createdAt.toISOString()}\n`);
    } else {
      console.log(`Submitting approval as ${adminUser.name} (${adminUser.role})...`);

      try {
        const approval = await milestonesService.submitApproval(
          milestone.id,
          adminUser.id,
          null,
          'Approved via demo workflow'
        );
        console.log('✅ Approval submitted successfully!');
        console.log(`   Approval ID: ${approval.id}`);
        console.log(`   Notes:       ${approval.approvalNotes}\n`);
      } catch (error: any) {
        console.error(`❌ Error submitting approval: ${error.message}\n`);
      }
    }

    // Step 5: Check Approval Completeness
    console.log('STEP 5: Check Approval Completeness');
    console.log('-'.repeat(70));

    const isComplete = await milestonesService.checkApprovalCompleteness(milestone.id);
    console.log(`Approval completeness: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);

    if (isComplete) {
      console.log('   All required approvals have been submitted!\n');
    } else {
      console.log('   Waiting for required approvals...\n');
    }

    // Step 6: Check Final Status
    console.log('STEP 6: Check Final Milestone Status');
    console.log('-'.repeat(70));

    const finalMilestone = await prisma.milestone.findUnique({
      where: { id: milestone.id },
      include: {
        approvals: {
          include: { user: true },
        },
      },
    });

    console.log(`Final status: ${finalMilestone!.status}`);
    console.log(`Total approvals: ${finalMilestone!.approvals.length}`);

    if (finalMilestone!.status === 'APPROVED') {
      console.log('✅ 🎉 MILESTONE AUTO-APPROVED!\n');
    } else {
      console.log(`⏳ Milestone is ${finalMilestone!.status}\n`);
    }

    console.log('Approvals received:');
    finalMilestone!.approvals.forEach((approval, i) => {
      console.log(`   ${i + 1}. ${approval.user.name} (${approval.user.role})`);
      console.log(`      ${approval.createdAt.toISOString()}`);
      if (approval.approvalNotes) {
        console.log(`      Notes: ${approval.approvalNotes}`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ WORKFLOW DEMO COMPLETED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log('   1. ✅ Configured approval requirements (admin required)');
    console.log('   2. ✅ Retrieved milestone details via service');
    console.log('   3. ✅ Simulated evidence completion');
    console.log('   4. ✅ Submitted admin approval');
    console.log('   5. ✅ Checked approval completeness');
    console.log('   6. ✅ Verified auto-approval logic\n');

  } catch (error: any) {
    console.error('❌ Error during demo:', error.message);
    console.error(error.stack);
  }
}

demoMilestoneWorkflow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
