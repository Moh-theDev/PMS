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
  const { tasks, fetchTasks, categories, tags, fetchCategories, fetchTags } = useTaskStore();

  const [activeEntry, setActiveEntry] = React.useState<TimeEntry | null>(null);
  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [seconds, setSeconds] = React.useState(0);
  const [isRunning, setIsRunning] = React.useState(false);
  const [showMinSessionWarning, setShowMinSessionWarning] = React.useState(false);
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
    await executeStop();
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
          {selectedTask && (
            <div className="bg-white border border-slate-200/95 rounded-2xl p-4 shadow-xs max-w-xs w-full relative overflow-hidden transition-all hover:border-slate-300 select-none text-left">
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
                
                <div className="flex items-center justify-between pt-0.5 text-[10px] font-bold text-slate-400">
                  <span>{selectedTask.durationInMinutes} min planned</span>
                  {activeEntry === null && (
                    <button
                      onClick={() => setSelectedTaskId(null)}
                      className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Change
                    </button>
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
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Session Too Short</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    Minimum 5 minutes required. Currently: <strong>{formatTime(seconds)}</strong>. Stopping now discards this session.
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
                      Discard
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
          <div className="flex items-center justify-center gap-3 max-w-xs w-full select-none">
            {/* Start / Pause / Resume */}
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
                disabled={isApiLoading || showMinSessionWarning}
                className="h-11 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all active:scale-98"
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
