import { z } from 'zod';

const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|outlook\.com|yahoo\.com)$/i;

export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .regex(emailRegex, 'Only @gmail.com, @outlook.com, and @yahoo.com are allowed'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Please enter a valid email address')
    .regex(emailRegex, 'Only @gmail.com, @outlook.com, and @yahoo.com are allowed'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(20, 'Password must not exceed 20 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
