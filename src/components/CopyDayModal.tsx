import React, { useState } from 'react';
import { X, Copy, ArrowRight } from 'lucide-react';
import { DayOfWeek, WeekType } from '../types';
import { DAYS_OF_WEEK } from '../data/mockData';

interface CopyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDay: DayOfWeek;
  currentWeek: WeekType;
  onCopyDay: (params: {
    sourceDay: DayOfWeek;
    sourceWeek: 'odd' | 'even' | 'both';
    targetDay: DayOfWeek;
    targetWeek: 'odd' | 'even' | 'both';
  }) => void;
}

export const CopyDayModal: React.FC<CopyDayModalProps> = ({
  isOpen,
  onClose,
  currentDay,
  currentWeek,
  onCopyDay,
}) => {
  const [sourceDay, setSourceDay] = useState<DayOfWeek>(currentDay);
  const [sourceWeek, setSourceWeek] = useState<'odd' | 'even' | 'both'>(currentWeek);
  const [targetDay, setTargetDay] = useState<DayOfWeek>(currentDay === 'monday' ? 'tuesday' : 'monday');
  const [targetWeek, setTargetWeek] = useState<'odd' | 'even' | 'both'>(currentWeek === 'odd' ? 'even' : 'odd');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCopyDay({
      sourceDay,
      sourceWeek,
      targetDay,
      targetWeek,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Копировать расписание дня
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Позволяет быстро продублировать все пары из одного дня в другой день или перенести расписание с числителя на знаменатель.
          </p>

          {/* Source selection */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Откуда копировать:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1">День недели</label>
                <select
                  value={sourceDay}
                  onChange={(e) => setSourceDay(e.target.value as DayOfWeek)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.key} value={d.key}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1">Неделя</label>
                <select
                  value={sourceWeek}
                  onChange={(e) => setSourceWeek(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="odd">Числитель (I)</option>
                  <option value="even">Знаменатель (II)</option>
                  <option value="both">Обе недели</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center text-slate-400">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Target selection */}
          <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block mb-2">
              Куда вставить копии:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1">В какой день</label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(e.target.value as DayOfWeek)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d.key} value={d.key}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-300 block mb-1">На какую неделю</label>
                <select
                  value={targetWeek}
                  onChange={(e) => setTargetWeek(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <option value="odd">Числитель (I)</option>
                  <option value="even">Знаменатель (II)</option>
                  <option value="both">Обе недели</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Скопировать пары</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
