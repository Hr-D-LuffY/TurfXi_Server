import type { NextFunction, Request, Response } from 'express';
import passport from 'passport';

// Protects a route — requires a valid JWT access token
export const requireAuth = passport.authenticate('jwt', { session: false });

// Optional auth — extracts user if Bearer token is present, continues as guest if not
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (err) {
      return next(err);
    }
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Restricts a route to specific roles, e.g. requireRole('ADMIN', 'TURF_OWNER')
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
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
    if (!user || !tiers.includes(user.membershipTier)) {
      return res.status(403).json({ error: { message: 'Upgrade required' } });
    }
    next();
  };
}

// Tournaments organize permission: Gold membership tier OR Turf Owner / Admin role
export function requireTournamentOrganizer() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    const isOwnerOrAdmin = user.role === 'ADMIN' || user.role === 'TURF_OWNER';
    const isGoldMember = user.membershipTier === 'GOLD';

    if (!isOwnerOrAdmin && !isGoldMember) {
      return res.status(403).json({
        error: {
          message: 'Only Gold members and Turf Owners can organize tournaments.',
          code: 'UPGRADE_REQUIRED',
        },
      });
    }
    next();
  };
}

// Tournaments join permission: Silver or Gold member, or Turf Owner / Admin
export function requireTournamentParticipant() {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: { message: 'Authentication required' } });
    }
    const isOwnerOrAdmin = user.role === 'ADMIN' || user.role === 'TURF_OWNER';
    const isEligibleTier = user.membershipTier === 'SILVER' || user.membershipTier === 'GOLD';

    if (!isOwnerOrAdmin && !isEligibleTier) {
      return res.status(403).json({
        error: {
          message: 'Joining tournaments requires a Silver or Gold membership.',
          code: 'UPGRADE_REQUIRED',
        },
      });
    }
    next();
  };
}
