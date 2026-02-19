#!/usr/bin/env tsx
import { prisma } from '../src/lib/prisma';

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      clerkId: true,
    },
  });

  console.log(JSON.stringify(users, null, 2));
}

checkUsers().then(() => process.exit(0));
