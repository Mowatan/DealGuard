/**
 * Test script for /api/deals/:id/progress endpoint
 *
 * Usage: npx tsx scripts/test-progress-endpoint.ts <dealId>
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'https://api.dealguard.org';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

async function testProgressEndpoint(dealId: string) {
  console.log('🧪 Testing Progress Endpoint\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Deal ID: ${dealId}\n`);

  if (!AUTH_TOKEN) {
    console.error('❌ Error: TEST_AUTH_TOKEN environment variable not set');
    console.log('\nTo get a token:');
    console.log('1. Go to https://dealguard.org');
    console.log('2. Sign in');
    console.log('3. Open browser DevTools > Application > Cookies');
    console.log('4. Copy the __session cookie value');
    console.log('5. Run: export TEST_AUTH_TOKEN="<session_value>"\n');
    process.exit(1);
  }

  try {
    console.log('📡 Making request to /api/deals/:id/progress...\n');

    const response = await axios.get(
      `${API_URL}/api/deals/${dealId}/progress`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Success! Response:\n');
    console.log('═══════════════════════════════════════════════════\n');

    const data = response.data;

    console.log(`📊 Current Stage: ${data.stage}`);
    console.log(`📝 Description: ${data.stageDescription}`);
    console.log(`📈 Progress: ${data.progressPercentage}%\n`);

    if (data.blockers && data.blockers.length > 0) {
      console.log('⚠️  Blockers:');
      data.blockers.forEach((blocker: string) => {
        console.log(`   • ${blocker}`);
      });
      console.log();
    } else {
      console.log('✅ No blockers\n');
    }

    console.log('📊 Statistics:');
    console.log(`   • Parties: ${data.stats.acceptedParties}/${data.stats.totalParties} accepted`);
    console.log(`   • Pending Parties: ${data.stats.pendingParties}`);
    console.log(`   • Milestones: ${data.stats.completedMilestones}/${data.stats.totalMilestones} completed`);
    console.log(`   • Pending Milestones: ${data.stats.pendingMilestones}\n`);

    console.log('👥 Parties:');
    data.parties.forEach((party: any) => {
      console.log(`   • ${party.name} (${party.role}): ${party.status}`);
      if (party.members && party.members.length > 0) {
        party.members.forEach((member: any) => {
          if (member.user) {
            console.log(`     - ${member.user.name} <${member.user.email}>`);
          }
        });
      }
    });
    console.log();

    console.log('🎯 Milestones:');
    data.milestones.forEach((milestone: any, idx: number) => {
      console.log(`   ${idx + 1}. ${milestone.title || 'Untitled'}: ${milestone.status}`);
    });
    console.log();

    console.log('═══════════════════════════════════════════════════\n');
    console.log('✅ Progress endpoint is working correctly!\n');

  } catch (error: any) {
    console.error('❌ Error testing progress endpoint:\n');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.data?.error || error.response.statusText}`);
      console.error('\nResponse data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Make sure the API is running and accessible');
    } else {
      console.error(error.message);
    }

    process.exit(1);
  }
}

// Get deal ID from command line args
const dealId = process.argv[2];

if (!dealId) {
  console.error('❌ Error: Deal ID required\n');
  console.log('Usage: npx tsx scripts/test-progress-endpoint.ts <dealId>\n');
  console.log('Example: npx tsx scripts/test-progress-endpoint.ts clz1234567890\n');
  process.exit(1);
}

testProgressEndpoint(dealId);
