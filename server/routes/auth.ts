import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(50),
  email: z.string().email('Некорректный формат email').toLowerCase(),
  password: z.string().min(6, 'Пароль должен быть не короче 6 символов'),
  university: z.string().optional(),
  faculty: z.string().optional(),
  course: z.number().int().min(1).max(6).optional(),
  groupName: z.string().optional(),
  inviteCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Некорректный формат email').toLowerCase(),
  password: z.string().min(1, 'Введите пароль'),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(50).optional(),
  university: z.string().max(100).optional().nullable(),
  faculty: z.string().max(100).optional().nullable(),
  course: z.number().int().min(1).max(6).optional().nullable(),
  groupName: z.string().max(50).optional().nullable(),
});

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('session_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/',
  });
}

function formatUserResponse(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    university: user.university || null,
    faculty: user.faculty || null,
    course: user.course || null,
    groupName: user.groupName || null,
    groups: user.memberships?.map((m: any) => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      inviteCode: m.group.inviteCode,
    })) || [],
  };
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('Пользователь с таким email уже зарегистрирован', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        university: data.university,
        faculty: data.faculty,
        course: data.course,
        groupName: data.groupName,
      },
    });

    // Handle group: join by code or create new group
    if (data.inviteCode) {
      const group = await prisma.group.findUnique({
        where: { inviteCode: data.inviteCode },
      });
      if (group) {
        await prisma.groupMember.create({
          data: {
            userId: user.id,
            groupId: group.id,
            role: 'MEMBER',
          },
        });
      }
    } else if (data.groupName) {
      const generatedCode = crypto.randomBytes(3).toString('hex').toUpperCase();
      const group = await prisma.group.create({
        data: {
          name: data.groupName,
          inviteCode: generatedCode,
        },
      });
      await prisma.groupMember.create({
        data: {
          userId: user.id,
          groupId: group.id,
          role: 'ADMIN',
        },
      });
    }

    // Create session (expires in 14 days)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    setSessionCookie(res, token, expiresAt);

    // Fetch user with groups
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: {
            group: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Регистрация успешно завершена',
      user: formatUserResponse(fullUser || user),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Неверный адрес email или пароль', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Неверный адрес email или пароль', 401);
    }

    // Create new session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    setSessionCookie(res, token, expiresAt);

    res.status(200).json({
      message: 'Успешный вход в систему',
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.session_token || req.headers.authorization?.replace(/^Bearer\s+/, '');
    if (token) {
      await prisma.session.deleteMany({
        where: { token },
      }).catch(() => {});
    }

    res.clearCookie('session_token', { path: '/' });
    res.status(200).json({ message: 'Вы успешно вышли из системы' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Пользователь не найден', 404);
    }

    res.status(200).json({
      user: formatUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/auth/profile (Update university, faculty, course, groupName, name)
authRouter.patch('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = profileUpdateSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        name: data.name,
        university: data.university,
        faculty: data.faculty,
        course: data.course,
        groupName: data.groupName,
      },
      include: {
        memberships: {
          include: {
            group: true,
          },
        },
      },
    });

    res.status(200).json({
      message: 'Профиль успешно обновлен',
      user: formatUserResponse(updated),
    });
  } catch (error) {
    next(error);
  }
});
