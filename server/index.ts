import path from 'path';
import express from 'express';
import { createExpressApp } from './app';
import { disconnectDatabase } from './lib/prisma';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

export async function startServer() {
  const app = createExpressApp();

  if (isProduction) {
    // In production, serve pre-built Vite assets from dist/
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));

    // Fallback to index.html for SPA routes (excluding /api)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In development mode, mount Vite dev server middlewares
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          host: HOST,
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn('Could not mount Vite middleware in development mode:', e);
    }
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[Student Planner Server] Running at http://${HOST}:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('Server and database connections closed. Bye!');
      process.exit(0);
    });

    // Force exit after 10 seconds if not closed
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, server };
}

// Auto-start if run directly
startServer().catch((err) => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});
