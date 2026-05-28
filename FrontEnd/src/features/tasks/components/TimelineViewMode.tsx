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
import { parseISO } from 'date-fns/parseISO';
import { differenceInDays } from 'date-fns/differenceInDays';
import { addDays } from 'date-fns/addDays';
import { 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  CalendarRange
} from 'lucide-react';
import { type Task, type Category, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface TimelineViewModeProps {
  tasks: Task[];
  categories: Category[];
  selectedTaskId: number | null;
  onSelectTask: (id: number) => void;
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
}: TimelineViewModeProps) {
  const [timeframe, setTimeframe] = React.useState<'week' | 'month' | 'custom'>('month');
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());
  
  // Ref for the horizontal scroll viewport
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Custom date range state
  const [customStart, setCustomStart] = React.useState<string>(() => {
    const d = new Date();
    return format(d, 'yyyy-MM-01');
  });
  const [customEnd, setCustomEnd] = React.useState<string>(() => {
    const d = new Date();
    return format(endOfMonth(d), 'yyyy-MM-dd');
  });

  // Custom range change handlers that enforce max 31 days span
  const handleCustomStartChange = (val: string) => {
    setCustomStart(val);
    try {
      const start = parseISO(val);
      const end = parseISO(customEnd);
      if (differenceInDays(end, start) > 30) {
        setCustomEnd(format(addDays(start, 30), 'yyyy-MM-dd'));
      } else if (start > end) {
        setCustomEnd(format(addDays(start, 6), 'yyyy-MM-dd')); // default to a week
      }
    } catch {
      // fallback
    }
  };

  const handleCustomEndChange = (val: string) => {
    setCustomEnd(val);
    try {
      const end = parseISO(val);
      const start = parseISO(customStart);
      if (differenceInDays(end, start) > 30) {
        setCustomStart(format(addDays(end, -30), 'yyyy-MM-dd'));
      } else if (start > end) {
        setCustomStart(format(addDays(end, -6), 'yyyy-MM-dd')); // default to a week
      }
    } catch {
      // fallback
    }
  };

  // Today handler
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setCustomStart(format(today, 'yyyy-MM-01'));
    setCustomEnd(format(endOfMonth(today), 'yyyy-MM-dd'));
  };

  // Navigations
  const handlePrev = () => {
    if (timeframe === 'week') setCurrentDate((prev) => subWeeks(prev, 1));
    else if (timeframe === 'month') setCurrentDate((prev) => subMonths(prev, 1));
  };

  const handleNext = () => {
    if (timeframe === 'week') setCurrentDate((prev) => addWeeks(prev, 1));
    else if (timeframe === 'month') setCurrentDate((prev) => addMonths(prev, 1));
  };

  // Transform vertical mouse-wheel events into horizontal scrolling
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // If the scroll container is scrollable, redirect vertical wheel scrolling to horizontal scroll
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

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
    } else {
      try {
        start = parseISO(customStart);
        end = parseISO(customEnd);
        if (start > end) {
          start = startOfMonth(new Date());
          end = endOfMonth(new Date());
        }
        // Enforce max 31 days (30 days difference)
        const diff = differenceInDays(end, start);
        if (diff > 30) {
          end = addDays(start, 30);
        }
      } catch {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      }
    }

    return { start, end };
  }, [timeframe, currentDate, customStart, customEnd]);

  // Filter tasks to only those containing valid schedule ranges
  const scheduledTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const hasStart = t.earliestStart && !t.earliestStart.startsWith('0001-01-01');
      const hasEnd = t.latestEnd && !t.latestEnd.startsWith('0001-01-01');
      return hasStart && hasEnd;
    });
  }, [tasks]);

  // Filter scheduled tasks to only those overlapping the active range
  const visibleScheduledTasks = React.useMemo(() => {
    return scheduledTasks.filter((task) => {
      const tStart = parseISO(task.earliestStart!);
      const tEnd = parseISO(task.latestEnd!);
      // Check if task range overlaps timeframe boundaries
      return tStart <= boundaries.end && tEnd >= boundaries.start;
    });
  }, [scheduledTasks, boundaries]);

  // Columns for the Gantt Grid
  const columns = React.useMemo(() => {
    const { start, end } = boundaries;
    try {
      return eachDayOfInterval({ start, end }).map((day: Date) => ({
        label: format(day, 'EEE, MMM d'),
        date: day,
      }));
    } catch {
      return [];
    }
  }, [boundaries]);

  // Check if today falls within boundaries and compute center pixel coordinate
  const todayLinePositionPx = React.useMemo(() => {
    const { start, end } = boundaries;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startTime = start.getTime();
    const endTime = end.getTime();
    const todayTime = today.getTime();

    if (todayTime >= startTime && todayTime <= endTime) {
      const daysFromStart = differenceInDays(today, start);
      // Place the line in the middle of today's column (140px per day)
      return (daysFromStart + 0.5) * 140;
    }

    return null;
  }, [boundaries]);

  // Auto-scroll to Today's position
  const scrollToToday = React.useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current;
    if (!el) return;

    setTimeout(() => {
      if (todayLinePositionPx !== null) {
        const targetScrollLeft = todayLinePositionPx - el.clientWidth / 2;
        el.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior,
        });
      }
    }, 60);
  }, [todayLinePositionPx]);

  // Scroll to today automatically when timeframe or date boundaries shift
  React.useEffect(() => {
    scrollToToday('smooth');
  }, [boundaries, timeframe, scrollToToday]);

  // Compute Gantt coordinates for a scheduled task
  const calculateBarPosition = (task: Task) => {
    const tStart = parseISO(task.earliestStart!);
    const tEnd = parseISO(task.latestEnd!);

    // Clip to timeframe range
    const clippedStart = tStart < boundaries.start ? boundaries.start : tStart;
    const clippedEnd = tEnd > boundaries.end ? boundaries.end : tEnd;

    const daysFromStart = differenceInDays(clippedStart, boundaries.start);
    const taskSpanDays = differenceInDays(clippedEnd, clippedStart) + 1;

    const leftPx = daysFromStart * 140;
    const widthPx = taskSpanDays * 140;

    return { leftPx, widthPx, taskSpanDays };
  };

  return (
    <div className="flex h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      
      {/* ── Main Gantt Chart Panel (Full Width) ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navigation & timeframe header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            
            {/* Premium Date Navigation Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <button
                onClick={handlePrev}
                type="button"
                disabled={timeframe === 'custom'}
                className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer border-r border-slate-200/60"
                title="Previous"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              
              <div className="px-4 h-9 flex items-center gap-2 text-slate-800 font-bold text-xs select-none">
                <CalendarRange className="h-4 w-4 text-indigo-500" />
                <span className="min-w-[150px] text-center">
                  {timeframe === 'week' && `Week of ${format(boundaries.start, 'MMM d, yyyy')}`}
                  {timeframe === 'month' && format(currentDate, 'MMMM yyyy')}
                  {timeframe === 'custom' && 'Custom Range'}
                </span>
              </div>

              <button
                onClick={handleNext}
                type="button"
                disabled={timeframe === 'custom'}
                className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer border-l border-slate-200/60"
                title="Next"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Premium rounded Today Button */}
            <button
              onClick={handleToday}
              type="button"
              className="px-4 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-xs hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            {timeframe === 'custom' && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-2 animate-in fade-in slide-in-from-right-1">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => handleCustomStartChange(e.target.value)}
                  className="text-xs font-semibold px-2 py-0.5 outline-none text-slate-600 bg-transparent border-0 focus:ring-0 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 font-bold px-0.5 select-none">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => handleCustomEndChange(e.target.value)}
                  className="text-xs font-semibold px-2 py-0.5 outline-none text-slate-600 bg-transparent border-0 focus:ring-0 cursor-pointer"
                />
              </div>
            )}

            <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
              {(['week', 'month', 'custom'] as const).map((mode) => (
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
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative w-full select-none"
        >
          {/* Scrollable grid wrapper that expands to the total columns width */}
          <div className="min-w-max w-full flex flex-col min-h-full relative bg-slate-50/5">
            
            {/* Today Vertical Line Indicator */}
            {todayLinePositionPx !== null && (
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-blue-500/50 z-20 pointer-events-none flex flex-col items-center"
                style={{ left: `${todayLinePositionPx}px` }}
              >
                {/* Glowing marker dot at the top of header */}
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-500/20 shrink-0 mt-2 z-30 shadow-xs shadow-blue-500/10" title="Today" />
              </div>
            )}

            {/* Timeline Grid Header */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0 sticky top-0 z-10 w-full">
              {columns.map((col: { label: string; date: Date }, idx: number) => (
                <div 
                  key={idx}
                  className="flex-1 min-w-[140px] shrink-0 border-r border-slate-200/40 last:border-r-0 p-3.5 text-center flex flex-col items-center justify-center"
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate block">
                    {col.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Timeline Lanes Rows */}
            <div className="flex-1 divide-y divide-slate-150/45 w-full relative">
              {visibleScheduledTasks.map((task) => {
                const { leftPx, widthPx, taskSpanDays } = calculateBarPosition(task);
                const isClosed = task.status === TaskStatus.Done || task.status === TaskStatus.Cancelled;

                const category = categories.find((c) => c.id === task.categoryId);
                const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : '#94a3b8';

                return (
                  <div 
                    key={task.id} 
                    className={cn(
                      "relative w-full h-14 flex items-center hover:bg-slate-50/50 transition-colors group/row",
                      selectedTaskId === task.id && "bg-slate-50/60"
                    )}
                  >
                    {/* Visual Day Guides */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {columns.map((_: any, idx: number) => (
                        <div key={idx} className="flex-1 min-w-[140px] shrink-0 border-r border-slate-200/10 last:border-r-0 h-full" />
                      ))}
                    </div>

                    {/* Gantt Bar & Title Flex Wrapper (prevents overlap & layout bugs cleanly via standard flex gap!) */}
                    <div 
                      className="absolute h-9 flex items-center gap-2 z-10 pointer-events-auto"
                      style={{ 
                        left: `${leftPx}px`, 
                      }}
                    >
                      {/* Gantt Bar Pill */}
                      <div 
                        onClick={() => onSelectTask(task.id)}
                        className={cn(
                          "h-9 rounded-xl border flex items-center justify-between px-3.5 cursor-pointer shadow-2xs hover:shadow-xs hover:scale-[1.005] active:scale-98 transition-all text-xs font-bold text-white select-none overflow-hidden shrink-0",
                          isClosed ? "opacity-45 line-through" : "opacity-90 hover:opacity-100"
                        )}
                        style={{ 
                          width: `${widthPx}px`, 
                          backgroundColor: categoryColor,
                          borderColor: `${categoryColor}40`
                        }}
                        title={`${task.title} (${task.earliestStart ? format(parseISO(task.earliestStart), 'MMM d') : ''} - ${task.latestEnd ? format(parseISO(task.latestEnd), 'MMM d') : ''})`}
                      >
                        {taskSpanDays >= 2 && (
                          <span className="truncate flex-1 pr-2 font-bold tracking-tight">{task.title}</span>
                        )}
                        
                        {/* Priority Alert Dot inside the Gantt pill */}
                        {task.priority >= 8 && !isClosed && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0 animate-pulse" title="High Priority" />
                        )}
                      </div>

                      {/* Dynamic Task Title next to the bar (flows naturally via flex-row!) */}
                      {taskSpanDays < 2 && (
                        <div 
                          onClick={() => onSelectTask(task.id)}
                          className={cn(
                            "text-xs font-extrabold text-slate-700 hover:text-blue-600 cursor-pointer select-none transition-colors truncate max-w-[240px] shrink-0",
                            isClosed && "line-through text-slate-400"
                          )}
                        >
                          {task.title}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}

              {visibleScheduledTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2.5 w-full min-h-[300px]">
                  <Info className="h-8 w-8 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-400">No scheduled tasks within this timeframe</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
