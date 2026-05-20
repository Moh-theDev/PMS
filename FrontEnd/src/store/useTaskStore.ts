import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, List, Priority, Status } from '../types/index';

interface TaskState {
  tasks: Task[];
  lists: List[];
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addList: (list: List) => void;
  getTasksByList: (listId: string) => Task[];
  getTasksByStatus: (status: Status) => Task[];
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [
        {
          id: '1',
          title: 'Finalize Q3 Marketing Strategy Deck',
          description: 'Ensure the deck covers target audience personas, channel allocation, KPIs, and budget overview.',
          priority: 'high',
          status: 'todo',
          dueDate: new Date().toISOString(),
          tags: ['marketing'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          listId: 'inbox'
        },
        {
          id: '2',
          title: 'Review agency proposals for brand refresh',
          priority: 'medium',
          status: 'todo',
          dueDate: new Date().toISOString(),
          tags: ['design'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          listId: 'inbox'
        },
        {
          id: '3',
          title: 'Follow up with Sarah re: design assets',
          priority: 'low',
          status: 'todo',
          dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          listId: 'inbox'
        }
      ],
      lists: [
        { id: 'inbox', name: 'Inbox' },
        { id: 'today', name: 'Today' },
        { id: 'upcoming', name: 'Upcoming' },
        { id: 'programming', name: 'Programming & IT Field', color: '#1978e5' },
        { id: 'hobbies', name: 'Hobbies', color: '#5cde94' }
      ],
      addTask: (task) => set((state) => ({
        tasks: [...state.tasks, {
          id: Math.random().toString(36).substr(2, 9),
          title: '',
          priority: 'medium',
          status: 'todo',
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...task
        } as Task]
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),
      addList: (list) => set((state) => ({
        lists: [...state.lists, list]
      })),
      getTasksByList: (listId) => {
        const { tasks } = get();
        if (listId === 'inbox') return tasks;
        if (listId === 'today') {
           const today = new Date().toISOString().split('T')[0];
           return tasks.filter(t => t.dueDate?.startsWith(today));
        }
        return tasks.filter(t => t.listId === listId);
      },
      getTasksByStatus: (status) => get().tasks.filter(t => t.status === status),
    }),
    {
      name: 'focus-flow-tasks',
    }
  )
);
