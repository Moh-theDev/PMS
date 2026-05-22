import { create } from 'zustand';
import { type Task, type Category, type Tag, type List, type CreateTaskDto, type UpdateTaskDto, type DeleteTaskResult, TaskStatus } from '../types/index';
import * as taskService from '../features/tasks/services/taskService';
import * as categoryService from '../features/categories/services/categoryService';
import * as tagService from '../features/tags/services/tagService';

interface TaskState {
  tasks: Task[];
  categories: Category[];
  tags: Tag[];
  lists: List[];
  isLoading: boolean;
  error: string | null;

  fetchTasks: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  
  addTask: (task: CreateTaskDto, categoryId?: number) => Promise<Task>;
  updateTask: (id: number, updates: UpdateTaskDto) => Promise<void>;
  updateTaskStatus: (id: number, status: TaskStatus) => Promise<void>;
  deleteTask: (id: number) => Promise<DeleteTaskResult>;
  resolveDelete: (id: number, option: string, newTaskId?: number) => Promise<void>;

  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  addTag: (name: string) => Promise<void>;
  deleteTag: (id: number) => Promise<void>;

  assignTags: (taskId: number, tagIds: number[]) => Promise<void>;
  removeTag: (taskId: number, tagId: number) => Promise<void>;

  getTasksByList: (listId: string) => Task[];
}

const staticLists: List[] = [
  { id: 'inbox', name: 'Inbox' },
  { id: 'today', name: 'Today' },
  { id: 'upcoming', name: 'Upcoming' },
];

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  categories: [],
  tags: [],
  lists: staticLists,
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await taskService.getAllTasks();
      const tags = await tagService.getAllTags();
      
      const taskTagsMap: Record<number, string[]> = {};
      await Promise.all(
        tags.map(async (tag) => {
          try {
            const associatedTasks = await tagService.getTasksForTag(tag.id);
            if (associatedTasks && Array.isArray(associatedTasks)) {
              associatedTasks.forEach((assoc) => {
                if (!taskTagsMap[assoc.id]) {
                  taskTagsMap[assoc.id] = [];
                }
                if (!taskTagsMap[assoc.id].includes(tag.name)) {
                  taskTagsMap[assoc.id].push(tag.name);
                }
              });
            }
          } catch (err) {
            console.error(`Failed to fetch tasks for tag ${tag.name}`, err);
          }
        })
      );

      const tasksWithTags = tasks.map((task) => ({
        ...task,
        tags: taskTagsMap[task.id] || [],
      }));

      set({ tasks: tasksWithTags, isLoading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch tasks', isLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryService.getAllCategories();
      const mappedLists = [
        ...staticLists,
        ...categories.map((c) => ({
          id: String(c.id),
          name: c.name,
          color: c.color || '#64748b',
        })),
      ];
      set({ categories, lists: mappedLists, isLoading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch categories', isLoading: false });
    }
  },

  fetchTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await tagService.getAllTags();
      set({ tags, isLoading: false });
    } catch (err: any) {
      set({ error: 'Failed to fetch tags', isLoading: false });
    }
  },

  addTask: async (task, categoryId) => {
    set({ isLoading: true, error: null });
    try {
      const newTask = await taskService.createTask(task, categoryId);
      set((state) => ({
        tasks: [...state.tasks, newTask],
        isLoading: false,
      }));
      return newTask;
    } catch (err: any) {
      set({ error: 'Failed to create task', isLoading: false });
      throw err;
    }
  },

  updateTask: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      await taskService.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: 'Failed to update task', isLoading: false });
      throw err;
    }
  },

  updateTaskStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      // Convert status numeric enum to string representing the enum name for Backend
      const statusMap: Record<TaskStatus, string> = {
        [TaskStatus.Todo]: 'Todo',
        [TaskStatus.InProgress]: 'InProgress',
        [TaskStatus.Done]: 'Done',
        [TaskStatus.Cancelled]: 'Cancelled',
        [TaskStatus.Paused]: 'Paused',
      };
      const statusStr = statusMap[status] || 'Todo';
      await taskService.changeTaskStatus(id, statusStr);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: 'Failed to change status', isLoading: false });
      throw err;
    }
  },

  deleteTask: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const result = await taskService.deleteTask(id);
      if (result.success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          isLoading: false,
        }));
      } else {
        set({ isLoading: false });
      }
      return result;
    } catch (err: any) {
      set({ error: 'Failed to delete task', isLoading: false });
      throw err;
    }
  },

  resolveDelete: async (id, option, newTaskId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await taskService.resolveTaskDelete(id, { option, newTaskId });
      if (result.success) {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          isLoading: false,
        }));
      } else {
        set({ error: result.message || 'Failed to resolve deletion conflict', isLoading: false });
      }
    } catch (err: any) {
      set({ error: 'Failed to resolve deletion conflict', isLoading: false });
      throw err;
    }
  },

  addCategory: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const id = await categoryService.createCategory(name);
      if (id !== -1) {
        await get().fetchCategories();
      } else {
        set({ error: 'Category already exists', isLoading: false });
      }
    } catch (err: any) {
      set({ error: 'Failed to create category', isLoading: false });
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.deleteCategory(id);
      await get().fetchCategories();
    } catch (err: any) {
      set({ error: 'Failed to delete category', isLoading: false });
    }
  },

  addTag: async (name) => {
    set({ isLoading: true, error: null });
    try {
      await tagService.createTag(name);
      await get().fetchTags();
    } catch (err: any) {
      set({ error: 'Failed to create tag', isLoading: false });
    }
  },

  deleteTag: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await tagService.deleteTag(id);
      await get().fetchTags();
    } catch (err: any) {
      set({ error: 'Failed to delete tag', isLoading: false });
    }
  },

  assignTags: async (taskId, tagIds) => {
    set({ isLoading: true, error: null });
    try {
      await tagService.assignTagsToTask(taskId, tagIds);
      // Wait a moment and fetch updated tasks to get tag association
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: 'Failed to assign tags', isLoading: false });
    }
  },

  removeTag: async (taskId, tagId) => {
    set({ isLoading: true, error: null });
    try {
      await tagService.removeTagFromTask(taskId, tagId);
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: 'Failed to remove tag', isLoading: false });
    }
  },

  getTasksByList: (listId) => {
    const { tasks } = get();
    if (listId === 'inbox') {
      return tasks;
    }
    if (listId === 'today') {
      const today = new Date().toISOString().split('T')[0];
      return tasks.filter((t) => {
        const deadline = t.deadline?.split('T')[0];
        const start = t.earliestStart?.split('T')[0];
        const end = t.latestEnd?.split('T')[0];
        return deadline === today || start === today || end === today;
      });
    }
    if (listId === 'upcoming') {
      const today = new Date().toISOString().split('T')[0];
      return tasks.filter((t) => {
        const deadline = t.deadline?.split('T')[0];
        const start = t.earliestStart?.split('T')[0];
        const end = t.latestEnd?.split('T')[0];
        return (deadline && deadline > today) || (start && start > today) || (end && end > today);
      });
    }
    // Check if listId represents a dynamic category
    return tasks.filter((t) => t.categoryId !== undefined && String(t.categoryId) === listId);
  },
}));
