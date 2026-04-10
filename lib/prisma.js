import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const globalForPrisma = globalThis;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in .env file');
}

// Create a PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the Prisma adapter for PostgreSQL
const adapter = new PrismaPg(pool);

// Create Prisma Client WITH the adapter (NOT accelerateUrl)
const prismaClient = new PrismaClient({
  adapter, // This provides the database connection
  log: ['query'], // Optional: for debugging
});

export const prisma = globalForPrisma.prisma || prismaClient;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
