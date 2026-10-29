import React from 'react';
import { Clock, MapPin, User, ChevronRight, CheckCircle2, AlertCircle, Calendar, ArrowRight, BookOpen, CheckSquare } from 'lucide-react';
import { HomeworkItem, Lesson, PersonalTask, TabType, WeekType } from '../types';
import { formatDeadlineRelative, getLessonTypeInfo } from '../utils/formatters';

interface TodayViewProps {
  currentWeek: WeekType;
  todayLessons: Lesson[];
  urgentHomework: HomeworkItem[];
  personalTasks: PersonalTask[];
  onToggleTask: (id: string) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  currentWeek,
  todayLessons,
  urgentHomework,
  personalTasks,
  onToggleTask,
  onNavigateTab,
}) => {
  const incompleteTasks = personalTasks.filter((t) => !t.completed);
  const nextLesson = todayLessons.length > 0 ? todayLessons[0] : null;

  return (
    <div className="space-y-5 pb-6">
      {/* Greeting & Quick Stats */}
      <section className="bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-500/15 dark:via-sky-950/20 dark:to-transparent rounded-2xl p-4 sm:p-5 border border-sky-100 dark:border-sky-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Сегодня в расписании
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
              {currentWeek === 'odd' ? 'Числитель' : 'Знаменатель'} • {todayLessons.length} {todayLessons.length === 1 ? 'пара' : todayLessons.length < 5 ? 'пары' : 'пар'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('schedule')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white transition-all shadow-xs"
            >
              <span>Всё расписание</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 pt-4 border-t border-sky-200/50 dark:border-sky-800/40">
          <div
            onClick={() => onNavigateTab('schedule')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigateTab('schedule')}
            className="p-2.5 sm:p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
              <Calendar className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="truncate">Пар сегодня</span>
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {todayLessons.length}
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('homework')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigateTab('homework')}
            className="p-2.5 sm:p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Дедлайны ДЗ</span>
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {urgentHomework.length}
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('tasks')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onNavigateTab('tasks')}
            className="p-2.5 sm:p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">Личные дела</span>
            </div>
            <div className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {incompleteTasks.length}
            </div>
          </div>
        </div>
      </section>

      {/* Featured / Next Class Spotlight */}
      {nextLesson && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Ближайшая пара
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
              {nextLesson.startTime} – {nextLesson.endTime}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border ${
                    getLessonTypeInfo(nextLesson.type).bgClass
                  } ${getLessonTypeInfo(nextLesson.type).textClass} ${
                    getLessonTypeInfo(nextLesson.type).borderClass
                  }`}
                >
                  {getLessonTypeInfo(nextLesson.type).label}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {nextLesson.subject}
                </h2>
              </div>

              {nextLesson.notes && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  💡 {nextLesson.notes}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-700 dark:text-slate-300">{nextLesson.room}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{nextLesson.teacher}</span>
            </div>
          </div>
        </section>
      )}

      {/* Today's Schedule Overview List */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Порядок пар на сегодня
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('schedule')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-0.5"
          >
            <span>На неделю</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayLessons.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
            Пар на сегодня нет! Отличное время для отдыха или подготовки к проектам. 🎉
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todayLessons.map((lesson, idx) => {
              const typeMeta = getLessonTypeInfo(lesson.type);
              return (
                <div key={lesson.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                  {/* Time column */}
                  <div className="w-16 sm:w-20 shrink-0 text-left">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block tabular-nums">
                      {lesson.startTime}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block tabular-nums">
                      {lesson.endTime}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                      #{idx + 1} пара
                    </span>
                  </div>

                  {/* Divider line / pill */}
                  <div className="w-1 self-stretch rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />

                  {/* Subject and location details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {lesson.subject}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-medium rounded ${typeMeta.bgClass} ${typeMeta.textClass}`}
                      >
                        {typeMeta.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{lesson.room}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{lesson.teacher}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Split Section: Urgent Homework & Quick Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Urgent Group Homework */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ближайшие дедлайны ДЗ
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('homework')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Все ({urgentHomework.length})
            </button>
          </div>

          {urgentHomework.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
              Нет горящих дедлайнов
            </p>
          ) : (
            <div className="space-y-2.5">
              {urgentHomework.slice(0, 3).map((hw) => {
                const rel = formatDeadlineRelative(hw.deadline);
                return (
                  <div
                    key={hw.id}
                    onClick={() => onNavigateTab('homework')}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 truncate">
                        {hw.subject}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          rel.isUrgent
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {rel.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 dark:text-slate-200 line-clamp-1 mt-1">
                      {hw.title}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Personal Tasks Preview */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Мои задачи на сегодня
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('tasks')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Все задачи
            </button>
          </div>

          {personalTasks.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
              Список задач пуст
            </p>
          ) : (
            <div className="space-y-2">
              {personalTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <button
                    onClick={() => onToggleTask(task.id)}
                    aria-label={task.completed ? 'Отметить невыполненной' : 'Отметить выполненной'}
                    className={`min-h-[28px] min-w-[28px] flex items-center justify-center rounded-lg border transition-all ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-4 h-4" />}
                  </button>
                  <span
                    className={`text-xs font-medium truncate flex-1 ${
                      task.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
