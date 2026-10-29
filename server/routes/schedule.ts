import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const scheduleRouter = Router();

scheduleRouter.use(requireAuth);

const lessonSchema = z.object({
  groupId: z.string().optional().nullable(),
  subject: z.string().min(1, 'Укажите предмет').max(100),
  type: z.enum(['lecture', 'practice', 'lab']).default('lecture'),
  teacher: z.string().min(1, 'Укажите преподавателя'),
  room: z.string().min(1, 'Укажите аудиторию'),
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  weekType: z.enum(['odd', 'even', 'both']).default('both'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Время в формате ЧЧ:ММ'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Время в формате ЧЧ:ММ'),
  specificDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateLessonSchema = lessonSchema.partial();

const copyDaySchema = z.object({
  sourceDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  sourceWeek: z.enum(['odd', 'even', 'both']),
  targetDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  targetWeek: z.enum(['odd', 'even', 'both']),
  groupId: z.string().optional().nullable(),
});

const copyLessonSchema = z.object({
  targetDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).optional(),
  targetWeek: z.enum(['odd', 'even', 'both']).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

// GET /api/schedule
scheduleRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dayOfWeek, weekType, specificDate, groupId } = req.query;

    const userGroupIds = req.user!.memberships.map((m) => m.groupId);

    const orConditions: any[] = [{ userId: req.user!.id }];
    if (userGroupIds.length > 0) {
      if (typeof groupId === 'string' && userGroupIds.includes(groupId)) {
        orConditions.push({ groupId });
      } else {
        orConditions.push({ groupId: { in: userGroupIds } });
      }
    }

    const where: any = {
      OR: orConditions,
    };

    if (typeof dayOfWeek === 'string' && dayOfWeek) {
      where.dayOfWeek = dayOfWeek;
    }

    if (typeof weekType === 'string' && (weekType === 'odd' || weekType === 'even')) {
      where.weekType = { in: [weekType, 'both'] };
    }

    if (typeof specificDate === 'string' && specificDate) {
      where.specificDate = specificDate;
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.status(200).json({ lessons });
  } catch (error) {
    next(error);
  }
});

// GET /api/schedule/week (get full week grouped by day)
scheduleRouter.get('/week', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { weekType } = req.query; // 'odd' | 'even'
    const parity = weekType === 'even' ? 'even' : 'odd';

    const userGroupIds = req.user!.memberships.map((m) => m.groupId);

    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { userId: req.user!.id },
          ...(userGroupIds.length > 0 ? [{ groupId: { in: userGroupIds } }] : []),
        ],
        weekType: { in: [parity, 'both'] },
      },
      orderBy: { startTime: 'asc' },
    });

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const grouped: Record<string, typeof lessons> = {};
    for (const d of days) {
      grouped[d] = lessons.filter((l) => l.dayOfWeek === d);
    }

    res.status(200).json({ weekType: parity, schedule: grouped });
  } catch (error) {
    next(error);
  }
});

// POST /api/schedule
scheduleRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = lessonSchema.parse(req.body);

    if (data.groupId) {
      const membership = req.user!.memberships.find((m) => m.groupId === data.groupId);
      if (!membership) {
        throw new AppError('Вы не состоите в указанной группе', 403);
      }
    }

    const lesson = await prisma.lesson.create({
      data: {
        subject: data.subject,
        type: data.type,
        teacher: data.teacher,
        room: data.room,
        dayOfWeek: data.dayOfWeek,
        weekType: data.weekType,
        startTime: data.startTime,
        endTime: data.endTime,
        specificDate: data.specificDate || null,
        notes: data.notes || null,
        groupId: data.groupId || null,
        userId: data.groupId ? null : req.user!.id,
      },
    });

    res.status(201).json({
      message: 'Пара успешно добавлена в расписание',
      lesson,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/schedule/:id (Edit lesson)
scheduleRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lesson.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Занятие не найдено', 404);
    }

    if (existing.userId && existing.userId !== req.user!.id) {
      throw new AppError('У вас нет прав для изменения этого занятия', 403);
    }

    if (existing.groupId) {
      const member = req.user!.memberships.find((m) => m.groupId === existing.groupId);
      if (!member || (member.role !== 'ADMIN' && member.role !== 'HEADMAN')) {
        throw new AppError('Редактировать расписание группы может только староста или администратор', 403);
      }
    }

    const data = updateLessonSchema.parse(req.body);

    const updated = await prisma.lesson.update({
      where: { id: req.params.id },
      data: {
        ...data,
        specificDate: data.specificDate !== undefined ? data.specificDate : existing.specificDate,
      },
    });

    res.status(200).json({
      message: 'Занятие успешно обновлено',
      lesson: updated,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/schedule/:id/copy (Duplicate a single lesson)
scheduleRouter.post('/:id/copy', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.lesson.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Занятие не найдено', 404);
    }

    const body = copyLessonSchema.parse(req.body);

    const newLesson = await prisma.lesson.create({
      data: {
        subject: existing.subject,
        type: existing.type,
        teacher: existing.teacher,
        room: existing.room,
        startTime: existing.startTime,
        endTime: existing.endTime,
        notes: existing.notes,
        dayOfWeek: body.targetDay || existing.dayOfWeek,
        weekType: body.targetWeek || existing.weekType,
        specificDate: body.targetDate !== undefined ? body.targetDate : existing.specificDate,
        groupId: existing.groupId,
        userId: existing.groupId ? null : req.user!.id,
      },
    });

    res.status(201).json({
      message: 'Занятие успешно скопировано',
      lesson: newLesson,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/schedule/copy-day (Copy all lessons of a day to another day or parity)
scheduleRouter.post('/copy-day', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceDay, sourceWeek, targetDay, targetWeek, groupId } = copyDaySchema.parse(req.body);

    const userGroupIds = req.user!.memberships.map((m) => m.groupId);

    const orConditions: any[] = [{ userId: req.user!.id }];
    if (groupId && userGroupIds.includes(groupId)) {
      orConditions.push({ groupId });
    }

    const sourceLessons = await prisma.lesson.findMany({
      where: {
        OR: orConditions,
        dayOfWeek: sourceDay,
        weekType: { in: [sourceWeek, 'both'] },
      },
    });

    if (sourceLessons.length === 0) {
      throw new AppError('В исходном дне нет занятий для копирования', 400);
    }

    const createdLessons = await Promise.all(
      sourceLessons.map((l) =>
        prisma.lesson.create({
          data: {
            subject: l.subject,
            type: l.type,
            teacher: l.teacher,
            room: l.room,
            startTime: l.startTime,
            endTime: l.endTime,
            notes: l.notes,
            dayOfWeek: targetDay,
            weekType: targetWeek,
            groupId: l.groupId,
            userId: l.groupId ? null : req.user!.id,
          },
        })
      )
    );

    res.status(201).json({
      message: `Успешно скопировано ${createdLessons.length} пар из ${sourceDay} в ${targetDay}`,
      count: createdLessons.length,
      lessons: createdLessons,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/schedule/:id
scheduleRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
    });

    if (!lesson) {
      throw new AppError('Занятие не найдено', 404);
    }

    if (lesson.userId && lesson.userId !== req.user!.id) {
      throw new AppError('У вас нет прав на удаление этого занятия', 403);
    }

    if (lesson.groupId) {
      const member = req.user!.memberships.find((m) => m.groupId === lesson.groupId);
      if (!member || (member.role !== 'ADMIN' && member.role !== 'HEADMAN')) {
        throw new AppError('Удалять занятия группы может только староста или администратор', 403);
      }
    }

    await prisma.lesson.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: 'Занятие успешно удалено' });
  } catch (error) {
    next(error);
  }
});
