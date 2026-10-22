import type { Response } from 'express';

export interface ApiResponseOptions<T> {
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(res: Response, statusCode: number, options: ApiResponseOptions<T>) {
  return res.status(statusCode).json({
    data: options.data,
    ...(options.message ? { message: options.message } : {}),
    ...(options.pagination ? { pagination: options.pagination } : {}),
  });
}

export function errorResponse(res: Response, statusCode: number, message: string, code?: string) {
  return res.status(statusCode).json({
    error: {
      message,
      ...(code ? { code } : {}),
    },
  });
}
