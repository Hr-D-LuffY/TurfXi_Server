import prisma from '../../config/db';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from './auth.utils';
import type { Role } from '../../generated/prisma/client';

export interface RegisterInput {
  name: string;
  email: string;
  password?: string | undefined;
  role?: Role | undefined;
  playerProfile?: {
    position?: string | undefined;
    preferredFoot?: string | undefined;
    city?: string | undefined;
    area?: string | undefined;
    skillLevel?: string | undefined;
  } | undefined;
}

export interface LoginInput {
  email: string;
  password?: string | undefined;
}

function sanitizeUser(user: any) {
  const { password, ...safeUser } = user;
  return safeUser;
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    if (!input.password || input.password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }

    const hashedPassword = await hashPassword(input.password);
    const assignedRole: Role = input.playerProfile || input.role === 'PLAYER' ? 'PLAYER' : (input.role || 'NORMAL');

    const profileData = input.playerProfile
      ? {
          create: {
            position: input.playerProfile.position ?? null,
            preferredFoot: input.playerProfile.preferredFoot ?? null,
            city: input.playerProfile.city ?? null,
            area: input.playerProfile.area ?? null,
            skillLevel: input.playerProfile.skillLevel ?? null,
          },
        }
      : undefined;

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.toLowerCase().trim(),
        password: hashedPassword,
        role: assignedRole,
        membershipTier: 'FREE',
        wallet: {
          create: {
            balance: 0,
          },
        },
        ...(profileData ? { playerProfile: profileData } : {}),
      },
      include: {
        playerProfile: true,
        wallet: true,
      },
    });

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ sub: user.id });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },

  async login(input: LoginInput) {
    if (!input.email || !input.password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      include: {
        playerProfile: true,
        wallet: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.suspended) {
      throw new ForbiddenError('This account has been suspended. Please contact support.');
    }

    if (!user.password) {
      throw new BadRequestError('Account was registered via Google. Please sign in with Google.');
    }

    const isMatch = await comparePassword(input.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ sub: user.id });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.suspended) {
      throw new UnauthorizedError('Invalid user session');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
    };

    const accessToken = signAccessToken(tokenPayload);

    return { accessToken };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        playerProfile: true,
        wallet: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.suspended) {
      throw new ForbiddenError('Account suspended');
    }

    return sanitizeUser(user);
  },

  async handleGoogleUser(profile: { id: string; displayName?: string | undefined; emails?: Array<{ value: string }> | undefined }) {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) {
      throw new BadRequestError('Google account did not provide an email address');
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: profile.id }, { email }],
      },
      include: {
        playerProfile: true,
        wallet: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email,
          name: profile.displayName || email.split('@')[0] || 'User',
          role: 'NORMAL',
          membershipTier: 'FREE',
          wallet: {
            create: {
              balance: 0,
            },
          },
        },
        include: {
          playerProfile: true,
          wallet: true,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id },
        include: {
          playerProfile: true,
          wallet: true,
        },
      });
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      membershipTier: user.membershipTier,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ sub: user.id });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  },
};
