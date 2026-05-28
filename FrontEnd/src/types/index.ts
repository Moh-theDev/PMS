export const TaskStatus = {
  Todo: 0,
  InProgress: 1,
  Done: 2,
  Cancelled: 3,
  Paused: 4,
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface Task {
  id: number;
  title: string;
  description?: string;
  durationInMinutes: number;
  priority: number; // 1 to 10
  effortLevel: number; // 1 to 5
  deadline?: string | null;
  earliestStart?: string | null;
  latestEnd?: string | null;
  status: TaskStatus;
  categoryId?: number;
  tags?: string[];
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  durationInMinutes: number;
  priority?: number; // 1 to 10
  effortLevel?: number; // 1 to 5
  deadline?: string | null;
  earliestStart?: string | null;
  latestEnd?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  durationInMinutes?: number;
  priority?: number;
  effortLevel?: number;
  deadline?: string | null;
  earliestStart?: string | null;
  latestEnd?: string | null;
  status?: TaskStatus;
  categoryId?: number;
}

export interface DeleteTaskResult {
  success: boolean;
  notFound: boolean;
  hasScheduleConflict: boolean;
  options?: string[]; // e.g. ["ReplaceTask", "ReplanSchedule", "ClearSlot", "Cancel"]
  message?: string;
}

export interface DeleteResolutionRequest {
  option: string; // ReplaceTask, ReplanSchedule, ClearSlot, Cancel
  newTaskId?: number;
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
}

export interface Category {
  id: number;
  name: string;
  color?: string;
}

export interface List {
  id: string; // "inbox" | "today" | "upcoming" | String(categoryId)
  name: string;
  icon?: string;
  color?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}