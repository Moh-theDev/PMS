import { api } from '@/api/axios';
import { type Task, type CreateTaskDto, type UpdateTaskDto, type DeleteTaskResult, type DeleteResolutionRequest } from '@/types/index';

export async function getAllTasks(): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks');
  return res.data;
}

export async function getTaskById(id: number): Promise<Task> {
  const res = await api.get<Task>(`/tasks/${id}`);
  return res.data;
}

export async function createTask(dto: CreateTaskDto, categoryId?: number): Promise<Task> {
  const res = await api.post<Task>('/tasks', dto, {
    params: categoryId ? { CategoryId: categoryId } : undefined,
  });
  return res.data;
}

export async function updateTask(id: number, dto: UpdateTaskDto): Promise<void> {
  await api.put(`/tasks/${id}`, dto);
}

export async function changeTaskStatus(id: number, status: string): Promise<void> {
  // Backend expects a raw string JSON value, e.g. "Done"
  await api.put(`/tasks/${id}/status`, JSON.stringify(status), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function deleteTask(id: number): Promise<DeleteTaskResult> {
  try {
    await api.delete(`/tasks/${id}`);
    // If successful directly, return a success result
    return {
      success: true,
      notFound: false,
      hasScheduleConflict: false,
    };
  } catch (err: any) {
    if (err.response && err.response.status === 409) {
      return err.response.data as DeleteTaskResult;
    }
    throw err;
  }
}

export async function resolveTaskDelete(id: number, request: DeleteResolutionRequest): Promise<DeleteTaskResult> {
  const res = await api.post<DeleteTaskResult>(`/tasks/${id}/resolve-delete`, request);
  return res.data;
}

export async function filterTasks(
  categoryId?: number,
  tagId?: number,
  from?: string,
  to?: string
): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks/filter', {
    params: { categoryId, tagId, from, to },
  });
  return res.data;
}

export async function searchTasks(keyword: string): Promise<Task[]> {
  const res = await api.get<Task[]>('/tasks/search', {
    params: { keyword },
  });
  return res.data;
}

export async function clearStartEnd(id: number): Promise<void> {
  await api.patch(`/tasks/clear-start-end/${id}`);
}
