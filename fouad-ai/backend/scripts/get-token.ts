#!/usr/bin/env tsx
import { createClerkClient } from '@clerk/backend';
import 'dotenv/config';

async function getToken() {
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  const userList = await clerk.users.getUserList({ limit: 1 });
  const user = userList.data[0];
  const session = await clerk.sessions.createSession({ userId: user.id });
  const tokenResult = await clerk.sessions.getToken(session.id);
  const token = typeof tokenResult === 'string' ? tokenResult : (tokenResult as any)?.jwt;
  console.log(token);
}

getToken().catch(console.error);
