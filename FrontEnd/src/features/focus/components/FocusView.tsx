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
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <div className="min-h-screen max-h-screen bg-slate-50/50 relative overflow-hidden flex flex-col">
      {/* Decorative Blur */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="min-w-full flex flex-col min-h-[calc(100vh-2rem)] gap-8 relative z-10 justify-center items-center">
          
          {/* Header section */}
            <div className="flex items-center gap-3 text-slate-400 p-5 self-start">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Pomodoro</h1>
              </div>
            </div>
          
            
          

          {/* Main Content */}
          <div className="max-w-2xl w-full text-center py-2 flex-1 flex flex-col justify-center items-center">
            
            <div className="flex flex-col gap-2">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 max-w-xl mx-auto leading-tight">
                Drafting graduation project report & technical analysis
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
                  <div className="flex items-center gap-2 bg-white text-slate-600 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-600" />
                    Academic Research
                  </div>
                  <Separator orientation="vertical" className="hidden sm:block h-4 bg-slate-300" />
                  <span className="text-xs md:text-sm text-slate-500 font-semibold tracking-wide">
                    Block {sessionCount} of {totalSessions} • Total 2.5h
                  </span>
              </div>
            </div>

            {/* Timer Circle */}
            <div className="relative flex items-center justify-center my-10">
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-[360px] h-[360px] rounded-full border border-slate-100/60 shadow-inner bg-white/20 backdrop-blur-[2px]" />
              </div>
              <svg className="w-[340px] h-[340px] -rotate-90 relative">
                {/* Background track */}
                <circle
                  cx="170"
                  cy="170"
                  r="150"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  strokeDasharray="4 8"
                />
                {/* Progress track */}
                <motion.circle
                  cx="170"
                  cy="170"
                  r="150"
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 150}
                  initial={{ strokeDashoffset: 2 * Math.PI * 150 }}
                  animate={{ strokeDashoffset: (2 * Math.PI * 150) * (1 - progress / 100) }}
                  transition={{ duration: 0.5, ease: "linear" }}
                />
              </svg>
              
              <div className="absolute text-center">
                <motion.div 
                  key={timeLeft}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-6xl md:text-7xl font-bold tracking-tighter tabular-nums leading-none text-slate-900"
                >
                  {formatTime(timeLeft)}
                </motion.div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">
                  Focus Phase
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3 md:gap-6">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 md:h-14 md:w-14 rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all text-slate-400 hover:text-slate-900"
                onClick={resetTimer}
              >
                <RotateCcw className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
              
              <Button 
                size="icon" 
                className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-slate-900 hover:bg-slate-800 shadow-2xl shadow-slate-900/20 active:scale-95 transition-all text-white border-2 border-white"
                onClick={() => isActive ? stopFocus() : startFocus(null, 25)}
              >
                {isActive ? (
                  <Pause className="h-8 w-8 md:h-10 md:w-10 fill-white" />
                ) : (
                  <Play className="h-8 w-8 md:h-10 md:w-10 fill-white ml-1" />
                )}
              </Button>
            </div>
          </div>

        </div>
    </div>
  );
}
