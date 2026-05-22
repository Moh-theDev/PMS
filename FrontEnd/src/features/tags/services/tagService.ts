import { api } from '@/api/axios';
import { type Tag } from '@/types/index';

export async function getAllTags(): Promise<Tag[]> {
  const res = await api.get<Tag[] | string>('/tags');
  if (typeof res.data === 'string') {
    return []; // Handles "No tags found" string from backend
  }
  return res.data || [];
}

export async function getTagById(id: number): Promise<Tag> {
  const res = await api.get<Tag>(`/tags/${id}`);
  return res.data;
}

export async function createTag(name: string): Promise<Tag> {
  const res = await api.post<Tag>('/tags', { Name: name });
  return res.data;
}

export async function updateTag(id: number, name: string): Promise<void> {
  await api.put(`/tags/${id}`, { Name: name });
}

export async function deleteTag(id: number): Promise<void> {
  await api.delete(`/tags/${id}`);
}

export async function assignTagsToTask(taskId: number, tagIds: number[]): Promise<void> {
  // POST api/Tags/assign?taskId=X&tagIds=Y
  await api.post('/tags/assign', null, {
    params: {
      taskId,
      tagIds,
    },
    paramsSerializer: {
      indexes: null, // serializes array as tagIds=1&tagIds=2
    }
  });
}

export async function removeTagFromTask(taskId: number, tagId: number): Promise<void> {
  // DELETE api/Tags/{taskId}/tags/{tagId}
  await api.delete(`/tags/${taskId}/tags/${tagId}`);
}

export async function getTasksForTag(tagId: number): Promise<{ id: number; title: string }[]> {
  const res = await api.get<{ id: number; title: string }[]>(`/tags/${tagId}/tasks`);
  return res.data || [];
}
