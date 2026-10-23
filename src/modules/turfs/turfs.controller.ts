import type { Request, Response, NextFunction } from 'express';
import { turfsService } from './turfs.service';
import { successResponse } from '../../utils/apiResponse';

export const turfsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        city: typeof req.query.city === 'string' ? req.query.city : undefined,
        area: typeof req.query.area === 'string' ? req.query.area : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
      };
      const turfs = await turfsService.list(filters);
      return successResponse(res, 200, { data: turfs });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const turf = await turfsService.getById(id as string);
      return successResponse(res, 200, { data: turf });
    } catch (err) {
      next(err);
    }
  },
};
