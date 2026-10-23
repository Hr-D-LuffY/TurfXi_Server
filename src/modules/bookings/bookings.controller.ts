import type { Request, Response, NextFunction } from 'express';
import { bookingsService } from './bookings.service';
import { successResponse } from '../../utils/apiResponse';
import { BadRequestError } from '../../utils/errors';

export const bookingsController = {
  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const turfId = req.query.turfId as string | undefined;
      const date = req.query.date as string | undefined;

      if (!turfId || !date) {
        throw new BadRequestError('Both turfId and date (YYYY-MM-DD) query parameters are required');
      }

      const availability = await bookingsService.getAvailability(turfId, date);
      return successResponse(res, 200, { data: availability });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any).id;
      const { turfId, bookingDate, startTime, endTime, type } = req.body;

      if (!turfId || !bookingDate || !startTime || !endTime) {
        throw new BadRequestError('turfId, bookingDate, startTime, and endTime are required');
      }

      const booking = await bookingsService.createBooking(userId, {
        turfId,
        bookingDate,
        startTime,
        endTime,
        type,
      });

      return successResponse(res, 201, {
        data: booking,
        message: 'Turf slot reserved successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async myBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any).id;
      const bookings = await bookingsService.getUserBookings(userId);
      return successResponse(res, 200, { data: bookings });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const booking = await bookingsService.getById(id as string);
      return successResponse(res, 200, { data: booking });
    } catch (err) {
      next(err);
    }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as any).id;
      const { id } = req.params;
      const booking = await bookingsService.cancelBooking(id as string, userId);
      return successResponse(res, 200, {
        data: booking,
        message: 'Booking cancelled successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
