import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  Building,
  Users,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Moon,
  Sun,
  Repeat,
  RefreshCw,
  LogOut,
  Key,
} from 'lucide-react';
import { AuthUser } from '../api/client';
import { WeekType } from '../types';

interface SettingsViewProps {
  currentUser: AuthUser | null;
  currentWeek: WeekType;
  onToggleWeek: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  dbHealth: { connected: boolean; message: string } | null;
  onRefreshHealth: () => void;
  onUpdateProfile: (data: {
    name?: string;
    university?: string | null;
    faculty?: string | null;
    course?: number | null;
    groupName?: string | null;
  }) => Promise<void>;
  onOpenAuth: () => void;
  onLogout: () => Promise<void>;
  onJoinGroup?: (code: string) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  currentWeek,
  onToggleWeek,
  isDark,
  onToggleTheme,
  dbHealth,
  onRefreshHealth,
  onUpdateProfile,
  onOpenAuth,
  onLogout,
  onJoinGroup,
}) => {
  const [name, setName] = useState(currentUser?.name || '');
  const [university, setUniversity] = useState(currentUser?.university || '');
  const [faculty, setFaculty] = useState(currentUser?.faculty || '');
  const [course, setCourse] = useState<number>(currentUser?.course || 2);
  const [groupName, setGroupName] = useState(currentUser?.groupName || 'ИВТ-21');
  const [joinCode, setJoinCode] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setUniversity(currentUser.university || '');
      setFaculty(currentUser.faculty || '');
      setCourse(currentUser.course || 2);
      setGroupName(currentUser.groupName || currentUser.groups?.[0]?.name || 'ИВТ-21');
    } else {
      const savedProfile = localStorage.getItem('student_planner_local_profile');
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setName(parsed.name || '');
          setUniversity(parsed.university || '');
          setFaculty(parsed.faculty || '');
          setCourse(parsed.course || 2);
          setGroupName(parsed.groupName || 'ИВТ-21');
        } catch {}
      }
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      if (currentUser) {
        await onUpdateProfile({
          name: name.trim(),
          university: university.trim() || null,
          faculty: faculty.trim() || null,
          course: Number(course) || null,
          groupName: groupName.trim() || null,
        });
      } else {
        localStorage.setItem(
          'student_planner_local_profile',
          JSON.stringify({
            name: name.trim(),
            university: university.trim(),
            faculty: faculty.trim(),
            course: Number(course),
            groupName: groupName.trim(),
          })
        );
      }
      setSaveSuccess('Настройки профиля успешно сохранены!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Не удалось сохранить настройки');
    } finally {
      setIsSaving(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onJoinGroup || !joinCode.trim()) return;
    try {
      await onJoinGroup(joinCode.trim().toUpperCase());
      setSaveSuccess('Вы успешно присоединились к группе!');
      setJoinCode('');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Ошибка вступления в группу');
    }
  };

  return (
    <div className="space-y-4 pb-8 max-w-2xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Настройки приложения
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Персонализация профиля студента, вуза, группы и параметров расписания
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 1. Student Profile & University */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Учебные данные студента
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Имя и фамилия</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Алексей Смирнов"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Университет / Вуз</span>
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="МГТУ им. Баумана"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Факультет / Институт
              </label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="Информатика и системы"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Курс обучения
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              >
                <option value={1}>1 курс (Бакалавриат)</option>
                <option value={2}>2 курс (Бакалавриат)</option>
                <option value={3}>3 курс (Бакалавриат)</option>
                <option value={4}>4 курс (Бакалавриат)</option>
                <option value={5}>1 курс (Магистратура)</option>
                <option value={6}>2 курс (Магистратура)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Учебная группа</span>
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="ИВТ-21 или оставьте пустым"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Если группа не указана, вы работаете в персональном режиме.
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Сохранение...' : 'Сохранить профиль'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* 2. Group Management (Invites & Server Groups) */}
      {currentUser && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Связь с учебной группой
            </h2>
          </div>

          {currentUser.groups.length > 0 ? (
            <div className="space-y-2">
              {currentUser.groups.map((g) => (
                <div
                  key={g.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{g.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Ваша роль: {g.role === 'ADMIN' ? 'Администратор' : g.role === 'HEADMAN' ? 'Староста' : 'Студент'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Инвайт-код:</span>
                    <code className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {g.inviteCode}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-1">
              Вы работаете без подключённой серверной группы. Все ваши задания и расписание приватны.
            </p>
          )}

          {/* Join by code form */}
          {onJoinGroup && (
            <form onSubmit={handleJoin} className="pt-2 flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ввести инвайт-код группы"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono uppercase focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 disabled:opacity-50 transition-colors"
              >
                Вступить
              </button>
            </form>
          )}
        </section>
      )}

      {/* 3. Parity & App Appearance */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
          Параметры отображения
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Week parity switcher */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">Чётность недели</span>
              <span className="text-[11px] text-slate-500">
                {currentWeek === 'odd' ? 'Числитель (I неделя)' : 'Знаменатель (II неделя)'}
              </span>
            </div>
            <button
              onClick={onToggleWeek}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Сменить
            </button>
          </div>

          {/* Theme switcher */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">Тема оформления</span>
              <span className="text-[11px] text-slate-500">
                {isDark ? 'Тёмная (Telegram Dark)' : 'Светлая тема'}
              </span>
            </div>
            <button
              onClick={onToggleTheme}
              className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isDark ? 'Включить светлую' : 'Включить тёмную'}
            </button>
          </div>
        </div>
      </section>

      {/* 4. Backend & Database Status */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Статус сервера и базы данных
            </h2>
          </div>
          <button
            onClick={onRefreshHealth}
            title="Проверить статус подключения"
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Обновить</span>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                dbHealth?.connected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {dbHealth?.connected
                ? 'База данных PostgreSQL подключена'
                : 'Автономный режим (локальное хранилище)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {dbHealth?.message || 'Проверка соединения с бэкендом...'}
          </p>
        </div>
      </section>

      {/* 5. Account Switch / Logout */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
            {currentUser ? `Вы вошли как ${currentUser.name}` : 'Вы используете гостевой режим'}
          </span>
          <span className="text-[11px] text-slate-500">
            {currentUser ? currentUser.email : 'Войдите для синхронизации между устройствами'}
          </span>
        </div>

        {currentUser ? (
          <button
            onClick={onLogout}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Выйти</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
          >
            Войти / Регистрация
          </button>
        )}
      </section>
    </div>
  );
};
