import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuthStore } from '../../store/useAuthStore';

export function LoginView() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      id: '1',
      name: 'Alex Carter',
      email: 'alex@example.com',
      plan: 'standard',
      avatar: 'https://github.com/shadcn.png'
    });
    navigate('/tasks/inbox');
  };

  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-accent items-center font-sans overflow-hidden">

      <div className="flex flex-col h-screen justify-center px-6 lg:px-20 bg-accent gap-6">
        

          <form onSubmit={handleLogin} className='flex flex-col gap-5 w-fit bg-card p-5 rounded-2xl shadow-xl'>
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-slate-500">Enter your credentials to access your workspace</p>
            </div>
            <div className="">
              <label className="text-sm font-semibold text-slate-700" htmlFor="email">Email</label>
              <Input 
                type="email" 
                id="email" 
                placeholder="name@company.com" 
                className="w-full px-4 py-2.5 h-11 rounded-lg border-slate-200 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-sm bg-slate-50/50" 
                required 
              />
            </div>
            
            <div className="">
              <div className="flex justify-between">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password">Password</label>
              </div>
              <Input 
                type="password" 
                id="password" 
                placeholder="••••••••" 
                className="w-full px-4 py-2.5 h-11 rounded-lg border-slate-200 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-sm bg-slate-50/50" 
                required 
              />
            </div>

            <Button type="submit" className="w-full bg-slate-900 text-white h-11 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] mt-2 group">
              Sign In
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-center text-sm text-slate-500 pt-2">
              Don't have an account? <Link to="/signup" className="text-blue-600 font-bold hover:underline">Create account</Link>
            </p>
          </form>
        
        
        </div>
        <div className="flex gap-6 text-xs md:text-lg p-2 font-medium text-slate-400">
          <Link to="#" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
          <Link to="#" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
          <span>&copy; 2024 FocusFlow v2.0.4</span>
        </div>
    </div>
  );
}
