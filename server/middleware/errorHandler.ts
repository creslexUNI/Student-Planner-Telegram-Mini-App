import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e: any) => ({
      field: e.path?.join('.') || '',
      message: e.message,
    }));
    res.status(400).json({
      error: 'ValidationError',
      message: 'Ошибка валидации входных данных',
      details: formattedErrors,
    });
    return;
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: 'ClientError',
      message: err.message,
    });
    return;
  }

  // 3. Prisma database initialization and connection errors (P1000: auth, P1001: unreachable, etc.)
  if (
    err.name === 'PrismaClientInitializationError' ||
    (typeof err.code === 'string' && err.code.startsWith('P1'))
  ) {
    res.status(503).json({
      error: 'DatabaseUnavailable',
      message: 'База данных PostgreSQL временно недоступна или ожидает настройки DATABASE_URL.',
    });
    return;
  }

  // 4. Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = (err.meta?.target as string[])?.join(', ') || 'поле';
    res.status(409).json({
      error: 'Conflict',
      message: `Запись с таким значением (${target}) уже существует`,
    });
    return;
  }

  // 5. Prisma record not found
  if (err.code === 'P2025') {
    res.status(404).json({
      error: 'NotFound',
      message: 'Запрошенная запись не найдена в базе данных',
    });
    return;
  }

  // 6. Generic unexpected errors
  console.error('Application error:', err?.message || err);
  res.status(500).json({
    error: 'InternalServerError',
    message: 'Внутренняя ошибка сервера. Пожалуйста, повторите запрос позже.',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NotFound',
    message: `API маршрут ${req.method} ${req.originalUrl} не найден`,
  });
}
