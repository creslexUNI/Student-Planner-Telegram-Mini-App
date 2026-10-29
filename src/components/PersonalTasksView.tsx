import React, { useState } from 'react';
import { Plus, CheckCircle2, Clock, Trash2, Calendar, Tag } from 'lucide-react';
import { PersonalTask, TaskPriority } from '../types';
import { formatDeadlineRelative, getPriorityMeta } from '../utils/formatters';
import { TaskModal } from './TaskModal';

interface PersonalTasksViewProps {
  tasks: PersonalTask[];
  onToggleTask: (id: string) => void;
  onAddTask: (task: {
    title: string;
    deadline?: string;
    priority: TaskPriority;
    category?: 'Учёба' | 'Деканат' | 'Проект' | 'Личное';
  }) => void;
  onDeleteTask: (id: string) => void;
}

export const PersonalTasksView: React.FC<PersonalTasksViewProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="space-y-4 pb-6">
      {/* Top Card: Progress and Add CTA */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Личные задачи и дела
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Индивидуальный трекер учебных и бытовых задач
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Новая задача</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
            <span>Прогресс выполнения:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {completedCount} из {totalCount} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: `Все (${totalCount})` },
            { id: 'active', label: `Активные (${totalCount - completedCount})` },
            { id: 'completed', label: `Завершённые (${completedCount})` },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as 'all' | 'active' | 'completed')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Задач в этом списке нет
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Нажмите «Новая задача», чтобы добавить дело или напоминание.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityMeta = getPriorityMeta(task.priority);
            const relDeadline = task.deadline ? formatDeadlineRelative(task.deadline) : null;

            return (
              <div
                key={task.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border transition-all ${
                  task.completed
                    ? 'border-slate-100 dark:border-slate-800/60 opacity-80 bg-slate-50/50 dark:bg-slate-900/40'
                    : 'border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Big Checkbox hitbox */}
                  <button
                    onClick={() => onToggleTask(task.id)}
                    aria-label={task.completed ? 'Отметить задачу как незавершённую' : 'Отметить задачу как выполненную'}
                    className={`min-h-[32px] min-w-[32px] mt-0.5 flex items-center justify-center rounded-xl border transition-all shrink-0 ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-600 hover:border-sky-500 bg-white dark:bg-slate-800'
                    }`}
                  >
                    {task.completed && <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />}
                  </button>

                  {/* Task Info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium leading-snug transition-all ${
                        task.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2 text-xs">
                      {/* Priority */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${priorityMeta.badgeClass}`}>
                        {priorityMeta.label}
                      </span>

                      {/* Category if any */}
                      {task.category && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                          <span>{task.category}</span>
                        </span>
                      )}

                      {/* Deadline if specified */}
                      {task.deadline && relDeadline && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                            relDeadline.isUrgent && !task.completed
                              ? 'text-rose-600 dark:text-rose-400 font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{relDeadline.label} ({task.deadline})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    aria-label="Удалить задачу"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for creating a task */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddTask={onAddTask}
      />
    </div>
  );
};
