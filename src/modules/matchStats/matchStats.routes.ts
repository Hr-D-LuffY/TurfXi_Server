import { Router } from 'express';
import { matchStatsController } from './matchStats.controller';
import { requireAuth, optionalAuth } from '../../middleware/auth';

const router = Router();

// Public / Tier-gated player stats profile
router.get('/player/:playerId', optionalAuth, matchStatsController.getPlayerStats);

// Competitive leaderboards (Goals, Assists, Rating)
router.get('/leaderboard', matchStatsController.getLeaderboard);

// Head to head squad comparison & predictions
router.get('/head-to-head', matchStatsController.getHeadToHead);

// Submit match report & stats (Captain / Vice-Captain / Admin)
router.post('/report', requireAuth, matchStatsController.submitMatchReport);

export default router;
