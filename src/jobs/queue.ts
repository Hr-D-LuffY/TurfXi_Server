import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

// Starter queue — split into one queue per job type as modules need them,
// e.g. splitBillingHoldQueue, recurringBookingQueue, refundQueue.
export const defaultQueue = new Queue('default', {
  connection: redisConnection,
});
