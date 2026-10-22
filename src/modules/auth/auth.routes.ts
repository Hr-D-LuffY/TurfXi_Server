import { Router } from 'express';
import passport from 'passport';
import { authController } from './auth.controller';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${env.CLIENT_URL}/login?error=GoogleAuthFailed`,
    }),
    authController.googleCallback
  );
}

export default router;
