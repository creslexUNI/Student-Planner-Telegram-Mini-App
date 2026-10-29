import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const groupsRouter = Router();

groupsRouter.use(requireAuth);

const createGroupSchema = z.object({
  name: z.string().min(2, 'Название группы должно содержать от 2 символов').max(50),
});

const joinGroupSchema = z.object({
  inviteCode: z.string().min(4, 'Код приглашения должен содержать от 4 символов').trim().toUpperCase(),
});

// GET /api/groups
groupsRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user!.id },
      include: {
        group: {
          include: {
            _count: { select: { members: true, homeworks: true, lessons: true } },
          },
        },
      },
    });

    res.status(200).json({
      groups: memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        role: m.role,
        inviteCode: m.group.inviteCode,
        memberCount: m.group._count.members,
        homeworkCount: m.group._count.homeworks,
        lessonCount: m.group._count.lessons,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/groups (Create group)
groupsRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name } = createGroupSchema.parse(req.body);

    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const group = await prisma.group.create({
      data: {
        name,
        inviteCode,
        members: {
          create: {
            userId: req.user!.id,
            role: 'ADMIN',
          },
        },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    res.status(201).json({
      message: 'Учебная группа успешно создана',
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        role: 'ADMIN',
        memberCount: 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/groups/join (Join by code)
groupsRouter.post('/join', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { inviteCode } = joinGroupSchema.parse(req.body);

    const group = await prisma.group.findUnique({
      where: { inviteCode },
    });

    if (!group) {
      throw new AppError('Группа с таким кодом приглашения не найдена', 404);
    }

    const existingMember = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.id,
          groupId: group.id,
        },
      },
    });

    if (existingMember) {
      throw new AppError('Вы уже являетесь участником этой группы', 409);
    }

    const membership = await prisma.groupMember.create({
      data: {
        userId: req.user!.id,
        groupId: group.id,
        role: 'MEMBER',
      },
    });

    res.status(200).json({
      message: `Вы успешно присоединились к группе «${group.name}»`,
      group: {
        id: group.id,
        name: group.name,
        inviteCode: group.inviteCode,
        role: membership.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/groups/:id/leave
groupsRouter.post('/:id/leave', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user!.id,
          groupId: req.params.id,
        },
      },
    });

    if (!membership) {
      throw new AppError('Вы не состоите в этой группе', 404);
    }

    await prisma.groupMember.delete({
      where: { id: membership.id },
    });

    res.status(200).json({ message: 'Вы покинули учебную группу' });
  } catch (error) {
    next(error);
  }
});

// GET /api/groups/:id/members
groupsRouter.get('/:id/members', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isMember = req.user!.memberships.some((m) => m.groupId === req.params.id);
    if (!isMember) {
      throw new AppError('У вас нет доступа к списку участников этой группы', 403);
    }

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.status(200).json({
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});
