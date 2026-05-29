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
  dummyCategoryId: number | null;

  fetchTasks: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  
  addTask: (task: CreateTaskDto, categoryId?: number) => Promise<Task>;
  updateTask: (id: number, updates: UpdateTaskDto) => Promise<void>;
  updateTaskStatus: (id: number, status: TaskStatus) => Promise<void>;
  deleteTask: (id: number) => Promise<DeleteTaskResult>;
  resolveDelete: (id: number, option: string, newTaskId?: number) => Promise<void>;
  clearStartEnd: (id: number) => Promise<void>;

  addCategory: (name: string) => Promise<void>;
  updateCategory: (id: number, name: string) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  addTag: (name: string) => Promise<void>;
  updateTag: (id: number, name: string) => Promise<void>;
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
  dummyCategoryId: null,

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const tasks = await taskService.getAllTasks();
      const tags = await tagService.getAllTags();
      let categories = await categoryService.getAllCategories();
      
      // Auto-initialize dummy category if missing
      let dummyCat = categories.find((c) => c.name === '_no_category_');
      let dummyId: number | null = dummyCat ? dummyCat.id : null;
      
      if (!dummyCat) {
        try {
          const newId = await categoryService.createCategory('_no_category_');
          if (newId !== -1) {
            categories = await categoryService.getAllCategories();
            dummyCat = categories.find((c) => c.name === '_no_category_');
            dummyId = dummyCat ? dummyCat.id : null;
          }
        } catch (e) {
          console.error('Failed to auto-create _no_category_ dummy category', e);
        }
      }

      const taskTagsMap: Record<number, string[]> = {};
      const taskCategoryMap: Record<number, number> = {};

      await Promise.all([
        ...tags.map(async (tag) => {
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
        }),
        ...categories.map(async (cat) => {
          try {
            const associatedTasks = await taskService.filterTasks(cat.id);
            if (associatedTasks && Array.isArray(associatedTasks)) {
              associatedTasks.forEach((assoc) => {
                taskCategoryMap[assoc.id] = cat.id;
              });
            }
          } catch (err) {
            console.error(`Failed to fetch tasks for category ${cat.name}`, err);
          }
        })
      ]);

      const enrichedTasks = tasks.map((task) => {
        const catId = taskCategoryMap[task.id];
        return {
          ...task,
          tags: taskTagsMap[task.id] || [],
          // Map dummy category ID back to undefined/null for the rest of the application
          categoryId: catId === dummyId ? undefined : catId,
        };
      });

      set({ tasks: enrichedTasks, isLoading: false, dummyCategoryId: dummyId });
    } catch (err: any) {
      set({ error: 'Failed to fetch tasks', isLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      let categories = await categoryService.getAllCategories();
      
      // Look for the special dummy category
      let dummyCat = categories.find((c) => c.name === '_no_category_');
      let dummyId: number | null = dummyCat ? dummyCat.id : null;
      
      if (!dummyCat) {
        try {
          const newId = await categoryService.createCategory('_no_category_');
          if (newId !== -1) {
            categories = await categoryService.getAllCategories();
            dummyCat = categories.find((c) => c.name === '_no_category_');
            dummyId = dummyCat ? dummyCat.id : null;
          }
        } catch (e) {
          console.error('Failed to auto-create _no_category_ dummy category', e);
        }
      }

      // Filter out the dummy category so the user never sees it in general lists or sidebars!
      const visibleCategories = categories.filter((c) => c.name !== '_no_category_');

      const mappedLists = [
        ...staticLists,
        ...visibleCategories.map((c) => ({
          id: String(c.id),
          name: c.name,
          color: c.color || '#64748b',
        })),
      ];
      set({ 
        categories: visibleCategories, 
        lists: mappedLists, 
        isLoading: false, 
        dummyCategoryId: dummyId 
      });
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
      const enrichedNewTask = {
        ...newTask,
        categoryId: categoryId,
        tags: [],
      };
      set((state) => ({
        tasks: [...state.tasks, enrichedNewTask],
        isLoading: false,
      }));
      return enrichedNewTask;
    } catch (err: any) {
      set({ error: 'Failed to create task', isLoading: false });
      throw err;
    }
  },

  updateTask: async (id, updates) => {
    const previousTasks = get().tasks;
    const task = previousTasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic update in client state
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...updates };
          if (updates.deadline === null || updates.deadline === '') {
            updated.deadline = '0001-01-01T00:00:00';
          }
          // Only remove categoryId from local state when the user explicitly
          // chose "No Category" (value 0). If categoryId is simply absent from
          // the update object it means we're changing another field (date, title,
          // etc.) and the existing category should be preserved.
          if ('categoryId' in updates && (updates.categoryId === 0 || updates.categoryId === null)) {
            delete updated.categoryId;
          }
          return updated;
        }
        return t;
      }),
      error: null,
    }));

    try {
      let apiUpdates = { ...updates };

      // 0. Map categoryId to dummyCategoryId if trying to clear or set no category
      if (updates.categoryId !== undefined) {
        if (updates.categoryId === 0 || updates.categoryId === null || updates.categoryId === undefined) {
          const dummyId = get().dummyCategoryId;
          if (dummyId) {
            apiUpdates.categoryId = dummyId;
          }
        }
      }

      const isScheduled = !!(task.earliestStart && !task.earliestStart.startsWith('0001-01-01') && 
                             task.latestEnd && !task.latestEnd.startsWith('0001-01-01'));

      // 1. Enrich date fields to satisfy backend "EarliestStart < LatestEnd" constraint
      if (updates.earliestStart !== undefined || updates.latestEnd !== undefined) {
        const currentStart = updates.earliestStart !== undefined ? updates.earliestStart : task.earliestStart;
        const currentEnd = updates.latestEnd !== undefined ? updates.latestEnd : task.latestEnd;

        const hasStart = currentStart && !currentStart.startsWith('0001-01-01');
        const hasEnd = currentEnd && !currentEnd.startsWith('0001-01-01');

        if (hasStart && !hasEnd) {
          const duration = updates.durationInMinutes !== undefined 
            ? updates.durationInMinutes 
            : (task.durationInMinutes || 30);
          try {
            const startDate = new Date(currentStart);
            const endDate = new Date(startDate.getTime() + duration * 60000);
            apiUpdates.earliestStart = currentStart;
            apiUpdates.latestEnd = endDate.toISOString();
          } catch (e) {
            console.error(e);
          }
        } else if (!hasStart && hasEnd) {
          const duration = updates.durationInMinutes !== undefined 
            ? updates.durationInMinutes 
            : (task.durationInMinutes || 30);
          try {
            const endDate = new Date(currentEnd);
            const startDate = new Date(endDate.getTime() - duration * 60000);
            apiUpdates.earliestStart = startDate.toISOString();
            apiUpdates.latestEnd = currentEnd;
          } catch (e) {
            console.error(e);
          }
        } else if (hasStart && hasEnd) {
          // If start date is after or equal to end date, automatically adjust to preserve duration and satisfy constraints
          const duration = updates.durationInMinutes !== undefined 
            ? updates.durationInMinutes 
            : (task.durationInMinutes || 30);
          try {
            const startVal = new Date(currentStart).getTime();
            const endVal = new Date(currentEnd).getTime();
            if (startVal >= endVal) {
              if (updates.earliestStart !== undefined) {
                // User moved start forward: push end to match
                const newEnd = new Date(startVal + duration * 60000).toISOString();
                apiUpdates.earliestStart = currentStart;
                apiUpdates.latestEnd = newEnd;
              } else {
                // User moved end backward: pull start to match
                const newStart = new Date(endVal - duration * 60000).toISOString();
                apiUpdates.earliestStart = newStart;
                apiUpdates.latestEnd = currentEnd;
              }
            } else {
              apiUpdates.earliestStart = currentStart;
              apiUpdates.latestEnd = currentEnd;
            }
          } catch (e) {
            console.error(e);
            apiUpdates.earliestStart = currentStart;
            apiUpdates.latestEnd = currentEnd;
          }
        }

        // Proactive deadline safeguard: if the task has a valid deadline,
        // and the new latestEnd is after that deadline, push the deadline to match latestEnd
        if (apiUpdates.latestEnd && task.deadline && !task.deadline.startsWith('0001-01-01')) {
          try {
            const newEndVal = new Date(apiUpdates.latestEnd).getTime();
            const currDeadlineVal = new Date(task.deadline).getTime();
            if (newEndVal > currDeadlineVal) {
              apiUpdates.deadline = apiUpdates.latestEnd;
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      // 2. Handle deadline updates with respect to backend constraints
      if (updates.deadline !== undefined) {
        if (updates.deadline === null || updates.deadline === '') {
          // WORKAROUND for backend: to clear deadline, set to 0001-01-01 with dummy 0001 schedule, then clear schedule
          const clearDeadlineVal = '0001-01-01T00:00:00Z';
          await taskService.updateTask(id, {
            ...apiUpdates,
            deadline: clearDeadlineVal,
            earliestStart: clearDeadlineVal,
            latestEnd: clearDeadlineVal,
          });
          await taskService.clearStartEnd(id);
          return;
        } else {
          if (isScheduled) {
            // Send earliestStart and latestEnd to ensure "latestEnd <= deadline" backend check succeeds
            apiUpdates.earliestStart = apiUpdates.earliestStart !== undefined ? apiUpdates.earliestStart : task.earliestStart;
            apiUpdates.latestEnd = apiUpdates.latestEnd !== undefined ? apiUpdates.latestEnd : task.latestEnd;
          } else {
            // WORKAROUND for backend bug: if task is unscheduled, backend's UpdateAsync ignores deadline updates.
            // We temporarily set dummy schedule dates, update the task, then immediately clear the schedule.
            const deadlineDate = new Date(updates.deadline);
            const dummyEndDate = deadlineDate.toISOString();
            const dummyStartDate = new Date(deadlineDate.getTime() - 5 * 60000).toISOString();

            await taskService.updateTask(id, {
              ...apiUpdates,
              earliestStart: dummyStartDate,
              latestEnd: dummyEndDate,
            });
            await taskService.clearStartEnd(id);
            return;
          }
        }
      }

      await taskService.updateTask(id, apiUpdates);
    } catch (err: any) {
      set({ tasks: previousTasks, error: 'Failed to update task' });
      throw err;
    }
  },

  updateTaskStatus: async (id, status) => {
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
      error: null,
    }));

    // Record or clear completion date on Done status change
    try {
      const stored = localStorage.getItem('task_completions');
      const completions = stored ? JSON.parse(stored) : {};
      if (status === TaskStatus.Done) {
        completions[id] = new Date().toISOString();
      } else {
        delete completions[id];
      }
      localStorage.setItem('task_completions', JSON.stringify(completions));
    } catch (e) {
      console.error('Failed to update task_completions in localStorage', e);
    }

    try {
      const statusMap: Record<TaskStatus, string> = {
        [TaskStatus.Todo]: 'Todo',
        [TaskStatus.InProgress]: 'InProgress',
        [TaskStatus.Done]: 'Done',
        [TaskStatus.Cancelled]: 'Cancelled',
        [TaskStatus.Paused]: 'Paused',
      };
      const statusStr = statusMap[status] || 'Todo';
      await taskService.changeTaskStatus(id, statusStr);
    } catch (err: any) {
      // Revert completion date in localStorage on failure
      try {
        const stored = localStorage.getItem('task_completions');
        if (stored) {
          const completions = JSON.parse(stored);
          const oldTask = previousTasks.find((t) => t.id === id);
          if (oldTask && oldTask.status === TaskStatus.Done) {
            completions[id] = new Date().toISOString(); // keep it if it was Done
          } else {
            delete completions[id];
          }
          localStorage.setItem('task_completions', JSON.stringify(completions));
        }
      } catch (e) {
        console.error(e);
      }

      set({ tasks: previousTasks, error: 'Failed to change status' });
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

  clearStartEnd: async (id) => {
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            earliestStart: null,
            latestEnd: null,
          };
        }
        return t;
      }),
      error: null,
    }));

    try {
      await taskService.clearStartEnd(id);
    } catch (err: any) {
      set({ tasks: previousTasks, error: 'Failed to clear task schedule dates' });
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

  updateCategory: async (id, name) => {
    set({ isLoading: true, error: null });
    try {
      await categoryService.updateCategory(id, name);
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, name } : c)),
        lists: state.lists.map((l) => (l.id === String(id) ? { ...l, name } : l)),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: 'Failed to rename category', isLoading: false });
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

  updateTag: async (id, name) => {
    set({ isLoading: true, error: null });
    try {
      await tagService.updateTag(id, name);
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? { ...t, name } : t)),
        isLoading: false,
      }));
      await get().fetchTasks();
    } catch (err: any) {
      set({ error: 'Failed to rename tag', isLoading: false });
    }
  },

  assignTags: async (taskId, tagIds) => {
    const previousTasks = get().tasks;
    const allTags = get().tags;
    const tagNamesToAssign = tagIds
      .map((id) => allTags.find((t) => t.id === id)?.name)
      .filter((name): name is string => !!name);

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, tags: Array.from(new Set([...(t.tags || []), ...tagNamesToAssign])) }
          : t
      ),
      error: null,
    }));

    try {
      await tagService.assignTagsToTask(taskId, tagIds);
    } catch (err: any) {
      set({ tasks: previousTasks, error: 'Failed to assign tags' });
    }
  },

  removeTag: async (taskId, tagId) => {
    const previousTasks = get().tasks;
    const tagToRemove = get().tags.find((t) => t.id === tagId);

    if (tagToRemove) {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId
            ? { ...t, tags: (t.tags || []).filter((name) => name !== tagToRemove.name) }
            : t
        ),
        error: null,
      }));
    }

    try {
      await tagService.removeTagFromTask(taskId, tagId);
    } catch (err: any) {
      set({ tasks: previousTasks, error: 'Failed to remove tag' });
    }
  },

  getTasksByList: (listId) => {
    const { tasks } = get();
    if (listId === 'inbox') {
      return tasks.filter((t) => !t.categoryId || t.categoryId === 0);
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
        const start = t.earliestStart?.split('T')[0];
        const end = t.latestEnd?.split('T')[0];
        const isScheduled = start && !t.earliestStart?.startsWith('0001-01-01') &&
                            end && !t.latestEnd?.startsWith('0001-01-01');
        if (!isScheduled) return false;
        return start > today || end > today;
      });
    }
    // Check if listId represents a dynamic category
    return tasks.filter((t) => t.categoryId !== undefined && String(t.categoryId) === listId);
  },
}));
