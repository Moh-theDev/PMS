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
import { isToday } from 'date-fns/isToday';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarRange,
  AlertCircle
} from 'lucide-react';
import { type Task, type Category, TaskStatus } from '@/types/index';
import { cn } from '@/lib/utils';

interface CalendarViewModeProps {
  tasks: Task[];
  categories: Category[];
  selectedTaskId: number | null;
  onSelectTask: (id: number) => void;
}

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

export function CalendarViewMode({
  tasks,
  categories,
  selectedTaskId,
  onSelectTask,
}: CalendarViewModeProps) {
  const [timeframe, setTimeframe] = React.useState<'week' | 'month' | 'custom'>('month');
  const [currentDate, setCurrentDate] = React.useState<Date>(() => new Date());

  // Custom date range state for Custom View
  const [customStart, setCustomStart] = React.useState<string>(() => {
    const d = new Date();
    return format(d, 'yyyy-MM-01');
  });
  const [customEnd, setCustomEnd] = React.useState<string>(() => {
    const d = new Date();
    return format(endOfMonth(d), 'yyyy-MM-dd');
  });

  // Enforce max 31 days span for Custom Range
  const handleCustomStartChange = (val: string) => {
    setCustomStart(val);
    try {
      const start = parseISO(val);
      const end = parseISO(customEnd);
      if (differenceInDays(end, start) > 30) {
        setCustomEnd(format(addDays(start, 30), 'yyyy-MM-dd'));
      } else if (start > end) {
        setCustomEnd(format(addDays(start, 6), 'yyyy-MM-dd'));
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
        setCustomStart(format(addDays(end, -6), 'yyyy-MM-dd'));
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

  // Active boundaries
  const boundaries = React.useMemo(() => {
    let start: Date;
    let end: Date;

    if (timeframe === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (timeframe === 'month') {
      // Standard calendar grid covers leading/trailing days of weeks
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    } else {
      try {
        start = parseISO(customStart);
        end = parseISO(customEnd);
        if (start > end) {
          start = startOfMonth(new Date());
          end = endOfMonth(new Date());
        }
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

  // Filter tasks containing valid schedules
  const scheduledTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const hasStart = t.earliestStart && !t.earliestStart.startsWith('0001-01-01');
      const hasEnd = t.latestEnd && !t.latestEnd.startsWith('0001-01-01');
      return hasStart && hasEnd;
    });
  }, [tasks]);

  // Helper to check if a task spans/overlaps a specific calendar day cell
  const isTaskActiveOnDay = (task: Task, day: Date) => {
    if (!task.earliestStart || !task.latestEnd) return false;
    try {
      const start = new Date(task.earliestStart);
      const end = new Date(task.latestEnd);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      
      const target = new Date(day);
      target.setHours(12, 0, 0, 0);
      
      return target >= start && target <= end;
    } catch {
      return false;
    }
  };

  // Get full list of day cells to render inside grid
  const dayCells = React.useMemo(() => {
    try {
      return eachDayOfInterval({ start: boundaries.start, end: boundaries.end });
    } catch {
      return [];
    }
  }, [boundaries]);

  // Helper to render task pill in day grid cell
  const renderTaskPill = (task: Task) => {
    const isClosed = task.status === TaskStatus.Done || task.status === TaskStatus.Cancelled;
    const category = categories.find((c) => c.id === task.categoryId);
    const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : '#94a3b8';
    const isSelected = selectedTaskId === task.id;

    return (
      <button
        key={task.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectTask(task.id);
        }}
        className={cn(
          "w-full text-left px-2 py-1 rounded-md text-[10px] font-bold text-white transition-all shadow-3xs cursor-pointer select-none truncate hover:brightness-105 active:scale-98 flex items-center justify-between gap-1",
          isClosed ? "opacity-45 line-through" : "opacity-90 hover:opacity-100",
          isSelected && "ring-2 ring-indigo-500/50 ring-offset-1 ring-offset-white scale-[1.01]"
        )}
        style={{ backgroundColor: categoryColor }}
        title={`${task.title} (${task.earliestStart ? format(parseISO(task.earliestStart), 'MMM d') : ''} - ${task.latestEnd ? format(parseISO(task.latestEnd), 'MMM d') : ''})`}
      >
        <span className="truncate flex-1 font-semibold">{task.title}</span>
        {task.priority >= 8 && !isClosed && (
          <span className="w-1 h-1 rounded-full bg-white animate-pulse shrink-0" />
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex-col">
      
      {/* ── Calendar Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50 shrink-0 select-none">
        <div className="flex items-center gap-3">
          
          {/* Navigation controls */}
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
            
            <div className="px-4 h-9 flex items-center gap-2 text-slate-800 font-bold text-xs">
              <CalendarRange className="h-4 w-4 text-indigo-500" />
              <span className="min-w-[150px] text-center">
                {timeframe === 'week' && `Week of ${format(boundaries.start, 'MMM d, yyyy')}`}
                {timeframe === 'month' && format(currentDate, 'MMMM yyyy')}
                {timeframe === 'custom' && 'Custom Grid Range'}
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

          {/* Today centering button */}
          <button
            onClick={handleToday}
            type="button"
            className="px-4 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-xs hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Today
          </button>
        </div>

        {/* Views timeframe selector */}
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

      {/* ── Month Grid View ─────────────────────────────────────────── */}
      {timeframe === 'month' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50 text-center select-none py-2.5 shrink-0">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </span>
            ))}
          </div>

          {/* Monthly grid day cells */}
          <div className="grid grid-cols-7 flex-1 border-b border-slate-100 divide-x divide-y divide-slate-100 min-h-[480px]">
            {dayCells.map((day: Date) => {
              const dayTasks = scheduledTasks.filter((t) => isTaskActiveOnDay(t, day));
              const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[100px] p-2 flex flex-col gap-1.5 transition-all bg-white relative group/cell hover:bg-slate-50/20",
                    !isCurrentMonth && "bg-slate-50/30 text-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between shrink-0 mb-0.5">
                    <span 
                      className={cn(
                        "text-[10.5px] font-extrabold h-5 w-5 rounded-full flex items-center justify-center text-slate-500 select-none",
                        isDayToday && "bg-indigo-600 text-white font-black shadow-sm",
                        !isCurrentMonth && "text-slate-350"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[9px] font-black text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 select-none">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Scrollable list of active tasks for this day */}
                  <div className="flex-1 overflow-y-auto space-y-1 max-h-[90px] pr-0.5 scrollbar-thin">
                    {dayTasks.slice(0, 3).map(renderTaskPill)}
                    {dayTasks.length > 3 && (
                      <div className="text-[9.5px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-center select-none">
                        + {dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Week Grid View ──────────────────────────────────────────── */}
      {timeframe === 'week' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50 text-center select-none py-2.5 shrink-0">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <span key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </span>
            ))}
          </div>

          {/* Weekly grid day cells (roomier lanes) */}
          <div className="grid grid-cols-7 flex-1 border-b border-slate-150 divide-x divide-slate-100 min-h-[400px]">
            {dayCells.map((day: Date) => {
              const dayTasks = scheduledTasks.filter((t) => isTaskActiveOnDay(t, day));
              const isDayToday = isToday(day);

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "p-3 flex flex-col gap-2 transition-all bg-white relative hover:bg-slate-50/15",
                    isDayToday && "bg-slate-50/5"
                  )}
                >
                  <div className="flex items-center justify-between shrink-0 mb-1.5 border-b border-slate-100 pb-1.5 select-none">
                    <span 
                      className={cn(
                        "text-xs font-extrabold h-6 w-6 rounded-full flex items-center justify-center text-slate-600",
                        isDayToday && "bg-indigo-600 text-white font-black shadow-sm"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <span className="text-[9.5px] font-black text-slate-400">
                      {format(day, 'EEE')}
                    </span>
                  </div>

                  {/* Scrollable list of active tasks for this day */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
                    {dayTasks.map(renderTaskPill)}
                    {dayTasks.length === 0 && (
                      <span className="text-[9.5px] text-slate-350 italic block pt-3 text-center select-none">No tasks</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Custom Range View ───────────────────────────────────────── */}
      {timeframe === 'custom' && (
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/15 p-6">
          {dayCells.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white p-8 gap-2 max-w-md mx-auto mt-12 shadow-sm animate-fade-in">
              <AlertCircle className="h-8 w-8 text-slate-300 animate-bounce" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider mt-1">No days selected</span>
              <span className="text-[10px] text-slate-450 font-medium text-center">Please choose a valid start and end range within 31 days above.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-200">
              {dayCells.map((day: Date) => {
                const dayTasks = scheduledTasks.filter((t) => isTaskActiveOnDay(t, day));
                const isDayToday = isToday(day);

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col gap-3 min-h-[140px]",
                      isDayToday && "border-indigo-400 ring-4 ring-indigo-50"
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 select-none">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800">
                          {format(day, 'EEEE')}
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400 mt-0.5">
                          {format(day, 'MMM d, yyyy')}
                        </span>
                      </div>
                      {isDayToday && (
                        <span className="bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm shrink-0">
                          Today
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[120px] pr-0.5 scrollbar-thin">
                      {dayTasks.map(renderTaskPill)}
                      {dayTasks.length === 0 && (
                        <span className="text-[10px] text-slate-350 italic block py-4 text-center select-none">
                          No tasks scheduled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
