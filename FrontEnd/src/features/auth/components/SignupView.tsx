import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { signupSchema, type SignupInput } from '../types';

export function SignupView() {
  const navigate = useNavigate();
  const { register: signupUser, error, isLoading, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  // Clear any existing errors when mounting
  React.useEffect(() => {
    clearError();
  }, [clearError]);

  const onSubmit = async (data: SignupInput) => {
    try {
      await signupUser(data);
      navigate('/tasks/inbox');
    } catch (err) {
      // Errors are handled inside the Zustand store
    }
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col justify-between bg-slate-900 items-center font-sans overflow-hidden relative">
      {/* Premium Ambient Background Lights */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="flex-1 flex flex-col h-full justify-center items-center px-6 z-10 w-full max-w-md">
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="flex flex-col gap-5 w-full bg-slate-950/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl shadow-slate-950/50"
        >
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">Create an account</h2>
            <p className="text-slate-400 text-sm">Start your journey towards professional focus</p>
          </div>

          {/* Backend Error Message */}
          {error && (
            <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/40 p-4 rounded-xl text-red-400 text-sm animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="username">Username</label>
            <Input 
              type="text" 
              id="username" 
              placeholder="John Doe" 
              className="w-full px-4 py-2.5 h-12 rounded-xl border-slate-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-900/50 text-white placeholder:text-slate-600" 
              {...register('username')}
            />
            {errors.username && (
              <span className="text-xs font-bold text-red-500 mt-1 pl-1">{errors.username.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="email">Email</label>
            <Input 
              type="email" 
              id="email" 
              placeholder="name@company.com" 
              className="w-full px-4 py-2.5 h-12 rounded-xl border-slate-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-900/50 text-white placeholder:text-slate-600" 
              {...register('email')}
            />
            {errors.email && (
              <span className="text-xs font-bold text-red-500 mt-1 pl-1">{errors.email.message}</span>
            )}
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider" htmlFor="password">Password</label>
            <Input 
              type="password" 
              id="password" 
              placeholder="••••••••" 
              className="w-full px-4 py-2.5 h-12 rounded-xl border-slate-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm bg-slate-900/50 text-white placeholder:text-slate-600" 
              {...register('password')}
            />
            {errors.password && (
              <span className="text-xs font-bold text-red-500 mt-1 pl-1">{errors.password.message}</span>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] mt-2 group flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>

          <p className="text-center text-sm text-slate-400 pt-2">
            Already have an account? <Link to="/login" className="text-blue-500 font-bold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>

      <div className="flex gap-6 text-xs p-6 font-semibold text-slate-600 z-10">
        <Link to="#" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
        <Link to="#" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
        <span>&copy; 2026 PMS Flow</span>
      </div>
    </div>
  );
}
