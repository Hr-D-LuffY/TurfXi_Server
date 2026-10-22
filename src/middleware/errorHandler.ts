import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err);
  const status = err instanceof AppError ? err.status : (err.status || 500);
  const code = err instanceof AppError ? err.code : err.code;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: {
      message,
      ...(code ? { code } : {}),
    },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Route not found' } });
}
