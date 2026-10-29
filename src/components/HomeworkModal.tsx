import React, { useState, useEffect } from 'react';
import { X, Calendar, BookOpen, AlertCircle, Paperclip } from 'lucide-react';
import { HomeworkItem } from '../types';

interface HomeworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHomework?: HomeworkItem | null;
  onSave: (data: {
    id?: string;
    subject: string;
    title: string;
    description: string;
    deadline: string;
    attachmentName?: string;
  }) => void;
}

export const HomeworkModal: React.FC<HomeworkModalProps> = ({
  isOpen,
  onClose,
  initialHomework,
  onSave,
}) => {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialHomework) {
      setSubject(initialHomework.subject);
      setTitle(initialHomework.title);
      setDescription(initialHomework.description);
      setDeadline(initialHomework.deadline.slice(0, 10));
      setAttachmentName(initialHomework.attachmentName || '');
    } else {
      setSubject('');
      setTitle('');
      setDescription('');
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      setDeadline(defaultDate.toISOString().slice(0, 10));
      setAttachmentName('');
    }
    setError(null);
  }, [initialHomework, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Укажите название предмета');
      return;
    }
    if (!title.trim()) {
      setError('Укажите название задания');
      return;
    }
    if (!deadline) {
      setError('Укажите срок сдачи (дедлайн)');
      return;
    }

    onSave({
      id: initialHomework?.id,
      subject: subject.trim(),
      title: title.trim(),
      description: description.trim(),
      deadline,
      attachmentName: attachmentName.trim() || undefined,
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 overflow-hidden animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {initialHomework ? 'Редактировать задание группы' : 'Новое домашнее задание группы'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Учебная дисциплина *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Например: Базы данных"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Название задания *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Лабораторная работа №2"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Срок сдачи (дедлайн) *</span>
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Описание задания и требования
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите требования, варианты или вопросы для подготовки..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              <span>Имя методички или файла (опционально)</span>
            </label>
            <input
              type="text"
              value={attachmentName}
              onChange={(e) => setAttachmentName(e.target.value)}
              placeholder="metodichka_lab2.pdf"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
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
              className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all active:scale-95"
            >
              {initialHomework ? 'Сохранить изменения' : 'Опубликовать задание'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
