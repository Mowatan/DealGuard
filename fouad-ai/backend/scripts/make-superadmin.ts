#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

/**
 * Make a user SUPER_ADMIN by email address
 * Usage: npx tsx scripts/make-superadmin.ts your-email@example.com
 */

async function makeSuperAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: npx tsx scripts/make-superadmin.ts your-email@example.com');
    process.exit(1);
  }

  console.log(`🔍 Looking for user with email: ${email}`);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email },
        { email: { contains: email } }
      ]
    },
  });

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    console.log('\n💡 Tip: Sign up first at http://localhost:3001/sign-up');
    console.log('Then run this script again with your email address.');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
  console.log(`   Current role: ${user.role}`);
  console.log(`   Clerk ID: ${user.clerkId || 'Not set'}`);

  if (user.role === 'SUPER_ADMIN') {
    console.log('\n✅ User is already a SUPER_ADMIN!');
    process.exit(0);
  }

  console.log(`\n🔧 Upgrading ${user.email} to SUPER_ADMIN...`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ SUCCESS! User upgraded to SUPER_ADMIN');
  console.log('='.repeat(50));
  console.log('Email:', updated.email);
  console.log('Role:', updated.role);
  console.log('Clerk ID:', updated.clerkId || 'Not set');
  console.log('\n🚀 You can now login and access http://localhost:3001/admin');
  console.log('='.repeat(50) + '\n');
}

makeSuperAdmin().then(() => process.exit(0)).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
