#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function upgradeUser() {
  const result = await prisma.user.update({
    where: { clerkId: 'user_39Rdn5Mi35No7N9bj8H2A34qdg3' },
    data: { role: 'ADMIN' },
  });

  console.log('Updated user:',  JSON.stringify(result, null, 2));
}

upgradeUser().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
