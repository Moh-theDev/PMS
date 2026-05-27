import * as React from 'react';
import { format } from 'date-fns/format';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { isToday } from 'date-fns/isToday';
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
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

  // Reset to today
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

  // Safe task deadline parser
  const getTaskDate = (task: Task): Date | null => {
    if (!task.deadline || task.deadline.startsWith('0001-01-01')) return null;
    try {
      return parseISO(task.deadline);
    } catch {
      return null;
    }
  };

  // Filter tasks that have valid deadlines
  const scheduledTasks = React.useMemo(() => {
    return tasks.filter((t) => getTaskDate(t) !== null);
  }, [tasks]);

  // WEEK VIEW CALCULATION
  const weekDays = React.useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // MONTH VIEW CALCULATION
  const monthDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // YEAR VIEW CALCULATION
  const yearMonths = React.useMemo(() => {
    const start = startOfYear(currentDate);
    const end = endOfYear(currentDate);
    return eachMonthOfInterval({ start, end });
  }, [currentDate]);

  // CUSTOM VIEW CALCULATION
  const customDays = React.useMemo(() => {
    try {
      const start = parseISO(customStart);
      const end = parseISO(customEnd);
      if (start > end) return [];
      // Max 100 days to prevent browser lockups
      const days = eachDayOfInterval({ start, end });
      return days.slice(0, 100);
    } catch {
      return [];
    }
  }, [customStart, customEnd]);

  // Helper to retrieve tasks due on a specific day
  const getTasksForDay = React.useMemo(() => {
    const cache: Record<string, Task[]> = {};
    scheduledTasks.forEach((task) => {
      const date = getTaskDate(task);
      if (date) {
        const key = format(date, 'yyyy-MM-dd');
        if (!cache[key]) cache[key] = [];
        cache[key].push(task);
      }
    });
    return (day: Date) => cache[format(day, 'yyyy-MM-dd')] || [];
  }, [scheduledTasks]);

  // Helper for rendering task pills
  const renderTaskPill = (task: Task) => {
    const isCompleted = task.status === TaskStatus.Done;
    const isCancelled = task.status === TaskStatus.Cancelled;
    const isClosed = isCompleted || isCancelled;
    
    const category = categories.find((c) => c.id === task.categoryId);
    const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : '#94a3b8';

    return (
      <button
        key={task.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectTask(task.id);
        }}
        type="button"
        className={cn(
          "w-full text-left px-2 py-1 text-xs font-semibold rounded-md border flex items-center justify-between gap-1 transition-all select-none cursor-pointer",
          selectedTaskId === task.id
            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-xs scale-[1.01]"
            : "border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 text-slate-700",
          isClosed && "opacity-50 line-through text-slate-400"
        )}
        style={{ borderLeftWidth: '3px', borderLeftColor: categoryColor }}
        title={task.title}
      >
        <span className="truncate flex-1">{task.title}</span>
        {task.priority >= 8 && (
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" title="High Priority" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/20 border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
      
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-slate-200/60 bg-white/50 backdrop-blur-xs">
        
        {/* Previous, Next, Today, Range Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={handlePrev}
              type="button"
              disabled={timeframe === 'custom'}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            
            <button
              onClick={handleToday}
              type="button"
              disabled={timeframe === 'custom'}
              className="px-3 h-8 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
            >
              Today
            </button>
            
            <button
              onClick={handleNext}
              type="button"
              disabled={timeframe === 'custom'}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>

          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-blue-500" />
            {timeframe === 'week' && (
              <span>
                Week of {format(weekDays[0], 'MMM dd, yyyy')}
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
              <span>Custom Date Range</span>
            )}
          </h2>
        </div>

        {/* Timeframe switchers */}
        <div className="flex items-center gap-2">
          {timeframe === 'custom' && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-2 animate-in fade-in slide-in-from-right-1 duration-150">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-xs font-semibold px-2 py-1 outline-none text-slate-700 border-r border-slate-100"
              />
              <span className="text-[10px] font-bold text-slate-400 px-0.5">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-xs font-semibold px-2 py-1 outline-none text-slate-700"
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

      {/* Grid Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        
        {/* WEEK VIEW */}
        {timeframe === 'week' && (
          <div className="grid grid-cols-7 h-full min-h-[500px] border-b border-slate-100">
            {weekDays.map((day: Date) => {
              const dayTasks = getTasksForDay(day);
              const isDayToday = isToday(day);
              
              return (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "flex flex-col border-r border-slate-200/60 last:border-r-0 min-h-0 bg-white/60 hover:bg-slate-50/40 transition-colors",
                    isDayToday && "bg-blue-50/20"
                  )}
                >
                  {/* Column Header */}
                  <div className={cn(
                    "p-3 text-center border-b border-slate-100 flex flex-col items-center gap-0.5",
                    isDayToday && "bg-blue-500/5"
                  )}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {format(day, 'eee')}
                    </span>
                    <span className={cn(
                      "text-sm font-black h-7 w-7 rounded-full flex items-center justify-center text-slate-700",
                      isDayToday && "bg-blue-600 text-white shadow-xs"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Tasks List */}
                  <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-[450px]">
                    {dayTasks.map(renderTaskPill)}
                    {dayTasks.length === 0 && (
                      <span className="text-[10px] font-semibold text-slate-300 block text-center mt-4 italic">No tasks</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MONTH VIEW */}
        {timeframe === 'month' && (
          <div className="flex flex-col h-full min-h-[550px]">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-slate-200/60 bg-white/30 text-center py-2 shrink-0">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 flex-1 border-b border-slate-100">
              {monthDays.map((day: Date) => {
                const dayTasks = getTasksForDay(day);
                const isCurrentMonth = format(day, 'M') === format(currentDate, 'M');
                const isDayToday = isToday(day);
                
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "min-h-[90px] border-r border-b border-slate-200/60 last:border-r-0 p-1.5 flex flex-col gap-1 transition-all bg-white",
                      !isCurrentMonth && "bg-slate-50/40 text-slate-300",
                      isDayToday && "bg-blue-50/15"
                    )}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between shrink-0 mb-0.5">
                      <span 
                        className={cn(
                          "text-[11px] font-black h-5 w-5 rounded-full flex items-center justify-center text-slate-500",
                          isDayToday && "bg-blue-600 text-white font-extrabold shadow-sm",
                          !isCurrentMonth && "text-slate-300"
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayTasks.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 px-1 bg-slate-100 rounded">
                          {dayTasks.length}
                        </span>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="flex-1 overflow-y-auto space-y-1 max-h-[85px] scrollbar-thin">
                      {dayTasks.slice(0, 4).map(renderTaskPill)}
                      {dayTasks.length > 4 && (
                        <button
                          onClick={() => {
                            // Focus on this day by clicking first task
                            onSelectTask(dayTasks[4].id);
                          }}
                          className="w-full text-center py-0.5 text-[9px] font-bold text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 rounded transition-colors"
                        >
                          + {dayTasks.length - 4} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* YEAR VIEW */}
        {timeframe === 'year' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
            {yearMonths.map((month: Date) => {
              // Find all tasks that lie in this month
              const monthTasks = scheduledTasks.filter((t) => {
                const date = getTaskDate(t);
                return date && format(date, 'yyyy-MM') === format(month, 'yyyy-MM');
              });

              return (
                <div
                  key={month.toString()}
                  onClick={() => {
                    setCurrentDate(month);
                    setTimeframe('month');
                  }}
                  className="bg-white border border-slate-200 hover:border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all flex flex-col gap-3 group"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-extrabold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                      {format(month, 'MMMM')}
                    </span>
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded-full shrink-0",
                      monthTasks.length > 0
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-slate-100 text-slate-400"
                    )}>
                      {monthTasks.length} {monthTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  {/* List first 3 tasks */}
                  <div className="flex-1 space-y-1.5">
                    {monthTasks.slice(0, 3).map((task) => (
                      <div 
                        key={task.id} 
                        className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 truncate"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                        <span className="truncate flex-1">{task.title}</span>
                      </div>
                    ))}
                    {monthTasks.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-bold block pt-1 pl-3">
                        + {monthTasks.length - 3} more
                      </span>
                    )}
                    {monthTasks.length === 0 && (
                      <span className="text-[10px] text-slate-300 italic block text-center py-4">
                        Empty month
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CUSTOM RANGE VIEW */}
        {timeframe === 'custom' && (
          <div className="p-6">
            {customDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/60 p-8 gap-2">
                <AlertCircle className="h-8 w-8 text-slate-300" />
                <span className="text-sm font-bold text-slate-600">No days selected</span>
                <span className="text-xs text-slate-400">Please choose a valid start and end range.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {customDays.map((day: Date) => {
                  const dayTasks = getTasksForDay(day);
                  const isDayToday = isToday(day);

                  return (
                    <div
                      key={day.toString()}
                      className={cn(
                        "bg-white border border-slate-150 rounded-xl p-3.5 hover:shadow-xs transition-all flex flex-col gap-2 min-h-[120px]",
                        isDayToday && "border-blue-400 ring-2 ring-blue-50"
                      )}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800">
                            {format(day, 'EEEE')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {format(day, 'MMM d, yyyy')}
                          </span>
                        </div>
                        {isDayToday && (
                          <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                            Today
                          </span>
                        )}
                      </div>

                      <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px]">
                        {dayTasks.map(renderTaskPill)}
                        {dayTasks.length === 0 && (
                          <span className="text-[10px] text-slate-300 italic block py-2">
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
    </div>
  );
}
