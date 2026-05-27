import * as React from 'react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { getAllSessions, type TimeEntry } from '@/features/focus/services/timeTrackingService';
import { type Task } from '@/types/index';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  LayoutGrid,
  Loader2,
  Filter,
  Activity,
  CheckSquare,
  Sliders,
  Target,
  Flame,
  Zap,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to format seconds into a friendly duration: e.g. "14h30m"
const formatSecondsFriendly = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}m`;
};

// Returns a chronological anchor date for a task, spreading fallbacks based on task ID
const getTaskAnchorDate = (t: Task): Date => {
  if (t.latestEnd && !t.latestEnd.startsWith('0001-01-01')) {
    return new Date(t.latestEnd);
  }
  if (t.deadline && !t.deadline.startsWith('0001-01-01')) {
    return new Date(t.deadline);
  }
  if (t.earliestStart && !t.earliestStart.startsWith('0001-01-01')) {
    return new Date(t.earliestStart);
  }
  // Soft fallback: Spread task IDs across the past 15 days to populate charts gracefully
  const offsetDays = (t.id % 15);
  const fallback = new Date();
  fallback.setDate(fallback.getDate() - offsetDays);
  return fallback;
};

// Custom Tooltip component for standard styling across Recharts components
const CustomTooltip = ({ active, payload, label, sessions = [], tasks = [], showFocus = true, showTasks = true }: any) => {
  if (active && payload && payload.length) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Dynamically calculate focus seconds and completed tasks for the hovered label/date to construct premium headers
    let focusSeconds = 0;
    let completedTasksCount = 0;
    
    // Find Focus duration metrics inside active payload first
    const focusHoursPayload = payload.find((p: any) => 
      p.name === 'Focused Hours' || 
      p.name === 'Hours' || 
      p.name === 'Focus Time' || 
      p.name === 'Focused Time'
    );
    const focusMinsPayload = payload.find((p: any) => p.name === 'Focus Minutes' || p.name === 'Focus Time');
    
    if (showFocus) {
      if (focusHoursPayload) {
        focusSeconds = Math.round(Number(focusHoursPayload.value) * 3600);
      } else if (focusMinsPayload) {
        focusSeconds = Math.round(Number(focusMinsPayload.value) * 60);
      } else {
        // If the current chart does not plot focus, look up in the master sessions list
        let matchingSessions: any[] = [];
        const now = new Date();
        
        if (monthNames.includes(label)) {
          matchingSessions = sessions.filter((s: any) => {
            const d = new Date(s.startedAt || s.createdAt);
            return d.getFullYear() === now.getFullYear() && monthNames[d.getMonth()] === label;
          });
        } else if (dayNames.includes(label)) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          matchingSessions = sessions.filter((s: any) => {
            const d = new Date(s.startedAt || s.createdAt);
            return d.getTime() >= weekStart.getTime() && dayNames[d.getDay()] === label;
          });
        } else if (typeof label === 'string' && label.includes(' ')) {
          const [mName, dDay] = label.split(' ');
          if (monthNames.includes(mName) && !isNaN(Number(dDay))) {
            matchingSessions = sessions.filter((s: any) => {
              const d = new Date(s.startedAt || s.createdAt);
              return monthNames[d.getMonth()] === mName && d.getDate() === Number(dDay);
            });
          }
        }
        focusSeconds = matchingSessions.reduce((acc: number, s: any) => acc + s.accumulatedSeconds, 0);
      }
    }

    if (showTasks) {
      // Find Completed Task metrics inside payload or master tasks
      const tasksCompletedPayload = payload.find((p: any) => 
        p.name === 'Completed Tasks' || 
        p.name === 'Total Completed' || 
        p.name === 'Daily Completed' ||
        p.name === 'Tasks Completed' ||
        p.name === 'Completed'
      );
      
      if (tasksCompletedPayload) {
        completedTasksCount = Number(tasksCompletedPayload.value);
      } else {
        // Look up in master tasks
        let matchingCompletedTasks: any[] = [];
        const now = new Date();
        
        if (monthNames.includes(label)) {
          matchingCompletedTasks = tasks.filter((t: any) => {
            if (t.status !== 2) return false;
            const d = getTaskAnchorDate(t);
            return d.getFullYear() === now.getFullYear() && monthNames[d.getMonth()] === label;
          });
        } else if (dayNames.includes(label)) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          matchingCompletedTasks = tasks.filter((t: any) => {
            if (t.status !== 2) return false;
            const d = getTaskAnchorDate(t);
            return d.getTime() >= weekStart.getTime() && dayNames[d.getDay()] === label;
          });
        } else if (typeof label === 'string' && label.includes(' ')) {
          const [mName, dDay] = label.split(' ');
          if (monthNames.includes(mName) && !isNaN(Number(dDay))) {
            matchingCompletedTasks = tasks.filter((t: any) => {
              if (t.status !== 2) return false;
              const d = getTaskAnchorDate(t);
              return monthNames[d.getMonth()] === mName && d.getDate() === Number(dDay);
            });
          }
        }
        completedTasksCount = matchingCompletedTasks.length;
      }
    }

    const focusStr = (showFocus && focusSeconds > 0) ? formatSecondsFriendly(focusSeconds) : '';
    const taskStr = (showTasks && completedTasksCount > 0) ? `${completedTasksCount} completed` : '';

    let headerText = label;
    if (focusStr && taskStr) {
      headerText = `${label}, ${focusStr}, ${taskStr}`;
    } else if (focusStr) {
      headerText = `${label}, ${focusStr}`;
    } else if (taskStr) {
      headerText = `${label}, ${taskStr}`;
    }

    return (
      <div className="bg-white/95 border border-slate-200/80 rounded-2xl shadow-xl p-3.5 flex flex-col gap-1.5 backdrop-blur-md">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{headerText}</span>
        {payload.map((p: any, idx: number) => {
          const isFocusItem = p.name === 'Focused Hours' || 
                              p.name === 'Hours' || 
                              p.name === 'Focus Time' || 
                              p.name === 'Focused Time' || 
                              p.name === 'Focus Minutes' ||
                              p.name === 'Sessions' ||
                              p.name === 'Focus Sessions';
                              
          const isTaskItem = p.name === 'Active Tasks' || 
                             p.name === 'Completed Tasks' || 
                             p.name === 'Cancelled Tasks' || 
                             p.name === 'Daily Completed' || 
                             p.name === 'Total Completed' ||
                             p.name === 'Tasks Completed' ||
                             p.name === 'In Progress' ||
                             p.name === 'Cancelled' ||
                             p.name === 'Completed';

          if (isFocusItem && !showFocus) return null;
          if (isTaskItem && !showTasks) return null;

          let displayValue = p.value;
          if (
            p.name === 'Focused Hours' || 
            p.name === 'Hours' || 
            p.name === 'Focus Time' || 
            p.name === 'Focused Time'
          ) {
            displayValue = formatSecondsFriendly(Math.round(Number(p.value) * 3600));
          } else if (p.name === 'Focus Minutes') {
            displayValue = formatSecondsFriendly(Math.round(Number(p.value) * 60));
          } else if (p.name === 'Sessions' || p.name === 'Focus Sessions') {
            displayValue = `${p.value} sessions`;
          } else if (
            p.name === 'Active Tasks' || 
            p.name === 'Completed Tasks' || 
            p.name === 'Cancelled Tasks' || 
            p.name === 'Daily Completed' || 
            p.name === 'Total Completed' ||
            p.name === 'Tasks Completed' ||
            p.name === 'In Progress' ||
            p.name === 'Cancelled' ||
            p.name === 'Completed'
          ) {
            displayValue = `${p.value} tasks`;
          }
          
          return (
            <div key={idx} className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill || '#3b82f6' }} />
              <span className="text-xs font-bold text-slate-700 capitalize">
                {p.name}: <span className="text-blue-600 font-extrabold">{displayValue}</span>
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// Reusable card timeframe selection dropdown with custom date range fields
interface CardTimeframeSelectorProps {
  timeframe: 'week' | 'month' | 'year' | 'custom';
  onChangeTimeframe: (tf: 'week' | 'month' | 'year' | 'custom') => void;
  customStart: string;
  customEnd: string;
  onChangeCustomRange: (start: string, end: string) => void;
}

function CardTimeframeSelector({
  timeframe,
  onChangeTimeframe,
  customStart,
  customEnd,
  onChangeCustomRange,
}: CardTimeframeSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [tempStart, setTempStart] = React.useState(customStart);
  const [tempEnd, setTempEnd] = React.useState(customEnd);

  // Sync state with props
  React.useEffect(() => {
    setTempStart(customStart);
    setTempEnd(customEnd);
  }, [customStart, customEnd]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="bg-slate-50 hover:bg-slate-100 border-slate-200/60 hover:border-slate-300 text-slate-600 font-bold rounded-xl h-9 px-4 shadow-2xs flex items-center justify-between gap-2 transition-all cursor-pointer">
          <span className="capitalize text-xs">
            {timeframe === 'week' ? 'Week' : timeframe === 'month' ? 'Month' : timeframe === 'year' ? 'Year' : 'Custom Range'}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase select-none">Timeframe</span>
          <button
            type="button"
            onClick={() => { onChangeTimeframe('week'); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-left",
              timeframe === 'week' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => { onChangeTimeframe('month'); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-left",
              timeframe === 'month' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => { onChangeTimeframe('year'); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-left",
              timeframe === 'year' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Year
          </button>
          
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100">
            <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 uppercase select-none">Custom Range</span>
            <div className="flex flex-col gap-1.5 px-2.5">
              <div>
                <label className="text-[8px] font-bold text-slate-400 block mb-0.5">Start</label>
                <input 
                  type="date" 
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg p-1 px-2 focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
              <div>
                <label className="text-[8px] font-bold text-slate-400 block mb-0.5">End</label>
                <input 
                  type="date" 
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 rounded-lg p-1 px-2 focus:outline-none focus:border-blue-600 bg-white"
                />
              </div>
              <Button 
                size="sm" 
                className="w-full mt-1.5 text-[10px] font-black rounded-xl bg-blue-600 hover:bg-blue-700 text-white h-7.5 cursor-pointer uppercase tracking-wider animate-in fade-in"
                onClick={() => {
                  onChangeCustomRange(tempStart, tempEnd);
                  onChangeTimeframe('custom');
                  setOpen(false);
                }}
              >
                Apply Range
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface FocusHeatmapProps {
  timeframe: 'week' | 'month' | 'year' | 'custom';
  customStart: string;
  customEnd: string;
  sessions: TimeEntry[];
}

function FocusHeatmap({ timeframe, customStart, customEnd, sessions }: FocusHeatmapProps) {
  const now = new Date();
  
  const days = React.useMemo(() => {
    let datesList: Date[] = [];
    
    if (timeframe === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        datesList.push(d);
      }
    } else if (timeframe === 'month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= lastDay; i++) {
        datesList.push(new Date(year, month, i));
      }
    } else if (timeframe === 'year') {
      const year = now.getFullYear();
      const firstDay = new Date(year, 0, 1);
      const lastDay = new Date(year, 11, 31);
      const curr = new Date(firstDay);
      while (curr <= lastDay) {
        datesList.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      const start = customStart ? new Date(customStart) : new Date();
      const end = customEnd ? new Date(customEnd) : new Date();
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      const curr = new Date(start);
      while (curr <= end) {
        datesList.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }
    
    return datesList;
  }, [timeframe, customStart, customEnd]);

  const focusTimeByDate = React.useMemo(() => {
    const table: Record<string, number> = {};
    sessions.forEach(s => {
      const dateStr = new Date(s.startedAt || s.createdAt).toISOString().split('T')[0];
      table[dateStr] = (table[dateStr] || 0) + s.accumulatedSeconds;
    });
    return table;
  }, [sessions]);

  const getColorClass = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'bg-slate-100 border-slate-200/20';
    const hours = seconds / 3600;
    if (hours <= 1) return 'bg-blue-50 border-blue-100';
    if (hours <= 3) return 'bg-blue-200 border-blue-300';
    if (hours <= 5) return 'bg-blue-400 border-blue-500';
    return 'bg-blue-600 border-blue-700';
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (timeframe === 'week') {
    return (
      <div className="flex flex-col gap-6 w-full h-full justify-center">
        <div className="flex items-center justify-around gap-2.5 py-4 max-w-lg mx-auto w-full select-none">
          {days.map(d => {
            const dStr = d.toISOString().split('T')[0];
            const seconds = focusTimeByDate[dStr] || 0;
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            return (
              <div key={dStr} className="flex flex-col items-center gap-2 group relative">
                <span className="text-[10px] font-bold text-slate-400">{dayName}</span>
                <div 
                  className={cn(
                    "w-9 h-9 rounded-xl border transition-all duration-300 cursor-pointer shadow-2xs hover:scale-110",
                    getColorClass(seconds)
                  )}
                />
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-50">
                  <div className="bg-slate-900 text-white text-[10px] font-black py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap">
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatSecondsFriendly(seconds)}
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
        <HeatmapLegend />
      </div>
    );
  }

  if (timeframe === 'month') {
    const firstDayIndex = new Date(days[0].getFullYear(), days[0].getMonth(), 1).getDay();
    const paddingBlocks = Array.from({ length: firstDayIndex });
    
    return (
      <div className="flex flex-col gap-6 w-full h-full justify-center">
        <div className="grid grid-cols-7 gap-2.5 max-w-sm mx-auto py-2 select-none">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`header-${i}`} className="text-center text-[10px] font-black text-slate-400 w-8">
              {day}
            </div>
          ))}
          
          {paddingBlocks.map((_, i) => (
            <div key={`pad-${i}`} className="w-8 h-8 opacity-0" />
          ))}
          
          {days.map(d => {
            const dStr = d.toISOString().split('T')[0];
            const seconds = focusTimeByDate[dStr] || 0;
            return (
              <div key={dStr} className="group relative flex justify-center items-center">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-lg border transition-all duration-300 cursor-pointer flex items-center justify-center text-[10px] font-bold shadow-2xs hover:scale-110",
                    getColorClass(seconds),
                    seconds > 0 ? "text-slate-800" : "text-slate-400"
                  )}
                >
                  {d.getDate()}
                </div>
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-50">
                  <div className="bg-slate-900 text-white text-[10px] font-black py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap">
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatSecondsFriendly(seconds)}
                  </div>
                  <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-1" />
                </div>
              </div>
            );
          })}
        </div>
        <HeatmapLegend />
      </div>
    );
  }

  // Timeframe: Year/Custom contribution grid
  const weekGrid = React.useMemo(() => {
    const grid: Date[][] = [];
    let currentWeek: Date[] = [];
    const startDay = days[0];
    const leadingEmptyCount = startDay.getDay();
    const firstWeek: (Date | null)[] = Array(leadingEmptyCount).fill(null);
    
    days.forEach(d => {
      if (firstWeek.length < 7) {
        firstWeek.push(d);
        if (firstWeek.length === 7) {
          grid.push(firstWeek as Date[]);
        }
      } else {
        currentWeek.push(d);
        if (currentWeek.length === 7) {
          grid.push(currentWeek);
          currentWeek = [];
        }
      }
    });
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null as any);
      }
      grid.push(currentWeek);
    }
    
    return grid;
  }, [days]);

  return (
    <div className="flex flex-col gap-6 w-full h-full justify-center">
      <div className="flex items-start gap-1 overflow-x-auto py-2 scrollbar-thin select-none max-w-full">
        <div className="flex flex-col justify-around h-[84px] text-[8px] font-bold text-slate-400 pr-1.5 pt-1">
          <span>Sun</span>
          <span>Tue</span>
          <span>Thu</span>
          <span>Sat</span>
        </div>

        <div className="flex gap-1">
          {weekGrid.map((week, weekIdx) => {
            const firstValidDay = week.find(d => d !== null);
            const showMonthLabel = firstValidDay && firstValidDay.getDate() <= 7 && firstValidDay.getDay() === 0;
            
            return (
              <div key={`wk-${weekIdx}`} className="flex flex-col gap-1 relative">
                {showMonthLabel && (
                  <span className="absolute -top-3.5 left-0 text-[8px] font-black text-slate-400 whitespace-nowrap">
                    {monthNames[firstValidDay.getMonth()]}
                  </span>
                )}
                
                {week.map((day, dayIdx) => {
                  if (!day) return <div key={`day-${dayIdx}`} className="w-2.5 h-2.5 opacity-0 rounded-xs" />;
                  
                  const dStr = day.toISOString().split('T')[0];
                  const seconds = focusTimeByDate[dStr] || 0;
                  
                  return (
                    <div key={dStr} className="group relative">
                      <div 
                        className={cn(
                          "w-2.5 h-2.5 rounded-xs border transition-all duration-300 cursor-pointer shadow-2xs hover:scale-125",
                          getColorClass(seconds)
                        )}
                      />
                      <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center z-50 left-1/2 transform -translate-x-1/2">
                        <div className="bg-slate-900 text-white text-[9px] font-black py-1 px-2.5 rounded-md shadow-xl whitespace-nowrap">
                          {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatSecondsFriendly(seconds)}
                        </div>
                        <div className="w-1 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <HeatmapLegend />
    </div>
  );
}

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-3.5 justify-center mt-2.5 py-1 text-[9px] font-black text-slate-400 select-none uppercase tracking-wider">
      <span>Less</span>
      <div className="flex gap-1 items-center">
        <div className="w-2.5 h-2.5 rounded-xs border bg-slate-100 border-slate-200/20" title="0m focus" />
        <div className="w-2.5 h-2.5 rounded-xs border bg-blue-50 border-blue-100" title="0-1h focus" />
        <div className="w-2.5 h-2.5 rounded-xs border bg-blue-200 border-blue-300" title="1-3h focus" />
        <div className="w-2.5 h-2.5 rounded-xs border bg-blue-400 border-blue-500" title="3-5h focus" />
        <div className="w-2.5 h-2.5 rounded-xs border bg-blue-600 border-blue-700" title=">5h focus" />
      </div>
      <span>More</span>
    </div>
  );
}

export function AnalyticsView() {
  const { tasks, categories, tags, fetchTasks, fetchCategories, fetchTags } = useTaskStore();
  const [sessions, setSessions] = React.useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Tab Navigation State
  const [activeTab, setActiveTab] = React.useState<'overview' | 'tasks' | 'focus'>('overview');

  // Default Custom Dates (Last 7 Days)
  const defaultStartDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }, []);

  const defaultEndDate = React.useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  // --- CARD INDEPENDENT FILTER STATES ---
  
  // Overview: Completed Tasks Overview Chart
  const [overviewTasksTimeframe, setOverviewTasksTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [overviewTasksCustomStart, setOverviewTasksCustomStart] = React.useState(defaultStartDate);
  const [overviewTasksCustomEnd, setOverviewTasksCustomEnd] = React.useState(defaultEndDate);
  const [overviewTasksBarHover, setOverviewTasksBarHover] = React.useState<number | null>(null);

  // Overview: Focus Hours Overview Chart
  const [overviewFocusTimeframe, setOverviewFocusTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [overviewFocusCustomStart, setOverviewFocusCustomStart] = React.useState(defaultStartDate);
  const [overviewFocusCustomEnd, setOverviewFocusCustomEnd] = React.useState(defaultEndDate);

  // Overview Hover Scale State
  const [overviewHover, setOverviewHover] = React.useState<'task' | 'focus' | null>(null);

  // Tasks: Task Progress Breakdown Chart
  const [tasksVolumeTimeframe, setTasksVolumeTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [tasksVolumeCustomStart, setTasksVolumeCustomStart] = React.useState(defaultStartDate);
  const [tasksVolumeCustomEnd, setTasksVolumeCustomEnd] = React.useState(defaultEndDate);
  const [tasksVolumeHover, setTasksVolumeHover] = React.useState<number | null>(null);

  // Tasks: Completion Rate Card
  const [tasksRatioTimeframe, setTasksRatioTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [tasksRatioCustomStart, setTasksRatioCustomStart] = React.useState(defaultStartDate);
  const [tasksRatioCustomEnd, setTasksRatioCustomEnd] = React.useState(defaultEndDate);
  const [tasksRatioCategory, setTasksRatioCategory] = React.useState<number | 'all'>('all');
  const [tasksRatioTag, setTasksRatioTag] = React.useState<string | 'all'>('all');
  const [ratioCatOpen, setRatioCatOpen] = React.useState(false);
  const [ratioTagOpen, setRatioTagOpen] = React.useState(false);

  // Tasks Hover Scale State
  const [tasksHover, setTasksHover] = React.useState<'breakdown' | 'rate' | null>(null);

  // Focus: Focus Distribution Pie Chart
  const [focusPieTimeframe, setFocusPieTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [focusPieCustomStart, setFocusPieCustomStart] = React.useState(defaultStartDate);
  const [focusPieCustomEnd, setFocusPieCustomEnd] = React.useState(defaultEndDate);
  const [focusPieCategory, setFocusPieCategory] = React.useState<number | 'all'>('all');
  const [focusPieTag, setFocusPieTag] = React.useState<string | 'all'>('all');
  const [focusPieCatOpen, setFocusPieCatOpen] = React.useState(false);
  const [focusPieTagOpen, setFocusPieTagOpen] = React.useState(false);

  // Focus: Focus Time Trend Chart
  const [focusTrendTimeframe, setFocusTrendTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [focusTrendCustomStart, setFocusTrendCustomStart] = React.useState(defaultStartDate);
  const [focusTrendCustomEnd, setFocusTrendCustomEnd] = React.useState(defaultEndDate);

  // Focus: Heatmap Card
  const [focusHeatmapTimeframe, setFocusHeatmapTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [focusHeatmapCustomStart, setFocusHeatmapCustomStart] = React.useState(defaultStartDate);
  const [focusHeatmapCustomEnd, setFocusHeatmapCustomEnd] = React.useState(defaultEndDate);

  // Focus: Session Length Buckets
  const [focusLengthTimeframe, setFocusLengthTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [focusLengthCustomStart, setFocusLengthCustomStart] = React.useState(defaultStartDate);
  const [focusLengthCustomEnd, setFocusLengthCustomEnd] = React.useState(defaultEndDate);
  const [focusLengthHover, setFocusLengthHover] = React.useState<number | null>(null);

  // Focus Hover Scale States
  const [focusRow1Hover, setFocusRow1Hover] = React.useState<'task' | 'trend' | null>(null);
  const [focusRow2Hover, setFocusRow2Hover] = React.useState<'heatmap' | 'durations' | null>(null);

  // --- API DATA INGESTION ---
  React.useEffect(() => {
    Promise.all([
      fetchTasks(),
      fetchCategories(),
      fetchTags(),
      getAllSessions()
    ]).then(([_, __, ___, sessionData]) => {
      setSessions(sessionData || []);
      setIsLoading(false);
    }).catch(err => {
      console.error("Failed loading dashboard data:", err);
      setIsLoading(false);
    });
  }, [fetchTasks, fetchCategories, fetchTags]);

  // --- FILTERING & AGGREGATION UTILITIES ---
  
  // High-performance Date Filter builder
  const getDateFilter = React.useCallback((
    timeframe: 'week' | 'month' | 'year' | 'custom',
    customStart: string,
    customEnd: string
  ) => {
    const now = new Date();
    return (date: Date) => {
      const targetTime = date.getTime();
      
      if (timeframe === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return targetTime >= weekStart.getTime() && targetTime <= todayEnd.getTime();
      }
      
      if (timeframe === 'month') {
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
        const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return targetTime >= monthStart.getTime() && targetTime <= monthEnd.getTime();
      }
      
      if (timeframe === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        return targetTime >= yearStart.getTime() && targetTime <= yearEnd.getTime();
      }
      
      if (timeframe === 'custom') {
        const start = customStart ? new Date(customStart) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = customEnd ? new Date(customEnd) : new Date();
        end.setHours(23, 59, 59, 999);
        return targetTime >= start.getTime() && targetTime <= end.getTime();
      }
      
      return false;
    };
  }, []);

  // Dynamic X-axis Chart aggregate binning generator
  const generateChartDataPoints = React.useCallback((
    timeframe: 'week' | 'month' | 'year' | 'custom',
    customStart: string,
    customEnd: string
  ) => {
    const now = new Date();
    
    if (timeframe === 'week') {
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(d);
      }
      return days.map(d => {
        const dStr = d.toISOString().split('T')[0];
        const label = dayNames[d.getDay()];
        return {
          key: dStr,
          label,
          filter: (date: Date) => date.toISOString().split('T')[0] === dStr
        };
      });
    }
    
    if (timeframe === 'month') {
      const days = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const totalDays = lastDay.getDate();
      
      for (let i = 1; i <= totalDays; i++) {
        const d = new Date(year, month, i);
        days.push(d);
      }
      
      return days.map(d => {
        const dStr = d.toISOString().split('T')[0];
        const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
        return {
          key: dStr,
          label,
          filter: (date: Date) => date.toISOString().split('T')[0] === dStr
        };
      });
    }

    if (timeframe === 'year') {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthNames.map((mName, idx) => {
        return {
          key: `month-${idx}`,
          label: mName,
          filter: (date: Date) => date.getFullYear() === now.getFullYear() && date.getMonth() === idx
        };
      });
    }
    
    // Custom Timeframe Range Segmenting
    const start = customStart ? new Date(customStart) : new Date();
    const end = customEnd ? new Date(customEnd) : new Date();
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 1) {
      return [
        { label: '12am', minHour: 0, maxHour: 3 },
        { label: '3am', minHour: 3, maxHour: 6 },
        { label: '6am', minHour: 6, maxHour: 9 },
        { label: '9am', minHour: 9, maxHour: 12 },
        { label: '12pm', minHour: 12, maxHour: 15 },
        { label: '3pm', minHour: 15, maxHour: 18 },
        { label: '6pm', minHour: 18, maxHour: 21 },
        { label: '9pm', minHour: 21, maxHour: 24 },
      ].map(item => ({
        key: item.label,
        label: item.label,
        filter: (d: Date) => {
          const isSameDay = d.getFullYear() === start.getFullYear() &&
                            d.getMonth() === start.getMonth() &&
                            d.getDate() === start.getDate();
          const hour = d.getHours();
          return isSameDay && hour >= item.minHour && hour < item.maxHour;
        }
      }));
    }
    
    if (diffDays <= 7) {
      const days = [];
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
      return days.map(d => {
        const dStr = d.toISOString().split('T')[0];
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return {
          key: dStr,
          label,
          filter: (date: Date) => date.toISOString().split('T')[0] === dStr
        };
      });
    }
    
    if (diffDays <= 31) {
      const days = [];
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
      return days.map(d => {
        const dStr = d.toISOString().split('T')[0];
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return {
          key: dStr,
          label,
          filter: (date: Date) => date.toISOString().split('T')[0] === dStr
        };
      });
    }
    
    // Smooth segment binning for larger ranges (6 ticks max)
    const segmentDays = Math.ceil(diffDays / 6);
    const segments = [];
    for (let i = 0; i < 6; i++) {
      const sStart = new Date(start);
      sStart.setDate(start.getDate() + (i * segmentDays));
      const sEnd = new Date(sStart);
      sEnd.setDate(sStart.getDate() + segmentDays - 1);
      segments.push({ start: sStart, end: sEnd });
    }
    return segments.map((seg, idx) => {
      const label = `${seg.start.getMonth() + 1}/${seg.start.getDate()} - ${seg.end.getMonth() + 1}/${seg.end.getDate()}`;
      return {
        key: `seg-${idx}`,
        label,
        filter: (date: Date) => {
          const t = date.getTime();
          return t >= seg.start.getTime() && t <= seg.end.getTime();
        }
      };
    });
  }, []);

  // --- CHART DATA GENERATION FUNCTIONS ---

  // Overview View: Completed Tasks (Split Card 1)
  const overviewTasksData = React.useMemo(() => {
    const bins = generateChartDataPoints(overviewTasksTimeframe, overviewTasksCustomStart, overviewTasksCustomEnd);
    return bins.map(bin => {
      const binCompleted = tasks.filter(t => {
        if (t.status !== 2) return false;
        const d = getTaskAnchorDate(t);
        return bin.filter(d);
      });
      return {
        name: bin.label,
        'Tasks Completed': binCompleted.length
      };
    });
  }, [tasks, overviewTasksTimeframe, overviewTasksCustomStart, overviewTasksCustomEnd, generateChartDataPoints]);

  // Overview View: Focus Hours (Split Card 2)
  const overviewFocusData = React.useMemo(() => {
    const bins = generateChartDataPoints(overviewFocusTimeframe, overviewFocusCustomStart, overviewFocusCustomEnd);
    return bins.map(bin => {
      const binSessions = sessions.filter(s => {
        const d = new Date(s.startedAt || s.createdAt);
        return bin.filter(d);
      });
      const totalSeconds = binSessions.reduce((acc, s) => acc + s.accumulatedSeconds, 0);
      return {
        name: bin.label,
        'Focus Time': parseFloat((totalSeconds / 3600).toFixed(2))
      };
    });
  }, [sessions, overviewFocusTimeframe, overviewFocusCustomStart, overviewFocusCustomEnd, generateChartDataPoints]);

  // Tasks View: Status & Volume (Stacked Bar Chart with warm names)
  const tasksVolumeData = React.useMemo(() => {
    const bins = generateChartDataPoints(tasksVolumeTimeframe, tasksVolumeCustomStart, tasksVolumeCustomEnd);
    return bins.map(bin => {
      const binTasks = tasks.filter(t => bin.filter(getTaskAnchorDate(t)));
      
      const active = binTasks.filter(t => t.status === 0 || t.status === 1 || t.status === 4).length;
      const completed = binTasks.filter(t => t.status === 2).length;
      const cancelled = binTasks.filter(t => t.status === 3).length;

      return {
        name: bin.label,
        'In Progress': active,
        'Completed': completed,
        'Cancelled': cancelled
      };
    });
  }, [tasks, tasksVolumeTimeframe, tasksVolumeCustomStart, tasksVolumeCustomEnd, generateChartDataPoints]);

  // Tasks View: Completion Ratio Circular Gauge
  const tasksCompletionRatio = React.useMemo(() => {
    const filter = getDateFilter(tasksRatioTimeframe, tasksRatioCustomStart, tasksRatioCustomEnd);
    
    const filtered = tasks.filter(t => {
      // Category filter
      if (tasksRatioCategory !== 'all' && t.categoryId !== tasksRatioCategory) return false;
      // Tag filter
      if (tasksRatioTag !== 'all') {
        if (!t.tags || !t.tags.includes(tasksRatioTag)) return false;
      }
      // Timeframe
      return filter(getTaskAnchorDate(t));
    });

    const total = filtered.length;
    const completed = filtered.filter(t => t.status === 2).length;
    const active = filtered.filter(t => t.status === 0 || t.status === 1 || t.status === 4).length;
    const cancelled = filtered.filter(t => t.status === 3).length;
    const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, active, cancelled, ratio };
  }, [tasks, tasksRatioTimeframe, tasksRatioCustomStart, tasksRatioCustomEnd, tasksRatioCategory, tasksRatioTag, getDateFilter]);

  // Focus View: Interactive Focus Pie Chart
  const focusPieData = React.useMemo(() => {
    const filter = getDateFilter(focusPieTimeframe, focusPieCustomStart, focusPieCustomEnd);
    
    // Gather matching sessions
    const rangeSessions = sessions.filter(s => filter(new Date(s.startedAt || s.createdAt)));
    
    const taskAccumulations: Record<string, { seconds: number; color: string }> = {};
    let totalSeconds = 0;

    rangeSessions.forEach(s => {
      const assocTask = tasks.find(t => t.id === s.taskId);
      
      // Filter Category
      if (focusPieCategory !== 'all') {
        if (!assocTask || assocTask.categoryId !== focusPieCategory) return;
      }
      
      // Filter Tag
      if (focusPieTag !== 'all') {
        if (!assocTask || !assocTask.tags || !assocTask.tags.includes(focusPieTag)) return;
      }

      const taskTitle = assocTask ? assocTask.title : 'Orphaned/Deleted Task';
      let categoryColor = '#8b919f'; // Default gray
      
      if (assocTask && assocTask.categoryId) {
        const cat = categories.find(c => c.id === assocTask.categoryId);
        if (cat) categoryColor = cat.color || '#3b82f6';
      }

      if (!taskAccumulations[taskTitle]) {
        taskAccumulations[taskTitle] = { seconds: 0, color: categoryColor };
      }
      taskAccumulations[taskTitle].seconds += s.accumulatedSeconds;
      totalSeconds += s.accumulatedSeconds;
    });

    const entries = Object.entries(taskAccumulations).map(([name, data]) => ({
      name,
      value: data.seconds,
      hours: parseFloat((data.seconds / 3600).toFixed(2)),
      percentage: totalSeconds > 0 ? Math.round((data.seconds / totalSeconds) * 100) : 0,
      color: data.color
    })).sort((a, b) => b.value - a.value);

    // Limit to top 5 and bundle others to ensure premium donut aesthetics
    if (entries.length <= 5) {
      return { data: entries, totalSeconds };
    }

    const top5 = entries.slice(0, 5);
    const rest = entries.slice(5);
    const restSeconds = rest.reduce((acc, r) => acc + r.value, 0);

    top5.push({
      name: 'Other Tasks',
      value: restSeconds,
      hours: parseFloat((restSeconds / 3600).toFixed(2)),
      percentage: totalSeconds > 0 ? Math.round((restSeconds / totalSeconds) * 100) : 0,
      color: '#cbd5e1'
    });

    return { data: top5, totalSeconds };
  }, [sessions, tasks, categories, focusPieTimeframe, focusPieCustomStart, focusPieCustomEnd, focusPieCategory, focusPieTag, getDateFilter]);

  // Focus View: Focused Hours Trend (Spline Area Chart)
  const focusTrendData = React.useMemo(() => {
    const bins = generateChartDataPoints(focusTrendTimeframe, focusTrendCustomStart, focusTrendCustomEnd);
    return bins.map(bin => {
      const binSessions = sessions.filter(s => bin.filter(new Date(s.startedAt || s.createdAt)));
      const seconds = binSessions.reduce((acc, s) => acc + s.accumulatedSeconds, 0);

      return {
        name: bin.label,
        'Focused Time': parseFloat((seconds / 3600).toFixed(2))
      };
    });
  }, [sessions, focusTrendTimeframe, focusTrendCustomStart, focusTrendCustomEnd, generateChartDataPoints]);

  // Focus View: Focus Session Length Buckets (Bar Chart)
  const focusLengthData = React.useMemo(() => {
    const filter = getDateFilter(focusLengthTimeframe, focusLengthCustomStart, focusLengthCustomEnd);
    const rangeSessions = sessions.filter(s => filter(new Date(s.startedAt || s.createdAt)));

    const buckets = [
      { name: '< 15m', min: 0, max: 15 * 60 },
      { name: '15m - 30m', min: 15 * 60, max: 30 * 60 },
      { name: '30m - 45m', min: 30 * 60, max: 45 * 60 },
      { name: '45m - 60m', min: 45 * 60, max: 60 * 60 },
      { name: '> 60m', min: 60 * 60, max: Infinity }
    ];

    return buckets.map(b => {
      const count = rangeSessions.filter(s => s.accumulatedSeconds >= b.min && s.accumulatedSeconds < b.max).length;
      return {
        name: b.name,
        'Sessions': count
      };
    });
  }, [sessions, focusLengthTimeframe, focusLengthCustomStart, focusLengthCustomEnd, getDateFilter]);

  // --- STAT CARD TOP ROW AGGREGATES ---
  const headerStats = React.useMemo(() => {
    const totalCompletions = tasks.filter(t => t.status === 2).length;
    const totalFocusSeconds = sessions.reduce((acc, s) => acc + s.accumulatedSeconds, 0);
    const activeTasksCount = tasks.filter(t => t.status === 0 || t.status === 1 || t.status === 4).length;
    const categoryCount = categories.length;

    return {
      completions: totalCompletions,
      focusTime: formatSecondsFriendly(totalFocusSeconds),
      activeTasks: activeTasksCount,
      categories: categoryCount
    };
  }, [tasks, sessions, categories]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 text-blue-600 animate-spin" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50/50">
      <ScrollArea className="h-full">
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-10 md:py-10 space-y-8 md:space-y-12">
          
          {/* Header with Dashboard Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Analytics</h1>
            </div>
            
            {/* Segmented Controller Tab Selector */}
            <div className="flex bg-slate-200/50 backdrop-blur-xs rounded-2xl p-1 border border-slate-200/40 shrink-0 self-start md:self-center">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95",
                  activeTab === 'overview' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Activity className="h-4 w-4" />
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95",
                  activeTab === 'tasks' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <CheckSquare className="h-4 w-4" />
                Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('focus')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none active:scale-95",
                  activeTab === 'focus' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Clock className="h-4 w-4" />
                Focus
              </button>
            </div>
          </div>

          {/* Quick High-Level Stats Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <StatCard 
              title="Tasks Completed" 
              value={String(headerStats.completions)} 
              icon={CheckCircle2} 
              iconColor="text-emerald-600 bg-emerald-50"
            />
            <StatCard 
              title="Total Time Focused" 
              value={headerStats.focusTime} 
              icon={Clock} 
              iconColor="text-blue-600 bg-blue-50"
            />
            <StatCard 
              title="Tasks Active" 
              value={String(headerStats.activeTasks)} 
              icon={Flame} 
              iconColor="text-orange-600 bg-orange-50"
            />
            <StatCard 
              title="Total Lists" 
              value={String(headerStats.categories)} 
              icon={LayoutGrid} 
              iconColor="text-purple-600 bg-purple-50"
            />
          </div>

          {/* Dynamic Tab Renderers */}
          <div className="space-y-8 animate-in fade-in duration-300">

            {/* VIEW 1: OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-12">
                
                {/* Completed Tasks Overview Card (Card 1) */}
                <Card 
                  onMouseEnter={() => setOverviewHover('task')}
                  onMouseLeave={() => setOverviewHover(null)}
                  className={cn(
                    "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out",
                    overviewHover === 'focus' ? "lg:col-span-1" : "lg:col-span-2"
                  )}
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Completed Tasks
                    </CardTitle>
                    <CardTimeframeSelector 
                      timeframe={overviewTasksTimeframe}
                      onChangeTimeframe={setOverviewTasksTimeframe}
                      customStart={overviewTasksCustomStart}
                      customEnd={overviewTasksCustomEnd}
                      onChangeCustomRange={(s: string, e: string) => { setOverviewTasksCustomStart(s); setOverviewTasksCustomEnd(e); }}
                    />
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {overviewTasksData.every(d => d['Tasks Completed'] === 0) ? (
                      <EmptyStateIcon Icon={CheckCircle2} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overviewTasksData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => Math.round(val).toString()} />
                          <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={overviewTasksTimeframe} showFocus={true} showTasks={true} />} cursor={{ fill: 'rgba(16,185,129,0.08)', radius: 8 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Bar dataKey="Tasks Completed" name="Tasks Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            {overviewTasksData.map((_, idx) => (
                              <Cell 
                                key={`cell-task-comp-${idx}`}
                                fill={overviewTasksBarHover === idx ? '#059669' : '#10b981'}
                                onMouseEnter={() => setOverviewTasksBarHover(idx)}
                                onMouseLeave={() => setOverviewTasksBarHover(null)}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Focus Hours Overview Card (Card 2) */}
                <Card 
                  onMouseEnter={() => setOverviewHover('focus')}
                  onMouseLeave={() => setOverviewHover(null)}
                  className={cn(
                    "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out",
                    overviewHover === 'focus' ? "lg:col-span-2" : "lg:col-span-1"
                  )}
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Focus Hours
                    </CardTitle>
                    <CardTimeframeSelector 
                      timeframe={overviewFocusTimeframe}
                      onChangeTimeframe={setOverviewFocusTimeframe}
                      customStart={overviewFocusCustomStart}
                      customEnd={overviewFocusCustomEnd}
                      onChangeCustomRange={(s: string, e: string) => { setOverviewFocusCustomStart(s); setOverviewFocusCustomEnd(e); }}
                    />
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {overviewFocusData.every(d => d['Focus Time'] === 0) ? (
                      <EmptyStateIcon Icon={Clock} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewFocusData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOverviewFocus" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => formatSecondsFriendly(Math.round(val * 3600))} />
                          <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={overviewFocusTimeframe} showFocus={true} showTasks={true} />} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Area type="monotone" dataKey="Focus Time" name="Focused Hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOverviewFocus)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* VIEW 2: TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 pb-12">
                
                {/* Task Progress Breakdown (Card 1) */}
                <Card 
                  onMouseEnter={() => setTasksHover('breakdown')}
                  onMouseLeave={() => setTasksHover(null)}
                  className={cn(
                    "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out",
                    tasksHover === 'rate' ? "lg:col-span-1" : "lg:col-span-2"
                  )}
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                      Progress Breakdown
                    </CardTitle>
                    <CardTimeframeSelector 
                      timeframe={tasksVolumeTimeframe}
                      onChangeTimeframe={setTasksVolumeTimeframe}
                      customStart={tasksVolumeCustomStart}
                      customEnd={tasksVolumeCustomEnd}
                      onChangeCustomRange={(s: string, e: string) => { setTasksVolumeCustomStart(s); setTasksVolumeCustomEnd(e); }}
                    />
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {tasksVolumeData.every(d => d['In Progress'] === 0 && d['Completed'] === 0 && d['Cancelled'] === 0) ? (
                      <EmptyStateIcon Icon={CheckSquare} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tasksVolumeData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => Math.round(val).toString()} />
                          <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={tasksVolumeTimeframe} showFocus={false} showTasks={true} />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Bar dataKey="Completed" name="Completed" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={35}>
                            {tasksVolumeData.map((_, idx) => (
                              <Cell 
                                key={`cell-vol-comp-${idx}`}
                                fill={tasksVolumeHover === idx ? '#059669' : '#10b981'}
                                onMouseEnter={() => setTasksVolumeHover(idx)}
                                onMouseLeave={() => setTasksVolumeHover(null)}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="In Progress" name="In Progress" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={35}>
                            {tasksVolumeData.map((_, idx) => (
                              <Cell 
                                key={`cell-vol-act-${idx}`}
                                fill={tasksVolumeHover === idx ? '#2563eb' : '#3b82f6'}
                                onMouseEnter={() => setTasksVolumeHover(idx)}
                                onMouseLeave={() => setTasksVolumeHover(null)}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="Cancelled" name="Cancelled" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={35}>
                            {tasksVolumeData.map((_, idx) => (
                              <Cell 
                                key={`cell-vol-canc-${idx}`}
                                fill={tasksVolumeHover === idx ? '#dc2626' : '#ef4444'}
                                onMouseEnter={() => setTasksVolumeHover(idx)}
                                onMouseLeave={() => setTasksVolumeHover(null)}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Completion Rate (Card 2) */}
                <Card 
                  onMouseEnter={() => setTasksHover('rate')}
                  onMouseLeave={() => setTasksHover(null)}
                  className={cn(
                    "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-between",
                    tasksHover === 'rate' ? "lg:col-span-2" : "lg:col-span-1"
                  )}
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-col gap-3">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Completion Rate
                    </CardTitle>
                    
                    {/* Sub-Filters Inside Header */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <CardTimeframeSelector 
                        timeframe={tasksRatioTimeframe}
                        onChangeTimeframe={setTasksRatioTimeframe}
                        customStart={tasksRatioCustomStart}
                        customEnd={tasksRatioCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setTasksRatioCustomStart(s); setTasksRatioCustomEnd(e); }}
                      />

                      {/* Category Selector */}
                      <Popover open={ratioCatOpen} onOpenChange={setRatioCatOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                            <Sliders className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] truncate max-w-[70px]">
                              {tasksRatioCategory === 'all' ? 'All Lists' : categories.find(c => c.id === tasksRatioCategory)?.name || 'List'}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by List</span>
                            <button
                              onClick={() => { setTasksRatioCategory('all'); setRatioCatOpen(false); }}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                tasksRatioCategory === 'all' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              All Lists
                            </button>
                            {categories.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setTasksRatioCategory(c.id); setRatioCatOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioCategory === c.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                {c.name}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Clear List Badge */}
                      {tasksRatioCategory !== 'all' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 shrink-0 border border-slate-200/40 cursor-pointer"
                          onClick={() => setTasksRatioCategory('all')}
                          title="Clear List Filter"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Tag Selector */}
                      <Popover open={ratioTagOpen} onOpenChange={setRatioTagOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] truncate max-w-[70px]">
                              {tasksRatioTag === 'all' ? 'All Tags' : tasksRatioTag}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[220px]">
                          <ScrollArea className="h-full">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by Tag</span>
                              <button
                                onClick={() => { setTasksRatioTag('all'); setRatioTagOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioTag === 'all' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                All Tags
                              </button>
                              {tags.map(t => (
                                <button
                                  key={t.id}
                                  onClick={() => { setTasksRatioTag(t.name); setRatioTagOpen(false); }}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                    tasksRatioTag === t.name ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  #{t.name}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>

                      {/* Clear Tag Badge */}
                      {tasksRatioTag !== 'all' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 shrink-0 border border-slate-200/40 cursor-pointer"
                          onClick={() => setTasksRatioTag('all')}
                          title="Clear Tag Filter"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-6 md:p-8 pt-0">
                    {tasksCompletionRatio.total === 0 ? (
                      <EmptyStateIcon Icon={Target} />
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        
                        {/* Circular SVG Progress Ring */}
                        <div className="relative flex items-center justify-center h-[160px] w-[160px]">
                          <svg className="transform -rotate-90 w-[140px] h-[140px]">
                            <circle 
                              stroke="#f1f5f9"
                              strokeWidth="12"
                              fill="transparent"
                              r="55"
                              cx="70"
                              cy="70"
                            />
                            <circle 
                              stroke="#2563eb"
                              strokeWidth="12"
                              strokeDasharray={String(2 * Math.PI * 55)}
                              strokeDashoffset={2 * Math.PI * 55 - (tasksCompletionRatio.ratio / 100) * (2 * Math.PI * 55)}
                              strokeLinecap="round"
                              fill="transparent"
                              r="55"
                              cx="70"
                              cy="70"
                              className="transition-all duration-500 ease-out"
                            />
                          </svg>
                          
                          <div className="absolute flex flex-col items-center text-center">
                            <span className="text-3xl font-black text-slate-900 tracking-tight">{tasksCompletionRatio.ratio}%</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Rate</span>
                          </div>
                        </div>

                        {/* Stat Metric Grid */}
                        <div className="grid grid-cols-3 gap-2 w-full mt-4">
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Completed</span>
                            <span className="text-sm font-bold text-emerald-600">{tasksCompletionRatio.completed}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">In Progress</span>
                            <span className="text-sm font-bold text-blue-600">{tasksCompletionRatio.active}</span>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Total</span>
                            <span className="text-sm font-bold text-slate-800">{tasksCompletionRatio.total}</span>
                          </div>
                        </div>

                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* VIEW 3: FOCUS TAB */}
            {activeTab === 'focus' && (
              <div className="space-y-8 pb-12">
                
                {/* ROW 1: Donut Distribution & Spline Area Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  
                  {/* Focus Distribution (Card 1) */}
                  <Card 
                    onMouseEnter={() => setFocusRow1Hover('task')}
                    onMouseLeave={() => setFocusRow1Hover(null)}
                    className={cn(
                      "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-between",
                      focusRow1Hover === 'trend' ? "lg:col-span-1" : "lg:col-span-2"
                    )}
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-blue-600" />
                        Focus Distribution
                      </CardTitle>
                      
                      {/* Dynamic Dropdown Filters */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <CardTimeframeSelector 
                          timeframe={focusPieTimeframe}
                          onChangeTimeframe={setFocusPieTimeframe}
                          customStart={focusPieCustomStart}
                          customEnd={focusPieCustomEnd}
                          onChangeCustomRange={(s: string, e: string) => { setFocusPieCustomStart(s); setFocusPieCustomEnd(e); }}
                        />

                        {/* Category Dropdown */}
                        <Popover open={focusPieCatOpen} onOpenChange={setFocusPieCatOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                              <Sliders className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-[11px] truncate max-w-[70px]">
                                {focusPieCategory === 'all' ? 'All Lists' : categories.find(c => c.id === focusPieCategory)?.name || 'List'}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by List</span>
                              <button
                                onClick={() => { setFocusPieCategory('all'); setFocusPieCatOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  focusPieCategory === 'all' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                All Lists
                              </button>
                              {categories.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => { setFocusPieCategory(c.id); setFocusPieCatOpen(false); }}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                    focusPieCategory === c.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Clear List Badge */}
                        {focusPieCategory !== 'all' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 shrink-0 border border-slate-200/40 cursor-pointer"
                            onClick={() => setFocusPieCategory('all')}
                            title="Clear List Filter"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}

                        {/* Tag Dropdown */}
                        <Popover open={focusPieTagOpen} onOpenChange={setFocusPieTagOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                              <Filter className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-[11px] truncate max-w-[70px]">
                                {focusPieTag === 'all' ? 'All Tags' : focusPieTag}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[220px]">
                            <ScrollArea className="h-full">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by Tag</span>
                                <button
                                  onClick={() => { setFocusPieTag('all'); setFocusPieTagOpen(false); }}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                    focusPieTag === 'all' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  All Tags
                                </button>
                                {tags.map(t => (
                                  <button
                                    key={t.id}
                                    onClick={() => { setFocusPieTag(t.name); setFocusPieTagOpen(false); }}
                                    className={cn(
                                      "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                      focusPieTag === t.name ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                    )}
                                  >
                                    #{t.name}
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </PopoverContent>
                        </Popover>

                        {/* Clear Tag Badge */}
                        {focusPieTag !== 'all' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 shrink-0 border border-slate-200/40 cursor-pointer"
                            onClick={() => setFocusPieTag('all')}
                            title="Clear Tag Filter"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 md:p-8 pt-0 min-h-[300px]">
                      {focusPieData.totalSeconds === 0 ? (
                        <div className="w-full h-full min-h-[220px] flex items-center justify-center">
                          <EmptyStateIcon Icon={LayoutGrid} />
                        </div>
                      ) : (
                        <>
                          {/* Pie Chart Donut */}
                          <div className="h-[200px] w-[200px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={focusPieData.data}
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {focusPieData.data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={focusPieData.data[index].color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={focusPieTimeframe} showFocus={true} showTasks={false} />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Custom Scrollable Task Breakdown Table with Progress Bars */}
                          <div className="flex-1 w-full max-h-[240px] overflow-y-auto pr-1 space-y-3.5">
                            {focusPieData.data.map((item) => (
                              <div key={item.name} className="flex flex-col">
                                <div className="flex items-center justify-between text-xs font-bold mb-1">
                                  <div className="flex items-center gap-2 max-w-[70%]">
                                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-slate-700 truncate">{item.name}</span>
                                  </div>
                                  <span className="text-slate-900 shrink-0 font-extrabold">
                                    {formatSecondsFriendly(item.value)}{' '}
                                    <span className="text-slate-400 font-semibold text-[10px]">({item.percentage}%)</span>
                                  </span>
                                </div>
                                
                                {/* Tiny matching progress bar */}
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Focus Trend (Card 2) */}
                  <Card 
                    onMouseEnter={() => setFocusRow1Hover('trend')}
                    onMouseLeave={() => setFocusRow1Hover(null)}
                    className={cn(
                      "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-between",
                      focusRow1Hover === 'trend' ? "lg:col-span-2" : "lg:col-span-1"
                    )}
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Focus Trend
                      </CardTitle>
                      <CardTimeframeSelector 
                        timeframe={focusTrendTimeframe}
                        onChangeTimeframe={setFocusTrendTimeframe}
                        customStart={focusTrendCustomStart}
                        customEnd={focusTrendCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setFocusTrendCustomStart(s); setFocusTrendCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {focusTrendData.every(d => d['Focused Time'] === 0) ? (
                        <EmptyStateIcon Icon={Clock} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={focusTrendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorFocusTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => formatSecondsFriendly(Math.round(val * 3600))} />
                            <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={focusTrendTimeframe} showFocus={true} showTasks={false} />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Area type="monotone" dataKey="Focused Time" name="Focused Hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocusTrend)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ROW 2: Heatmap Activity Grid & Session Durations */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-8">
                  
                  {/* Heatmap Activity Grid (Card 1) */}
                  <Card 
                    onMouseEnter={() => setFocusRow2Hover('heatmap')}
                    onMouseLeave={() => setFocusRow2Hover(null)}
                    className={cn(
                      "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-between",
                      focusRow2Hover === 'durations' ? "lg:col-span-1" : "lg:col-span-2"
                    )}
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Focus Activity Map
                      </CardTitle>
                      <CardTimeframeSelector 
                        timeframe={focusHeatmapTimeframe}
                        onChangeTimeframe={setFocusHeatmapTimeframe}
                        customStart={focusHeatmapCustomStart}
                        customEnd={focusHeatmapCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setFocusHeatmapCustomStart(s); setFocusHeatmapCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 pt-0 flex-1 flex flex-col justify-center min-h-[280px]">
                      <FocusHeatmap 
                        timeframe={focusHeatmapTimeframe}
                        customStart={focusHeatmapCustomStart}
                        customEnd={focusHeatmapCustomEnd}
                        sessions={sessions}
                      />
                    </CardContent>
                  </Card>

                  {/* Focus Session Lengths (Card 2) */}
                  <Card 
                    onMouseEnter={() => setFocusRow2Hover('durations')}
                    onMouseLeave={() => setFocusRow2Hover(null)}
                    className={cn(
                      "bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-all duration-500 ease-in-out flex flex-col justify-between",
                      focusRow2Hover === 'durations' ? "lg:col-span-2" : "lg:col-span-1"
                    )}
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        Session Durations
                      </CardTitle>
                      <CardTimeframeSelector 
                        timeframe={focusLengthTimeframe}
                        onChangeTimeframe={setFocusLengthTimeframe}
                        customStart={focusLengthCustomStart}
                        customEnd={focusLengthCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setFocusLengthCustomStart(s); setFocusLengthCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {focusLengthData.every(d => d['Sessions'] === 0) ? (
                        <EmptyStateIcon Icon={Zap} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={focusLengthData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => Math.round(val).toString()} />
                            <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={focusLengthTimeframe} showFocus={true} showTasks={false} />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Sessions" name="Focus Sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35}>
                              {focusLengthData.map((_, idx) => (
                                <Cell 
                                  key={`cell-length-${idx}`}
                                  fill={focusLengthHover === idx ? '#2563eb' : '#3b82f6'}
                                  onMouseEnter={() => setFocusLengthHover(idx)}
                                  onMouseLeave={() => setFocusLengthHover(null)}
                                  className="transition-all duration-200 cursor-pointer"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

          </div>

        </div>
      </ScrollArea>
    </div>
  );
}

// Reusable StatCard component for consistent layout and rich effects
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor 
}: { 
  title: string, 
  value: string, 
  icon: any, 
  iconColor?: string 
}) {
  return (
    <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl p-5 md:p-6 transition-all hover:scale-[1.02] duration-300">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
        <CardTitle className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{title}</CardTitle>
        <div className={cn("p-2 rounded-xl shadow-2xs", iconColor)}>
          <Icon className="h-4.5 w-4.5 animate-in spin-in-12 duration-500" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <span className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{value}</span>
      </CardContent>
    </Card>
  );
}

// Reusable Empty State handler for clean, professional data fallback overlays
function EmptyStateIcon({ Icon }: { Icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 min-h-[220px]">
      <div className="h-11 w-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-slate-400/80" />
      </div>
      <p className="text-xs font-bold text-slate-500 mb-0.5">No focus activity logged yet</p>
      <p className="text-[10px] text-slate-400/80 max-w-[200px] leading-normal font-medium">Start focus sessions or complete tasks during this period to see your insights here!</p>
    </div>
  );
}
