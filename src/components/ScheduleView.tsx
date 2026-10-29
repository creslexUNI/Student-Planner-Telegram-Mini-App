import React, { useState } from 'react';
import {
  MapPin,
  User,
  Clock,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Copy,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { DayOfWeek, Lesson, LessonType, WeekType } from '../types';
import { DAYS_OF_WEEK } from '../data/mockData';
import { getLessonTypeInfo } from '../utils/formatters';
import { LessonModal } from './LessonModal';
import { CopyDayModal } from './CopyDayModal';
import { ConfirmModal } from './ConfirmModal';

interface ScheduleViewProps {
  currentWeek: WeekType;
  onChangeWeek: (week: WeekType) => void;
  selectedDay: DayOfWeek;
  onSelectDay: (day: DayOfWeek) => void;
  lessons: Lesson[];
  allWeekSchedule?: Record<DayOfWeek, Lesson[]>;
  onSaveLesson: (lessonData: {
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
  }) => void;
  onDuplicateLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onCopyDay: (params: {
    sourceDay: DayOfWeek;
    sourceWeek: 'odd' | 'even' | 'both';
    targetDay: DayOfWeek;
    targetWeek: 'odd' | 'even' | 'both';
  }) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  currentWeek,
  onChangeWeek,
  selectedDay,
  onSelectDay,
  lessons,
  allWeekSchedule,
  onSaveLesson,
  onDuplicateLesson,
  onDeleteLesson,
  onCopyDay,
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isCopyDayModalOpen, setIsCopyDayModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingLesson(null);
    setIsLessonModalOpen(true);
  };

  const handleOpenEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsLessonModalOpen(true);
  };

  const renderLessonCard = (lesson: Lesson, idx: number) => {
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
            {lesson.specificDate && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                Дата: {lesson.specificDate}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>{lesson.startTime} – {lesson.endTime}</span>
            </div>

            {/* Action buttons: Edit, Duplicate, Delete */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDuplicateLesson(lesson)}
                title="Дублировать пару"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleOpenEdit(lesson)}
                title="Редактировать пару"
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDeletingLessonId(lesson.id)}
                title="Удалить пару"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
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
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Controls: Numerator / Denominator Switcher & Action buttons */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Расписание занятий
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Редактор пар, аудиторий и времени
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* View Mode: Day vs Full Week */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <button
                onClick={() => setViewMode('day')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'day'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>День</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Вся неделя</span>
              </button>
            </div>

            {/* Parity Switcher */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <button
                onClick={() => onChangeWeek('odd')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  currentWeek === 'odd'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Числитель
              </button>
              <button
                onClick={() => onChangeWeek('even')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  currentWeek === 'even'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Знаменатель
              </button>
            </div>
          </div>
        </div>

        {/* Action Row: Add lesson, Copy Day */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить пару</span>
            </button>
            <button
              onClick={() => setIsCopyDayModalOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/60 dark:border-slate-700/60 transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Копировать день</span>
            </button>
          </div>

          <span className="text-xs text-slate-500">
            {viewMode === 'day' ? `Пар: ${lessons.length}` : 'Расписание на 6 дней'}
          </span>
        </div>

        {/* Days of Week Horizontal Selector (visible in day view) */}
        {viewMode === 'day' && (
          <div className="pt-2">
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
        )}
      </div>

      {/* Main Schedule Content: Day View or Full Week View */}
      {viewMode === 'day' ? (
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
                Нажмите «Добавить пару», чтобы создать занятие, или скопируйте расписание с другого дня.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить пару</span>
              </button>
            </div>
          ) : (
            lessons.map((lesson, idx) => renderLessonCard(lesson, idx))
          )}
        </div>
      ) : (
        /* Full Week View (Monday to Saturday) */
        <div className="space-y-6">
          {DAYS_OF_WEEK.map((day) => {
            const dayLessons = allWeekSchedule?.[day.key] || [];
            return (
              <div key={day.key} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {day.name} ({day.short})
                  </h3>
                  <button
                    onClick={() => {
                      onSelectDay(day.key);
                      setViewMode('day');
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    Перейти к дню ({dayLessons.length})
                  </button>
                </div>

                {dayLessons.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center text-xs text-slate-400">
                    Пар нет
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {dayLessons.map((lesson, idx) => renderLessonCard(lesson, idx))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson Modal (Add/Edit) */}
      <LessonModal
        isOpen={isLessonModalOpen}
        onClose={() => setIsLessonModalOpen(false)}
        initialLesson={editingLesson}
        defaultDay={selectedDay}
        defaultWeek={currentWeek}
        onSave={onSaveLesson}
      />

      {/* Copy Day Modal */}
      <CopyDayModal
        isOpen={isCopyDayModalOpen}
        onClose={() => setIsCopyDayModalOpen(false)}
        currentDay={selectedDay}
        currentWeek={currentWeek}
        onCopyDay={onCopyDay}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingLessonId)}
        title="Удалить занятие?"
        message="Вы уверены, что хотите удалить эту пару из расписания? Это действие нельзя будет отменить."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        isDanger={true}
        onConfirm={() => {
          if (deletingLessonId) {
            onDeleteLesson(deletingLessonId);
            setDeletingLessonId(null);
          }
        }}
        onCancel={() => setDeletingLessonId(null)}
      />
    </div>
  );
};
