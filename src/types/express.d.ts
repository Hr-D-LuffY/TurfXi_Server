import { User as PrismaUser } from '@prisma/client';

declare global {
  namespace Express {
    // Extends Passport's req.user with our Prisma User shape
    interface User extends PrismaUser {}
  }
}

export {};
