import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { env } from './env';
import prisma from './db';

// Validates the access token on protected routes (used by requireAuth middleware)
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        if (!payload.sub) {
          return done(null, false);
        }
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          include: {
            playerProfile: true,
            wallet: true,
          },
        });

        if (!user || user.suspended) {
          return done(null, false);
        }

        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Google OAuth sign-up / sign-in
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );
}

export default passport;
