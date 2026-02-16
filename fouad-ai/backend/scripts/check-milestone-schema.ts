#!/usr/bin/env tsx
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

async function checkMilestoneSchema() {
  try {
    // Query the information_schema to get Milestone table columns
    const columns = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'Milestone'
      ORDER BY ordinal_position;
    `;

    console.log('\n📋 Milestone Table Columns in Database:\n');
    console.log('Column Name'.padEnd(30), 'Data Type'.padEnd(20), 'Nullable'.padEnd(10), 'Default');
    console.log('='.repeat(80));

    columns.forEach((col: any) => {
      console.log(
        col.column_name.padEnd(30),
        col.data_type.padEnd(20),
        col.is_nullable.padEnd(10),
        col.column_default || ''
      );
    });

    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMilestoneSchema();
