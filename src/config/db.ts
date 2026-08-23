import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from './env';

// Prisma 7 has no built-in query engine binary — it connects through a
// driver adapter instead (here, node-postgres via @prisma/adapter-pg).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// Single shared Prisma client instance — import this everywhere instead of
// instantiating `new PrismaClient()` in individual modules.
const prisma = new PrismaClient({ adapter });

export default prisma;
