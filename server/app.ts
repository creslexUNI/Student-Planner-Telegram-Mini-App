import express from 'express';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { tasksRouter } from './routes/tasks';
import { scheduleRouter } from './routes/schedule';
import { homeworkRouter } from './routes/homework';
import { groupsRouter } from './routes/groups';
import { dashboardRouter } from './routes/dashboard';

export function createExpressApp(): express.Express {
  const app = express();

  // Standard parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Global auth session extraction
  app.use(authMiddleware);

  // REST API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/schedule', scheduleRouter);
  app.use('/api/homework', homeworkRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/dashboard', dashboardRouter);

  // Catch-all for undefined API routes
  app.use('/api', notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
