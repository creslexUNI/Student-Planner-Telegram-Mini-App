import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../lib/prisma';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const dbHealth = await checkDatabaseHealth();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbHealth.connected,
      message: dbHealth.message,
    },
  });
});
