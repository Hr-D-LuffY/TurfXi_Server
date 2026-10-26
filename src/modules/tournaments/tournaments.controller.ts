import type { Request, Response, NextFunction } from 'express';
import { tournamentsService } from './tournaments.service';
import { successResponse } from '../../utils/apiResponse';

export const tournamentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      };
      const tournaments = await tournamentsService.list(filters);
      return successResponse(res, 200, { data: tournaments });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tournament = await tournamentsService.getById(id as string);
      return successResponse(res, 200, { data: tournament });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any).id;
      const tournament = await tournamentsService.create(userId, req.body);
      return successResponse(res, 201, {
        data: tournament,
        message: 'Tournament created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async registerTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any).id;
      const { id } = req.params;
      const { teamId } = req.body;
      const entry = await tournamentsService.registerTeam(userId, id as string, teamId);
      return successResponse(res, 201, {
        data: entry,
        message: 'Team successfully registered for the tournament',
      });
    } catch (err) {
      next(err);
    }
  },

  async generateBracket(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any).id;
      const { id } = req.params;
      const result = await tournamentsService.generateBracket(userId, id as string);
      return successResponse(res, 200, {
        data: result,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};
