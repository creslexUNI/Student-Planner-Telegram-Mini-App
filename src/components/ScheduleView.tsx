import React from 'react';
import { MapPin, User, Clock, AlertCircle } from 'lucide-react';
import { DayOfWeek, Lesson, WeekType } from '../types';
import { DAYS_OF_WEEK } from '../data/mockData';
import { getLessonTypeInfo } from '../utils/formatters';

interface ScheduleViewProps {
  currentWeek: WeekType;
  onChangeWeek: (week: WeekType) => void;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  lessons: Lesson[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentWeek,
  onChangeWeek,
  selectedDay,
  onSelectDay,
  lessons,
}) => {
  return (
    <div className="space-y-4 pb-6">
      {/* Top Controls: Numerator / Denominator Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Расписание занятий
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Двухнедельный цикл пар
            </p>
          </div>

          {/* Segmented Week Parity Toggle */}
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60 self-start sm:self-auto">
            <button
              onClick={() => onChangeWeek('odd')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentWeek === 'odd'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Числитель (I)
            </button>
            <button
              onClick={() => onChangeWeek('even')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                currentWeek === 'even'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Знаменатель (II)
            </button>
          </div>
        </div>

        {/* Days of Week Horizontal Selector */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = selectedDay === day.key;
              return (
                <button
                  key={day.key}
                  onClick={() => onSelectDay(day.key)}
                  className={`min-h-[48px] py-2 px-1 flex flex-col items-center justify-center rounded-xl transition-all text-center focus-visible:outline-2 focus-visible:outline-sky-500 ${
                    isSelected
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'text-sky-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {day.short}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold mt-0.5 truncate max-w-full">
                    {day.name.slice(0, 3)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="space-y-3">
        {lessons.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              В этот день занятий нет
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              В расписании для выбранного дня недели нет запланированных пар.
            </p>
          </div>
        ) : (
          lessons.map((lesson, idx) => {
            const typeMeta = getLessonTypeInfo(lesson.type);
            return (
              <div
                key={lesson.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      #{idx + 1} пара
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${typeMeta.bgClass} ${typeMeta.textClass} ${typeMeta.borderClass}`}
                    >
                      {typeMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    <span>{lesson.startTime} – {lesson.endTime}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {lesson.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{lesson.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{lesson.teacher}</span>
                    </div>
                  </div>

                  {lesson.notes && (
                    <div className="mt-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1.5">Примечание:</span>
                      {lesson.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
