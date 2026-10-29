import React from 'react';
import { Home, Calendar, BookOpen, CheckSquare } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingHomeworkCount: number;
  incompleteTasksCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingHomeworkCount,
  incompleteTasksCount,
}) => {
  const tabs = [
    {
      id: 'today' as TabType,
      label: 'Сегодня',
      icon: Home,
    },
    {
      id: 'schedule' as TabType,
      label: 'Расписание',
      icon: Calendar,
    },
    {
      id: 'homework' as TabType,
      label: 'Общее ДЗ',
      icon: BookOpen,
      badge: pendingHomeworkCount > 0 ? pendingHomeworkCount : undefined,
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'tasks' as TabType,
      label: 'Мои дела',
      icon: CheckSquare,
      badge: incompleteTasksCount > 0 ? incompleteTasksCount : undefined,
      badgeColor: 'bg-sky-500',
    },
  ];

  return (
    <>
      {/* Desktop & Tablet Top Navigation Tabs */}
      <nav aria-label="Разделы приложения" className="hidden sm:block max-w-4xl mx-auto px-4 pt-4">
        <div className="flex p-1 bg-slate-200/70 dark:bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex-1 min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className="truncate">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold text-white rounded-full ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Мобильная навигация"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800/90 transition-colors duration-200 pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative min-h-[48px] flex flex-col items-center justify-center py-1 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-sky-500 rounded-lg ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                    }`}
                  />
                  {tab.badge !== undefined && (
                    <span
                      className={`absolute -top-1.5 -right-3 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full ${tab.badgeColor}`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[11px] mt-1 font-medium tracking-tight ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sky-600 dark:bg-sky-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
