import * as React from 'react';
import { 
  Clock, 
  FolderOpen, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  getActiveTimer, 
  startTimer, 
  pauseTimer, 
  resumeTimer, 
  stopTimer, 
  type TimeEntry 
} from '../services/timeTrackingService';

export function FocusView() {
  const { tasks, fetchTasks, categories } = useTaskStore();

  const [activeEntry, setActiveEntry] = React.useState<TimeEntry | null>(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showMinSessionWarning, setShowMinSessionWarning] = React.useState(false);
  const [isApiLoading, setIsApiLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // 1. Fetch tasks and restore active tracking session on mount
  React.useEffect(() => {
    fetchTasks();

    async function restoreSession() {
      try {
        setIsApiLoading(true);
        const active = await getActiveTimer();
        if (active) {
          setActiveEntry(active);
          setSelectedTaskId(active.taskId);
          setSeconds(active.currentSeconds);
          setIsRunning(!active.isPaused);
        }
      } catch (err) {
        console.error('Failed to restore active tracking session', err);
      } finally {
        setIsApiLoading(false);
      }
    }
    restoreSession();
  }, [fetchTasks]);

  // 2. Real-time timer ticker interval
  React.useEffect(() => {
    let interval: any = null;
    if (isRunning && !showMinSessionWarning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, showMinSessionWarning]);

  // 3. Format seconds as HH:MM:SS or MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const category = selectedTask ? categories.find((c) => c.id === selectedTask.categoryId) : null;
  
  const totalTimeSeconds = selectedTask ? selectedTask.durationInMinutes * 60 : 30 * 60;
  const progress = Math.min((seconds / totalTimeSeconds) * 100, 100);
  const progressExceeded = seconds > totalTimeSeconds;

  // Filter tasks to show only pending (active) items
  const pendingTasks = tasks.filter((t) => t.status !== 2);

  // Category Color matching (using identical palette as Sidebar/TaskItem)
  const CATEGORY_COLORS = [
    '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
    '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  ];
  const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : '#64748b';

  // ── API Playback Action Handlers ───────────────────────────────────────────
  
  const handleStart = async () => {
    if (!selectedTaskId) return;
    try {
      setIsApiLoading(true);
      setErrorMsg(null);
      const entry = await startTimer(selectedTaskId);
      setActiveEntry(entry);
      setIsRunning(true);
      setSeconds(0);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to start tracking session.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const handlePause = async () => {
    if (!activeEntry) return;
    try {
      setIsApiLoading(true);
      setErrorMsg(null);
      const entry = await pauseTimer(activeEntry.id);
      setActiveEntry(entry);
      setIsRunning(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to pause tracking.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeEntry) return;
    try {
      setIsApiLoading(true);
      setErrorMsg(null);
      const entry = await resumeTimer(activeEntry.id);
      setActiveEntry(entry);
      setIsRunning(true);
      
      // Fix: If backend DTO doesn't populate currentSeconds on resume, safely restore from accumulatedSeconds or retain current local seconds
      if (entry.currentSeconds) {
        setSeconds(entry.currentSeconds);
      } else if (entry.accumulatedSeconds) {
        setSeconds(entry.accumulatedSeconds);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to resume tracking.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    
    // 🚨 User Check: Bypass 5-minute minimum session period limit for testing Focus Mode
    await executeStop();
  };

  const executeStop = async () => {
    if (!activeEntry) return;
    try {
      setIsApiLoading(true);
      setErrorMsg(null);
      await stopTimer(activeEntry.id);
      
      // Reset states
      setActiveEntry(null);
      setSelectedTaskId(null);
      setSeconds(0);
      setIsRunning(false);
      setShowMinSessionWarning(false);
      
      // Force store refresh to update counts immediately
      await fetchTasks();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to stop tracking.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!activeEntry) return;
    try {
      setIsApiLoading(true);
      setErrorMsg(null);
      // Call stop on backend to close database tracker session, but discard locally
      await stopTimer(activeEntry.id);
      
      // Reset states without saving
      setActiveEntry(null);
      setSelectedTaskId(null);
      setSeconds(0);
      setIsRunning(false);
      setShowMinSessionWarning(false);
      
      await fetchTasks();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to discard session.');
    } finally {
      setIsApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-h-screen bg-slate-50/50 relative overflow-hidden flex flex-col">
      {/* Decorative Gradient Background Blur Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="min-w-full flex flex-col min-h-[calc(100vh-2rem)] gap-6 relative z-10 justify-start md:justify-center items-center py-6 px-4">
        
        {/* Header section */}
        <div className="flex items-center gap-3 text-slate-400 p-2 self-start max-w-4xl mx-auto w-full md:px-8">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
            <Clock className={cn("h-5 w-5 text-blue-600", isRunning && "animate-pulse")} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Stopwatch Tracking</h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Focus and track active tasks in real time</p>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="max-w-2xl w-full text-center flex-1 flex flex-col justify-center items-center gap-4">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-2xl w-full max-w-md flex items-center gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── Task Selector Area ────────────────────────────────────── */}
          {activeEntry === null ? (
            <div className="w-full max-w-md space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block text-left">
                Select active task to track
              </label>
              
              <div className="relative w-full">
                <select
                  value={selectedTaskId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedTaskId(val ? Number(val) : null);
                    setErrorMsg(null);
                  }}
                  disabled={isApiLoading}
                  className="w-full px-4 py-3 bg-white border border-slate-200/80 focus:border-blue-500 rounded-2xl shadow-sm text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <option value="">Choose a task...</option>
                  {pendingTasks.map((t) => {
                    const priorityLabel = t.priority >= 8 ? 'High' : t.priority > 4 ? 'Mid' : 'Low';
                    return (
                      <option key={t.id} value={t.id}>
                        [{priorityLabel}] {t.title}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Active Task Description Card ──────────────────────────── */}
          {selectedTask && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm max-w-md w-full mx-auto relative overflow-hidden transition-all hover:border-slate-300">
              {/* Left-edge priority indicator */}
              <div 
                className="absolute top-0 left-0 w-1.5 h-full" 
                style={{ 
                  backgroundColor: selectedTask.priority >= 8 
                    ? '#ef4444' // Red
                    : selectedTask.priority > 4 
                      ? '#d97706' // Warning Amber
                      : '#64748b' // Slate Grey
                }} 
              />
              
              <div className="pl-2 space-y-2.5 text-left">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                    selectedTask.priority >= 8 
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : selectedTask.priority > 4
                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                        : "bg-slate-100 text-slate-500 border border-slate-200/50"
                  )}>
                    {selectedTask.priority >= 8 ? 'High Importance' : selectedTask.priority > 4 ? 'Medium Importance' : 'Low Importance'}
                  </span>
                  {category && (
                    <span 
                      className="text-[9px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                    >
                      <FolderOpen className="h-3 w-3" />
                      {category.name}
                    </span>
                  )}
                </div>
                
                <h3 className="text-sm font-black text-slate-800 leading-snug">
                  {selectedTask.title}
                </h3>
                
                {selectedTask.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-semibold">
                    {selectedTask.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-slate-400">
                  <span>Planned Duration: {selectedTask.durationInMinutes} mins</span>
                  {activeEntry === null && (
                    <button
                      onClick={() => setSelectedTaskId(null)}
                      className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Change Task
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 🚨 5-Minute Session Limit Warning Alert Card */}
          {showMinSessionWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm max-w-md w-full mx-auto text-left animate-in fade-in zoom-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Session Too Short</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    Tracked sessions must be at least **5 minutes (300 seconds)** to be saved to your logs. 
                    You have currently focused for only **{formatTime(seconds)}**. 
                    Stopping now will discard this timer session.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setShowMinSessionWarning(false)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl shadow-xs"
                    >
                      Keep Focusing
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDiscard}
                      disabled={isApiLoading}
                      className="text-amber-800 hover:bg-amber-100 text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl"
                    >
                      Discard Session
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timer Circle */}
          <div className="relative flex items-center justify-center my-6 shrink-0 select-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[310px] h-[310px] rounded-full border border-slate-100/60 shadow-inner bg-white/20 backdrop-blur-[2px]" />
            </div>
            
            <svg className="w-[290px] h-[290px] -rotate-90 relative">
              {/* Background dashed track */}
              <circle
                cx="145"
                cy="145"
                r="130"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="4"
                strokeDasharray="4 8"
              />
              {/* Progress track */}
              <motion.circle
                cx="145"
                cy="145"
                r="130"
                fill="none"
                stroke={isRunning ? (progressExceeded ? '#ef4444' : '#2563eb') : '#94a3b8'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 130}
                initial={{ strokeDashoffset: 2 * Math.PI * 130 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 130) * (1 - progress / 100) }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </svg>
            
            <div className="absolute text-center flex flex-col items-center">
              <motion.div 
                key={seconds}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "text-5xl font-black tracking-tighter tabular-nums leading-none",
                  progressExceeded ? "text-red-500" : "text-slate-800"
                )}
              >
                {formatTime(seconds)}
              </motion.div>
              
              <div className="flex items-center gap-1.5 mt-3">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full inline-block",
                  isRunning 
                    ? "bg-blue-500 animate-ping" 
                    : activeEntry !== null 
                      ? "bg-amber-400" 
                      : "bg-slate-300"
                )} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {isRunning 
                    ? "Active Tracking" 
                    : activeEntry !== null 
                      ? "Paused Tracking" 
                      : "Ready to Focus"}
                </span>
              </div>
            </div>
          </div>

          {/* Playback Action Buttons */}
          <div className="flex items-center justify-center gap-5 p-2 rounded-2xl max-w-xs w-full select-none">
            {/* Start / Pause / Resume Button */}
            <Button
              onClick={
                activeEntry === null 
                  ? handleStart 
                  : isRunning 
                    ? handlePause 
                    : handleResume
              }
              disabled={isApiLoading || selectedTaskId === null || showMinSessionWarning}
              className={cn(
                "h-12 rounded-2xl flex-1 font-bold text-xs shadow-md transition-all active:scale-98 text-white border-2 border-white",
                activeEntry === null
                  ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/10"
                  : isRunning
                    ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
              )}
            >
              {isApiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : activeEntry === null ? (
                "Start Session"
              ) : isRunning ? (
                "Pause"
              ) : (
                "Resume"
              )}
            </Button>

            {/* Stop Timer Button */}
            {activeEntry !== null && (
              <Button
                onClick={handleStop}
                disabled={isApiLoading || showMinSessionWarning}
                className="h-12 flex-2 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-red-600/10 border-2 border-white transition-all active:scale-98"
              >
                {isApiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  "Complete Session"
                )}
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
