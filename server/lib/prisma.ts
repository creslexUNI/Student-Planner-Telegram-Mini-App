import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __dbHealthCache: { connected: boolean; message: string; timestamp: number } | undefined;
}

export const prisma =
  global.__prisma ||
  new PrismaClient({
    // Disable automatic error dumping to avoid flooding logs when database is not yet ready or unreachable
    log: [],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function checkDatabaseHealth(): Promise<{ connected: boolean; message: string }> {
  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      message: 'DATABASE_URL environment variable is not configured',
    };
  }

  // Cache health check for 15 seconds to prevent connection retry storms
  const now = Date.now();
  if (global.__dbHealthCache && now - global.__dbHealthCache.timestamp < 15000) {
    return {
      connected: global.__dbHealthCache.connected,
      message: global.__dbHealthCache.message,
    };
  }

  try {
    // Quick probe with timeout
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000)),
    ]);

    const result = { connected: true, message: 'Database connection active' };
    global.__dbHealthCache = { ...result, timestamp: now };
    return result;
  } catch (err: any) {
    const errorMsg = err.message?.includes('password authentication failed')
      ? 'Неверные реквизиты авторизации PostgreSQL (проверьте пароль в DATABASE_URL)'
      : err.message?.includes('Can\'t reach database server')
      ? 'Не удалось подключиться к серверу PostgreSQL (сервер недоступен или заблокирован порт)'
      : `Ошибка подключения: ${err.message || 'Неизвестная ошибка'}`;

    const result = { connected: false, message: errorMsg };
    global.__dbHealthCache = { ...result, timestamp: now };
    return result;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch {
    // Quiet disconnect
  }
}
