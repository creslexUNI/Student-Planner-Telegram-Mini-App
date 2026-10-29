/**
 * Unified API Client for Student Planner
 * Centralizes request handling, HTTP-only cookies credentials, and typed errors.
 */

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Ensures session_token cookie is transmitted
  });

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    data = { message: await response.text().catch(() => '') };
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Ошибка сервера (${response.status})`;
    throw new ApiError(errorMessage, response.status, data?.details);
  }

  return data as T;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  university?: string | null;
  faculty?: string | null;
  course?: number | null;
  groupName?: string | null;
  groups: {
    id: string;
    name: string;
    role: 'ADMIN' | 'HEADMAN' | 'MEMBER';
    inviteCode: string;
  }[];
}

export const authApi = {
  async register(params: {
    name: string;
    email: string;
    password: string;
    university?: string;
    faculty?: string;
    course?: number;
    groupName?: string;
    inviteCode?: string;
  }) {
    return request<{ message: string; user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async login(params: { email: string; password: string }) {
    return request<{ message: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async logout() {
    return request<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async getMe() {
    return request<{ user: AuthUser }>('/api/auth/me');
  },

  async updateProfile(params: {
    name?: string;
    university?: string | null;
    faculty?: string | null;
    course?: number | null;
    groupName?: string | null;
  }) {
    return request<{ message: string; user: AuthUser }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  },
};

// 2. Tasks API
export interface ApiTask {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  category?: string | null;
  deadline?: string | null;
  homework?: { id: string; subject: string; title: string } | null;
  createdAt: string;
}

export const tasksApi = {
  async getTasks(params?: { status?: 'all' | 'active' | 'completed'; category?: string }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.category) query.set('category', params.category);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ tasks: ApiTask[] }>(`/api/tasks${queryString}`);
  },

  async createTask(data: {
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    category?: string;
    deadline?: string;
    homeworkId?: string;
  }) {
    return request<{ message: string; task: ApiTask }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, updates: Partial<{
    title: string;
    description: string | null;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    category: string | null;
    deadline: string | null;
  }>) {
    return request<{ message: string; task: ApiTask }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteTask(id: string) {
    return request<{ message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};

// 3. Homework API
export interface ApiHomework {
  id: string;
  groupId: string;
  groupName?: string;
  subject: string;
  title: string;
  description: string;
  deadline: string;
  author: string;
  attachmentName?: string | null;
  status: 'pending' | 'in_progress' | 'urgent' | 'completed';
  createdAt?: string;
}

export const homeworkApi = {
  async getHomework(params?: { status?: string; subject?: string; groupId?: string }) {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.subject && params.subject !== 'all') query.set('subject', params.subject);
    if (params?.groupId) query.set('groupId', params.groupId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ homework: ApiHomework[] }>(`/api/homework${queryString}`);
  },

  async updateProgress(id: string, status: 'pending' | 'in_progress' | 'urgent' | 'completed') {
    return request<{ message: string; status: string }>(`/api/homework/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async convertToPersonalTask(id: string) {
    return request<{ message: string; task: any }>(`/api/homework/${id}/convert-to-task`, {
      method: 'POST',
    });
  },

  async createHomework(data: {
    groupId?: string;
    subject: string;
    title: string;
    description: string;
    deadline: string;
    attachmentName?: string;
  }) {
    return request<{ message: string; homework: ApiHomework }>('/api/homework', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateHomework(
    id: string,
    data: Partial<{
      subject: string;
      title: string;
      description: string;
      deadline: string;
      attachmentName: string | null;
    }>
  ) {
    return request<{ message: string; homework: ApiHomework }>(`/api/homework/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteHomework(id: string) {
    return request<{ message: string }>(`/api/homework/${id}`, {
      method: 'DELETE',
    });
  },
};

// 4. Schedule API
export interface ApiLesson {
  id: string;
  groupId?: string | null;
  userId?: string | null;
  subject: string;
  type: 'lecture' | 'practice' | 'lab';
  teacher: string;
  room: string;
  dayOfWeek: string;
  weekType: string;
  startTime: string;
  endTime: string;
  specificDate?: string | null;
  notes?: string | null;
}

export const scheduleApi = {
  async getSchedule(params?: { dayOfWeek?: string; weekType?: string; specificDate?: string; groupId?: string }) {
    const query = new URLSearchParams();
    if (params?.dayOfWeek) query.set('dayOfWeek', params.dayOfWeek);
    if (params?.weekType) query.set('weekType', params.weekType);
    if (params?.specificDate) query.set('specificDate', params.specificDate);
    if (params?.groupId) query.set('groupId', params.groupId);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<{ lessons: ApiLesson[] }>(`/api/schedule${queryString}`);
  },

  async getWeekSchedule(weekType: 'odd' | 'even') {
    return request<{ weekType: string; schedule: Record<string, ApiLesson[]> }>(
      `/api/schedule/week?weekType=${weekType}`
    );
  },

  async createLesson(data: {
    subject: string;
    type: 'lecture' | 'practice' | 'lab';
    teacher: string;
    room: string;
    dayOfWeek: string;
    weekType: 'odd' | 'even' | 'both';
    startTime: string;
    endTime: string;
    specificDate?: string | null;
    notes?: string;
    groupId?: string;
  }) {
    return request<{ message: string; lesson: ApiLesson }>('/api/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateLesson(id: string, updates: Partial<{
    subject: string;
    type: 'lecture' | 'practice' | 'lab';
    teacher: string;
    room: string;
    dayOfWeek: string;
    weekType: 'odd' | 'even' | 'both';
    startTime: string;
    endTime: string;
    specificDate: string | null;
    notes: string | null;
  }>) {
    return request<{ message: string; lesson: ApiLesson }>(`/api/schedule/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async duplicateLesson(id: string, data?: { targetDay?: string; targetWeek?: string; targetDate?: string | null }) {
    return request<{ message: string; lesson: ApiLesson }>(`/api/schedule/${id}/copy`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async copyDay(data: {
    sourceDay: string;
    sourceWeek: string;
    targetDay: string;
    targetWeek: string;
    groupId?: string;
  }) {
    return request<{ message: string; count: number; lessons: ApiLesson[] }>('/api/schedule/copy-day', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteLesson(id: string) {
    return request<{ message: string }>(`/api/schedule/${id}`, {
      method: 'DELETE',
    });
  },
};

// 5. Groups API
export interface ApiGroup {
  id: string;
  name: string;
  role: 'ADMIN' | 'HEADMAN' | 'MEMBER';
  inviteCode: string;
  memberCount: number;
  homeworkCount: number;
  lessonCount: number;
  joinedAt: string;
}

export const groupsApi = {
  async getGroups() {
    return request<{ groups: ApiGroup[] }>('/api/groups');
  },

  async createGroup(name: string) {
    return request<{ message: string; group: ApiGroup }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async joinGroup(inviteCode: string) {
    return request<{ message: string; group: ApiGroup }>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  },

  async leaveGroup(id: string) {
    return request<{ message: string }>(`/api/groups/${id}/leave`, {
      method: 'POST',
    });
  },
};

// 6. Health API
export const healthApi = {
  async getHealth() {
    return request<{
      status: string;
      timestamp: string;
      uptime: number;
      database: { connected: boolean; message: string };
    }>('/api/health');
  },
};
