import { api } from "@/api/api";

type SignupRequest = {
  username: string;
  email: string;
  password: string;
}

export async function signup(data: SignupRequest) {
  const res = await api.post('/api/auth/register', data)
  return res.data
}