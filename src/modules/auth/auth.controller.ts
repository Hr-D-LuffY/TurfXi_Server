import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'turfxi_refresh_token';

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
}

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      setRefreshTokenCookie(res, result.refreshToken);
      return successResponse(res, 201, {
        data: result,
        message: 'Account created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body);
      setRefreshTokenCookie(res, result.refreshToken);
      return successResponse(res, 200, {
        data: result,
        message: 'Logged in successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.body?.refreshToken || req.cookies?.[REFRESH_COOKIE_NAME];
      if (!token) {
        return errorResponse(res, 401, 'Refresh token not found');
      }
      const result = await authService.refresh(token);
      return successResponse(res, 200, {
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      return successResponse(res, 200, {
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any)?.id;
      const user = await authService.getMe(userId);
      return successResponse(res, 200, {
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  },

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = req.user as any;
      if (!profile) {
        return res.redirect(`${env.CLIENT_URL}/login?error=GoogleAuthFailed`);
      }
      const result = await authService.handleGoogleUser(profile);
      setRefreshTokenCookie(res, result.refreshToken);
      return res.redirect(
        `${env.CLIENT_URL}/login?token=${encodeURIComponent(result.accessToken)}`
      );
    } catch (err) {
      next(err);
    }
  },
};
