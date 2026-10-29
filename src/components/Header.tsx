import React from 'react';
import { Moon, Sun, Repeat, UserCircle, LogIn, Database } from 'lucide-react';
import { WeekType } from '../types';
import { formatDateRussian } from '../utils/formatters';
import { AuthUser } from '../api/client';

interface HeaderProps {
  currentWeek: WeekType;
  onToggleWeek: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  isDbConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentWeek,
  onToggleWeek,
  isDark,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  isDbConnected = false,
}) => {
  const todayFormatted = formatDateRussian();
  const currentGroup = currentUser?.groups?.[0];

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Left: App title & group info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-50 truncate">
                Student Planner
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                {currentGroup ? currentGroup.name : 'ИВТ-21'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {todayFormatted}
            </p>
          </div>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Week Parity Toggle */}
            <button
              onClick={onToggleWeek}
              title="Переключить числитель / знаменатель"
              aria-label="Переключить числитель / знаменатель"
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200/60 dark:border-slate-700/60 focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              <Repeat className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden xs:inline">{currentWeek === 'odd' ? 'Числитель' : 'Знаменатель'}</span>
              <span className="xs:hidden">{currentWeek === 'odd' ? 'I' : 'II'}</span>
            </button>

            {/* User Account / Login button */}
            <button
              onClick={onOpenAuth}
              title={currentUser ? `Профиль: ${currentUser.name}` : 'Войти в аккаунт'}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 transition-colors border border-sky-200/60 dark:border-sky-800/60"
            >
              {currentUser ? (
                <>
                  <UserCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="max-w-[80px] sm:max-w-[120px] truncate">{currentUser.name.split(' ')[0]}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Вход</span>
                </>
              )}
            </button>

            {/* Dark/Light mode toggle */}
            <button
              onClick={onToggleTheme}
              title={isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
              aria-label="Переключить тему оформления"
              className="min-w-[40px] min-h-[40px] p-2 inline-flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200/60 dark:border-slate-700/60 focus-visible:outline-2 focus-visible:outline-sky-500"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
