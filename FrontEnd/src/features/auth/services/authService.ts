import { api } from '@/api/axios';
import { type LoginInput, type SignupInput } from '../types';

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  avatar?: string;
}

export async function login(data: LoginInput): Promise<void> {
  // POST api/Auth/login
  await api.post('/auth/login', {
    Email: data.email,
    Password: data.password,
  });
}

export async function signup(data: SignupInput): Promise<void> {
  // POST api/Auth/register
  await api.post('/auth/register', {
    UserName: data.username,
    Email: data.email,
    Password: data.password,
  });
}

export async function logout(): Promise<void> {
  // POST api/Auth/revokeToken
  await api.post('/auth/revokeToken');
}

export async function getMyProfile(): Promise<UserResponse> {
  // GET api/Users
  const res = await api.get<UserResponse>('/users');
  return res.data;
}

export async function updateProfile(data: { name?: string; avatar?: string }): Promise<void> {
  // PUT api/Users
  await api.put('/users', {
    Name: data.name,
    Avatar: data.avatar,
  });
}

export async function deleteAccount(): Promise<void> {
  // DELETE api/Users
  await api.delete('/users');
}
