import * as React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Settings, 
  Flame,
  Clock,
  Target,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { useFocusStore } from '@/store/useFocusStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export function FocusView() {
  const { 
    isActive, 
    timeLeft, 
    totalTime, 
    sessionCount, 
    totalSessions, 
    tick, 
    startFocus, 
    stopFocus, 
    resetTimer 
  } = useFocusStore();

  React.useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, tick]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  return (
    <div className="h-full flex flex-col items-center justify-center relative bg-slate-50/50 overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />

      {/* Top Controls */}
      <div className="absolute top-10 left-10 flex items-center gap-3 text-slate-400">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Pomodoro</h1>
        </div>
      </div>
      
      <div className="absolute top-10 right-10 flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
          <Flame className="h-4 w-4 text-orange-500" />
          <span>3 Day Streak</span>
        </div>
        <Button variant="outline" size="icon" className="h-10 w-10 border-slate-200 bg-white">
          <Settings className="h-5 w-5 text-slate-500" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl w-full text-center space-y-16 relative z-10">
        <div className="space-y-6">
          <div className="flex justify-center">
            <Badge className="bg-blue-600/10 text-blue-700 hover:bg-blue-600/20 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full border border-blue-600/10 shadow-sm">
              Deep Work Protocol Active
            </Badge>
          </div>
          <h2 className="text-5xl font-bold tracking-tight text-slate-900 balance leading-[1.1]">Drafting graduation project report & technical analysis</h2>
          <div className="flex items-center justify-center gap-4">
             <div className="flex items-center gap-2 bg-white text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
               <div className="h-2 w-2 rounded-full bg-blue-600" />
               Academic Research
             </div>
             <Separator orientation="vertical" className="h-4 bg-slate-300" />
             <span className="text-sm text-slate-500 font-semibold tracking-wide">Block {sessionCount} of {totalSessions} • Total 2.5h</span>
          </div>
        </div>

        {/* Timer Circle */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-[450px] h-[450px] rounded-full border-2 border-slate-100 shadow-inner" />
          </div>
          <svg className="w-[420px] h-[420px] -rotate-90 relative">
            {/* Background track */}
            <circle
              cx="210"
              cy="210"
              r="200"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="4"
              strokeDasharray="4 8"
            />
            {/* Progress track */}
            <motion.circle
              cx="210"
              cy="210"
              r="200"
              fill="none"
              stroke="#2563eb"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 200}
              initial={{ strokeDashoffset: 2 * Math.PI * 200 }}
              animate={{ strokeDashoffset: (2 * Math.PI * 200) * (1 - progress / 100) }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </svg>
          
          <div className="absolute text-center">
            <motion.div 
              key={timeLeft}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[120px] font-bold tracking-tighter tabular-nums leading-none text-slate-900"
            >
              {formatTime(timeLeft)}
            </motion.div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mt-4">
              Focus Phase
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-8">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-14 w-14 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all text-slate-400 hover:text-slate-900"
            onClick={resetTimer}
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
          
          <Button 
            size="icon" 
            className="h-24 w-24 rounded-3xl bg-slate-900 hover:bg-slate-800 shadow-2xl shadow-slate-900/20 active:scale-95 transition-all text-white border-2 border-white"
            onClick={() => isActive ? stopFocus() : startFocus(null, 25)}
          >
            {isActive ? (
              <Pause className="h-10 w-10 fill-white" />
            ) : (
              <Play className="h-10 w-10 fill-white ml-1.5" />
            )}
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="h-14 w-14 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all text-slate-400 hover:text-slate-900"
          >
            <SkipForward className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Stats Overlay */}
      <div className="absolute bottom-10 flex items-center gap-10 px-10 py-6 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 backdrop-blur-sm">
        <StatItem label="Daily Average" value="4.2 Hours" icon={BarChart3} color="blue" />
        <Separator orientation="vertical" className="h-10" />
        <StatItem label="Tasks Completed" value="28 Tasks" icon={CheckCircle2} color="green" />
        <Separator orientation="vertical" className="h-10" />
        <StatItem label="Focus Score" value="92/100" icon={Target} color="purple" />
      </div>
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50'
  };

  return (
    <div className="flex items-center gap-4">
      <div className={cn("p-2.5 rounded-xl", colors[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-base font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}


