export type LessonType = 'lecture' | 'practice' | 'lab';

export type WeekType = 'odd' | 'even'; // odd = Числитель, even = Знаменатель

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Lesson {
  id: string;
  subject: string;
  type: LessonType;
  startTime: string; // "09:00"
  endTime: string;   // "10:35"
  room: string;      // "ауд. 312 (Гл. корпус)"
  teacher: string;   // "Иванов И.И."
  notes?: string;
  onlineLink?: string;
}

export type HomeworkStatus = 'pending' | 'in_progress' | 'urgent' | 'completed';

export interface HomeworkItem {
  id: string;
  subject: string;
  title: string;
  description: string;
  deadline: string; // ISO date "2026-10-31"
  assignedDate: string;
  status: HomeworkStatus;
  author: string; // e.g. "Староста" or "Алексей"
  attachmentName?: string;
}

export type TaskPriority = 'low' | 'medium' | 'high';

export interface PersonalTask {
  id: string;
  title: string;
  deadline?: string;
  completed: boolean;
  priority: TaskPriority;
  category?: 'Учёба' | 'Деканат' | 'Проект' | 'Личное';
  createdAt: string;
}

export type TabType = 'today' | 'schedule' | 'homework' | 'tasks';

export interface DaySchedule {
  day: DayOfWeek;
  dayName: string;
  shortName: string;
  dateStr: string;
  lessons: Lesson[];
}
