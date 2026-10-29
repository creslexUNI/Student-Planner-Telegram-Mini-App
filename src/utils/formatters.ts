import { DayOfWeek, LessonType, TaskPriority } from '../types';

export function getLessonTypeInfo(type: LessonType): { label: string; bgClass: string; textClass: string; borderClass: string } {
  switch (type) {
    case 'lecture':
      return {
        label: 'Лекция',
        bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
        textClass: 'text-blue-700 dark:text-blue-300',
        borderClass: 'border-blue-200 dark:border-blue-800/60',
      };
    case 'practice':
      return {
        label: 'Семинар',
        bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-200 dark:border-emerald-800/60',
      };
    case 'lab':
      return {
        label: 'Лабораторная',
        bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-200 dark:border-purple-800/60',
      };
  }
}

export function formatDeadlineRelative(deadlineStr: string): { label: string; isUrgent: boolean; isPast: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Просрочено на ${Math.abs(diffDays)} дн.`, isUrgent: true, isPast: true };
  } else if (diffDays === 0) {
    return { label: 'Сегодня', isUrgent: true, isPast: false };
  } else if (diffDays === 1) {
    return { label: 'Завтра', isUrgent: true, isPast: false };
  } else if (diffDays === 2) {
    return { label: 'Послезавтра', isUrgent: false, isPast: false };
  } else if (diffDays <= 4) {
    return { label: `Через ${diffDays} дня`, isUrgent: false, isPast: false };
  } else {
    return { label: `Через ${diffDays} дней`, isUrgent: false, isPast: false };
  }
}

export function formatDateRussian(date: Date = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  const formatted = date.toLocaleDateString('ru-RU', options);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getPriorityMeta(priority: TaskPriority): { label: string; dotClass: string; badgeClass: string } {
  switch (priority) {
    case 'high':
      return {
        label: 'Высокий',
        dotClass: 'bg-rose-500',
        badgeClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50',
      };
    case 'medium':
      return {
        label: 'Средний',
        dotClass: 'bg-amber-500',
        badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50',
      };
    case 'low':
      return {
        label: 'Низкий',
        dotClass: 'bg-slate-400',
        badgeClass: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50',
      };
  }
}

export function getCurrentDayKey(): DayOfWeek {
  const day = new Date().getDay(); // 0 is Sunday, 1 is Monday ...
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
      return 'thursday'; // Default to Thursday for demo viewing, or Monday
  }
}
