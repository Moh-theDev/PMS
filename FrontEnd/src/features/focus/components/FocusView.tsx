import * as React from 'react';
import { 
  Clock, 
  FolderOpen, 
  AlertTriangle,
  Loader2,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Tag,
  Inbox,
  Check
} from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  getActiveTimer, 
  startTimer, 
  pauseTimer, 
  resumeTimer, 
  stopTimer, 
  getTaskSessions,
  type TimeEntry 
} from '../services/timeTrackingService';

export function FocusView() {
  const { tasks, fetchTasks, categories, tags, fetchCategories, fetchTags } = useTaskStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeEntry, setActiveEntry] = React.useState<TimeEntry | null>(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showMinSessionWarning, setShowMinSessionWarning] = React.useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = React.useState(false);
  const [isManualLogOpen, setIsManualLogOpen] = React.useState(false);
  const [manualHours, setManualHours] = React.useState(0);
  const [manualMinutes, setManualMinutes] = React.useState(25);
  const [manualDate, setManualDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [taskFocusedSeconds, setTaskFocusedSeconds] = React.useState(0);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isApiLoading, setIsApiLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Upgraded custom dropdown states
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [dropdownView, setDropdownView] = React.useState<'tasks' | 'filters'>('tasks');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState<{
    type: 'all' | 'today' | 'tomorrow' | 'inbox' | 'category' | 'tag';
    id?: number;
    name?: string;
  }>({ type: 'all' });
  const [isOverdueCollapsed, setIsOverdueCollapsed] = React.useState(false);

  // Ref-based click-outside to close dropdown (no overlay div needed)
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const isAutoStartingRef = React.useRef(
    localStorage.getItem('pms_auto_start_focus') === 'true' || 
    !!(location.state && (location.state as any).autoStart)
  );
  React.useEffect(() => {
    if (!isDropdownOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isDropdownOpen]);

  // Helper to format overdue date (e.g., "Mar 5")
  const formatOverdueDate = (isoStr: string) => {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  // Persist selectedTaskId to localStorage
  React.useEffect(() => {
    if (selectedTaskId !== null) {
      localStorage.setItem('pms_selected_focus_task_id', String(selectedTaskId));
    } else {
      localStorage.removeItem('pms_selected_focus_task_id');
    }
  }, [selectedTaskId]);

  // Restore selectedTaskId from localStorage if no active session
  React.useEffect(() => {
    if (tasks.length > 0 && selectedTaskId === null && !activeEntry) {
      const storedTaskIdStr = localStorage.getItem('pms_selected_focus_task_id');
      if (storedTaskIdStr) {
        const storedId = Number(storedTaskIdStr);
        const existsAndActive = tasks.some(t => t.id === storedId && t.status !== 2);
        if (existsAndActive) {
          setSelectedTaskId(storedId);
        }
      }
    }
  }, [tasks, selectedTaskId, activeEntry]);

  // 1. Fetch tasks, categories, tags and restore active tracking session on mount
  React.useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchTags();

    async function restoreSession() {
      if (isAutoStartingRef.current) {
        return;
      }
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
  }, [fetchTasks, fetchCategories, fetchTags]);

  // Auto-start timer session triggered by location route transitions (from context menu)
  React.useEffect(() => {
    const hasLocalStorageAutoStart = localStorage.getItem('pms_auto_start_focus') === 'true';
    const hasStateAutoStart = !!(location.state && (location.state as any).autoStart);

    if (hasLocalStorageAutoStart || hasStateAutoStart) {
      isAutoStartingRef.current = true;
      let targetId: number | null = null;

      if (hasStateAutoStart) {
        targetId = Number((location.state as any).taskId);
        // Clear router state to prevent loop
        navigate(location.pathname, { replace: true, state: {} });
      } else if (hasLocalStorageAutoStart) {
        const storedTaskIdStr = localStorage.getItem('pms_selected_focus_task_id');
        targetId = storedTaskIdStr ? Number(storedTaskIdStr) : null;
      }

      // Always clear localStorage flag
      localStorage.removeItem('pms_auto_start_focus');

      if (targetId) {
        setSelectedTaskId(targetId);
        localStorage.setItem('pms_selected_focus_task_id', String(targetId));

        const startSessionDirectly = async () => {
          try {
            setIsApiLoading(true);
            setErrorMsg(null);
            const entry = await startTimer(targetId!);
            if (entry.errors && entry.errors.length > 0) {
              setErrorMsg(entry.errors[0]);
              // Try to restore existing session on error
              const active = await getActiveTimer();
              if (active) {
                setActiveEntry(active);
                setSelectedTaskId(active.taskId);
                setSeconds(active.currentSeconds);
                setIsRunning(!active.isPaused);
              }
            } else {
              setActiveEntry(entry);
              setSeconds(0);
              setIsRunning(true);
            }
          } catch (err: any) {
            setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to start tracking session.');
            // Try to restore existing session on error
            try {
              const active = await getActiveTimer();
              if (active) {
                setActiveEntry(active);
                setSelectedTaskId(active.taskId);
                setSeconds(active.currentSeconds);
                setIsRunning(!active.isPaused);
              }
            } catch (restoreErr) {
              console.error('Failed to restore session after start error', restoreErr);
            }
          } finally {
            setIsApiLoading(false);
            isAutoStartingRef.current = false;
          }
        };
        startSessionDirectly();
      } else {
        isAutoStartingRef.current = false;
      }
    }
  }, [location, navigate]);

  // 2. Real-time timer ticker interval
  React.useEffect(() => {
    let interval: any = null;
    if (isRunning && !showMinSessionWarning && !showDiscardConfirm) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, showMinSessionWarning, showDiscardConfirm]);

  // Helper to format focused seconds (e.g. 1h 25m)
  const formatFocusedTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0m';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    
    return parts.join(' ');
  };

  const loadTaskFocusedTime = React.useCallback(async () => {
    if (!selectedTaskId) {
      setTaskFocusedSeconds(0);
      return;
    }
    try {
      const dbSessions = await getTaskSessions(selectedTaskId);
      const discardedIds = JSON.parse(localStorage.getItem('pms_discarded_sessions') || '[]');
      const manualSessions = JSON.parse(localStorage.getItem('pms_manual_sessions') || '[]');
      
      const activeDbSeconds = dbSessions
        .filter((s) => !discardedIds.includes(s.id))
        .reduce((sum, s) => sum + (s.accumulatedSeconds || 0), 0);
        
      const manualSeconds = manualSessions
        .filter((s: any) => s.taskId === selectedTaskId)
        .reduce((sum: number, s: any) => sum + (s.accumulatedSeconds || 0), 0);
      
      setTaskFocusedSeconds(activeDbSeconds + manualSeconds);
    } catch (err) {
      console.error('Failed to load task focused time:', err);
      setTaskFocusedSeconds(0);
    }
  }, [selectedTaskId]);

  React.useEffect(() => {
    loadTaskFocusedTime();
  }, [selectedTaskId, activeEntry, loadTaskFocusedTime]);

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
  const pendingTasks = tasks.filter((t) => t.status !== 2 && t.status !== 3);

  // Filter based on selected category/tag/view
  const filteredByListAndTag = pendingTasks.filter((t) => {
    if (activeFilter.type === 'category') {
      return t.categoryId === activeFilter.id;
    }
    if (activeFilter.type === 'tag') {
      return t.tags && t.tags.includes(activeFilter.name || '');
    }
    if (activeFilter.type === 'today') {
      if (!t.deadline || t.deadline.startsWith('0001-01-01')) return false;
      const dStr = t.deadline.split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      return dStr === todayStr;
    }
    if (activeFilter.type === 'tomorrow') {
      if (!t.deadline || t.deadline.startsWith('0001-01-01')) return false;
      const dStr = t.deadline.split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      return dStr === tomorrowStr;
    }
    if (activeFilter.type === 'inbox') {
      return t.categoryId === undefined || t.categoryId === null;
    }
    return true; // 'all'
  });

  // Apply search query filter
  const finalFilteredTasks = filteredByListAndTag.filter((t) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  });

  // Partition into Overdue vs Regular
  const overdueTasks = finalFilteredTasks.filter((t) => {
    if (!t.deadline || t.deadline.startsWith('0001-01-01')) return false;
    const d = new Date(t.deadline);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });

  const regularTasks = finalFilteredTasks.filter((t) => !overdueTasks.includes(t));

  const handleSelectTask = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setErrorMsg(null);
  };

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
      if (entry.errors && entry.errors.length > 0) {
        setErrorMsg(entry.errors[0]);
        return;
      }
      setActiveEntry(entry);
      setIsRunning(true);
      setSeconds(0);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to start tracking session.');
    } finally {
      setIsApiLoading(false);
    }
  };

  // Auto-start timer session consolidated directly inside the restoreSession mount handler

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
    if (seconds < 300) {
      setShowMinSessionWarning(true);
    } else {
      await executeStop();
    }
  };

  const executeStop = async () => {
    if (!activeEntry) return;
    try {
      setIsApiLoading(true);
      setErrorMsg(null);
      await stopTimer(activeEntry.id);
      
      setActiveEntry(null);
      setSelectedTaskId(null);
      setSeconds(0);
      setIsRunning(false);
      setShowMinSessionWarning(false);
      setShowDiscardConfirm(false);
      
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
      await stopTimer(activeEntry.id);
      
      // Save to discarded list in localStorage
      const discardedIds = JSON.parse(localStorage.getItem('pms_discarded_sessions') || '[]');
      discardedIds.push(activeEntry.id);
      localStorage.setItem('pms_discarded_sessions', JSON.stringify(discardedIds));
      
      setActiveEntry(null);
      setSelectedTaskId(null);
      setSeconds(0);
      setIsRunning(false);
      setShowMinSessionWarning(false);
      setShowDiscardConfirm(false);
      
      await fetchTasks();
      
      setToastMessage("Focus session discarded.");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.errors?.[0] || err.message || 'Failed to discard session.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const handleSaveManualLog = () => {
    if (!selectedTaskId) return;
    const totalSeconds = (manualHours * 3600) + (manualMinutes * 60);
    if (totalSeconds <= 0) {
      setErrorMsg("Please enter a focus duration greater than 0 minutes.");
      return;
    }
    
    try {
      const manualSessions = JSON.parse(localStorage.getItem('pms_manual_sessions') || '[]');
      const newManualSession = {
        id: `manual_${Date.now()}`,
        taskId: selectedTaskId,
        accumulatedSeconds: totalSeconds,
        startedAt: new Date(manualDate).toISOString(),
        createdAt: new Date().toISOString(),
        endedAt: new Date(manualDate).toISOString()
      };
      manualSessions.push(newManualSession);
      localStorage.setItem('pms_manual_sessions', JSON.stringify(manualSessions));
      
      setIsManualLogOpen(false);
      loadTaskFocusedTime();
      
      setToastMessage("Focus time logged successfully!");
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setErrorMsg("Failed to save manually logged focus session.");
    }
  };

  // Active filter label for the switcher button
  const activeFilterLabel = () => {
    switch (activeFilter.type) {
      case 'all': return 'All Active Tasks';
      case 'today': return "Today's Tasks";
      case 'tomorrow': return "Tomorrow's Tasks";
      case 'inbox': return 'Inbox Tasks';
      case 'category': return `List: ${activeFilter.name}`;
      case 'tag': return `Tag: ${activeFilter.name}`;
    }
  };

  const activeFilterIcon = () => {
    switch (activeFilter.type) {
      case 'all': return <Clock className="h-3 w-3 text-blue-500" />;
      case 'today': return <Calendar className="h-3 w-3 text-emerald-500" />;
      case 'tomorrow': return <Calendar className="h-3 w-3 text-amber-500" />;
      case 'inbox': return <Inbox className="h-3 w-3 text-indigo-500" />;
      case 'category': return <FolderOpen className="h-3 w-3 text-violet-500" />;
      case 'tag': return <Tag className="h-3 w-3 text-pink-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-y-auto flex flex-col pb-10">
      {/* Decorative Gradient Background Blur Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Header section (top-left corner) ─────────────────────────────── */}
      <div className="flex items-center gap-3 text-slate-400 px-6 py-5 md:pl-10 md:pt-8 select-none shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
          <Clock className={cn("h-4 w-4 text-blue-600", isRunning && "animate-pulse")} />
        </div>
        <div>
          <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight">Time Tracking</h1>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Focus and track active tasks in real time</p>
        </div>
      </div>

      {/* ── Main Scrollable Content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5 py-4">
        <div className="max-w-lg w-full flex flex-col items-center gap-10">

          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-2xl w-full flex items-center gap-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ── Task Selector Dropdown ─────────────────────────────────────── */}
          {activeEntry === null && (
            <div ref={dropdownRef} className="w-full max-w-xs relative">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block text-center select-none">
                Select task to track
              </label>
              
              <div className="relative w-full">
                {/* Trigger Button — compact */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setDropdownView('tasks');
                  }}
                  disabled={isApiLoading}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-xl shadow-xs text-xs font-semibold text-slate-700 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:cursor-not-allowed"
                >
                  <span className="truncate flex items-center gap-2 min-w-0">
                    {selectedTask ? (
                      <>
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ 
                            backgroundColor: selectedTask.priority >= 8 
                              ? '#ef4444' 
                              : selectedTask.priority > 4 
                                ? '#f59e0b' 
                                : '#3b82f6' 
                          }} 
                        />
                        <span className="truncate">{selectedTask.title}</span>
                      </>
                    ) : selectedTaskId ? (
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                        <span className="truncate">Loading selected task...</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Choose a task to track...</span>
                    )}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-2", isDropdownOpen && "rotate-180")} />
                </button>

                {/* Floating Dropdown Panel — compact */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 shadow-xl rounded-2xl z-50 text-left overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    
                    {/* Tasks List View */}
                    {dropdownView === 'tasks' ? (
                      <div className="flex flex-col" style={{ maxHeight: '260px' }}>
                        
                        {/* Search + Filter row */}
                        <div className="p-2 pb-1.5 border-b border-slate-100 shrink-0 space-y-1.5">
                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2 h-3 w-3 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search tasks..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-7 pr-7 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-all"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Active Filter Switcher */}
                          <button
                            type="button"
                            onClick={() => setDropdownView('filters')}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600 transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              {activeFilterIcon()}
                              {activeFilterLabel()}
                            </span>
                            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                          </button>
                        </div>

                        {/* Scrollable task list */}
                        <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5">
                          
                          {/* Overdue Section (Collapsible) */}
                          {overdueTasks.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setIsOverdueCollapsed(!isOverdueCollapsed)}
                                className="w-full flex items-center justify-between px-2 py-1 hover:bg-slate-50 rounded-lg text-left cursor-pointer"
                              >
                                <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                  Overdue
                                  <span className="bg-red-50 text-red-600 text-[9px] font-extrabold px-1 py-0.5 rounded-full">
                                    {overdueTasks.length}
                                  </span>
                                </span>
                                <ChevronDown className={cn("h-3 w-3 text-red-500 transition-transform duration-200", isOverdueCollapsed && "-rotate-90")} />
                              </button>

                              {!isOverdueCollapsed && (
                                <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
                                  {overdueTasks.map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => handleSelectTask(t.id)}
                                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left hover:bg-red-50/40 transition-all group cursor-pointer"
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-700 truncate">{t.title}</span>
                                      </div>
                                      {t.deadline && (
                                        <span className="text-[10px] font-bold text-red-500 ml-2 shrink-0">
                                          {formatOverdueDate(t.deadline)}
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Regular Tasks */}
                          {regularTasks.length > 0 ? (
                            <div>
                              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-2 py-1 select-none">
                                Tasks
                              </div>
                              {regularTasks.map((t) => {
                                const priorityColor = t.priority >= 8 ? '#ef4444' : t.priority > 4 ? '#f59e0b' : '#3b82f6';
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleSelectTask(t.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-all cursor-pointer"
                                  >
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-all"
                                      style={{ borderColor: priorityColor, backgroundColor: selectedTaskId === t.id ? priorityColor : 'transparent' }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-semibold text-slate-700 truncate">{t.title}</div>
                                      {t.description && (
                                        <div className="text-[10px] text-slate-400 truncate">{t.description}</div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            overdueTasks.length === 0 && (
                              <div className="text-center py-4 text-slate-400 text-xs font-semibold select-none">
                                No tasks found
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Filters Picker View */
                      <div className="p-2 space-y-1 animate-in fade-in duration-150" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => setDropdownView('tasks')}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer mb-1"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Back
                        </button>

                        {/* Views */}
                        <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-2 py-1 select-none">Views</div>
                        {[
                          { type: 'all', name: 'All Active Tasks', icon: Clock, color: 'text-blue-500' },
                          { type: 'today', name: "Today's Tasks", icon: Calendar, color: 'text-emerald-500' },
                          { type: 'tomorrow', name: "Tomorrow's Tasks", icon: Calendar, color: 'text-amber-500' },
                          { type: 'inbox', name: 'Inbox Tasks', icon: Inbox, color: 'text-indigo-500' },
                        ].map((item) => (
                          <button
                            key={item.type}
                            type="button"
                            onClick={() => {
                              setActiveFilter({ type: item.type as any });
                              setDropdownView('tasks');
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <item.icon className={cn("h-3.5 w-3.5 shrink-0", item.color)} />
                              {item.name}
                            </span>
                            {activeFilter.type === item.type && (
                              <Check className="h-3 w-3 text-blue-600 shrink-0" />
                            )}
                          </button>
                        ))}

                        {/* Lists */}
                        {categories.length > 0 && (
                          <>
                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-2 pt-2 pb-1 select-none">Lists</div>
                            {categories.map((c) => {
                              const isSelected = activeFilter.type === 'category' && activeFilter.id === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveFilter({ type: 'category', id: c.id, name: c.name });
                                    setDropdownView('tasks');
                                  }}
                                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 cursor-pointer"
                                >
                                  <span className="flex items-center gap-2">
                                    <span 
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: c.color || '#64748b' }}
                                    />
                                    {c.name}
                                  </span>
                                  {isSelected && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </>
                        )}

                        {/* Tags */}
                        {tags && tags.length > 0 && (
                          <>
                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest px-2 pt-2 pb-1 select-none">Tags</div>
                            {tags.map((tg) => {
                              const isSelected = activeFilter.type === 'tag' && activeFilter.name === tg.name;
                              return (
                                <button
                                  key={tg.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveFilter({ type: 'tag', name: tg.name });
                                    setDropdownView('tasks');
                                  }}
                                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 cursor-pointer"
                                >
                                  <span className="flex items-center gap-2">
                                    <Tag className="h-3 w-3 text-slate-400 shrink-0" />
                                    {tg.name}
                                  </span>
                                  {isSelected && <Check className="h-3 w-3 text-blue-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Active Task Card ────────────────────────────────────────────── */}
          {activeEntry !== null && !selectedTask && (
            <div className="bg-white border border-slate-200/95 rounded-2xl p-4 shadow-xs max-w-sm w-full relative overflow-hidden animate-pulse select-none text-left h-24 flex items-center justify-center">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                <span>Loading task details...</span>
              </div>
            </div>
          )}

          {selectedTask && (
            <div className="bg-white border border-slate-200/95 rounded-2xl p-4 shadow-xs max-w-sm w-full relative overflow-hidden transition-all hover:border-slate-300 select-none text-left">
              {/* Left-edge priority indicator */}
              <div 
                className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" 
                style={{ 
                  backgroundColor: selectedTask.priority >= 8 
                    ? '#ef4444'
                    : selectedTask.priority > 4 
                      ? '#d97706'
                      : '#3b82f6'
                }} 
              />
              
              <div className="pl-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider",
                    selectedTask.priority >= 8 
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : selectedTask.priority > 4
                        ? "bg-amber-50 text-amber-600 border border-amber-100"
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                  )}>
                    {selectedTask.priority >= 8 ? 'High' : selectedTask.priority > 4 ? 'Medium' : 'Low'}
                  </span>
                  {category && (
                    <span 
                      className="text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded-md truncate max-w-[120px]"
                      style={{ backgroundColor: `${categoryColor}15`, color: categoryColor }}
                    >
                      <FolderOpen className="h-2.5 w-2.5 shrink-0" />
                      {category.name}
                    </span>
                  )}
                </div>
                
                <h3 className="text-sm font-black text-slate-800 leading-snug line-clamp-2">
                  {selectedTask.title}
                </h3>
                
                {selectedTask.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 leading-relaxed font-semibold">
                    {selectedTask.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-2 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Planned: {selectedTask.durationInMinutes}m</span>
                    <span className="opacity-40">•</span>
                    <span className="text-blue-600">Focused: {formatFocusedTime(taskFocusedSeconds)}</span>
                  </div>
                  {activeEntry === null && (
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => {
                          setManualHours(0);
                          setManualMinutes(25);
                          setManualDate(new Date().toISOString().split('T')[0]);
                          setIsManualLogOpen(true);
                        }}
                        className="text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        Log Time
                      </button>
                      <button
                        onClick={() => setSelectedTaskId(null)}
                        className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 🚨 Session Warning */}
          {showMinSessionWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm max-w-xs w-full text-left animate-in fade-in zoom-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Keep focusing?</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    You've been focusing for less than 5 minutes. To keep your history clean and accurate, sessions this short won't be saved. Would you like to keep focusing or discard this session?
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setShowMinSessionWarning(false)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Keep Focusing
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleDiscard}
                      disabled={isApiLoading}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl cursor-pointer active:scale-95"
                    >
                      Discard Session
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🚨 Discard Session Confirmation */}
          {showDiscardConfirm && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm max-w-xs w-full text-left animate-in fade-in zoom-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">Discard Session?</h4>
                  <p className="text-[11px] text-rose-700 leading-relaxed font-semibold">
                    Are you sure you want to discard this focus session? All tracked time from this session will be lost and not saved.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleDiscard}
                      disabled={isApiLoading}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl shadow-xs cursor-pointer active:scale-95"
                    >
                      Yes, Discard
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDiscardConfirm(false)}
                      className="text-rose-800 hover:bg-rose-100 text-[10px] font-bold px-3 py-1.5 h-7 rounded-xl cursor-pointer active:scale-95"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Timer Circle ───────────────────────────────────────────────── */}
          <div className="relative flex items-center justify-center shrink-0 select-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[260px] h-[260px] rounded-full border border-slate-100/60 shadow-inner bg-white/20 backdrop-blur-[2px]" />
            </div>
            
            <svg className="w-[240px] h-[240px] -rotate-90 relative">
              {/* Background dashed track */}
              <circle
                cx="120"
                cy="120"
                r="108"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="4"
                strokeDasharray="4 8"
              />
              {/* Progress track */}
              <motion.circle
                cx="120"
                cy="120"
                r="108"
                fill="none"
                stroke={isRunning ? (progressExceeded ? '#ef4444' : '#2563eb') : '#94a3b8'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 108}
                initial={{ strokeDashoffset: 2 * Math.PI * 108 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 108) * (1 - progress / 100) }}
                transition={{ duration: 0.5, ease: "linear" }}
              />
            </svg>

            <div className="absolute text-center flex flex-col items-center">
              <motion.div 
                key={seconds}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "text-4xl font-black tracking-tighter tabular-nums leading-none",
                  progressExceeded ? "text-red-500" : "text-slate-800"
                )}
              >
                {formatTime(seconds)}
              </motion.div>
              
              <div className="flex items-center gap-1.5 mt-2">
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
                      ? "Paused" 
                      : "Ready to Focus"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Playback Buttons ───────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-3 max-w-sm w-full select-none">
            {/* Start / Pause / Resume */}
            <Button
              onClick={
                activeEntry === null 
                  ? handleStart 
                  : isRunning 
                    ? handlePause 
                    : handleResume
              }
              disabled={isApiLoading || selectedTaskId === null || showMinSessionWarning || showDiscardConfirm}
              className={cn(
                "h-11 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98 text-white",
                activeEntry === null
                  ? "bg-slate-900 hover:bg-slate-800 shadow-slate-900/10 disabled:bg-slate-300"
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

            {/* Stop / Complete */}
            {activeEntry !== null && (
              <Button
                onClick={handleStop}
                disabled={isApiLoading || showMinSessionWarning || showDiscardConfirm}
                className="h-11 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all active:scale-98"
              >
                {isApiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  "Complete Session"
                )}
              </Button>
            )}

            {/* Discard Session */}
            {activeEntry !== null && (
              <Button
                onClick={() => setShowDiscardConfirm(true)}
                disabled={isApiLoading || showMinSessionWarning || showDiscardConfirm}
                className="h-11 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 shadow-sm transition-all active:scale-98 px-4 cursor-pointer"
              >
                Discard
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* ── Manual Time Logging Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {isManualLogOpen && selectedTask && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-6 max-w-sm w-full relative flex flex-col gap-4 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsManualLogOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Log Focus Time</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-relaxed">
                  Add manual focus time for:
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {selectedTask.title}
                </div>
              </div>

              {/* Inputs grid */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  {/* Hours Input */}
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={manualHours}
                      onChange={(e) => setManualHours(Math.max(0, Math.min(24, parseInt(e.target.value) || 0)))}
                      className="w-full text-center font-bold text-sm bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Minutes Input */}
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualMinutes}
                      onChange={(e) => setManualMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-full text-center font-bold text-sm bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Date Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Date Focused</label>
                  <input
                    type="date"
                    value={manualDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full font-bold text-xs bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-700"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={handleSaveManualLog}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex-1 h-10 shadow-sm cursor-pointer active:scale-98"
                >
                  Log Session
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsManualLogOpen(false)}
                  className="text-slate-500 hover:bg-slate-100 font-bold text-xs rounded-xl h-10 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-4 py-3.5 rounded-xl shadow-lg shadow-emerald-900/10 text-emerald-800 text-xs font-bold max-w-xs sm:max-w-sm"
          >
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="flex-1 leading-relaxed">{toastMessage}</span>
            <button 
              type="button"
              onClick={() => setToastMessage(null)} 
              className="ml-2 p-0.5 text-emerald-500 hover:text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
