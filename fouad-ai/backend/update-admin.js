const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update admin to SUPER_ADMIN
  const updated = await prisma.user.update({
    where: { email: 'admin@fouad.ai' },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log('Updated admin user to SUPER_ADMIN:');
  console.log(JSON.stringify(updated, null, 2));

  // Check for Clerk users
  const clerkUsers = await prisma.user.findMany({
    where: { clerkId: { not: null } },
  });

  console.log('\nClerk users found:', clerkUsers.length);
  if (clerkUsers.length > 0) {
    console.log(JSON.stringify(clerkUsers, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
