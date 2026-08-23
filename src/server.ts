import http from 'http';
import app from './app';
import { env } from './config/env';
import { initSocket } from './config/socket';
import { logger } from './utils/logger';

const httpServer = http.createServer(app);

initSocket(httpServer);

const port = Number(env.PORT);
httpServer.listen(port, () => {
  logger.info(`TurfXI API listening on port ${port}`);
});
