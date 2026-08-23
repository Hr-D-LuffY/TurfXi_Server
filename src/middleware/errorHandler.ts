import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: { message: err.message || 'Internal server error' },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Route not found' } });
}
