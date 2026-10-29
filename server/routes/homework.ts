import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const homeworkRouter = Router();

homeworkRouter.use(requireAuth);

const createHomeworkSchema = z.object({
  groupId: z.string().optional(),
  subject: z.string().min(1, 'Укажите предмет').max(100),
  title: z.string().min(1, 'Укажите название задания').max(200),
  description: z.string().min(1, 'Укажите описание задания'),
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  attachmentName: z.string().optional(),
});

const updateHomeworkSchema = z.object({
  subject: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  attachmentName: z.string().optional().nullable(),
});

const updateProgressSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'urgent', 'completed']),
});

// GET /api/homework
homeworkRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userGroupIds = req.user!.memberships.map((m) => m.groupId);

    // If user has no group yet, return empty list
    if (userGroupIds.length === 0) {
      res.status(200).json({ homework: [] });
      return;
    }

    const { status, subject, groupId } = req.query;

    const targetGroupIds = typeof groupId === 'string' && userGroupIds.includes(groupId)
      ? [groupId]
      : userGroupIds;

    const where: any = {
      groupId: { in: targetGroupIds },
    };

    if (typeof subject === 'string' && subject.trim() && subject !== 'all') {
      where.subject = subject.trim();
    }

    const homeworkList = await prisma.homework.findMany({
      where,
      orderBy: { deadline: 'asc' },
      include: {
        group: { select: { id: true, name: true } },
        progress: {
          where: { userId: req.user!.id },
          select: { status: true, updatedAt: true },
        },
      },
    });

    // Map homework and calculate user's personal progress status
    const result = homeworkList.map((hw) => {
      const userProgress = hw.progress[0]?.status || 'pending';
      return {
        id: hw.id,
        groupId: hw.groupId,
        groupName: hw.group.name,
        subject: hw.subject,
        title: hw.title,
        description: hw.description,
        deadline: hw.deadline.toISOString().slice(0, 10),
        author: hw.author,
        attachmentName: hw.attachmentName,
        status: userProgress, // Personal status!
        createdAt: hw.createdAt.toISOString(),
      };
    });

    // Filter by personal status if requested
    const filtered = status && status !== 'all'
      ? result.filter((item) => item.status === status)
      : result;

    res.status(200).json({ homework: filtered });
  } catch (error) {
    next(error);
  }
});

// GET /api/homework/:id
homeworkRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id },
      include: {
        group: { select: { id: true, name: true } },
        progress: {
          where: { userId: req.user!.id },
          select: { status: true },
        },
      },
    });

    if (!hw) {
      throw new AppError('Задание не найдено', 404);
    }

    // Check if user is in group
    const isMember = req.user!.memberships.some((m) => m.groupId === hw.groupId);
    if (!isMember) {
      throw new AppError('У вас нет доступа к заданиям этой группы', 403);
    }

    res.status(200).json({
      homework: {
        id: hw.id,
        groupId: hw.groupId,
        groupName: hw.group.name,
        subject: hw.subject,
        title: hw.title,
        description: hw.description,
        deadline: hw.deadline.toISOString().slice(0, 10),
        author: hw.author,
        attachmentName: hw.attachmentName,
        status: hw.progress[0]?.status || 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/homework (Group Homework creation)
homeworkRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createHomeworkSchema.parse(req.body);
    const targetGroupId = data.groupId || req.user!.memberships[0]?.groupId;
    if (!targetGroupId) {
      throw new AppError('Укажите учебную группу или присоединитесь к группе', 400);
    }

    const membership = req.user!.memberships.find((m) => m.groupId === targetGroupId);
    if (!membership) {
      throw new AppError('Вы не состоите в указанной группе', 403);
    }

    // Only ADMIN or HEADMAN or single-student groups can create assignments for group
    if (membership.role === 'MEMBER') {
      const memberCount = await prisma.groupMember.count({ where: { groupId: targetGroupId } });
      if (memberCount > 1) {
        throw new AppError('Создавать общие задания группы могут только староста или администратор группы', 403);
      }
    }

    const deadlineDate = new Date(data.deadline);

    const hw = await prisma.homework.create({
      data: {
        groupId: targetGroupId,
        subject: data.subject,
        title: data.title,
        description: data.description,
        deadline: deadlineDate,
        author: req.user!.name,
        attachmentName: data.attachmentName,
      },
      include: { group: true },
    });

    res.status(201).json({
      message: 'Домашнее задание успешно добавлено для группы',
      homework: {
        id: hw.id,
        groupId: hw.groupId,
        groupName: hw.group.name,
        subject: hw.subject,
        title: hw.title,
        description: hw.description,
        deadline: hw.deadline.toISOString().slice(0, 10),
        author: hw.author,
        attachmentName: hw.attachmentName,
        status: 'pending',
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/homework/:id/progress (Update personal progress on a group homework item)
homeworkRouter.patch('/:id/progress', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = updateProgressSchema.parse(req.body);

    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id },
    });

    if (!hw) {
      throw new AppError('Задание не найдено', 404);
    }

    const isMember = req.user!.memberships.some((m) => m.groupId === hw.groupId);
    if (!isMember) {
      throw new AppError('Вы не являетесь участником группы этого задания', 403);
    }

    // Upsert individual progress
    const progress = await prisma.homeworkProgress.upsert({
      where: {
        homeworkId_userId: {
          homeworkId: hw.id,
          userId: req.user!.id,
        },
      },
      create: {
        homeworkId: hw.id,
        userId: req.user!.id,
        status,
      },
      update: {
        status,
      },
    });

    res.status(200).json({
      message: 'Личный статус выполнения задания обновлен',
      status: progress.status,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/homework/:id/convert-to-task (Convert group homework to a personal task)
homeworkRouter.post('/:id/convert-to-task', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id },
    });

    if (!hw) {
      throw new AppError('Задание не найдено', 404);
    }

    // Create a personal task linked to this homework
    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title: `${hw.subject}: ${hw.title}`,
        description: hw.description,
        deadline: hw.deadline,
        category: 'Учёба',
        priority: 'high',
        homeworkId: hw.id,
      },
    });

    res.status(201).json({
      message: 'Задание добавлено в ваш личный список дел',
      task,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/homework/:id (Edit group assignment)
homeworkRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id },
    });

    if (!hw) {
      throw new AppError('Задание не найдено', 404);
    }

    const member = req.user!.memberships.find((m) => m.groupId === hw.groupId);
    if (!member || (member.role !== 'ADMIN' && member.role !== 'HEADMAN' && hw.author !== req.user!.name)) {
      throw new AppError('Редактировать задание группы может только староста, администратор или автор', 403);
    }

    const data = updateHomeworkSchema.parse(req.body);

    const updateData: any = {};
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.deadline !== undefined) updateData.deadline = new Date(data.deadline);
    if (data.attachmentName !== undefined) updateData.attachmentName = data.attachmentName;

    const updated = await prisma.homework.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json({
      message: 'Задание успешно обновлено',
      homework: {
        id: updated.id,
        groupId: updated.groupId,
        subject: updated.subject,
        title: updated.title,
        description: updated.description,
        deadline: updated.deadline.toISOString().slice(0, 10),
        author: updated.author,
        attachmentName: updated.attachmentName,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/homework/:id (Delete assignment - restricted)
homeworkRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const hw = await prisma.homework.findUnique({
      where: { id: req.params.id },
    });

    if (!hw) {
      throw new AppError('Задание не найдено', 404);
    }

    const member = req.user!.memberships.find((m) => m.groupId === hw.groupId);
    if (!member || (member.role !== 'ADMIN' && member.role !== 'HEADMAN')) {
      throw new AppError('Удалять задание группы может только староста или администратор', 403);
    }

    await prisma.homework.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: 'Задание группы удалено' });
  } catch (error) {
    next(error);
  }
});
