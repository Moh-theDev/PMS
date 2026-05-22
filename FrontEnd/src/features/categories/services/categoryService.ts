import { api } from '@/api/axios';
import { type Category } from '@/types/index';

export async function getAllCategories(): Promise<Category[]> {
  const res = await api.get<Category[]>('/categories');
  return res.data;
}

export async function getCategoryById(id: number): Promise<Category> {
  const res = await api.get<Category>(`/categories/${id}`);
  return res.data;
}

export async function createCategory(name: string): Promise<number> {
  const res = await api.post<number>('/categories', { Name: name });
  return res.data; // Returns category ID
}

export async function updateCategory(id: number, name: string, color?: string): Promise<void> {
  await api.put(`/categories/${id}`, { Name: name, Color: color });
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}
