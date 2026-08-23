import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';

// Protects a route — requires a valid JWT access token
export const requireAuth = passport.authenticate('jwt', { session: false });

// Restricts a route to specific roles, e.g. requireRole('ADMIN', 'TURF_OWNER')
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    // TODO: confirm req.user.role matches the Prisma Role enum
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
    next();
  };
}

// Restricts a route to specific membership tiers, e.g. requireTier('SILVER', 'GOLD')
export function requireTier(...tiers: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    // TODO: confirm req.user.membershipTier matches the Prisma MembershipTier enum
    if (!user || !tiers.includes(user.membershipTier)) {
      return res.status(403).json({ error: { message: 'Upgrade required' } });
    }
    next();
  };
}
