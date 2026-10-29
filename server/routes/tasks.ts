import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const tasksRouter = Router();

// Protect all task routes
tasksRouter.use(requireAuth);

const createTaskSchema = z.object({
  title: z.string().min(1, 'Укажите название задачи').max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z.string().optional(),
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
  homeworkId: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  category: z.string().optional().nullable(),
  deadline: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional().nullable(),
});

// GET /api/tasks
tasksRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, category } = req.query;

    const where: any = {
      userId: req.user!.id,
    };

    if (status === 'completed') {
      where.completed = true;
    } else if (status === 'active') {
      where.completed = false;
    }

    if (typeof category === 'string' && category.trim()) {
      where.category = category.trim();
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { completed: 'asc' },
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        homework: {
          select: {
            id: true,
            subject: true,
            title: true,
          },
        },
      },
    });

    res.status(200).json({
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        completed: t.completed,
        priority: t.priority,
        category: t.category,
        deadline: t.deadline ? t.deadline.toISOString().slice(0, 10) : null,
        homework: t.homework,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id
tasksRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        homework: true,
      },
    });

    if (!task) {
      throw new AppError('Задача не найдена', 404);
    }

    // Security check: isolate users!
    if (task.userId !== req.user!.id) {
      throw new AppError('У вас нет доступа к этой задаче', 403);
    }

    res.status(200).json({ task });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks
tasksRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createTaskSchema.parse(req.body);

    const deadlineDate = data.deadline ? new Date(data.deadline) : null;

    const task = await prisma.task.create({
      data: {
        userId: req.user!.id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        deadline: deadlineDate,
        homeworkId: data.homeworkId,
      },
    });

    res.status(201).json({
      message: 'Задача успешно создана',
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority,
        category: task.category,
        deadline: task.deadline ? task.deadline.toISOString().slice(0, 10) : null,
        createdAt: task.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Задача не найдена', 404);
    }

    // Ownership check
    if (existing.userId !== req.user!.id) {
      throw new AppError('У вас нет прав для изменения этой задачи', 403);
    }

    const data = updateTaskSchema.parse(req.body);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.completed !== undefined) updateData.completed = data.completed;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.status(200).json({
      message: 'Задача успешно обновлена',
      task: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        completed: updated.completed,
        priority: updated.priority,
        category: updated.category,
        deadline: updated.deadline ? updated.deadline.toISOString().slice(0, 10) : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.task.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      throw new AppError('Задача не найдена', 404);
    }

    if (existing.userId !== req.user!.id) {
      throw new AppError('У вас нет прав для удаления этой задачи', 403);
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ message: 'Задача успешно удалена' });
  } catch (error) {
    next(error);
  }
});
