import { Router } from 'express';
import { bookingsController } from './bookings.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Public / client slot availability checker for any turf & date
router.get('/availability', bookingsController.getAvailability);

// Current user's booking history
router.get('/my', requireAuth, bookingsController.myBookings);

// Booking details by ID
router.get('/:id', requireAuth, bookingsController.getById);

// Reserve a turf slot
router.post('/', requireAuth, bookingsController.create);

// Cancel a booking
router.post('/:id/cancel', requireAuth, bookingsController.cancel);

export default router;
