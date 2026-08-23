import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

// Run this as a separate process (`npm run worker`), not inside the API process.
// TODO: split into one worker per queue as modules add jobs.
const worker = new Worker(
  'default',
  async (job) => {
    logger.info('processing job', job.name, job.data);
  },
  { connection: redisConnection }
);

worker.on('completed', (job) => logger.info(`job ${job.id} completed`));
worker.on('failed', (job, err) => logger.error(`job ${job?.id} failed`, err));
