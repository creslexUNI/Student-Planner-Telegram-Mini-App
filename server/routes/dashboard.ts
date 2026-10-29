import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

function getCurrentDayOfWeekString(): string {
  const day = new Date().getDay();
  switch (day) {
    case 1:
      return 'monday';
    case 2:
      return 'tuesday';
    case 3:
      return 'wednesday';
    case 4:
      return 'thursday';
    case 5:
      return 'friday';
    case 6:
      return 'saturday';
    case 0:
    default:
      return 'monday';
  }
}

// GET /api/dashboard/today
dashboardRouter.get('/today', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { weekType } = req.query;
    const parity = (weekType === 'even' ? 'even' : 'odd') as 'odd' | 'even';
    const dayOfWeek = getCurrentDayOfWeekString();

    const userGroupIds = req.user!.memberships.map((m) => m.groupId);

    // 1. Lessons for today
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { userId: req.user!.id },
          ...(userGroupIds.length > 0 ? [{ groupId: { in: userGroupIds } }] : []),
        ],
        dayOfWeek,
        weekType: { in: [parity, 'both'] },
      },
      orderBy: { startTime: 'asc' },
    });

    // 2. Personal tasks summary
    const tasks = await prisma.task.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ completed: 'asc' }, { deadline: 'asc' }],
    });

    const incompleteTasksCount = tasks.filter((t) => !t.completed).length;

    // 3. Urgent Group Homework
    let urgentHomework: any[] = [];
    if (userGroupIds.length > 0) {
      const homeworkList = await prisma.homework.findMany({
        where: {
          groupId: { in: userGroupIds },
        },
        orderBy: { deadline: 'asc' },
        include: {
          progress: {
            where: { userId: req.user!.id },
            select: { status: true },
          },
        },
        take: 5,
      });

      urgentHomework = homeworkList
        .filter((h) => (h.progress[0]?.status || 'pending') !== 'completed')
        .map((h) => ({
          id: h.id,
          subject: h.subject,
          title: h.title,
          deadline: h.deadline.toISOString().slice(0, 10),
          status: h.progress[0]?.status || 'pending',
        }));
    }

    res.status(200).json({
      dayOfWeek,
      currentWeek: parity,
      lessons,
      stats: {
        lessonsCount: lessons.length,
        incompleteTasksCount,
        urgentHomeworkCount: urgentHomework.length,
      },
      urgentHomework: urgentHomework.slice(0, 3),
      tasksPreview: tasks.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        priority: t.priority,
        deadline: t.deadline ? t.deadline.toISOString().slice(0, 10) : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});
