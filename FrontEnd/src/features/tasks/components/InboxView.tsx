import * as React from 'react';
import { useParams, useSearchParams, useOutletContext } from 'react-router-dom';
import { Filter, ListFilter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskStatus, type UpdateTaskDto } from '@/types/index';
import { TaskQuickCreate } from './TaskQuickCreate';
import { TaskList } from './TaskList';
import { TaskDetailPanel } from './TaskDetailPanel';
import { ResizableDivider } from './ResizableDivider';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { CalendarViewMode } from './CalendarViewMode';
import { TimelineViewMode } from './TimelineViewMode';
import { TaskContextMenu } from './TaskContextMenu';
import { cn } from '@/lib/utils';

export function InboxView() {
  const { listId = 'inbox', tagId } = useParams();
  const [searchParams] = useSearchParams();
  const paramTaskId = searchParams.get('taskId');

  const {
    tasks,
    categories,
    tags,
    isLoading,
    fetchTasks,
    fetchCategories,
    fetchTags,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    resolveDelete,
    assignTags,
    removeTag,
    getTasksByList,
  } = useTaskStore();

  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const panelRef = React.useRef<HTMLElement | null>(null);

  // Sidebar Open/Collapse Context from Layout
  const outletCtx = useOutletContext<any>();
  const sidebarOpen = outletCtx?.sidebarOpen ?? true;

  // View settings toggles
  const [showOverdue, setShowOverdue] = React.useState(true);
  const [showCompleted, setShowCompleted] = React.useState(true);
  const [showCancelled, setShowCancelled] = React.useState(true);

  // Upcoming views switch state (persisted in localStorage)
  const [upcomingViewMode, setUpcomingViewMode] = React.useState<'list' | 'calendar' | 'timeline'>(() => {
    const saved = localStorage.getItem('upcomingViewMode');
    return (saved as 'list' | 'calendar' | 'timeline') || 'list';
  });

  const handleUpcomingViewModeChange = (mode: 'list' | 'calendar' | 'timeline') => {
    setUpcomingViewMode(mode);
    localStorage.setItem('upcomingViewMode', mode);
  };

  // Client-side Filter settings
  const [searchQuery, setSearchQuery] = React.useState('');
  const [priorityFilters, setPriorityFilters] = React.useState<('high' | 'medium' | 'low')[]>(['high', 'medium', 'low']);
  const [selectedListIds, setSelectedListIds] = React.useState<string[]>([]);
  const [selectedTagNames, setSelectedTagNames] = React.useState<string[]>([]);
  const [dateFilter, setDateFilter] = React.useState<'all' | 'today' | 'tomorrow' | 'week' | 'month' | 'no-deadline' | 'custom'>('all');
  const [filterCustomStart, setFilterCustomStart] = React.useState<string>('');
  const [filterCustomEnd, setFilterCustomEnd] = React.useState<string>('');

  // Client-side Sorting settings
  const [sortBy, setSortBy] = React.useState<'none' | 'dueDate' | 'priority' | 'alphabetical'>('none');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Synchronise selection state with URL taskId parameter if provided (e.g. from Search Modal)
  React.useEffect(() => {
    if (paramTaskId) {
      setSelectedTaskId(Number(paramTaskId));
    }
  }, [paramTaskId]);

  // Conflict modal state
  const [conflictModalOpen, setConflictModalOpen] = React.useState(false);
  const [conflictMessage, setConflictMessage] = React.useState('');
  const [conflictOptions, setConflictOptions] = React.useState<string[]>([]);
  const [conflictedTaskId, setConflictedTaskId] = React.useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    task: any;
  } | null>(null);

  React.useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchTags();
  }, [fetchTasks, fetchCategories, fetchTags]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Base list of tasks (filtered by route listId/tagId)
  const baseTasks = React.useMemo(() => {
    const currentTag = tags.find((t) => String(t.id) === tagId || t.name === tagId);
    if (tagId) {
      return tasks.filter((t) => currentTag && t.tags?.includes(currentTag.name));
    }
    return getTasksByList(listId);
  }, [tasks, listId, tagId, tags, getTasksByList]);

  // Client-side filtering & sorting engine
  const processedTasks = React.useMemo(() => {
    let result = [...baseTasks];

    // 1. Text Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // 2. Priority Filter
    result = result.filter((t) => {
      const p = t.priority;
      let level: 'high' | 'medium' | 'low' = 'low';
      if (p >= 8) level = 'high';
      else if (p >= 5) level = 'medium';
      
      return priorityFilters.includes(level);
    });

    // 3. Category / List Filter
    if (selectedListIds.length > 0) {
      result = result.filter((t) => {
        const catIdStr = t.categoryId ? String(t.categoryId) : 'none';
        return selectedListIds.includes(catIdStr);
      });
    }

    // 4. Tag Filter
    if (selectedTagNames.length > 0) {
      result = result.filter((t) => {
        if (!t.tags || t.tags.length === 0) {
          return selectedTagNames.includes('none');
        }
        return t.tags.some((tagName) => selectedTagNames.includes(tagName));
      });
    }

    // 4.5 Date Filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const oneWeekLater = new Date(today);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      const oneWeekLaterStr = oneWeekLater.toISOString().split('T')[0];

      const oneMonthLater = new Date(today);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
      const oneMonthLaterStr = oneMonthLater.toISOString().split('T')[0];

      result = result.filter((t) => {
        const hasDeadline = t.deadline && !t.deadline.startsWith('0001-01-01');
        
        if (dateFilter === 'no-deadline') {
          return !hasDeadline;
        }
        
        if (!t.deadline || t.deadline.startsWith('0001-01-01')) return false;
        const tDateStr = t.deadline.split('T')[0];

        if (dateFilter === 'today') {
          return tDateStr === todayStr;
        } else if (dateFilter === 'tomorrow') {
          return tDateStr === tomorrowStr;
        } else if (dateFilter === 'week') {
          return tDateStr >= todayStr && tDateStr <= oneWeekLaterStr;
        } else if (dateFilter === 'month') {
          return tDateStr >= todayStr && tDateStr <= oneMonthLaterStr;
        } else if (dateFilter === 'custom') {
          if (filterCustomStart && filterCustomEnd) {
            return tDateStr >= filterCustomStart && tDateStr <= filterCustomEnd;
          } else if (filterCustomStart) {
            return tDateStr >= filterCustomStart;
          } else if (filterCustomEnd) {
            return tDateStr <= filterCustomEnd;
          }
          return true;
        }
        return true;
      });
    }

    // 5. Overdue / Completed / Cancelled visibility
    if (!showCompleted) {
      result = result.filter((t) => t.status !== TaskStatus.Done);
    }
    if (!showCancelled) {
      result = result.filter((t) => t.status !== TaskStatus.Cancelled);
    }
    if (!showOverdue) {
      result = result.filter((t) => {
        const isOverdue =
          t.status !== TaskStatus.Done &&
          t.status !== TaskStatus.Cancelled &&
          t.deadline &&
          !t.deadline.startsWith('0001-01-01') &&
          t.deadline.split('T')[0] < todayStr;
        return !isOverdue;
      });
    }

    // 6. Sorting
    if (sortBy !== 'none') {
      result.sort((a, b) => {
        let valA: any = null;
        let valB: any = null;

        if (sortBy === 'dueDate') {
          // Put tasks without deadlines at the end
          const dateA = a.deadline && !a.deadline.startsWith('0001-01-01') ? a.deadline : '9999-12-31';
          const dateB = b.deadline && !b.deadline.startsWith('0001-01-01') ? b.deadline : '9999-12-31';
          valA = dateA;
          valB = dateB;
        } else if (sortBy === 'priority') {
          valA = a.priority;
          valB = b.priority;
        } else if (sortBy === 'alphabetical') {
          valA = a.title.toLowerCase();
          valB = b.title.toLowerCase();
        }

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        const comparison = valA < valB ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [baseTasks, searchQuery, priorityFilters, selectedListIds, selectedTagNames, showCompleted, showCancelled, showOverdue, sortBy, sortOrder, todayStr]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Group tasks for list rendering
  const overdueTasks = React.useMemo(() => {
    return processedTasks.filter(
      (t) =>
        t.status !== TaskStatus.Done &&
        t.status !== TaskStatus.Cancelled &&
        t.deadline &&
        !t.deadline.startsWith('0001-01-01') &&
        t.deadline.split('T')[0] < todayStr
    );
  }, [processedTasks, todayStr]);

  const activeTasks = React.useMemo(() => {
    return processedTasks.filter(
      (t) =>
        t.status !== TaskStatus.Done &&
        t.status !== TaskStatus.Cancelled &&
        (!t.deadline || t.deadline.startsWith('0001-01-01') || t.deadline.split('T')[0] >= todayStr)
    );
  }, [processedTasks, todayStr]);

  const completedTasks = React.useMemo(() => {
    return processedTasks.filter(
      (t) => t.status === TaskStatus.Done || t.status === TaskStatus.Cancelled
    );
  }, [processedTasks]);

  // View title
  const currentTag = tags.find((t) => String(t.id) === tagId || t.name === tagId);
  const viewTitle = (() => {
    if (tagId) return currentTag ? `#${currentTag.name}` : 'Label';
    if (listId === 'inbox') return 'Inbox';
    if (listId === 'today') return "Today";
    if (listId === 'upcoming') return 'Upcoming';
    const cat = categories.find((c) => String(c.id) === listId);
    return cat ? cat.name : 'Tasks';
  })();

  const viewSubtitle = (() => {
    if (listId === 'today') return "Your tasks due today";
    if (listId === 'upcoming') return "Scheduled ahead";
    return "Capture and organise your work";
  })();

  // Handlers
  const handleAddTask = async (title: string, priority: number, deadline: string | null) => {
    const categoryIdNum = !['inbox', 'today', 'upcoming'].includes(listId) ? Number(listId) : undefined;
    try {
      const createdTask = await addTask(
        {
          title,
          durationInMinutes: 30,
          priority,
          effortLevel: 3,
          ...(deadline ? { deadline } : {}),
        },
        categoryIdNum
      );
      if (tagId) {
        const activeTag = tags.find((t) => String(t.id) === tagId || t.name === tagId);
        if (activeTag) {
          await assignTags(createdTask.id, [activeTag.id]);
        }
      }
    } catch { /* handled in store */ }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const result = await deleteTask(id);
      if (result.hasScheduleConflict) {
        setConflictedTaskId(id);
        setConflictMessage(result.message || 'This task is scheduled. Choose how to resolve:');
        setConflictOptions(result.options || ['ClearSlot', 'Cancel']);
        setConflictModalOpen(true);
      } else if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    } catch { /* handled in store */ }
  };

  const handleResolveDelete = async (option: string, newTaskId?: number) => {
    if (conflictedTaskId === null) return;
    await resolveDelete(conflictedTaskId, option, newTaskId);
    if (selectedTaskId === conflictedTaskId) setSelectedTaskId(null);
    setConflictedTaskId(null);
  };

  const handleUpdateTask = (id: number, updates: UpdateTaskDto) => {
    updateTask(id, updates);
  };

  const handleTogglePriorityFilter = (level: 'high' | 'medium' | 'low') => {
    setPriorityFilters((prev) =>
      prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level]
    );
  };


  const handleToggleTagFilter = (tagName: string) => {
    setSelectedTagNames((prev) =>
      prev.includes(tagName) ? prev.filter((x) => x !== tagName) : [...prev, tagName]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setPriorityFilters(['high', 'medium', 'low']);
    setSelectedListIds([]);
    setSelectedTagNames([]);
    setDateFilter('all');
    setFilterCustomStart('');
    setFilterCustomEnd('');
  };

  const isAnyFilterActive = searchQuery || selectedListIds.length > 0 || selectedTagNames.length > 0 || priorityFilters.length < 3 || dateFilter !== 'all';

  // Render content according to layouts
  const renderMainContent = () => {
    if (listId === 'upcoming' && upcomingViewMode === 'calendar') {
      return (
        <div className="flex-1 px-8 pt-2 pb-6 overflow-hidden">
          <CalendarViewMode
            tasks={processedTasks}
            categories={categories}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />
        </div>
      );
    }
    
    if (listId === 'upcoming' && upcomingViewMode === 'timeline') {
      return (
        <div className="flex-1 px-8 pt-2 pb-6 overflow-hidden">
          <TimelineViewMode
            tasks={processedTasks}
            categories={categories}
            selectedTaskId={selectedTaskId}
            onSelectTask={setSelectedTaskId}
          />
        </div>
      );
    }

    return (
      <>
        {/* Quick create */}
        <TaskQuickCreate onAddTask={handleAddTask} />

        {/* Task list */}
        <ScrollArea className="flex-1 px-8 pt-2">
          <div className="max-w-4xl mx-auto w-full pb-20">
            <TaskList
              overdueTasks={overdueTasks}
              activeTasks={activeTasks}
              completedTasks={completedTasks}
              categories={categories}
              tags={tags}
              onRemoveTag={removeTag}
              selectedTaskId={selectedTaskId}
              isLoading={isLoading}
              onSelectTask={setSelectedTaskId}
              onToggleStatus={(task, checked) =>
                updateTaskStatus(task.id, checked ? TaskStatus.Done : TaskStatus.Todo)
              }
              onContextMenu={(e, task) => {
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  task
                });
              }}
            />
          </div>
        </ScrollArea>
      </>
    );
  };

  return (
    <div className="flex h-full bg-slate-50/40 overflow-hidden">

      {/* ── Left pane ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className={cn("px-8 pt-7 pb-4 flex items-start justify-between shrink-0 transition-all duration-300", !sidebarOpen && "pl-18")}>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 capitalize">{viewTitle}</h1>
              
              {/* View Settings sliders Button next to Title */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer" 
                    title="View Settings"
                  >
                    <SlidersHorizontal className="h-4.5 w-4.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 border border-slate-200 bg-white shadow-xl rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-1">
                  
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <h4 className="font-extrabold text-sm text-slate-800">General View Settings</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Toggle visibility of task segments</p>
                  </div>

                  <div className="space-y-3">
                    <div 
                      onClick={() => setShowOverdue(!showOverdue)} 
                      className="flex items-center gap-3 cursor-pointer select-none py-1 hover:opacity-80 transition-opacity"
                    >
                      <Checkbox checked={showOverdue} onCheckedChange={undefined} />
                      <span className="text-xs font-bold text-slate-700">Show Overdue Tasks</span>
                    </div>
                    <div 
                      onClick={() => setShowCompleted(!showCompleted)} 
                      className="flex items-center gap-3 cursor-pointer select-none py-1 hover:opacity-80 transition-opacity"
                    >
                      <Checkbox checked={showCompleted} onCheckedChange={undefined} />
                      <span className="text-xs font-bold text-slate-700">Show Completed Tasks</span>
                    </div>
                    <div 
                      onClick={() => setShowCancelled(!showCancelled)} 
                      className="flex items-center gap-3 cursor-pointer select-none py-1 hover:opacity-80 transition-opacity"
                    >
                      <Checkbox checked={showCancelled} onCheckedChange={undefined} />
                      <span className="text-xs font-bold text-slate-700">Show Cancelled Tasks</span>
                    </div>
                  </div>

                  {listId === 'upcoming' && (
                    <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                      <div className="flex flex-col">
                        <h4 className="font-extrabold text-sm text-slate-800">Upcoming Layout Mode</h4>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Switch view layout display</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        {(['list', 'calendar', 'timeline'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => handleUpcomingViewModeChange(mode)}
                            className={cn(
                              "py-1 rounded-lg text-xs font-black capitalize transition-all cursor-pointer",
                              upcomingViewMode === mode 
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            )}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-slate-400 mt-1 font-medium">{viewSubtitle}</p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
              
              {/* Premium Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 rounded-lg cursor-pointer transition-colors relative",
                      isAnyFilterActive
                        ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    )}
                    title="Filters"
                  >
                    <Filter className="h-4 w-4" />
                    {isAnyFilterActive && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4 border border-slate-200 bg-white shadow-xl rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 max-h-[480px] overflow-y-auto">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex flex-col">
                      <h4 className="font-extrabold text-sm text-slate-800">Filters</h4>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Narrow down your task list</p>
                    </div>
                    {isAnyFilterActive && (
                      <button
                        onClick={handleClearFilters}
                        type="button"
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {/* Text Search */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Search</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Priority select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Priority</label>
                    <div className="flex items-center gap-3">
                      {(['high', 'medium', 'low'] as const).map((level) => (
                        <label key={level} className="flex items-center gap-1.5 cursor-pointer select-none">
                          <Checkbox
                            checked={priorityFilters.includes(level)}
                            onCheckedChange={() => handleTogglePriorityFilter(level)}
                          />
                          <span className="text-xs font-bold text-slate-700 capitalize">{level}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Date Due</label>
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { id: 'all', label: 'All Time' },
                        { id: 'today', label: 'Today' },
                        { id: 'tomorrow', label: 'Tomorrow' },
                        { id: 'week', label: 'This Week' },
                        { id: 'month', label: 'This Month' },
                        { id: 'no-deadline', label: 'No Due Date' },
                        { id: 'custom', label: 'Custom Range...' }
                      ] as const).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDateFilter(opt.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                            dateFilter === opt.id
                              ? "bg-blue-600 blue-slate-900 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-500 hover:text-blue-500 hover:border-slate-300"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Expandable Custom Date Inputs inside the filter */}
                    {dateFilter === 'custom' && (
                      <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
                          <input
                            type="date"
                            value={filterCustomStart}
                            onChange={(e) => setFilterCustomStart(e.target.value)}
                            className="w-full h-8 px-2 py-0.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
                          <input
                            type="date"
                            value={filterCustomEnd}
                            onChange={(e) => setFilterCustomEnd(e.target.value)}
                            className="w-full h-8 px-2 py-0.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tags checklist - only show if NOT in a specific category list or tag view */}
                  {!tagId && (listId === 'inbox' || listId === 'today' || listId === 'upcoming') && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tags</label>
                        {selectedTagNames.length > 0 && (
                          <button
                            onClick={() => setSelectedTagNames([])}
                            type="button"
                            className="text-[9px] font-bold text-slate-400 hover:text-red-500"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        <label className="flex items-center gap-2 cursor-pointer py-0.5 select-none">
                          <Checkbox
                            checked={selectedTagNames.includes('none')}
                            onCheckedChange={() => handleToggleTagFilter('none')}
                          />
                          <span className="text-xs font-bold text-slate-700">No Tag</span>
                        </label>
                        {tags.map((tag) => (
                          <label key={tag.id} className="flex items-center gap-2 cursor-pointer py-0.5 select-none">
                            <Checkbox
                              checked={selectedTagNames.includes(tag.name)}
                              onCheckedChange={() => handleToggleTagFilter(tag.name)}
                            />
                            <span className="text-xs font-bold text-slate-700 truncate">#{tag.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reset & Summary info */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 mt-1">
                    <div className="text-[10px] font-semibold text-slate-400 mb-1">
                      Showing {processedTasks.length} of {baseTasks.length} tasks
                    </div>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      disabled={!isAnyFilterActive}
                      className={cn(
                        "w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        isAnyFilterActive
                          ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/50"
                          : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
                      )}
                    >
                      Reset all filters
                    </button>
                  </div>

                </PopoverContent>
              </Popover>

              {/* Premium Sort Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 rounded-lg cursor-pointer transition-colors relative",
                      sortBy !== 'none'
                        ? "text-blue-600 bg-blue-50 hover:bg-blue-100"
                        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    )}
                    title="Sorting"
                  >
                    <ListFilter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 border border-slate-200 bg-white shadow-xl rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-1">
                  
                  <div className="flex flex-col border-b border-slate-100 pb-2">
                    <h4 className="font-extrabold text-sm text-slate-800">Sorting</h4>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Arrange task order</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Sort Field</label>
                    
                    {(['none', 'dueDate', 'priority', 'alphabetical'] as const).map((field) => (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setSortBy(field)}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer capitalize flex items-center justify-between",
                          sortBy === field
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-100 hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <span>
                          {field === 'none' ? 'None (Default)' : field === 'dueDate' ? 'Due Date' : field === 'priority' ? 'Priority' : 'Alphabetical'}
                        </span>
                        {sortBy === field && <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {sortBy !== 'none' && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Order</label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSortOrder('asc')}
                          className={cn(
                            "py-1 rounded-lg text-xs font-black capitalize transition-all cursor-pointer",
                            sortOrder === 'asc'
                              ? "bg-white text-slate-800 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Ascending
                        </button>
                        <button
                          type="button"
                          onClick={() => setSortOrder('desc')}
                          className={cn(
                            "py-1 rounded-lg text-xs font-black capitalize transition-all cursor-pointer",
                            sortOrder === 'desc'
                              ? "bg-white text-slate-800 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          Descending
                        </button>
                      </div>
                    </div>
                  )}

                </PopoverContent>
              </Popover>

            </div>

          </div>
        </header>

        {renderMainContent()}

      </div>

      {/* ── Draggable divider ─────────────────────── */}
      {selectedTask && (
        <ResizableDivider
          panelRef={panelRef}
          minWidth={400}
          maxWidth={750}
          onResizeEnd={() => { /* panelRef already has the width — nothing extra needed */ }}
        />
      )}

      {/* ── Right pane: Task detail ───────────────── */}
      {selectedTask && (
        <TaskDetailPanel
          key={selectedTask.id}
          task={selectedTask}
          panelRef={panelRef}
          categories={categories}
          tags={tags}
          onClose={() => setSelectedTaskId(null)}
          onDelete={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onUpdateStatus={updateTaskStatus}
          onAssignTags={assignTags}
          onRemoveTag={removeTag}
        />
      )}

      {/* Conflict modal */}
      <ConflictResolutionModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        message={conflictMessage}
        options={conflictOptions}
        tasks={tasks}
        onResolve={handleResolveDelete}
      />

      {/* Task Context Menu */}
      {contextMenu && (
        <TaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          task={contextMenu.task}
          onClose={() => setContextMenu(null)}
          categories={categories}
          tags={tags}
          onUpdateTask={handleUpdateTask}
          onUpdateStatus={updateTaskStatus}
          onAssignTags={assignTags}
          onRemoveTag={removeTag}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
