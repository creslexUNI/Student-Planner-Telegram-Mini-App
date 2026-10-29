import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { GroupRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  memberships: {
    groupId: string;
    role: GroupRole;
  }[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.session_token || req.headers.authorization?.replace(/^Bearer\s+/, '');

  if (!token) {
    req.user = undefined;
    next();
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            memberships: {
              select: {
                groupId: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      req.user = undefined;
      next();
      return;
    }

    if (new Date() > session.expiresAt) {
      // Session expired, clean up
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      res.clearCookie('session_token');
      req.user = undefined;
      next();
      return;
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      memberships: session.user.memberships,
    };
    req.sessionId = session.id;

    next();
  } catch (error) {
    // If DB is unavailable, allow request to proceed without crashing
    req.user = undefined;
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Для доступа к этому разделу необходимо войти в систему',
    });
    return;
  }
  next();
}

export function requireGroupMember(groupIdParam = 'groupId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Требуется авторизация' });
      return;
    }

    const groupId = req.params[groupIdParam] || req.body[groupIdParam] || (req.query[groupIdParam] as string);
    if (!groupId) {
      res.status(400).json({ error: 'Bad Request', message: 'Не указан идентификатор группы' });
      return;
    }

    const member = req.user.memberships.find((m) => m.groupId === groupId);
    if (!member) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Вы не являетесь участником этой учебной группы',
      });
      return;
    }

    next();
  };
}

export function requireGroupRole(roles: GroupRole[], groupIdParam = 'groupId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Требуется авторизация' });
      return;
    }

    const groupId = req.params[groupIdParam] || req.body[groupIdParam] || (req.query[groupIdParam] as string);
    const member = req.user.memberships.find((m) => m.groupId === groupId);

    if (!member || !roles.includes(member.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Недостаточно прав для выполнения этого действия в группе',
      });
      return;
    }

    next();
  };
}
