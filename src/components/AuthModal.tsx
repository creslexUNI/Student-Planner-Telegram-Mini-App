import React, { useState } from 'react';
import { X, LogIn, UserPlus, LogOut, Users, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthUser } from '../api/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (data: { name: string; email: string; password: string; groupName?: string; inviteCode?: string }) => Promise<void>;
  onLogout: () => Promise<void>;
  onJoinGroup?: (code: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onRegister,
  onLogout,
  onJoinGroup,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [groupName, setGroupName] = useState('ИВТ-21');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await onLogin(email, password);
        onClose();
      } else if (mode === 'register') {
        await onRegister({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          groupName: groupName.trim() || undefined,
          inviteCode: inviteCode.trim().toUpperCase() || undefined,
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const demoEmail = 'student@study.edu';
      const demoPass = 'student123';
      try {
        await onLogin(demoEmail, demoPass);
        onClose();
      } catch {
        // If demo user doesn't exist yet, register it!
        await onRegister({
          name: 'Александр Студент',
          email: demoEmail,
          password: demoPass,
          groupName: 'ИВТ-21',
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить демо-вход');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onJoinGroup || !joinCodeInput.trim()) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await onJoinGroup(joinCodeInput.trim().toUpperCase());
      setSuccess('Вы успешно присоединились к группе!');
      setJoinCodeInput('');
    } catch (err: any) {
      setError(err.message || 'Не удалось присоединиться к группе');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {currentUser
                ? 'Профиль студента'
                : mode === 'login'
                ? 'Вход в Student Planner'
                : 'Регистрация аккаунта'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

        {success && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {currentUser ? (
          /* Profile view for logged-in user */
          <div className="mt-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">Авторизованный пользователь</div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">{currentUser.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">{currentUser.email}</div>
            </div>

            {/* Groups */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Ваши учебные группы</span>
                </span>
              </div>

              {currentUser.groups.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Вы пока не состоите ни в одной учебной группе.</p>
              ) : (
                <div className="space-y-2">
                  {currentUser.groups.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{g.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Роль: {g.role === 'ADMIN' ? 'Администратор' : g.role === 'HEADMAN' ? 'Староста' : 'Студент'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Код приглашения:</span>
                        <code className="px-1.5 py-0.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-300">
                          {g.inviteCode}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Join group form */}
            {onJoinGroup && (
              <form onSubmit={handleJoin} className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Присоединиться к другой группе по коду</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="Например: A1B2C3"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !joinCodeInput.trim()}
                    className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50"
                  >
                    Вступить
                  </button>
                </div>
              </form>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Выйти из аккаунта</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          /* Login / Register Form */
          <div className="mt-4">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Регистрация
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Имя и фамилия *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Александр Смирнов"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email адрес *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Пароль *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Создать группу:
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="ИВТ-21"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Или код приглашения:
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="XXXXXX"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isLoading ? 'Обработка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</span>
                </button>
              </div>

              {/* Quick Demo Test Access Button */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  disabled={isLoading}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  ⚡ Быстрый демонстрационный вход (Студент ИВТ-21)
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
