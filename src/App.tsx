import React, { useState, useEffect } from 'react';
import { DayOfWeek, HomeworkItem, PersonalTask, TabType, TaskPriority, WeekType } from './types';
import { MOCK_HOMEWORK, MOCK_PERSONAL_TASKS, MOCK_SCHEDULE } from './data/mockData';
import { getCurrentDayKey } from './utils/formatters';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TodayView } from './components/TodayView';
import { ScheduleView } from './components/ScheduleView';
import { HomeworkView } from './components/HomeworkView';
import { PersonalTasksView } from './components/PersonalTasksView';

export default function App() {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('student_planner_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Week parity state (odd = числитель, even = знаменатель)
  const [currentWeek, setCurrentWeek] = useState<WeekType>(() => {
    const saved = localStorage.getItem('student_planner_week');
    return saved === 'even' ? 'even' : 'odd';
  });

  // Current selected schedule day
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => getCurrentDayKey());

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // Homework state with localStorage sync
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(() => {
    const saved = localStorage.getItem('student_planner_homework');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse homework from localStorage', e);
      }
    }
    return MOCK_HOMEWORK;
  });

  // Personal tasks state with localStorage sync
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(() => {
    const saved = localStorage.getItem('student_planner_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tasks from localStorage', e);
      }
    }
    return MOCK_PERSONAL_TASKS;
  });

  // Synchronize theme with document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('student_planner_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('student_planner_theme', 'light');
    }
  }, [isDark]);

  // Synchronize week parity
  useEffect(() => {
    localStorage.setItem('student_planner_week', currentWeek);
  }, [currentWeek]);

  // Synchronize tasks
  useEffect(() => {
    localStorage.setItem('student_planner_tasks', JSON.stringify(personalTasks));
  }, [personalTasks]);

  // Synchronize homework
  useEffect(() => {
    localStorage.setItem('student_planner_homework', JSON.stringify(homeworkList));
  }, [homeworkList]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleToggleWeek = () => {
    setCurrentWeek((prev) => (prev === 'odd' ? 'even' : 'odd'));
  };

  const handleToggleTask = (id: string) => {
    setPersonalTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (newTask: {
    title: string;
    deadline?: string;
    priority: TaskPriority;
    category?: 'Учёба' | 'Деканат' | 'Проект' | 'Личное';
  }) => {
    const task: PersonalTask = {
      id: `task-${Date.now()}`,
      title: newTask.title,
      deadline: newTask.deadline,
      priority: newTask.priority,
      category: newTask.category,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setPersonalTasks((prev) => [task, ...prev]);
  };

  const handleDeleteTask = (id: string) => {
    setPersonalTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleHomeworkStatus = (id: string) => {
    setHomeworkList((prev) =>
      prev.map((hw) => {
        if (hw.id === id) {
          const newStatus = hw.status === 'completed' ? 'in_progress' : 'completed';
          return { ...hw, status: newStatus };
        }
        return hw;
      })
    );
  };

  // Lessons for today and for the schedule view
  const currentDayKey = getCurrentDayKey();
  const todayLessons = MOCK_SCHEDULE[currentWeek][currentDayKey] || [];
  const scheduleLessons = MOCK_SCHEDULE[currentWeek][selectedDay] || [];

  // Urgent homework
  const urgentHomework = homeworkList.filter((hw) => hw.status !== 'completed');
  const incompleteTasksCount = personalTasks.filter((t) => !t.completed).length;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 antialiased">
      {/* Top Header */}
      <Header
        currentWeek={currentWeek}
        onToggleWeek={handleToggleWeek}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Navigation (Tabs for Desktop) */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingHomeworkCount={urgentHomework.length}
        incompleteTasksCount={incompleteTasksCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:px-6 mb-16 sm:mb-6">
        {activeTab === 'today' && (
          <TodayView
            currentWeek={currentWeek}
            todayLessons={todayLessons}
            urgentHomework={urgentHomework}
            personalTasks={personalTasks}
            onToggleTask={handleToggleTask}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleView
            currentWeek={currentWeek}
            onChangeWeek={setCurrentWeek}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            lessons={scheduleLessons}
          />
        )}

        {activeTab === 'homework' && (
          <HomeworkView
            homeworkList={homeworkList}
            onToggleStatus={handleToggleHomeworkStatus}
          />
        )}

        {activeTab === 'tasks' && (
          <PersonalTasksView
            tasks={personalTasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
      </main>
    </div>
  );
}
