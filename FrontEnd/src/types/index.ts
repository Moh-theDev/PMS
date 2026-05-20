export type Priority = 'low' | 'medium' | 'high';
export type Status = 'todo' | 'in-progress' | 'done' | 'backlog';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string;
  duration?: number; // in minutes or pomodoros
  tags: string[]; // tag ids
  listId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'standard';
}