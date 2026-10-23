import type { Request, Response, NextFunction } from 'express';
import { matchStatsService } from './matchStats.service';
import { successResponse } from '../../utils/apiResponse';
import { BadRequestError } from '../../utils/errors';
import type { MembershipTier } from '../../generated/prisma/client';

export const matchStatsController = {
  async getPlayerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { playerId } = req.params;
      if (!playerId) {
        throw new BadRequestError('Player ID is required');
      }

      const viewerTier = ((req.user as any)?.membershipTier as MembershipTier) || 'FREE';
      const stats = await matchStatsService.getPlayerStats(playerId as string, viewerTier);

      return successResponse(res, 200, { data: stats });
    } catch (err) {
      next(err);
    }
  },

  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryParam = req.query.category as string | undefined;
      const category = (categoryParam === 'assists' || categoryParam === 'rating' ? categoryParam : 'goals') as
        | 'goals'
        | 'assists'
        | 'rating';

      const leaderboard = await matchStatsService.getLeaderboard(category);
      return successResponse(res, 200, { data: leaderboard });
    } catch (err) {
      next(err);
    }
  },

  async submitMatchReport(req: Request, res: Response, next: NextFunction) {
    try {
      const reporterUserId = (req.user as any).id;
      const { bookingId, teamAId, teamBId, scoreA, scoreB, playerStats } = req.body;

      if (!bookingId || scoreA === undefined || scoreB === undefined || !Array.isArray(playerStats)) {
        throw new BadRequestError('bookingId, scoreA, scoreB, and playerStats array are required');
      }

      const match = await matchStatsService.submitMatchReport(reporterUserId, {
        bookingId,
        teamAId,
        teamBId,
        scoreA: Number(scoreA),
        scoreB: Number(scoreB),
        playerStats,
      });

      return successResponse(res, 201, {
        data: match,
        message: 'Match report recorded and player statistics updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async getHeadToHead(req: Request, res: Response, next: NextFunction) {
    try {
      const teamAId = req.query.teamAId as string | undefined;
      const teamBId = req.query.teamBId as string | undefined;

      if (!teamAId || !teamBId) {
        throw new BadRequestError('teamAId and teamBId query parameters are required');
      }

      const h2h = await matchStatsService.getHeadToHead(teamAId, teamBId);
      return successResponse(res, 200, { data: h2h });
    } catch (err) {
      next(err);
    }
  },
};
