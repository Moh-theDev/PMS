import * as React from 'react';
import { format } from 'date-fns/format';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { addWeeks } from 'date-fns/addWeeks';
import { subWeeks } from 'date-fns/subWeeks';
import { addMonths } from 'date-fns/addMonths';
import { subMonths } from 'date-fns/subMonths';
import { addYears } from 'date-fns/addYears';
import { subYears } from 'date-fns/subYears';
import { parseISO } from 'date-fns/parseISO';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval';
import { differenceInDays } from 'date-fns/differenceInDays';
import { addDays } from 'date-fns/addDays';
import { 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  CalendarCheck,
  CalendarRange
} from 'lucide-react';
import { type Task, type Category, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface TimelineViewModeProps {
  tasks: Task[];
  categories: Category[];
  selectedTaskId: number | null;
  onSelectTask: (id: number) => void;
  onUpdateTask: (id: number, updates: any) => void;
}

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

export function TimelineViewMode({
  tasks,
  categories,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
}: TimelineViewModeProps) {
  const [timeframe, setTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  
  // Custom date range state
  const [customStart, setCustomStart] = React.useState<string>(() => {
    const d = new Date();
    return format(d, 'yyyy-MM-01');
  });
  const [customEnd, setCustomEnd] = React.useState<string>(() => {
    const d = new Date();
    return format(endOfMonth(d), 'yyyy-MM-dd');
  });

  // Today handler
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Navigations
  const handlePrev = () => {
    if (timeframe === 'week') setCurrentDate((prev) => subWeeks(prev, 1));
    else if (timeframe === 'month') setCurrentDate((prev) => subMonths(prev, 1));
    else if (timeframe === 'year') setCurrentDate((prev) => subYears(prev, 1));
  };

  const handleNext = () => {
    if (timeframe === 'week') setCurrentDate((prev) => addWeeks(prev, 1));
    else if (timeframe === 'month') setCurrentDate((prev) => addMonths(prev, 1));
    else if (timeframe === 'year') setCurrentDate((prev) => addYears(prev, 1));
  };

  // Timeframe boundaries
  const boundaries = React.useMemo(() => {
    let start: Date;
    let end: Date;

    if (timeframe === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (timeframe === 'month') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (timeframe === 'year') {
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
    } else {
      try {
        start = parseISO(customStart);
        end = parseISO(customEnd);
        if (start > end) {
          start = startOfMonth(new Date());
          end = endOfMonth(new Date());
        }
      } catch {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      }
    }

    return { start, end };
  }, [timeframe, currentDate, customStart, customEnd]);

  // Tasks categorized into scheduled vs unscheduled
  const { scheduledTasks, unscheduledTasks } = React.useMemo(() => {
    const s: Task[] = [];
    const u: Task[] = [];

    tasks.forEach((t) => {
      const hasDeadline = t.deadline && !t.deadline.startsWith('0001-01-01');
      const hasStart = t.earliestStart && !t.earliestStart.startsWith('0001-01-01');
      
      if (hasDeadline || hasStart) {
        s.push(t);
      } else {
        u.push(t);
      }
    });

    return { scheduledTasks: s, unscheduledTasks: u };
  }, [tasks]);

  // Filter scheduled tasks to only those overlapping the active range
  const visibleScheduledTasks = React.useMemo(() => {
    return scheduledTasks.filter((task) => {
      let tStart: Date;
      let tEnd: Date;

      if (task.earliestStart && !task.earliestStart.startsWith('0001-01-01')) {
        tStart = parseISO(task.earliestStart);
      } else {
        tStart = parseISO(task.deadline!);
      }

      if (task.deadline && !task.deadline.startsWith('0001-01-01')) {
        tEnd = parseISO(task.deadline);
      } else {
        tEnd = parseISO(task.earliestStart!);
      }

      // Check if task range overlaps timeframe boundaries
      return tStart <= boundaries.end && tEnd >= boundaries.start;
    });
  }, [scheduledTasks, boundaries]);

  // Columns for the Gantt Grid
  const columns = React.useMemo(() => {
    const { start, end } = boundaries;

    if (timeframe === 'week') {
      return eachDayOfInterval({ start, end }).map((day: Date) => ({
        label: format(day, 'eee dd'),
        date: day,
      }));
    } else if (timeframe === 'month') {
      // Return 5-day columns to prevent clutter, or all days in small labels
      const days = eachDayOfInterval({ start, end });
      const cols: { label: string; date: Date }[] = [];
      days.forEach((day: Date) => {
        // Label key days like 1, 5, 10, 15, 20, 25, or last day
        const dayNum = parseInt(format(day, 'd'), 10);
        if (dayNum === 1 || dayNum === 5 || dayNum === 10 || dayNum === 15 || dayNum === 20 || dayNum === 25 || dayNum === days.length) {
          cols.push({
            label: format(day, 'MMM d'),
            date: day,
          });
        } else {
          cols.push({
            label: '',
            date: day,
          });
        }
      });
      return cols;
    } else if (timeframe === 'year') {
      return eachMonthOfInterval({ start, end }).map((m: Date) => ({
        label: format(m, 'MMM'),
        date: m,
      }));
    } else {
      // Custom range: segment into max 10 ticks
      const diff = differenceInDays(end, start);
      if (diff <= 7) {
        return eachDayOfInterval({ start, end }).map((day: Date) => ({
          label: format(day, 'MMM d'),
          date: day,
        }));
      } else {
        const step = Math.ceil(diff / 8);
        const cols: { label: string; date: Date }[] = [];
        for (let i = 0; i <= diff; i += step) {
          const day = addDays(start, i);
          if (day <= end) {
            cols.push({
              label: format(day, 'MMM d'),
              date: day,
            });
          }
        }
        return cols;
      }
    }
  }, [boundaries, timeframe]);

  // Total interval duration in days for computing percentage positioning
  const totalDurationDays = React.useMemo(() => {
    return Math.max(1, differenceInDays(boundaries.end, boundaries.start) + 1);
  }, [boundaries]);

  // Compute Gantt coordinates for a scheduled task
  const calculateBarPosition = (task: Task) => {
    let tStart: Date;
    let tEnd: Date;

    if (task.earliestStart && !task.earliestStart.startsWith('0001-01-01')) {
      tStart = parseISO(task.earliestStart);
    } else {
      tStart = parseISO(task.deadline!);
    }

    if (task.deadline && !task.deadline.startsWith('0001-01-01')) {
      tEnd = parseISO(task.deadline);
    } else {
      tEnd = parseISO(task.earliestStart!);
    }

    // Clip to timeframe range
    const clippedStart = tStart < boundaries.start ? boundaries.start : tStart;
    const clippedEnd = tEnd > boundaries.end ? boundaries.end : tEnd;

    const daysFromStart = differenceInDays(clippedStart, boundaries.start);
    const taskSpanDays = differenceInDays(clippedEnd, clippedStart) + 1;

    let left = (daysFromStart / totalDurationDays) * 100;
    let width = (taskSpanDays / totalDurationDays) * 100;

    // Safety checks for minimum visual sizing
    if (left < 0) left = 0;
    if (left > 100) left = 95;
    if (width <= 0) width = 5;
    if (left + width > 100) width = 100 - left;

    return { left, width };
  };

  return (
    <div className="flex h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* ── Main Gantt Chart Panel ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200">
        
        {/* Navigation & timeframe header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-xs">
              <button
                onClick={handlePrev}
                type="button"
                disabled={timeframe === 'custom'}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              
              <button
                onClick={handleToday}
                type="button"
                disabled={timeframe === 'custom'}
                className="px-3 h-8 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
              >
                Today
              </button>
              
              <button
                onClick={handleNext}
                type="button"
                disabled={timeframe === 'custom'}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarRange className="h-4.5 w-4.5 text-blue-500" />
              {timeframe === 'week' && (
                <span>
                  Week of {format(boundaries.start, 'MMM dd, yyyy')}
                </span>
              )}
              {timeframe === 'month' && (
                <span>
                  {format(currentDate, 'MMMM yyyy')}
                </span>
              )}
              {timeframe === 'year' && (
                <span>
                  Year {format(currentDate, 'yyyy')}
                </span>
              )}
              {timeframe === 'custom' && (
                <span>Custom Timeline</span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {timeframe === 'custom' && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-2 animate-in fade-in slide-in-from-right-1">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs font-semibold px-2 py-0.5 outline-none text-slate-600"
                />
                <span className="text-[10px] text-slate-400 font-bold px-0.5">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs font-semibold px-2 py-0.5 outline-none text-slate-600"
                />
              </div>
            )}

            <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
              {(['week', 'month', 'year', 'custom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTimeframe(mode)}
                  type="button"
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer",
                    timeframe === mode
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gantt Area */}
        <div className="flex-1 flex flex-col overflow-x-auto min-w-full">
          
          {/* Timeline Grid Header */}
          <div className="flex border-b border-slate-200 bg-slate-50/20 shrink-0 sticky top-0 z-10 min-w-[700px]">
            {/* Task title column spacer */}
            <div className="w-52 md:w-64 border-r border-slate-200 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 bg-white">
              Task
            </div>
            
            {/* Grid labels */}
            <div className="flex-1 flex min-w-0 relative">
              {columns.map((col: { label: string; date: Date }, idx: number) => (
                <div 
                  key={idx}
                  className="flex-1 border-r border-slate-250/30 last:border-r-0 p-3 text-center shrink-0 min-w-0"
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide truncate block">
                    {col.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Lanes Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-w-[700px] bg-slate-50/10">
            {visibleScheduledTasks.map((task) => {
              const { left, width } = calculateBarPosition(task);
              const isClosed = task.status === TaskStatus.Done || task.status === TaskStatus.Cancelled;

              const category = categories.find((c) => c.id === task.categoryId);
              const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : '#94a3b8';

              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex hover:bg-slate-50/60 transition-colors group/row items-center",
                    selectedTaskId === task.id && "bg-blue-50/10 hover:bg-blue-50/20"
                  )}
                >
                  {/* Task Title Cell */}
                  <div 
                    onClick={() => onSelectTask(task.id)}
                    className={cn(
                      "w-52 md:w-64 border-r border-slate-200 p-3 truncate shrink-0 cursor-pointer text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors flex items-center gap-2",
                      selectedTaskId === task.id && "text-blue-600"
                    )}
                  >
                    <span 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ backgroundColor: categoryColor }}
                    />
                    <span className={cn("truncate flex-1", isClosed && "line-through text-slate-400")}>
                      {task.title}
                    </span>
                  </div>

                  {/* Lane Bar Cell */}
                  <div className="flex-1 relative h-12 flex items-center min-w-0">
                    
                    {/* Visual Day Guides */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {columns.map((_: any, idx: number) => (
                        <div key={idx} className="flex-1 border-r border-slate-200/20 last:border-r-0 h-full" />
                      ))}
                    </div>

                    {/* Gantt Bar Pill */}
                    <div 
                      onClick={() => onSelectTask(task.id)}
                      className={cn(
                        "absolute h-7 rounded-xl border flex items-center justify-between px-3 cursor-pointer shadow-2xs hover:shadow-sm hover:scale-[1.01] active:scale-95 transition-all text-[11px] font-bold text-white z-10 select-none overflow-hidden",
                        isClosed ? "opacity-50 line-through" : "opacity-90"
                      )}
                      style={{ 
                        left: `${left}%`, 
                        width: `${width}%`, 
                        backgroundColor: categoryColor,
                        borderColor: `${categoryColor}40`
                      }}
                      title={`${task.title} (${task.earliestStart ? format(parseISO(task.earliestStart), 'MMM d') : ''} - ${task.deadline ? format(parseISO(task.deadline), 'MMM d') : ''})`}
                    >
                      <span className="truncate flex-1 pr-1">{task.title}</span>
                      
                      {/* Priority Alert Dot inside the Gantt pill */}
                      {task.priority >= 8 && !isClosed && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 animate-pulse" title="High Priority" />
                      )}
                    </div>

                  </div>
                </div>
              );
            })}

            {visibleScheduledTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <Info className="h-7 w-7 text-slate-300" />
                <span className="text-xs font-semibold text-slate-400">No scheduled tasks within this timeframe</span>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Right drawer for Unscheduled Tasks ───────── */}
      <div className="w-72 border-l border-slate-200 flex flex-col shrink-0 bg-slate-50/40">
        
        {/* Title */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarCheck className="h-4 w-4 text-slate-500" />
            Unscheduled Tasks ({unscheduledTasks.length})
          </h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">
            Assign dates to map them onto the timeline.
          </p>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {unscheduledTasks.map((task) => {
            const category = categories.find((c) => c.id === task.categoryId);
            const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : '#e2e8f0';

            return (
              <div 
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={cn(
                  "p-3 bg-white border border-slate-200 hover:border-blue-200 rounded-xl cursor-pointer hover:shadow-sm transition-all flex flex-col gap-2.5 group relative overflow-hidden",
                  selectedTaskId === task.id && "border-blue-500 ring-2 ring-blue-50 shadow-xs"
                )}
              >
                {/* Accent border */}
                <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: categoryColor }} />
                
                {/* Title */}
                <div className="pl-1.5 flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                    {task.title}
                  </span>
                  {category && (
                    <span className="text-[9px] font-extrabold text-slate-400 mt-0.5 uppercase tracking-wide">
                      {category.name}
                    </span>
                  )}
                </div>

                {/* Direct quick date allocation controls */}
                <div className="pl-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="date"
                    onChange={(e) => {
                      if (e.target.value) {
                        onUpdateTask(task.id, { 
                          deadline: new Date(e.target.value).toISOString() 
                        });
                      }
                    }}
                    className="text-[10px] font-bold border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 focus:outline-none focus:border-blue-500 w-full"
                    title="Quick schedule deadline"
                  />
                </div>
              </div>
            );
          })}

          {unscheduledTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300 gap-2 italic text-center">
              <span className="text-xs font-semibold">All tasks are scheduled!</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
