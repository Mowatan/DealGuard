#!/usr/bin/env tsx
import { createClerkClient } from '@clerk/backend';
import { prisma } from '../src/lib/prisma';
import 'dotenv/config';

async function debugApiCall() {
  // Get token
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const userList = await clerk.users.getUserList({ limit: 1 });
  const user = userList.data[0];
  const session = await clerk.sessions.createSession({ userId: user.id });
  const tokenResult = await clerk.sessions.getToken(session.id);
  const token = typeof tokenResult === 'string' ? tokenResult : (tokenResult as any)?.jwt;

  console.log('Clerk User ID:', user.id);

  // Check DB user
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    select: { id: true, email: true, role: true, clerkId: true },
  });

  console.log('DB User:', dbUser);

  // Make API call
  const response = await fetch('http://localhost:4000/api/kyc/pending', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('Response Status:', response.status);
  console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

  const body = await response.text();
  console.log('Response Body:', body);

  try {
    const json = JSON.parse(body);
    console.log('Parsed JSON:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.log('Not JSON');
  }
}

debugApiCall().catch(console.error);
