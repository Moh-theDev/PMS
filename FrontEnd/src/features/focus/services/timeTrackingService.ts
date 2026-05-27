import { api } from '@/api/axios';

export interface TimeEntry {
  id: number;
  taskId: number;
  isPaused: boolean;
  accumulatedSeconds: number;
  startedAt: string;
  currentSeconds: number;
  createdAt: string;
  endedAt?: string | null;
  errors?: string[];
}

/**
 * Fetches the currently running/active timer session for the user.
 * Returns null if no active timer is running.
 */
export async function getActiveTimer(): Promise<TimeEntry | null> {
  try {
    const res = await api.get<TimeEntry>('/TimeTracking/active');
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Starts a new time-tracking session for a task.
 */
export async function startTimer(taskId: number): Promise<TimeEntry> {
  const res = await api.post<TimeEntry>(`/TimeTracking/start?taskId=${taskId}`);
  return res.data;
}

/**
 * Pauses an active time-tracking session.
 */
export async function pauseTimer(entryId: number): Promise<TimeEntry> {
  const res = await api.post<TimeEntry>(`/TimeTracking/${entryId}/pause`);
  return res.data;
}

/**
 * Resumes a paused time-tracking session.
 */
export async function resumeTimer(entryId: number): Promise<TimeEntry> {
  const res = await api.post<TimeEntry>(`/TimeTracking/${entryId}/resume`);
  return res.data;
}

/**
 * Stops a time-tracking session, completing the task.
 */
export async function stopTimer(entryId: number): Promise<TimeEntry> {
  const res = await api.post<TimeEntry>(`/TimeTracking/${entryId}/stop`);
  return res.data;
}

/**
 * Gets all sessions recorded for a specific task.
 */
export async function getTaskSessions(taskId: number): Promise<TimeEntry[]> {
  const res = await api.get<TimeEntry[]>(`/TimeTracking/tasks/${taskId}/sessions`);
  return res.data;
}

/**
 * Gets the total seconds tracked for a specific task.
 */
export async function getTaskTotalSeconds(taskId: number): Promise<number> {
  const res = await api.get<number>(`/TimeTracking/tasks/${taskId}/sum`);
  return res.data;
}

/**
 * Gets all time tracking sessions for the current user across all tasks.
 * Returns an empty array if no sessions exist.
 */
export async function getAllSessions(): Promise<TimeEntry[]> {
  try {
    const res = await api.get<TimeEntry[]>('/TimeTracking/Allsessions');
    return res.data;
  } catch (err: any) {
    if (err.response && err.response.status === 404) {
      return [];
    }
    throw err;
  }
}

