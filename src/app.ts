import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import passport from './config/passport';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import turfsRoutes from './modules/turfs/turfs.routes';
import bookingsRoutes from './modules/bookings/bookings.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import splitBillingRoutes from './modules/splitBilling/splitBilling.routes';
import cancellationsRoutes from './modules/cancellations/cancellations.routes';
import missingPlayersRoutes from './modules/missingPlayers/missingPlayers.routes';
import teamsRoutes from './modules/teams/teams.routes';
import matchStatsRoutes from './modules/matchStats/matchStats.routes';
import tournamentsRoutes from './modules/tournaments/tournaments.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import ratingsRoutes from './modules/ratings/ratings.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(passport.initialize());

// Basic global rate limit — individual modules can layer stricter limits
// on top (e.g. wallet top-up, login attempts).
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
});
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/turfs', turfsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/split-billing', splitBillingRoutes);
app.use('/api/cancellations', cancellationsRoutes);
app.use('/api/missing-players', missingPlayersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/match-stats', matchStatsRoutes);
app.use('/api/tournaments', tournamentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
