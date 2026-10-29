import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, User, Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { DayOfWeek, Lesson, LessonType, WeekType } from '../types';
import { DAYS_OF_WEEK } from '../data/mockData';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLesson?: Lesson | null;
  defaultDay?: DayOfWeek;
  defaultWeek?: WeekType;
  onSave: (lessonData: {
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
}

export const LessonModal: React.FC<LessonModalProps> = ({
  isOpen,
  onClose,
  initialLesson,
  defaultDay = 'monday',
  defaultWeek = 'odd',
  onSave,
}) => {
  const [subject, setSubject] = useState('');
  const [type, setType] = useState<LessonType>('lecture');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(defaultDay);
  const [weekType, setWeekType] = useState<'odd' | 'even' | 'both'>('both');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:05');
  const [specificDate, setSpecificDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLesson) {
      setSubject(initialLesson.subject);
      setType(initialLesson.type);
      setTeacher(initialLesson.teacher);
      setRoom(initialLesson.room);
      setDayOfWeek(initialLesson.dayOfWeek || defaultDay);
      setWeekType(initialLesson.weekType || 'both');
      setStartTime(initialLesson.startTime);
      setEndTime(initialLesson.endTime);
      setSpecificDate(initialLesson.specificDate || '');
      setNotes(initialLesson.notes || '');
    } else {
      setSubject('');
      setType('lecture');
      setTeacher('');
      setRoom('');
      setDayOfWeek(defaultDay);
      setWeekType(defaultWeek);
      setStartTime('08:30');
      setEndTime('10:05');
      setSpecificDate('');
      setNotes('');
    }
    setError(null);
  }, [initialLesson, defaultDay, defaultWeek, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Укажите название предмета');
      return;
    }
    if (!startTime || !endTime) {
      setError('Укажите время начала и окончания пары');
      return;
    }
    if (startTime >= endTime) {
      setError('Время начала должно быть раньше времени окончания');
      return;
    }

    onSave({
      id: initialLesson?.id,
      subject: subject.trim(),
      type,
      teacher: teacher.trim() || 'Преподаватель не указан',
      room: room.trim() || 'Аудитория не указана',
      dayOfWeek,
      weekType,
      startTime,
      endTime,
      specificDate: specificDate ? specificDate : undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {initialLesson ? 'Редактирование занятия' : 'Добавить пару в расписание'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Название предмета *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Высшая математика"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Type of class */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Тип занятия
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'lecture' as LessonType, label: 'Лекция' },
                { id: 'practice' as LessonType, label: 'Семинар' },
                { id: 'lab' as LessonType, label: 'Лабораторная' },
              ].map((item) => {
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teacher and Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Преподаватель</span>
              </label>
              <input
                type="text"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                placeholder="доц. Иванов А.А."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Аудитория</span>
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="ауд. 312 (ГК)"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Start and End Time (Customizable!) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Время пары (любой интервал) *</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 mb-0.5 block">Начало</span>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold tabular-nums focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 mb-0.5 block">Окончание</span>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold tabular-nums focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Day of Week & Week Parity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                День недели *
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.name} ({d.short})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Чётность недели
              </label>
              <select
                value={weekType}
                onChange={(e) => setWeekType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              >
                <option value="both">Каждую неделю (все)</option>
                <option value="odd">Числитель (I неделя)</option>
                <option value="even">Знаменатель (II неделя)</option>
              </select>
            </div>
          </div>

          {/* Specific date (optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Конкретная дата (для разовых или перенесённых пар)</span>
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Заметки или ссылка на пару
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Например: подготовить отчёт №3, ссылка на Zoom/МТС Линк"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all active:scale-95"
            >
              {initialLesson ? 'Сохранить изменения' : 'Добавить занятие'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
