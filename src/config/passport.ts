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
        // TODO (auth): payload.sub should be the user id set at token signing time
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        return done(null, user || false);
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
        // TODO (auth): find or create a User row from the Google profile
        return done(null, profile as any);
      }
    )
  );
}

export default passport;
