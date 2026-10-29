import React, { useState, useEffect, useCallback } from 'react';
import { DayOfWeek, HomeworkItem, HomeworkStatus, Lesson, LessonType, PersonalTask, TabType, TaskPriority, WeekType } from './types';
import { MOCK_HOMEWORK, MOCK_PERSONAL_TASKS, MOCK_SCHEDULE } from './data/mockData';
import { getCurrentDayKey } from './utils/formatters';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/TodayView';
import { ScheduleView } from './components/ScheduleView';
import { HomeworkView } from './components/HomeworkView';
import { PersonalTasksView } from './components/PersonalTasksView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import { authApi, AuthUser, groupsApi, healthApi, homeworkApi, scheduleApi, tasksApi } from './api/client';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('student_planner_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Week parity state (odd = числитель, even = знаменатель)
  const [currentWeek, setCurrentWeek] = useState<WeekType>(() => {
    const saved = localStorage.getItem('student_planner_week');
    return saved === 'even' ? 'even' : 'odd';
  });

  // Selected schedule day
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getCurrentDayKey());

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Standalone / Guest profile
  const [guestProfile, setGuestProfile] = useState<{
    name: string;
    university?: string | null;
    faculty?: string | null;
    course?: number | null;
    groupName?: string | null;
  }>(() => {
    const saved = localStorage.getItem('student_planner_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse guest profile', e);
      }
    }
    return {
      name: 'Студент',
      university: 'МГТУ им. Н.Э. Баумана',
      faculty: 'Информатика и системы управления (ИУ)',
      course: 2,
      groupName: 'ИВТ-21',
    };
  });

  // System & Database health state
  const [dbHealth, setDbHealth] = useState<{ connected: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // Schedule state with local storage fallback
  const [scheduleData, setScheduleData] = useState<Record<WeekType, Record<DayOfWeek, Lesson[]>>>(() => {
    const saved = localStorage.getItem('student_planner_schedule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse schedule from localStorage', e);
      }
    }
    return MOCK_SCHEDULE;
  });

  // Homework state
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(() => {
    const saved = localStorage.getItem('student_planner_homework');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse homework from localStorage', e);
      }
    }
    return MOCK_HOMEWORK;
  });

  // Personal tasks state
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(() => {
    const saved = localStorage.getItem('student_planner_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tasks from localStorage', e);
      }
    }
    return MOCK_PERSONAL_TASKS;
  });

  // Sync theme with document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('student_planner_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('student_planner_theme', 'light');
    }
  }, [isDark]);

  // Sync week parity
  useEffect(() => {
    localStorage.setItem('student_planner_week', currentWeek);
  }, [currentWeek]);

  // Refresh DB health
  const checkHealth = useCallback(async () => {
    try {
      const health = await healthApi.getHealth();
      setDbHealth(health.database);
    } catch (e) {
      console.warn('Health check failed:', e);
      setDbHealth({
        connected: false,
        message: 'Не удалось связаться с сервером. Включен автономный режим.',
      });
    }
  }, []);

  // Fetch server data when user is authenticated
  const loadServerData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);

    try {
      // 1. Fetch personal tasks from DB
      const tasksRes = await tasksApi.getTasks();
      if (tasksRes.tasks) {
        setPersonalTasks(
          tasksRes.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
            priority: t.priority,
            category: (t.category as any) || 'Учёба',
            deadline: t.deadline || undefined,
            createdAt: t.createdAt,
          }))
        );
      }

      // 2. Fetch group homework from DB
      const hwRes = await homeworkApi.getHomework();
      if (hwRes.homework && hwRes.homework.length > 0) {
        setHomeworkList(
          hwRes.homework.map((h) => ({
            id: h.id,
            subject: h.subject,
            title: h.title,
            description: h.description,
            deadline: h.deadline,
            assignedDate: h.createdAt ? h.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: h.status,
            author: h.author,
            attachmentName: h.attachmentName || undefined,
          }))
        );
      }

      // 3. Fetch schedule from DB
      const [oddSchedule, evenSchedule] = await Promise.all([
        scheduleApi.getWeekSchedule('odd').catch(() => null),
        scheduleApi.getWeekSchedule('even').catch(() => null),
      ]);

      if (oddSchedule?.schedule && evenSchedule?.schedule) {
        const hasDbLessons =
          Object.values(oddSchedule.schedule).some((arr) => arr.length > 0) ||
          Object.values(evenSchedule.schedule).some((arr) => arr.length > 0);

        if (hasDbLessons) {
          const mapLessons = (raw: any[], defaultDay: DayOfWeek, defaultWeek: WeekType): Lesson[] =>
            raw.map((l) => ({
              id: l.id,
              subject: l.subject,
              type: l.type,
              startTime: l.startTime,
              endTime: l.endTime,
              room: l.room,
              teacher: l.teacher,
              dayOfWeek: l.dayOfWeek || defaultDay,
              weekType: l.weekType || defaultWeek,
              specificDate: l.specificDate || undefined,
              notes: l.notes || undefined,
            }));

          const synced = {
            odd: {
              monday: mapLessons(oddSchedule.schedule.monday || [], 'monday', 'odd'),
              tuesday: mapLessons(oddSchedule.schedule.tuesday || [], 'tuesday', 'odd'),
              wednesday: mapLessons(oddSchedule.schedule.wednesday || [], 'wednesday', 'odd'),
              thursday: mapLessons(oddSchedule.schedule.thursday || [], 'thursday', 'odd'),
              friday: mapLessons(oddSchedule.schedule.friday || [], 'friday', 'odd'),
              saturday: mapLessons(oddSchedule.schedule.saturday || [], 'saturday', 'odd'),
            },
            even: {
              monday: mapLessons(evenSchedule.schedule.monday || [], 'monday', 'even'),
              tuesday: mapLessons(evenSchedule.schedule.tuesday || [], 'tuesday', 'even'),
              wednesday: mapLessons(evenSchedule.schedule.wednesday || [], 'wednesday', 'even'),
              thursday: mapLessons(evenSchedule.schedule.thursday || [], 'thursday', 'even'),
              friday: mapLessons(evenSchedule.schedule.friday || [], 'friday', 'even'),
              saturday: mapLessons(evenSchedule.schedule.saturday || [], 'saturday', 'even'),
            },
          };

          setScheduleData(synced);
          localStorage.setItem('student_planner_schedule', JSON.stringify(synced));
        }
      }
    } catch (err: any) {
      console.warn('Could not refresh full data from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Initial check on mount: Health + Me
  useEffect(() => {
    async function initApp() {
      checkHealth();

      try {
        const me = await authApi.getMe();
        if (me?.user) {
          setCurrentUser(me.user);
        }
      } catch {
        setCurrentUser(null);
      }
    }

    initApp();
  }, [checkHealth]);

  // When user logs in or out, reload data
  useEffect(() => {
    if (currentUser) {
      loadServerData();
    }
  }, [currentUser, loadServerData]);

  // Auth Handlers
  const handleLogin = async (email: string, pass: string) => {
    const res = await authApi.login({ email, password: pass });
    setCurrentUser(res.user);
    setApiNotice(`Добро пожаловать, ${res.user.name}!`);
    setTimeout(() => setApiNotice(null), 4000);
  };

  const handleRegister = async (data: {
    name: string;
    email: string;
    password: string;
    groupName?: string;
    inviteCode?: string;
  }) => {
    const res = await authApi.register(data);
    setCurrentUser(res.user);
    setApiNotice('Аккаунт успешно создан!');
    setTimeout(() => setApiNotice(null), 4000);
  };

  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setApiNotice('Вы вышли из системы. Включен автономный режим.');
    setTimeout(() => setApiNotice(null), 4000);
  };

  const handleJoinGroup = async (code: string) => {
    await groupsApi.joinGroup(code);
    const me = await authApi.getMe();
    if (me?.user) setCurrentUser(me.user);
    await loadServerData();
    setApiNotice('Вы успешно присоединились к учебной группе!');
    setTimeout(() => setApiNotice(null), 4000);
  };

  // Schedule Handlers
  const handleSaveLesson = async (lessonData: {
    id?: string;
    subject: string;
    type: LessonType;
    teacher: string;
    room: string;
    dayOfWeek: DayOfWeek;
    weekType: 'odd' | 'even' | 'both';
    startTime: string;
    endTime: string;
    specificDate?: string;
    notes?: string;
  }) => {
    if (lessonData.id) {
      // Update existing lesson
      if (currentUser) {
        try {
          await scheduleApi.updateLesson(lessonData.id, lessonData);
        } catch (e) {
          console.warn('API updateLesson error, falling back locally:', e);
        }
      }

      setScheduleData((prev) => {
        const next: Record<WeekType, Record<DayOfWeek, Lesson[]>> = {
          odd: { ...prev.odd },
          even: { ...prev.even },
        };
        (['odd', 'even'] as WeekType[]).forEach((w) => {
          (Object.keys(next[w]) as DayOfWeek[]).forEach((d) => {
            next[w][d] = next[w][d].map((l) =>
              l.id === lessonData.id
                ? {
                    ...l,
                    subject: lessonData.subject,
                    type: lessonData.type,
                    teacher: lessonData.teacher,
                    room: lessonData.room,
                    startTime: lessonData.startTime,
                    endTime: lessonData.endTime,
                    dayOfWeek: lessonData.dayOfWeek,
                    weekType: lessonData.weekType,
                    specificDate: lessonData.specificDate,
                    notes: lessonData.notes,
                  }
                : l
            );
          });
        });
        localStorage.setItem('student_planner_schedule', JSON.stringify(next));
        return next;
      });

      setApiNotice('Занятие успешно сохранено');
      setTimeout(() => setApiNotice(null), 3000);
      return;
    }

    // Create new lesson
    let newId = `lesson-${Date.now()}`;
    if (currentUser) {
      try {
        const res = await scheduleApi.createLesson(lessonData);
        if (res?.lesson?.id) newId = res.lesson.id;
      } catch (e) {
        console.warn('API createLesson error, creating locally:', e);
      }
    }

    const newLesson: Lesson = {
      id: newId,
      subject: lessonData.subject,
      type: lessonData.type,
      teacher: lessonData.teacher,
      room: lessonData.room,
      startTime: lessonData.startTime,
      endTime: lessonData.endTime,
      dayOfWeek: lessonData.dayOfWeek,
      weekType: lessonData.weekType,
      specificDate: lessonData.specificDate,
      notes: lessonData.notes,
    };

    setScheduleData((prev) => {
      const next: Record<WeekType, Record<DayOfWeek, Lesson[]>> = {
        odd: { ...prev.odd },
        even: { ...prev.even },
      };
      const targetWeeks: WeekType[] =
        lessonData.weekType === 'both' ? ['odd', 'even'] : [lessonData.weekType];

      targetWeeks.forEach((w) => {
        next[w][lessonData.dayOfWeek] = [...(next[w][lessonData.dayOfWeek] || []), newLesson].sort(
          (a, b) => a.startTime.localeCompare(b.startTime)
        );
      });
      localStorage.setItem('student_planner_schedule', JSON.stringify(next));
      return next;
    });

    setApiNotice('Новое занятие добавлено в расписание');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleDuplicateLesson = async (lesson: Lesson) => {
    let newId = `lesson-dup-${Date.now()}`;
    if (currentUser) {
      try {
        const res = await scheduleApi.duplicateLesson(lesson.id);
        if (res?.lesson?.id) newId = res.lesson.id;
      } catch (e) {
        console.warn('API duplicateLesson error, duplicating locally:', e);
      }
    }

    const duplicated: Lesson = {
      ...lesson,
      id: newId,
      subject: `${lesson.subject} (копия)`,
    };

    setScheduleData((prev) => {
      const next: Record<WeekType, Record<DayOfWeek, Lesson[]>> = {
        odd: { ...prev.odd },
        even: { ...prev.even },
      };
      const day = lesson.dayOfWeek || selectedDay;
      const targetWeeks: WeekType[] =
        lesson.weekType === 'both'
          ? ['odd', 'even']
          : lesson.weekType
          ? [lesson.weekType]
          : [currentWeek];

      targetWeeks.forEach((w) => {
        next[w][day] = [...(next[w][day] || []), duplicated].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
      });
      localStorage.setItem('student_planner_schedule', JSON.stringify(next));
      return next;
    });

    setApiNotice('Копия занятия добавлена в расписание');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleDeleteLesson = async (id: string) => {
    if (currentUser) {
      try {
        await scheduleApi.deleteLesson(id);
      } catch (e) {
        console.warn('API deleteLesson error, deleting locally:', e);
      }
    }

    setScheduleData((prev) => {
      const next: Record<WeekType, Record<DayOfWeek, Lesson[]>> = {
        odd: { ...prev.odd },
        even: { ...prev.even },
      };
      (['odd', 'even'] as WeekType[]).forEach((w) => {
        (Object.keys(next[w]) as DayOfWeek[]).forEach((d) => {
          next[w][d] = next[w][d].filter((l) => l.id !== id);
        });
      });
      localStorage.setItem('student_planner_schedule', JSON.stringify(next));
      return next;
    });

    setApiNotice('Занятие удалено');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleCopyDay = async (params: {
    sourceDay: DayOfWeek;
    sourceWeek: 'odd' | 'even' | 'both';
    targetDay: DayOfWeek;
    targetWeek: 'odd' | 'even' | 'both';
  }) => {
    if (currentUser) {
      try {
        await scheduleApi.copyDay(params);
      } catch (e) {
        console.warn('API copyDay error, copying locally:', e);
      }
    }

    setScheduleData((prev) => {
      const next: Record<WeekType, Record<DayOfWeek, Lesson[]>> = {
        odd: { ...prev.odd },
        even: { ...prev.even },
      };

      const sWeekKey: WeekType = params.sourceWeek === 'both' ? 'odd' : params.sourceWeek;
      const sourceLessons = prev[sWeekKey]?.[params.sourceDay] || [];

      const targetWeeks: WeekType[] =
        params.targetWeek === 'both' ? ['odd', 'even'] : [params.targetWeek];

      targetWeeks.forEach((w) => {
        const cloned = sourceLessons.map((l) => ({
          ...l,
          id: `copied-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          dayOfWeek: params.targetDay,
          weekType: params.targetWeek,
        }));
        next[w][params.targetDay] = cloned;
      });

      localStorage.setItem('student_planner_schedule', JSON.stringify(next));
      return next;
    });

    setApiNotice('Расписание дня скопировано');
    setTimeout(() => setApiNotice(null), 3500);
  };

  // Homework Operations
  const handleSaveHomework = async (data: {
    id?: string;
    subject: string;
    title: string;
    description: string;
    deadline: string;
    attachmentName?: string;
  }) => {
    if (data.id) {
      if (currentUser) {
        try {
          await homeworkApi.updateHomework(data.id, data);
        } catch (e) {
          console.warn('API updateHomework failed, updating locally:', e);
        }
      }
      setHomeworkList((prev) => {
        const next = prev.map((hw) =>
          hw.id === data.id
            ? {
                ...hw,
                subject: data.subject,
                title: data.title,
                description: data.description,
                deadline: data.deadline,
                attachmentName: data.attachmentName,
              }
            : hw
        );
        localStorage.setItem('student_planner_homework', JSON.stringify(next));
        return next;
      });
      setApiNotice('Домашнее задание обновлено');
      setTimeout(() => setApiNotice(null), 3000);
      return;
    }

    let newId = `hw-${Date.now()}`;
    if (currentUser) {
      try {
        const res = await homeworkApi.createHomework(data);
        if (res?.homework?.id) newId = res.homework.id;
      } catch (e) {
        console.warn('API createHomework failed, adding locally:', e);
      }
    }

    const newItem: HomeworkItem = {
      id: newId,
      subject: data.subject,
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      assignedDate: new Date().toISOString().slice(0, 10),
      status: 'pending',
      author: currentUser?.name || guestProfile.name || 'Студент',
      attachmentName: data.attachmentName,
    };

    setHomeworkList((prev) => {
      const next = [newItem, ...prev];
      localStorage.setItem('student_planner_homework', JSON.stringify(next));
      return next;
    });

    setApiNotice('Новое домашнее задание опубликовано');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleDeleteHomework = async (id: string) => {
    if (currentUser) {
      try {
        await homeworkApi.deleteHomework(id);
      } catch (e) {
        console.warn('API deleteHomework failed, deleting locally:', e);
      }
    }
    setHomeworkList((prev) => {
      const next = prev.filter((hw) => hw.id !== id);
      localStorage.setItem('student_planner_homework', JSON.stringify(next));
      return next;
    });
    setApiNotice('Домашнее задание удалено');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleToggleHomeworkStatus = async (id: string) => {
    const hw = homeworkList.find((h) => h.id === id);
    if (!hw) return;

    const newStatus: HomeworkStatus = hw.status === 'completed' ? 'in_progress' : 'completed';

    setHomeworkList((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item));
      localStorage.setItem('student_planner_homework', JSON.stringify(next));
      return next;
    });

    if (currentUser) {
      try {
        await homeworkApi.updateProgress(id, newStatus);
      } catch (e) {
        console.error('Failed to sync homework status with API:', e);
      }
    }
  };

  const handleConvertToTask = async (homeworkId: string) => {
    if (currentUser) {
      try {
        const res = await homeworkApi.convertToPersonalTask(homeworkId);
        if (res.task) {
          const newTask: PersonalTask = {
            id: res.task.id,
            title: res.task.title,
            deadline: res.task.deadline ? res.task.deadline.slice(0, 10) : undefined,
            priority: res.task.priority || 'high',
            category: 'Учёба',
            completed: false,
            createdAt: res.task.createdAt || new Date().toISOString(),
          };
          setPersonalTasks((prev) => [newTask, ...prev]);
          setApiNotice('Задание добавлено в личные дела');
          setTimeout(() => setApiNotice(null), 3000);
          return;
        }
      } catch (e) {
        console.error('API convert homework to task failed:', e);
      }
    }

    const hw = homeworkList.find((h) => h.id === homeworkId);
    if (hw) {
      const task: PersonalTask = {
        id: `task-from-hw-${Date.now()}`,
        title: `${hw.subject}: ${hw.title}`,
        deadline: hw.deadline,
        priority: 'high',
        category: 'Учёба',
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setPersonalTasks((prev) => {
        const next = [task, ...prev];
        localStorage.setItem('student_planner_tasks', JSON.stringify(next));
        return next;
      });
      setApiNotice('Задание добавлено в личные дела');
      setTimeout(() => setApiNotice(null), 3000);
    }
  };

  // Task Operations
  const handleToggleTask = async (id: string) => {
    const target = personalTasks.find((t) => t.id === id);
    if (!target) return;

    const newCompleted = !target.completed;
    setPersonalTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, completed: newCompleted } : t));
      localStorage.setItem('student_planner_tasks', JSON.stringify(next));
      return next;
    });

    if (currentUser) {
      try {
        await tasksApi.updateTask(id, { completed: newCompleted });
      } catch (e) {
        console.error('Failed to sync task status with API:', e);
      }
    }
  };

  const handleAddTask = async (newTask: {
    title: string;
    deadline?: string;
    priority: TaskPriority;
    category?: 'Учёба' | 'Деканат' | 'Проект' | 'Личное';
  }) => {
    if (currentUser) {
      try {
        const res = await tasksApi.createTask({
          title: newTask.title,
          deadline: newTask.deadline,
          priority: newTask.priority,
          category: newTask.category,
        });

        const created: PersonalTask = {
          id: res.task.id,
          title: res.task.title,
          deadline: res.task.deadline || undefined,
          priority: res.task.priority,
          category: (res.task.category as any) || 'Учёба',
          completed: res.task.completed,
          createdAt: res.task.createdAt,
        };
        setPersonalTasks((prev) => {
          const next = [created, ...prev];
          localStorage.setItem('student_planner_tasks', JSON.stringify(next));
          return next;
        });
        setApiNotice('Задача добавлена');
        setTimeout(() => setApiNotice(null), 3000);
        return;
      } catch (e) {
        console.error('API create task failed, using local:', e);
      }
    }

    const task: PersonalTask = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      deadline: newTask.deadline,
      priority: newTask.priority,
      category: newTask.category,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setPersonalTasks((prev) => {
      const next = [task, ...prev];
      localStorage.setItem('student_planner_tasks', JSON.stringify(next));
      return next;
    });
    setApiNotice('Задача добавлена');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleUpdateTask = async (task: {
    id: string;
    title: string;
    deadline?: string;
    priority: TaskPriority;
    category?: 'Учёба' | 'Деканат' | 'Проект' | 'Личное';
  }) => {
    if (currentUser) {
      try {
        await tasksApi.updateTask(task.id, {
          title: task.title,
          deadline: task.deadline,
          priority: task.priority,
          category: task.category,
        });
      } catch (e) {
        console.warn('API updateTask error, saving locally:', e);
      }
    }

    setPersonalTasks((prev) => {
      const next = prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              title: task.title,
              deadline: task.deadline,
              priority: task.priority,
              category: task.category,
            }
          : t
      );
      localStorage.setItem('student_planner_tasks', JSON.stringify(next));
      return next;
    });

    setApiNotice('Задача сохранена');
    setTimeout(() => setApiNotice(null), 3000);
  };

  const handleDeleteTask = async (id: string) => {
    if (currentUser) {
      try {
        await tasksApi.deleteTask(id);
      } catch (e) {
        console.error('API delete task failed:', e);
      }
    }
    setPersonalTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      localStorage.setItem('student_planner_tasks', JSON.stringify(next));
      return next;
    });
    setApiNotice('Задача удалена');
    setTimeout(() => setApiNotice(null), 3000);
  };

  // Profile update handler
  const handleUpdateProfile = async (data: {
    name?: string;
    university?: string | null;
    faculty?: string | null;
    course?: number | null;
    groupName?: string | null;
  }) => {
    if (currentUser) {
      const res = await authApi.updateProfile(data);
      setCurrentUser(res.user);
    } else {
      const updated = {
        name: data.name || guestProfile.name,
        university: data.university !== undefined ? data.university : guestProfile.university,
        faculty: data.faculty !== undefined ? data.faculty : guestProfile.faculty,
        course: data.course !== undefined ? data.course : guestProfile.course,
        groupName: data.groupName !== undefined ? data.groupName : guestProfile.groupName,
      };
      setGuestProfile(updated);
      localStorage.setItem('student_planner_profile', JSON.stringify(updated));
    }
    setApiNotice('Настройки профиля сохранены');
    setTimeout(() => setApiNotice(null), 3500);
  };

  // Current schedule & today's lessons
  const currentDayKey = getCurrentDayKey();
  const todayLessons = scheduleData[currentWeek]?.[currentDayKey] || [];
  const scheduleLessons = scheduleData[currentWeek]?.[selectedDay] || [];
  const allWeekSchedule = scheduleData[currentWeek] || ({} as Record<DayOfWeek, Lesson[]>);

  const urgentHomework = homeworkList.filter((hw) => hw.status !== 'completed');
  const incompleteTasksCount = personalTasks.filter((t) => !t.completed).length;

  // Active user data for Header/Settings
  const effectiveUser: AuthUser | null = currentUser || {
    id: 'guest',
    email: '',
    name: guestProfile.name,
    role: 'student',
    university: guestProfile.university,
    faculty: guestProfile.faculty,
    course: guestProfile.course,
    groupName: guestProfile.groupName,
    groups: guestProfile.groupName
      ? [{ id: 'local-group', name: guestProfile.groupName, role: 'MEMBER' as const, inviteCode: 'LOCAL' }]
      : [],
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 antialiased">
      {/* Top Header */}
      <Header
        currentWeek={currentWeek}
        onToggleWeek={() => setCurrentWeek((prev) => (prev === 'odd' ? 'even' : 'odd'))}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isDbConnected={dbHealth?.connected}
      />

      {/* Floating System Notification Banner */}
      {apiNotice && (
        <div className="max-w-4xl mx-auto px-4 pt-2 w-full">
          <div className="p-2.5 rounded-xl bg-sky-600 text-white text-xs font-medium flex items-center justify-between shadow-sm animate-in fade-in">
            <span>{apiNotice}</span>
            <button onClick={() => setApiNotice(null)} className="underline text-[11px] ml-2">
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Navigation (Desktop Tabs & Mobile Bar) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingHomeworkCount={urgentHomework.length}
        incompleteTasksCount={incompleteTasksCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:px-6 mb-20 sm:mb-6">
        {activeTab === 'today' && (
          <TodayView
            currentWeek={currentWeek}
            todayLessons={todayLessons}
            urgentHomework={urgentHomework}
            personalTasks={personalTasks}
            onToggleTask={handleToggleTask}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            currentWeek={currentWeek}
            onChangeWeek={setCurrentWeek}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            lessons={scheduleLessons}
            allWeekSchedule={allWeekSchedule}
            onSaveLesson={handleSaveLesson}
            onDuplicateLesson={handleDuplicateLesson}
            onDeleteLesson={handleDeleteLesson}
            onCopyDay={handleCopyDay}
          />
        )}

        {activeTab === 'homework' && (
          <HomeworkView
            homeworkList={homeworkList}
            onToggleStatus={handleToggleHomeworkStatus}
            onConvertToTask={handleConvertToTask}
            onSaveHomework={handleSaveHomework}
            onDeleteHomework={handleDeleteHomework}
          />
        )}

        {activeTab === 'tasks' && (
          <PersonalTasksView
            tasks={personalTasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentUser={effectiveUser}
            currentWeek={currentWeek}
            onToggleWeek={() => setCurrentWeek((prev) => (prev === 'odd' ? 'even' : 'odd'))}
            isDark={isDark}
            onToggleTheme={() => setIsDark((prev) => !prev)}
            dbHealth={dbHealth}
            onRefreshHealth={checkHealth}
            onUpdateProfile={handleUpdateProfile}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onJoinGroup={handleJoinGroup}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onLogout={handleLogout}
        onJoinGroup={handleJoinGroup}
      />
    </div>
  );
}
