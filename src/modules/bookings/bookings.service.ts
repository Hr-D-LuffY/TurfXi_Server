import prisma from '../../config/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import type { BookingType } from '../../generated/prisma/client';

export interface CreateBookingInput {
  turfId: string;
  bookingDate: string; // ISO date string "YYYY-MM-DD"
  startTime: string;   // "18:00"
  endTime: string;     // "19:00"
  type?: BookingType | undefined;
}

export const bookingsService = {
  async getAvailability(turfId: string, dateStr: string) {
    const turf = await prisma.turf.findUnique({
      where: { id: turfId },
      include: {
        membersOnlySlots: true,
      },
    });

    if (!turf) {
      throw new NotFoundError('Turf venue not found');
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestError('Invalid date format. Expected YYYY-MM-DD');
    }

    const existingBookings = await prisma.booking.findMany({
      where: {
        turfId,
        bookingDate: date,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    const dayOfWeek = date.getDay();
    const membersSlots = turf.membersOnlySlots.filter((s) => s.dayOfWeek === dayOfWeek);

    // Standard turf operating hours: 06:00 to 24:00 (1-hour slots)
    const hours = [
      '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
      '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
      '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
    ];

    const slots = hours.map((startTime, idx) => {
      const nextHour = idx + 7;
      const endTime = nextHour < 24 ? `${String(nextHour).padStart(2, '0')}:00` : '00:00';

      const bookedMatch = existingBookings.find((b) => b.startTime === startTime);
      const isMembersOnly = membersSlots.some(
        (ms) => startTime >= ms.startTime && startTime < ms.endTime
      );

      return {
        startTime,
        endTime,
        isBooked: Boolean(bookedMatch),
        isMembersOnly,
        price: Number(turf.pricePerHour),
        bookingId: bookedMatch?.id ?? null,
      };
    });

    return {
      turf: {
        id: turf.id,
        name: turf.name,
        area: turf.area,
        city: turf.city,
        pricePerHour: Number(turf.pricePerHour),
        advancePercent: turf.advancePercent,
      },
      date: dateStr,
      slots,
    };
  },

  async createBooking(bookerId: string, input: CreateBookingInput) {
    const turf = await prisma.turf.findUnique({
      where: { id: input.turfId },
      include: { membersOnlySlots: true },
    });

    if (!turf) {
      throw new NotFoundError('Turf venue not found');
    }

    const bookingDate = new Date(input.bookingDate);
    if (isNaN(bookingDate.getTime())) {
      throw new BadRequestError('Invalid booking date provided');
    }

    // Verify slot is not already reserved
    const existingConflict = await prisma.booking.findFirst({
      where: {
        turfId: input.turfId,
        bookingDate,
        startTime: input.startTime,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    });

    if (existingConflict) {
      throw new BadRequestError(
        'This slot has already been reserved. Please pick another available time slot.'
      );
    }

    // Verify members-only access
    const dayOfWeek = bookingDate.getDay();
    const isMembersSlot = turf.membersOnlySlots.some(
      (ms) =>
        ms.dayOfWeek === dayOfWeek &&
        input.startTime >= ms.startTime &&
        input.startTime < ms.endTime
    );

    if (isMembersSlot) {
      const user = await prisma.user.findUnique({ where: { id: bookerId } });
      const isEligible =
        user?.role === 'ADMIN' ||
        user?.role === 'TURF_OWNER' ||
        user?.membershipTier === 'SILVER' ||
        user?.membershipTier === 'GOLD';

      if (!isEligible) {
        throw new ForbiddenError(
          'This is a Prime Members-Only slot reserved for Silver and Gold athletes.'
        );
      }
    }

    const pricePerHour = Number(turf.pricePerHour);
    const advancePercent = turf.advancePercent || 30;
    const totalPrice = pricePerHour;
    const advanceAmount = Number(((totalPrice * advancePercent) / 100).toFixed(2));

    const booking = await prisma.booking.create({
      data: {
        turfId: input.turfId,
        bookerId,
        bookingDate,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type || 'HOURLY',
        status: 'CONFIRMED',
        totalPrice,
        advanceAmount,
        membersOnly: isMembersSlot,
      },
      include: {
        turf: {
          select: {
            id: true,
            name: true,
            address: true,
            area: true,
            city: true,
          },
        },
        booker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return booking;
  },

  async getUserBookings(bookerId: string) {
    return prisma.booking.findMany({
      where: { bookerId },
      include: {
        turf: {
          select: {
            id: true,
            name: true,
            address: true,
            area: true,
            city: true,
            photos: { take: 1 },
          },
        },
        splitBilling: true,
      },
      orderBy: [{ bookingDate: 'desc' }, { startTime: 'desc' }],
    });
  },

  async getById(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        turf: {
          include: {
            photos: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
        booker: {
          select: { id: true, name: true, email: true, membershipTier: true },
        },
        splitBilling: {
          include: {
            shares: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        match: true,
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking record not found');
    }

    return booking;
  },

  async cancelBooking(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { turf: true },
    });

    if (!booking) {
      throw new NotFoundError('Booking record not found');
    }

    const isBooker = booking.bookerId === userId;
    const isTurfOwner = booking.turf.ownerId === userId;

    if (!isBooker && !isTurfOwner) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenError('You are not authorized to cancel this booking.');
      }
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestError('This booking is already cancelled.');
    }

    return prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      include: { turf: true },
    });
  },
};
