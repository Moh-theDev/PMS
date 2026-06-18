import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, AlertCircle, X, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { signupSchema, type SignupInput } from '../types';

export function SignupView() {
  const navigate = useNavigate();
  const { register: signupUser, error, isLoading, clearError } = useAuthStore();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

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

  // Sync store errors to toast notifications
  React.useEffect(() => {
    if (error) {
      setToastMessage(error);
      clearError();
    }
  }, [error, clearError]);

  // Auto-dismiss toast notifications after 4 seconds
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const onSubmit = async (data: SignupInput) => {
    try {
      await signupUser(data);
      navigate('/tasks/inbox');
    } catch (err) {
      // Errors are handled inside the Zustand store
    }
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col items-center bg-accent font-sans overflow-hidden relative">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-red-500/10 border border-red-200 dark:border-red-500/30 px-4 py-3.5 rounded-xl shadow-lg dark:shadow-none shadow-red-900/5 text-red-700 dark:text-red-400 text-sm max-w-sm"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <span className="font-semibold flex-1 leading-snug">{toastMessage}</span>
            <button 
              type="button"
              onClick={() => setToastMessage(null)} 
              className="ml-2 p-0.5 text-red-400 hover:text-red-600 dark:text-red-400 rounded-md hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col h-screen items-center justify-center px-6 lg:px-20 bg-accent gap-6">
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className="flex flex-col gap-3 bg-card p-6 rounded-2xl shadow-xl dark:shadow-none min-w-[360px] md:min-w-[400px] border border-border"
        >
          <div className="text-center p-3 flex flex-col gap-2">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Create an account</h2>
            <p className="text-muted-foreground text-sm">Start your journey towards professional focus</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-foreground" htmlFor="username">Username</label>
            <Input 
              type="text" 
              id="username" 
              placeholder="username" 
              className="w-full px-4 py-2.5 h-11 rounded-lg border-border focus:ring-blue-600/10 focus:border-blue-600 transition-all text-sm bg-muted/50" 
              {...register('username')}
            />
            {errors.username && (
              <span className="text-xs font-semibold text-red-500 mt-1 pl-1">{errors.username.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-foreground" htmlFor="email">Email</label>
            <Input 
              type="text" 
              id="email" 
              placeholder="name@gmail.com" 
              className="w-full px-4 py-2.5 h-11 rounded-lg border-border focus:ring-blue-600/10 focus:border-blue-600 transition-all text-sm bg-muted/50" 
              {...register('email')}
            />
            {errors.email && (
              <span className="text-xs font-semibold text-red-500 mt-1 pl-1">{errors.email.message}</span>
            )}
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-foreground" htmlFor="password">Password</label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                placeholder="••••••••" 
                className="w-full px-4 py-2.5 pr-10 h-11 rounded-lg border-border focus:ring-blue-600/10 focus:border-blue-600 transition-all text-sm bg-muted/50" 
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <span className="text-xs font-semibold text-red-500 mt-1 pl-1">{errors.password.message}</span>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-foreground text-background h-11 rounded-lg font-bold hover:bg-foreground transition-all shadow-lg dark:shadow-none shadow-slate-900/10 active:scale-[0.98] mt-2 group flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground pt-2">
            Already have an account? <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
      
      <div className="flex gap-6 p-2 text-sm md:text-lg font-medium text-muted-foreground">
        <Link to="#" className="hover:text-muted-foreground transition-colors">Privacy Policy</Link>
        <Link to="#" className="hover:text-muted-foreground transition-colors">Terms of Service</Link>
        <span>&copy; 2026 PMS beta 1.0</span>
      </div>
    </div>
  );
}
