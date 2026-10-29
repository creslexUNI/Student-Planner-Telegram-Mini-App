import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  User,
  PlusCircle,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { HomeworkItem, HomeworkStatus } from '../types';
import { formatDeadlineRelative } from '../utils/formatters';
import { HomeworkModal } from './HomeworkModal';
import { ConfirmModal } from './ConfirmModal';

interface HomeworkViewProps {
  homeworkList: HomeworkItem[];
  onToggleStatus: (id: string) => void;
  onConvertToTask?: (id: string) => void;
  onSaveHomework?: (data: {
    id?: string;
    subject: string;
    title: string;
    description: string;
    deadline: string;
    attachmentName?: string;
  }) => void;
  onDeleteHomework?: (id: string) => void;
}

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  homeworkList,
  onToggleStatus,
  onConvertToTask,
  onSaveHomework,
  onDeleteHomework,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | HomeworkStatus>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<HomeworkItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Extract unique subjects
  const subjects = ['all', ...Array.from(new Set(homeworkList.map((h) => h.subject)))];

  const filteredList = homeworkList.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (selectedSubject !== 'all' && item.subject !== selectedSubject) return false;
    return true;
  });

  const handleDownloadAttachment = (fileName: string) => {
    setNotification(`Файл «${fileName}» сохранён в демонстрационном режиме`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleConvert = (id: string) => {
    if (onConvertToTask) {
      onConvertToTask(id);
      setNotification('Задание добавлено в список личных задач');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleOpenAdd = () => {
    setEditingHomework(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (hw: HomeworkItem) => {
    setEditingHomework(hw);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: HomeworkStatus) => {
    switch (status) {
      case 'urgent':
        return {
          label: 'Срочно',
          badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60',
        };
      case 'in_progress':
        return {
          label: 'В процессе',
          badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60',
        };
      case 'completed':
        return {
          label: 'Сдано',
          badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60',
        };
      case 'pending':
      default:
        return {
          label: 'Новое задание',
          badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Toast notification */}
      {notification && (
        <div className="p-3 bg-sky-600 text-white text-xs font-medium rounded-xl shadow-md transition-all flex items-center justify-between animate-in fade-in">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="underline text-[11px] ml-2">
            Закрыть
          </button>
        </div>
      )}

      {/* Header, Add button and Filter bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Домашние задания группы
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Общая база заданий с индивидуальным статусом сдачи
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSaveHomework && (
              <button
                onClick={handleOpenAdd}
                className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить ДЗ</span>
              </button>
            )}
            <span className="text-xs text-slate-400 hidden sm:inline">
              Показано: {filteredList.length} из {homeworkList.length}
            </span>
          </div>
        </div>

        {/* Filter by Status Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Все' },
            { id: 'urgent', label: 'Горящие' },
            { id: 'in_progress', label: 'В процессе' },
            { id: 'completed', label: 'Сдано' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as 'all' | HomeworkStatus)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Subject Filter selector if there are multiple subjects */}
        {subjects.length > 2 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Предмет:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="all">Все дисциплины</option>
              {subjects
                .filter((s) => s !== 'all')
                .map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Homework Cards List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Нет заданий по выбранным фильтрам
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Все дедлайны сданы или фильтр не вернул совпадений.
            </p>
            {onSaveHomework && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить задание</span>
              </button>
            )}
          </div>
        ) : (
          filteredList.map((hw) => {
            const relDeadline = formatDeadlineRelative(hw.deadline);
            const statusBadge = getStatusBadge(hw.status);

            return (
              <div
                key={hw.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Top: Subject + Status + Edit/Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                      {hw.subject}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                      {hw.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${statusBadge.badgeClass}`}
                    >
                      {statusBadge.label}
                    </span>

                    {onSaveHomework && (
                      <button
                        onClick={() => handleOpenEdit(hw)}
                        title="Редактировать задание"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteHomework && (
                      <button
                        onClick={() => setDeletingId(hw.id)}
                        title="Удалить задание"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                  {hw.description}
                </p>

                {/* Attachment if any */}
                {hw.attachmentName && (
                  <div className="mt-3">
                    <button
                      onClick={() => handleDownloadAttachment(hw.attachmentName!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span className="truncate">{hw.attachmentName}</span>
                    </button>
                  </div>
                )}

                {/* Bottom Meta & Interactive toggle */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Срок: {relDeadline.label} ({hw.deadline})</span>
                    </div>
                    <span aria-hidden="true">·</span>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{hw.author}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Convert to personal task button */}
                    {onConvertToTask && (
                      <button
                        onClick={() => handleConvert(hw.id)}
                        title="Создать отдельную личную задачу на основе этого задания"
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span className="hidden xs:inline">В мои дела</span>
                      </button>
                    )}

                    {/* Toggle student submission button */}
                    <button
                      onClick={() => onToggleStatus(hw.id)}
                      className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 ${
                        hw.status === 'completed'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {hw.status === 'completed' ? 'Вернуть в работу' : 'Сдать'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Homework Modal */}
      {onSaveHomework && (
        <HomeworkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialHomework={editingHomework}
          onSave={onSaveHomework}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        title="Удалить домашнее задание группы?"
        message="Вы уверены, что хотите удалить это задание для всей группы? Это действие нельзя отменить."
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        isDanger={true}
        onConfirm={() => {
          if (deletingId && onDeleteHomework) {
            onDeleteHomework(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
