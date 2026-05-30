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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Filter,
  Activity,
  CheckSquare,
  Sliders,
  Target,
  Flame,
  Zap,
  Check,
  Inbox
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';

// Helper to format a local Date object into a yyyy-MM-dd string in the local time zone (timezone shift immune!)
const formatLocalDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to format seconds into a friendly duration: e.g. "14h30m"
const formatSecondsFriendly = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}m`;
};

// Generates a highly polished human-readable date range label for a given timeframe and reference date
const getCardRangeLabel = (
  timeframe: 'week' | 'month' | 'year' | 'custom',
  refDate: Date,
  customStart: string,
  customEnd: string
): string => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (timeframe === 'week') {
    const end = refDate;
    const start = new Date(refDate);
    start.setDate(refDate.getDate() - 6);
    
    const startMonth = monthNames[start.getMonth()];
    const endMonth = monthNames[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    if (startYear !== endYear) {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }
    if (startMonth !== endMonth) {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
  }
  
  if (timeframe === 'month') {
    const month = monthNames[refDate.getMonth()];
    const year = refDate.getFullYear();
    return `${month} ${year}`;
  }
  
  if (timeframe === 'year') {
    return `${refDate.getFullYear()}`;
  }
  
  if (timeframe === 'custom') {
    if (!customStart || !customEnd) return 'Custom Range';
    const start = new Date(customStart);
    const end = new Date(customEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Custom Range';
    
    const startMonth = monthNames[start.getMonth()];
    const endMonth = monthNames[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    if (startYear !== endYear) {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
    }
    if (startMonth !== endMonth) {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} - ${endDay}, ${startYear}`;
  }
  
  return '';
};

// Checks if a card's reference date represents the current/today's date range to determine reset visibility
const isRefDateCurrent = (
  timeframe: 'week' | 'month' | 'year' | 'custom',
  refDate: Date
): boolean => {
  if (timeframe === 'custom') return true;
  const today = new Date();
  
  if (timeframe === 'week') {
    return formatLocalDate(refDate) === formatLocalDate(today);
  }
  if (timeframe === 'month') {
    return refDate.getMonth() === today.getMonth() && refDate.getFullYear() === today.getFullYear();
  }
  if (timeframe === 'year') {
    return refDate.getFullYear() === today.getFullYear();
  }
  return true;
};


// Returns a chronological anchor date for a task, returning null if none is valid (default 0001-01-01 date is ignored)
const getTaskAnchorDate = (t: Task): Date | null => {
  if (!t) return null;

  // If the task is completed (Done), use the day it was marked completed
  if (t.status === 2) {
    try {
      const stored = localStorage.getItem('task_completions');
      if (stored) {
        const completions = JSON.parse(stored);
        if (completions[t.id]) {
          return new Date(completions[t.id]);
        }
      }
    } catch (e) {
      console.error('Failed to parse task_completions from localStorage', e);
    }
  }

  if (typeof t.latestEnd === 'string' && !t.latestEnd.startsWith('0001-01-01')) {
    return new Date(t.latestEnd);
  }
  if (typeof t.deadline === 'string' && !t.deadline.startsWith('0001-01-01')) {
    return new Date(t.deadline);
  }
  if (typeof t.earliestStart === 'string' && !t.earliestStart.startsWith('0001-01-01')) {
    return new Date(t.earliestStart);
  }
  // Ignore unscheduled tasks without a deadline by returning null
  return null;
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
            if (!d) return false;
            return d.getFullYear() === now.getFullYear() && monthNames[d.getMonth()] === label;
          });
        } else if (dayNames.includes(label)) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          matchingCompletedTasks = tasks.filter((t: any) => {
            if (t.status !== 2) return false;
            const d = getTaskAnchorDate(t);
            if (!d) return false;
            return d.getTime() >= weekStart.getTime() && dayNames[d.getDay()] === label;
          });
        } else if (typeof label === 'string' && label.includes(' ')) {
          const [mName, dDay] = label.split(' ');
          if (monthNames.includes(mName) && !isNaN(Number(dDay))) {
            matchingCompletedTasks = tasks.filter((t: any) => {
              if (t.status !== 2) return false;
              const d = getTaskAnchorDate(t);
              if (!d) return false;
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
          if (p.payload && typeof p.payload.value === 'number' && p.payload.percentage !== undefined) {
            // This is the Focus Distribution Pie Chart!
            displayValue = `${formatSecondsFriendly(p.payload.value)} (${p.payload.percentage}%)`;
          } else if (
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
  refDate?: Date;
}

// ── Shared tooltip state type ────────────────────────────────────────────────
interface HeatmapTooltip {
  label: string;
  x: number; // pageX
  y: number; // pageY
}

// ── Colour helpers ───────────────────────────────────────────────────────────
function getHeatColor(seconds: number): string {
  if (!seconds || seconds <= 0) return 'bg-slate-100 border-slate-200/40';
  const h = seconds / 3600;
  if (h < 0.5)  return 'bg-blue-100 border-blue-200';
  if (h < 1.5)  return 'bg-blue-200 border-blue-300';
  if (h < 3)    return 'bg-blue-400 border-blue-500';
  if (h < 5)    return 'bg-blue-500 border-blue-600';
  return              'bg-blue-700 border-blue-800';
}

// ── Floating tooltip (React-portal at pointer position, no edge clipping) ───
function HeatTooltip({ tip }: { tip: HeatmapTooltip | null }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ left: 0, top: 0 });

  React.useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const el = ref.current;
    const vw = window.innerWidth;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const gap = 10;

    let left = tip.x - w / 2;
    let top  = tip.y - h - gap;

    // clamp horizontal
    left = Math.max(8, Math.min(left, vw - w - 8));
    // flip to below if too close to top
    if (top < 8) top = tip.y + gap;

    setPos({ left, top });
  }, [tip]);

  if (!tip) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] pointer-events-none"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="bg-blue-600 text-white text-[10px] font-black py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap">
        {tip.label}
      </div>
      <div className="mx-auto w-1.5 h-1.5 bg-blue-600 rotate-45 -mt-0.5" />
    </div>
  );
}

function FocusHeatmap({ timeframe, customStart, customEnd, sessions, refDate }: FocusHeatmapProps) {
  const now = refDate || new Date();

  // ── Tooltip state ──────────────────────────────────────────────────────────
  const [tooltip, setTooltip] = React.useState<HeatmapTooltip | null>(null);

  // ── Determine effective layout for custom range ────────────────────────────
  const effectiveLayout = React.useMemo((): 'week' | 'month' | 'year' => {
    if (timeframe !== 'custom') return timeframe as 'week' | 'month' | 'year';
    try {
      const s = new Date(customStart);
      const e = new Date(customEnd);
      const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
      if (diff <= 7)  return 'week';
      if (diff <= 31) return 'month';
      return 'year';
    } catch { return 'month'; }
  }, [timeframe, customStart, customEnd]);

  // ── Build day list ─────────────────────────────────────────────────────────
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
      for (let i = 1; i <= lastDay; i++) datesList.push(new Date(year, month, i));
    } else if (timeframe === 'year') {
      try { datesList = eachDayOfInterval({ start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) }); }
      catch (e) { console.error(e); }
    } else {
      // custom
      try {
        const s = new Date(customStart); s.setHours(0, 0, 0, 0);
        const e = new Date(customEnd);   e.setHours(23, 59, 59, 999);
        datesList = eachDayOfInterval({ start: s, end: e });
      } catch (e) { console.error(e); }
    }

    const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return datesList.map(d => ({
      date: d,
      dStr: formatLocalDate(d),
      dayNum: d.getDate(),
      monthIdx: d.getMonth(),
      yearNum: d.getFullYear(),
      dayOfWeek: d.getDay(),
      formattedDate: `${mn[d.getMonth()]} ${d.getDate()}`,
    }));
  }, [timeframe, customStart, customEnd, refDate]);

  // ── Session time lookup ────────────────────────────────────────────────────
  const focusTimeByDate = React.useMemo(() => {
    const table: Record<string, number> = {};
    sessions.forEach(s => {
      const dateVal = s.startedAt || s.createdAt;
      if (!dateVal) return;
      const p = new Date(dateVal);
      if (isNaN(p.getTime())) return;
      const k = formatLocalDate(p);
      table[k] = (table[k] || 0) + s.accumulatedSeconds;
    });
    return table;
  }, [sessions]);

  // ── Week grid for year/custom(year) layout ─────────────────────────────────
  const weekGrid = React.useMemo(() => {
    if (effectiveLayout !== 'year') return [];
    const grid: (typeof days[number] | null)[][] = [];
    let cur: (typeof days[number] | null)[] = [];
    const lead = days[0]?.dayOfWeek ?? 0;
    for (let i = 0; i < lead; i++) cur.push(null);
    days.forEach(d => {
      cur.push(d);
      if (cur.length === 7) { grid.push(cur); cur = []; }
    });
    if (cur.length > 0) { while (cur.length < 7) cur.push(null); grid.push(cur); }
    return grid;
  }, [days, effectiveLayout]);

  // ── Scroll wheel → horizontal scroll for year grid ────────────────────────
  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // ── Tooltip helpers ────────────────────────────────────────────────────────
  const showTip = (e: React.MouseEvent, label: string) =>
    setTooltip({ label, x: e.clientX, y: e.clientY });
  const hideTip = () => setTooltip(null);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // ════════════════════════════════════════════════════════════════════════════
  // WEEK layout
  // ════════════════════════════════════════════════════════════════════════════
  if (effectiveLayout === 'week') {
    const dayNamesShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return (
      <div className="flex flex-col gap-6 w-full h-full justify-center">
        <HeatTooltip tip={tooltip} />
        <div className="grid grid-cols-7 gap-3 max-w-md mx-auto w-full py-2 select-none px-4">
          {days.map(d => {
            const sec = focusTimeByDate[d.dStr] || 0;
            return (
              <div key={d.dStr} className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-full text-center">{dayNamesShort[d.dayOfWeek]}</span>
                <div
                  className={cn('aspect-square w-full max-w-[40px] rounded-lg sm:rounded-xl border transition-all duration-200 cursor-pointer shadow-2xs hover:scale-110', getHeatColor(sec))}
                  onMouseEnter={e => showTip(e, `${d.formattedDate}: ${formatSecondsFriendly(sec)}`)}
                  onMouseMove={e  => showTip(e, `${d.formattedDate}: ${formatSecondsFriendly(sec)}`)}
                  onMouseLeave={hideTip}
                />
              </div>
            );
          })}
        </div>
        <HeatmapLegend onTip={showTip} onHideTip={hideTip} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MONTH layout
  // ════════════════════════════════════════════════════════════════════════════
  if (effectiveLayout === 'month') {
    const firstDayIndex = days[0]?.dayOfWeek ?? 0;
    const paddingBlocks = Array.from({ length: firstDayIndex });
    return (
      <div className="flex flex-col gap-6 w-full h-full justify-center">
        <HeatTooltip tip={tooltip} />
        <div className="grid grid-cols-7 gap-2.5 max-w-sm mx-auto py-2 select-none">
          {['S','M','T','W','T','F','S'].map((day, i) => (
            <div key={`hdr-${i}`} className="text-center text-[10px] font-black text-slate-400 w-8">{day}</div>
          ))}
          {paddingBlocks.map((_, i) => <div key={`pad-${i}`} className="w-8 h-8 opacity-0" />)}
          {days.map(d => {
            const sec = focusTimeByDate[d.dStr] || 0;
            return (
              <div key={d.dStr} className="flex justify-center items-center">
                <div
                  className={cn('w-8 h-8 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center text-[10px] font-bold shadow-2xs hover:scale-110', getHeatColor(sec))}
                  onMouseEnter={e => showTip(e, `${d.formattedDate}: ${formatSecondsFriendly(sec)}`)}
                  onMouseMove={e  => showTip(e, `${d.formattedDate}: ${formatSecondsFriendly(sec)}`)}
                  onMouseLeave={hideTip}
                >
                  <span className={cn('select-none', sec > 0 ? (sec / 3600 >= 1.5 ? 'text-white' : 'text-blue-700') : 'text-slate-400')}>
                    {d.dayNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <HeatmapLegend onTip={showTip} onHideTip={hideTip} />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // YEAR layout (also used when custom range > 31 days)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-4 w-full h-full justify-center">
      <HeatTooltip tip={tooltip} />
      <div
        ref={scrollRef}
        className="flex items-start gap-1 overflow-x-auto pt-6 pb-2 scrollbar-thin select-none max-w-full"
      >
        {/* Row labels */}
        <div className="grid grid-rows-7 gap-1 h-[108px] text-[8px] font-bold text-slate-400 pr-1.5 pt-0.5 leading-none shrink-0">
          <span className="flex items-center h-3">Sun</span>
          <span className="flex items-center h-3 opacity-0">Mon</span>
          <span className="flex items-center h-3">Tue</span>
          <span className="flex items-center h-3 opacity-0">Wed</span>
          <span className="flex items-center h-3">Thu</span>
          <span className="flex items-center h-3 opacity-0">Fri</span>
          <span className="flex items-center h-3">Sat</span>
        </div>

        {/* Week columns */}
        <div className="flex gap-1">
          {weekGrid.map((week, wIdx) => {
            const firstValid  = week.find(d => d !== null);
            const dayWith1    = week.find(d => d && d.dayNum === 1);
            const showLabel   = !!dayWith1 || wIdx === 0;
            const labelMonth  = dayWith1 ? dayWith1.monthIdx : (firstValid?.monthIdx ?? 0);
            return (
              <div key={`wk-${wIdx}`} className="flex flex-col gap-1 relative h-[108px]">
                {showLabel && firstValid && (
                  <span className="absolute -top-6 left-0 text-[8px] font-black text-slate-400 whitespace-nowrap">
                    {monthNames[labelMonth]}
                  </span>
                )}
                {week.map((dayObj, dIdx) => {
                  if (!dayObj) return <div key={`e-${dIdx}`} className="w-3 h-3 opacity-0 rounded-sm" />;
                  const sec = focusTimeByDate[dayObj.dStr] || 0;
                  return (
                    <div
                      key={dayObj.dStr}
                      className={cn('w-3 h-3 rounded-sm border transition-colors duration-150 cursor-pointer hover:scale-125', getHeatColor(sec))}
                      onMouseEnter={e => showTip(e, `${dayObj.formattedDate}: ${formatSecondsFriendly(sec)}`)}
                      onMouseMove={e  => showTip(e, `${dayObj.formattedDate}: ${formatSecondsFriendly(sec)}`)}
                      onMouseLeave={hideTip}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <HeatmapLegend onTip={showTip} onHideTip={hideTip} />
    </div>
  );
}

// ── Legend row at the bottom of every layout ─────────────────────────────────
const LEGEND_ITEMS = [
  { color: 'bg-slate-100 border-slate-200/40', label: '0 min', title: 'No focus' },
  { color: 'bg-blue-100 border-blue-200',      label: '< 30m',  title: '< 30 min' },
  { color: 'bg-blue-200 border-blue-300',      label: '< 1.5h', title: '30 min – 1.5 h' },
  { color: 'bg-blue-400 border-blue-500',      label: '< 3h',   title: '1.5 – 3 h' },
  { color: 'bg-blue-500 border-blue-600',      label: '< 5h',   title: '3 – 5 h' },
  { color: 'bg-blue-700 border-blue-800',      label: '≥ 5h',   title: '≥ 5 h' },
];

function HeatmapLegend({
  onTip,
  onHideTip,
}: {
  onTip: (e: React.MouseEvent, label: string) => void;
  onHideTip: () => void;
}) {
  return (
    <div className="flex items-center gap-3.5 justify-center mt-1 py-1 text-[9px] font-black text-slate-400 select-none uppercase tracking-wider">
      <span>Less</span>
      <div className="flex gap-1.5 items-center">
        {LEGEND_ITEMS.map(item => (
          <div
            key={item.title}
            className={cn('w-3 h-3 rounded-sm border cursor-default', item.color)}
            onMouseEnter={e => onTip(e, item.title)}
            onMouseMove={e  => onTip(e, item.title)}
            onMouseLeave={onHideTip}
          />
        ))}
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
    return formatLocalDate(d);
  }, []);

  const defaultEndDate = React.useMemo(() => {
    return formatLocalDate(new Date());
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

  // Tasks: Task Progress Breakdown Chart
  const [tasksVolumeTimeframe, setTasksVolumeTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [tasksVolumeCustomStart, setTasksVolumeCustomStart] = React.useState(defaultStartDate);
  const [tasksVolumeCustomEnd, setTasksVolumeCustomEnd] = React.useState(defaultEndDate);
  const [tasksVolumeHover, setTasksVolumeHover] = React.useState<number | null>(null);

  // Tasks: Completion Rate Card
  const [tasksRatioTimeframe, setTasksRatioTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [tasksRatioCustomStart, setTasksRatioCustomStart] = React.useState(defaultStartDate);
  const [tasksRatioCustomEnd, setTasksRatioCustomEnd] = React.useState(defaultEndDate);
  const [tasksRatioCategory, setTasksRatioCategory] = React.useState<number | 'all' | 'none'>('none');
  const [tasksRatioTag, setTasksRatioTag] = React.useState<string | 'all'>('none');
  const [ratioCatOpen, setRatioCatOpen] = React.useState(false);
  const [ratioTagOpen, setRatioTagOpen] = React.useState(false);

  // Focus: Focus Distribution Pie Chart
  const [focusPieTimeframe, setFocusPieTimeframe] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [focusPieCustomStart, setFocusPieCustomStart] = React.useState(defaultStartDate);
  const [focusPieCustomEnd, setFocusPieCustomEnd] = React.useState(defaultEndDate);
  const [focusPieCategories, setFocusPieCategories] = React.useState<(number | string)[]>([]);
  const [focusPieTags, setFocusPieTags] = React.useState<string[]>([]);
  const [focusPieShowTasks, setFocusPieShowTasks] = React.useState(false);
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

  // Reference Dates for independent chart navigation
  const [overviewTasksRefDate, setOverviewTasksRefDate] = React.useState(new Date());
  const [overviewFocusRefDate, setOverviewFocusRefDate] = React.useState(new Date());
  const [tasksVolumeRefDate, setTasksVolumeRefDate] = React.useState(new Date());
  const [tasksRatioRefDate, setTasksRatioRefDate] = React.useState(new Date());
  const [focusPieRefDate, setFocusPieRefDate] = React.useState(new Date());
  const [focusTrendRefDate, setFocusTrendRefDate] = React.useState(new Date());
  const [focusHeatmapRefDate, setFocusHeatmapRefDate] = React.useState(new Date());
  const [focusLengthRefDate, setFocusLengthRefDate] = React.useState(new Date());

  const navigateRefDate = React.useCallback((chartKey: string, direction: -1 | 1) => {
    const entry = {
      overviewTasks: [overviewTasksRefDate, setOverviewTasksRefDate, overviewTasksTimeframe],
      overviewFocus: [overviewFocusRefDate, setOverviewFocusRefDate, overviewFocusTimeframe],
      tasksVolume: [tasksVolumeRefDate, setTasksVolumeRefDate, tasksVolumeTimeframe],
      tasksRatio: [tasksRatioRefDate, setTasksRatioRefDate, tasksRatioTimeframe],
      focusPie: [focusPieRefDate, setFocusPieRefDate, focusPieTimeframe],
      focusTrend: [focusTrendRefDate, setFocusTrendRefDate, focusTrendTimeframe],
      focusHeatmap: [focusHeatmapRefDate, setFocusHeatmapRefDate, focusHeatmapTimeframe],
      focusLength: [focusLengthRefDate, setFocusLengthRefDate, focusLengthTimeframe],
    }[chartKey];

    if (!entry) return;
    const [currentDate, setter, timeframe] = entry as [Date, React.Dispatch<React.SetStateAction<Date>>, string];

    const nextDate = new Date(currentDate);
    if (timeframe === 'week') {
      nextDate.setDate(nextDate.getDate() + (direction * 7));
    } else if (timeframe === 'month') {
      nextDate.setMonth(nextDate.getMonth() + direction);
    } else if (timeframe === 'year') {
      nextDate.setFullYear(nextDate.getFullYear() + direction);
    }
    setter(nextDate);
  }, [
    overviewTasksRefDate, overviewTasksTimeframe,
    overviewFocusRefDate, overviewFocusTimeframe,
    tasksVolumeRefDate, tasksVolumeTimeframe,
    tasksRatioRefDate, tasksRatioTimeframe,
    focusPieRefDate, focusPieTimeframe,
    focusTrendRefDate, focusTrendTimeframe,
    focusHeatmapRefDate, focusHeatmapTimeframe,
    focusLengthRefDate, focusLengthTimeframe
  ]);

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
    customEnd: string,
    refDate: Date = new Date()
  ) => {
    const now = refDate;
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
    customEnd: string,
    refDate: Date = new Date()
  ) => {
    const now = refDate;
    
    if (timeframe === 'week') {
      const days = [];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(d);
      }
      return days.map(d => {
        const dStr = formatLocalDate(d);
        const label = dayNames[d.getDay()];
        return {
          key: dStr,
          label,
          filter: (date: Date) => formatLocalDate(date) === dStr
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
        const dStr = formatLocalDate(d);
        const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
        return {
          key: dStr,
          label,
          filter: (date: Date) => formatLocalDate(date) === dStr
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
        const dStr = formatLocalDate(d);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return {
          key: dStr,
          label,
          filter: (date: Date) => formatLocalDate(date) === dStr
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
        const dStr = formatLocalDate(d);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        return {
          key: dStr,
          label,
          filter: (date: Date) => formatLocalDate(date) === dStr
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
    const bins = generateChartDataPoints(overviewTasksTimeframe, overviewTasksCustomStart, overviewTasksCustomEnd, overviewTasksRefDate);
    return bins.map(bin => {
      const binCompleted = tasks.filter(t => {
        if (t.status !== 2) return false;
        const d = getTaskAnchorDate(t);
        if (!d) return false;
        return bin.filter(d);
      });
      return {
        name: bin.label,
        'Tasks Completed': binCompleted.length
      };
    });
  }, [tasks, overviewTasksTimeframe, overviewTasksCustomStart, overviewTasksCustomEnd, overviewTasksRefDate, generateChartDataPoints]);

  // Overview View: Focus Hours (Split Card 2)
  const overviewFocusData = React.useMemo(() => {
    const bins = generateChartDataPoints(overviewFocusTimeframe, overviewFocusCustomStart, overviewFocusCustomEnd, overviewFocusRefDate);
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
  }, [sessions, overviewFocusTimeframe, overviewFocusCustomStart, overviewFocusCustomEnd, overviewFocusRefDate, generateChartDataPoints]);

  // Tasks View: Status & Volume (Stacked Bar Chart with warm names)
  const tasksVolumeData = React.useMemo(() => {
    const bins = generateChartDataPoints(tasksVolumeTimeframe, tasksVolumeCustomStart, tasksVolumeCustomEnd, tasksVolumeRefDate);
    return bins.map(bin => {
      const binTasks = tasks.filter(t => {
        const d = getTaskAnchorDate(t);
        if (!d) return false;
        return bin.filter(d);
      });
      
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
  }, [tasks, tasksVolumeTimeframe, tasksVolumeCustomStart, tasksVolumeCustomEnd, tasksVolumeRefDate, generateChartDataPoints]);

  // Tasks View: Completion Ratio Circular Gauge
  const tasksCompletionRatio = React.useMemo(() => {
    const filter = getDateFilter(tasksRatioTimeframe, tasksRatioCustomStart, tasksRatioCustomEnd, tasksRatioRefDate);
    
    const filtered = tasks.filter(t => {
      // Category filter
      if (tasksRatioCategory === 'none') {
        if (t.categoryId !== undefined && t.categoryId !== null) return false;
      } else if (tasksRatioCategory === 'all') {
        if (t.categoryId === undefined || t.categoryId === null) return false;
      } else if (t.categoryId !== tasksRatioCategory) {
        return false;
      }
      // Tag filter
      if (tasksRatioTag === 'none') {
        if (t.tags && t.tags.length > 0) return false;
      } else if (tasksRatioTag === 'all') {
        if (!t.tags || t.tags.length === 0) return false;
      } else if (!t.tags || !t.tags.includes(tasksRatioTag)) {
        return false;
      }
      // Timeframe
      const d = getTaskAnchorDate(t);
      if (!d) return false;
      return filter(d);
    });

    const total = filtered.length;
    const completed = filtered.filter(t => t.status === 2).length;
    const active = filtered.filter(t => t.status === 0 || t.status === 1 || t.status === 4).length;
    const cancelled = filtered.filter(t => t.status === 3).length;
    const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, active, cancelled, ratio };
  }, [tasks, tasksRatioTimeframe, tasksRatioCustomStart, tasksRatioCustomEnd, tasksRatioRefDate, tasksRatioCategory, tasksRatioTag, getDateFilter]);

  // Focus View: Interactive Focus Pie Chart
  const focusPieData = React.useMemo(() => {
    const filter = getDateFilter(focusPieTimeframe, focusPieCustomStart, focusPieCustomEnd, focusPieRefDate);
    
    // Gather matching sessions in the active date range
    const rangeSessions = sessions.filter(s => filter(new Date(s.startedAt || s.createdAt)));
    
    const taskAccumulations: Record<string, { seconds: number; color: string }> = {};
    let totalSeconds = 0;

    // Check if any filters are active
    const isCategoryFilterActive = focusPieCategories.length > 0;
    const isTagFilterActive = focusPieTags.length > 0;

    // ── Mode A: Displaying Category/Tag total times (focusPieShowTasks === false) ──
    if (!focusPieShowTasks) {
      const groupAccumulations: Record<string, { seconds: number; color: string }> = {};

      rangeSessions.forEach(s => {
        const assocTask = tasks.find(t => t.id === s.taskId);
        
        // If filters are active, only include sessions that match the selected filters
        if (isCategoryFilterActive || isTagFilterActive) {
          let matchesCategory = false;
          let matchesTag = false;

          if (isCategoryFilterActive && assocTask) {
            const hasNoCategory = !assocTask.categoryId || assocTask.categoryId === 0;
            if (hasNoCategory) {
              if (focusPieCategories.includes('inbox')) {
                matchesCategory = true;
              }
            } else if (assocTask.categoryId !== undefined && focusPieCategories.includes(assocTask.categoryId)) {
              matchesCategory = true;
            }
          }
          if (isTagFilterActive && assocTask && assocTask.tags && assocTask.tags.length > 0) {
            if (assocTask.tags.some(tag => focusPieTags.includes(tag))) {
              matchesTag = true;
            }
          }

          // If both category and tag filters are active, include if matching either (OR logic)
          const matches = (isCategoryFilterActive && isTagFilterActive)
            ? (matchesCategory || matchesTag)
            : (isCategoryFilterActive ? matchesCategory : matchesTag);

          if (!matches) return;
        }

        // Attribute focus time to selected categories/tags
        if (!isCategoryFilterActive && !isTagFilterActive) {
          // Default: group by Category
          if (assocTask && assocTask.categoryId) {
            const cat = categories.find(c => c.id === assocTask.categoryId);
            if (cat) {
              const name = cat.name;
              if (!groupAccumulations[name]) {
                groupAccumulations[name] = { seconds: 0, color: cat.color || '#3b82f6' };
              }
              groupAccumulations[name].seconds += s.accumulatedSeconds;
              totalSeconds += s.accumulatedSeconds;
            }
          } else {
            const name = 'Inbox';
            if (!groupAccumulations[name]) {
              groupAccumulations[name] = { seconds: 0, color: '#94a3b8' };
            }
            groupAccumulations[name].seconds += s.accumulatedSeconds;
            totalSeconds += s.accumulatedSeconds;
          }
        } else {
          // Attribute to each selected category
          if (isCategoryFilterActive && assocTask) {
            const hasNoCategory = !assocTask.categoryId || assocTask.categoryId === 0;
            if (hasNoCategory) {
              if (focusPieCategories.includes('inbox')) {
                const name = 'Inbox';
                if (!groupAccumulations[name]) {
                  groupAccumulations[name] = { seconds: 0, color: '#94a3b8' };
                }
                groupAccumulations[name].seconds += s.accumulatedSeconds;
                totalSeconds += s.accumulatedSeconds;
              }
            } else if (assocTask.categoryId !== undefined && focusPieCategories.includes(assocTask.categoryId)) {
              const cat = categories.find(c => c.id === assocTask.categoryId);
              if (cat) {
                const name = cat.name;
                if (!groupAccumulations[name]) {
                  groupAccumulations[name] = { seconds: 0, color: cat.color || '#3b82f6' };
                }
                groupAccumulations[name].seconds += s.accumulatedSeconds;
                totalSeconds += s.accumulatedSeconds;
              }
            }
          }
          // Attribute to each selected tag
          if (isTagFilterActive && assocTask && assocTask.tags && assocTask.tags.length > 0) {
            assocTask.tags.forEach(tag => {
              if (focusPieTags.includes(tag)) {
                const name = `#${tag}`;
                if (!groupAccumulations[name]) {
                  groupAccumulations[name] = { seconds: 0, color: '#a855f7' }; // Violet color for tags
                }
                groupAccumulations[name].seconds += s.accumulatedSeconds;
                totalSeconds += s.accumulatedSeconds;
              }
            });
          }
        }
      });

      const data = Object.entries(groupAccumulations).map(([name, data]) => ({
        name,
        value: data.seconds,
        hours: parseFloat((data.seconds / 3600).toFixed(2)),
        percentage: totalSeconds > 0 ? Math.round((data.seconds / totalSeconds) * 100) : 0,
        color: data.color
      })).sort((a, b) => b.value - a.value);

      return { data, totalSeconds };
    }

    // ── Mode B: Displaying Tasks inside selected filters (focusPieShowTasks === true) ──
    rangeSessions.forEach(s => {
      const assocTask = tasks.find(t => t.id === s.taskId);
      if (!assocTask) return;

      // Filter by Category
      if (isCategoryFilterActive) {
        const hasNoCategory = !assocTask.categoryId || assocTask.categoryId === 0;
        const matchesInbox = hasNoCategory && focusPieCategories.includes('inbox');
        const matchesSelectedCategory = assocTask.categoryId && focusPieCategories.includes(assocTask.categoryId);
        if (!matchesInbox && !matchesSelectedCategory) {
          return;
        }
      }

      // Filter by Tag
      if (isTagFilterActive) {
        if (!assocTask.tags || !assocTask.tags.some(tag => focusPieTags.includes(tag))) {
          return;
        }
      }

      const taskTitle = assocTask.title;
      let categoryColor = '#8b919f'; // Default gray
      
      if (assocTask.categoryId) {
        const cat = categories.find(c => c.id === assocTask.categoryId);
        if (cat) categoryColor = cat.color || '#3b82f6';
      } else {
        categoryColor = '#94a3b8'; // Inbox gray
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

    // Apply vibrant, premium color rotation
    const premiumColors = [
      '#3b82f6', // Blue
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#8b5cf6', // Violet
      '#ec4899', // Pink
      '#f43f5e', // Rose
      '#06b6d4', // Cyan
      '#14b8a6', // Teal
      '#f97316', // Orange
      '#6366f1', // Indigo
    ];

    const coloredEntries = entries.map((entry, idx) => {
      const sliceColor = entry.color && entry.color !== '#8b919f' && entry.color !== '#3b82f6'
        ? entry.color
        : premiumColors[idx % premiumColors.length];
      return {
        ...entry,
        color: sliceColor
      };
    });

    // Limit to top 5 and bundle others
    if (coloredEntries.length <= 5) {
      return { data: coloredEntries, totalSeconds };
    }

    const top5 = coloredEntries.slice(0, 5);
    const rest = coloredEntries.slice(5);
    const restSeconds = rest.reduce((acc, r) => acc + r.value, 0);

    top5.push({
      name: 'Other Tasks',
      value: restSeconds,
      hours: parseFloat((restSeconds / 3600).toFixed(2)),
      percentage: totalSeconds > 0 ? Math.round((restSeconds / totalSeconds) * 100) : 0,
      color: '#94a3b8'
    });

    return { data: top5, totalSeconds };
  }, [
    sessions,
    tasks,
    categories,
    focusPieTimeframe,
    focusPieCustomStart,
    focusPieCustomEnd,
    focusPieRefDate,
    focusPieCategories,
    focusPieTags,
    focusPieShowTasks,
    getDateFilter
  ]);

  // Focus View: Focused Hours Trend (Spline Area Chart)
  const focusTrendData = React.useMemo(() => {
    const bins = generateChartDataPoints(focusTrendTimeframe, focusTrendCustomStart, focusTrendCustomEnd, focusTrendRefDate);
    return bins.map(bin => {
      const binSessions = sessions.filter(s => bin.filter(new Date(s.startedAt || s.createdAt)));
      const seconds = binSessions.reduce((acc, s) => acc + s.accumulatedSeconds, 0);

      return {
        name: bin.label,
        'Focused Time': parseFloat((seconds / 3600).toFixed(2))
      };
    });
  }, [sessions, focusTrendTimeframe, focusTrendCustomStart, focusTrendCustomEnd, focusTrendRefDate, generateChartDataPoints]);

  // Focus View: Focus Session Length Buckets (Bar Chart)
  const focusLengthData = React.useMemo(() => {
    const filter = getDateFilter(focusLengthTimeframe, focusLengthCustomStart, focusLengthCustomEnd, focusLengthRefDate);
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
  }, [sessions, focusLengthTimeframe, focusLengthCustomStart, focusLengthCustomEnd, focusLengthRefDate, getDateFilter]);

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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-12">
                
                {/* Completed Tasks Overview Card (Card 1) */}
                <Card 
                  className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer"
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        Completed Tasks
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                        <span>{getCardRangeLabel(overviewTasksTimeframe, overviewTasksRefDate, overviewTasksCustomStart, overviewTasksCustomEnd)}</span>
                        {!isRefDateCurrent(overviewTasksTimeframe, overviewTasksRefDate) && (
                          <button
                            type="button"
                            onClick={() => setOverviewTasksRefDate(new Date())}
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                          >
                            • Reset to Today
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        onClick={() => navigateRefDate('overviewTasks', -1)}
                        disabled={overviewTasksTimeframe === 'custom'}
                        title="Previous period"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </Button>
                      <CardTimeframeSelector 
                        timeframe={overviewTasksTimeframe}
                        onChangeTimeframe={(tf) => { setOverviewTasksTimeframe(tf); setOverviewTasksRefDate(new Date()); }}
                        customStart={overviewTasksCustomStart}
                        customEnd={overviewTasksCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setOverviewTasksCustomStart(s); setOverviewTasksCustomEnd(e); }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        onClick={() => navigateRefDate('overviewTasks', 1)}
                        disabled={overviewTasksTimeframe === 'custom'}
                        title="Next period"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {overviewTasksData.every(d => d['Tasks Completed'] === 0) ? (
                      <EmptyStateIcon 
                        Icon={CheckCircle2} 
                        title="No completed tasks found" 
                        description="Complete tasks during this period to see your progress insights here!" 
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" debounce={0}>
                        <BarChart data={overviewTasksData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => Math.round(val).toString()} />
                          <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={overviewTasksTimeframe} showFocus={true} showTasks={true} />} cursor={{ fill: 'rgba(16,185,129,0.08)', radius: 8 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Bar dataKey="Tasks Completed" name="Tasks Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}>
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
                  className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer"
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        Focus Hours
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                        <span>{getCardRangeLabel(overviewFocusTimeframe, overviewFocusRefDate, overviewFocusCustomStart, overviewFocusCustomEnd)}</span>
                        {!isRefDateCurrent(overviewFocusTimeframe, overviewFocusRefDate) && (
                          <button
                            type="button"
                            onClick={() => setOverviewFocusRefDate(new Date())}
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                          >
                            • Reset to Today
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        onClick={() => navigateRefDate('overviewFocus', -1)}
                        disabled={overviewFocusTimeframe === 'custom'}
                        title="Previous period"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </Button>
                      <CardTimeframeSelector 
                        timeframe={overviewFocusTimeframe}
                        onChangeTimeframe={(tf) => { setOverviewFocusTimeframe(tf); setOverviewFocusRefDate(new Date()); }}
                        customStart={overviewFocusCustomStart}
                        customEnd={overviewFocusCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setOverviewFocusCustomStart(s); setOverviewFocusCustomEnd(e); }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        onClick={() => navigateRefDate('overviewFocus', 1)}
                        disabled={overviewFocusTimeframe === 'custom'}
                        title="Next period"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {overviewFocusData.every(d => d['Focus Time'] === 0) ? (
                      <EmptyStateIcon Icon={Clock} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" debounce={0}>
                        <AreaChart data={overviewFocusData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
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
                          <Area type="monotone" dataKey="Focus Time" name="Focused Hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOverviewFocus)" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* VIEW 2: TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-12">
                
                {/* Task Progress Breakdown (Card 1) */}
                <Card 
                  className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer"
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                        Progress Breakdown
                      </CardTitle>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                        <span>{getCardRangeLabel(tasksVolumeTimeframe, tasksVolumeRefDate, tasksVolumeCustomStart, tasksVolumeCustomEnd)}</span>
                        {!isRefDateCurrent(tasksVolumeTimeframe, tasksVolumeRefDate) && (
                          <button
                            type="button"
                            onClick={() => setTasksVolumeRefDate(new Date())}
                            className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                          >
                            • Reset to Today
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        onClick={() => navigateRefDate('tasksVolume', -1)}
                        disabled={tasksVolumeTimeframe === 'custom'}
                        title="Previous period"
                      >
                        <ChevronLeft className="h-4.5 w-4.5" />
                      </Button>
                      <CardTimeframeSelector 
                        timeframe={tasksVolumeTimeframe}
                        onChangeTimeframe={(tf) => { setTasksVolumeTimeframe(tf); setTasksVolumeRefDate(new Date()); }}
                        customStart={tasksVolumeCustomStart}
                        customEnd={tasksVolumeCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setTasksVolumeCustomStart(s); setTasksVolumeCustomEnd(e); }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                        onClick={() => navigateRefDate('tasksVolume', 1)}
                        disabled={tasksVolumeTimeframe === 'custom'}
                        title="Next period"
                      >
                        <ChevronRight className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {tasksVolumeData.every(d => d['In Progress'] === 0 && d['Completed'] === 0 && d['Cancelled'] === 0) ? (
                      <EmptyStateIcon 
                        Icon={CheckSquare} 
                        title="No task activity logged" 
                        description="Create tasks or update their status during this period to see your insights here!" 
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" debounce={0}>
                        <BarChart data={tasksVolumeData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => Math.round(val).toString()} />
                          <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={tasksVolumeTimeframe} showFocus={false} showTasks={true} />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Bar dataKey="Completed" name="Completed" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={35} isAnimationActive={false}>
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
                          <Bar dataKey="In Progress" name="In Progress" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={35} isAnimationActive={false}>
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
                          <Bar dataKey="Cancelled" name="Cancelled" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={35} isAnimationActive={false}>
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
                  className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer flex flex-col justify-between"
                >
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-col gap-3">
                    {/* Row 1: Title, Subtitle and Timeframe Selector */}
                    <div className="flex flex-row items-start justify-between gap-4 w-full">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          Completion Rate
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                          <span>{getCardRangeLabel(tasksRatioTimeframe, tasksRatioRefDate, tasksRatioCustomStart, tasksRatioCustomEnd)}</span>
                          {!isRefDateCurrent(tasksRatioTimeframe, tasksRatioRefDate) && (
                            <button
                              type="button"
                              onClick={() => setTasksRatioRefDate(new Date())}
                              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                            >
                              • Reset to Today
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('tasksRatio', -1)}
                          disabled={tasksRatioTimeframe === 'custom'}
                          title="Previous period"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </Button>
                        <CardTimeframeSelector 
                          timeframe={tasksRatioTimeframe}
                          onChangeTimeframe={(tf) => { setTasksRatioTimeframe(tf); setTasksRatioRefDate(new Date()); }}
                          customStart={tasksRatioCustomStart}
                          customEnd={tasksRatioCustomEnd}
                          onChangeCustomRange={(s: string, e: string) => { setTasksRatioCustomStart(s); setTasksRatioCustomEnd(e); }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('tasksRatio', 1)}
                          disabled={tasksRatioTimeframe === 'custom'}
                          title="Next period"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Row 2: Category and Tag selectors */}
                    <div className="flex flex-row items-center gap-2 mt-1">
                      {/* Category Selector */}
                      <Popover open={ratioCatOpen} onOpenChange={setRatioCatOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                            <Sliders className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] truncate max-w-[70px]">
                              {tasksRatioCategory === 'all' ? 'All Lists' : tasksRatioCategory === 'none' ? 'No List' : categories.find(c => c.id === tasksRatioCategory)?.name || 'List'}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by List</span>
                            <button
                              onClick={() => { setTasksRatioCategory('none'); setRatioCatOpen(false); }}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                tasksRatioCategory === 'none' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              No List
                            </button>
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

                      {/* Tag Selector */}
                      <Popover open={ratioTagOpen} onOpenChange={setRatioTagOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                            <Filter className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] truncate max-w-[70px]">
                              {tasksRatioTag === 'all' ? 'All Tags' : tasksRatioTag === 'none' ? 'No Tags' : tasksRatioTag}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[220px]">
                          <ScrollArea className="h-full">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by Tag</span>
                              <button
                                onClick={() => { setTasksRatioTag('none'); setRatioTagOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioTag === 'none' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                No Tags
                              </button>
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
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center p-6 md:p-8 pt-0">
                    {tasksCompletionRatio.total === 0 ? (
                      <EmptyStateIcon 
                        Icon={Target} 
                        title="No task activity found" 
                        description="Create or complete tasks during this period to calculate your completion rate!" 
                      />
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        
                        {/* Circular SVG Progress Ring */}
                        <div className="relative flex items-center justify-center h-[160px] w-[160px]">
                          <svg className="transform -rotate-90" width={140} height={140} viewBox="0 0 140 140">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  
                  {/* Focus Distribution (Card 1) */}
                  <Card 
                    className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer flex flex-col justify-between"
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-col gap-3">
                      {/* Row 1: Title, Subtitle and Timeframe Selector */}
                      <div className="flex flex-row items-start justify-between gap-4 w-full">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <LayoutGrid className="h-5 w-5 text-blue-600" />
                            Focus Distribution
                          </CardTitle>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                            <span>{getCardRangeLabel(focusPieTimeframe, focusPieRefDate, focusPieCustomStart, focusPieCustomEnd)}</span>
                            {!isRefDateCurrent(focusPieTimeframe, focusPieRefDate) && (
                              <button
                                type="button"
                                onClick={() => setFocusPieRefDate(new Date())}
                                className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                              >
                                • Reset to Today
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            onClick={() => navigateRefDate('focusPie', -1)}
                            disabled={focusPieTimeframe === 'custom'}
                            title="Previous period"
                          >
                            <ChevronLeft className="h-4.5 w-4.5" />
                          </Button>
                          <CardTimeframeSelector 
                            timeframe={focusPieTimeframe}
                            onChangeTimeframe={(tf) => { setFocusPieTimeframe(tf); setFocusPieRefDate(new Date()); }}
                            customStart={focusPieCustomStart}
                            customEnd={focusPieCustomEnd}
                            onChangeCustomRange={(s: string, e: string) => { setFocusPieCustomStart(s); setFocusPieCustomEnd(e); }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            onClick={() => navigateRefDate('focusPie', 1)}
                            disabled={focusPieTimeframe === 'custom'}
                            title="Next period"
                          >
                            <ChevronRight className="h-4.5 w-4.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Row 2: Category and Tag Selector Dropdowns & Tasks Toggle */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">

                        {/* Category Dropdown */}
                        <Popover open={focusPieCatOpen} onOpenChange={setFocusPieCatOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                              <Sliders className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-[11px] truncate max-w-[90px]">
                                {focusPieCategories.length === 0
                                  ? 'List'
                                  : focusPieCategories.length === categories.length + 1
                                    ? 'All Lists'
                                    : focusPieCategories.length === 1
                                      ? focusPieCategories[0] === 'inbox'
                                        ? 'Inbox'
                                        : categories.find(c => c.id === focusPieCategories[0])?.name || 'List'
                                      : `${focusPieCategories.length} Lists`}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by List</span>
                              <button
                                onClick={() => setFocusPieCategories([])}
                                className={cn(
                                  "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  focusPieCategories.length === 0 ? "bg-rose-50/60 text-rose-605 font-extrabold" : "text-slate-500 hover:bg-slate-50"
                                )}
                              >
                                <span>Clear Filters</span>
                                {focusPieCategories.length === 0 && <Check className="h-3.5 w-3.5 text-rose-500" />}
                              </button>
                              <button
                                onClick={() => setFocusPieCategories([...categories.map(c => c.id), 'inbox'])}
                                className={cn(
                                  "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  focusPieCategories.length === categories.length + 1 ? "bg-blue-50 text-blue-600 font-extrabold" : "text-slate-755 hover:bg-slate-50"
                                )}
                              >
                                <span>All Lists</span>
                                {focusPieCategories.length === categories.length + 1 && <Check className="h-3.5 w-3.5 text-blue-500" />}
                              </button>
                              <div className="h-[1px] bg-slate-100 my-1" />
                              <div className="max-h-[160px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
                                {/* Inbox List Option */}
                                {(() => {
                                  const isSelected = focusPieCategories.includes('inbox');
                                  return (
                                    <button
                                      onClick={() => {
                                        setFocusPieCategories(prev => 
                                          prev.includes('inbox') ? prev.filter(id => id !== 'inbox') : [...prev, 'inbox']
                                        );
                                      }}
                                      className={cn(
                                        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                        isSelected ? "bg-blue-50/50 text-blue-600" : "text-slate-750 hover:bg-slate-50"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <Inbox className="h-3.5 w-3.5 text-slate-405 shrink-0" />
                                        <span className="truncate">Inbox</span>
                                      </div>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-500" />}
                                    </button>
                                  );
                                })()}

                                {categories.map(c => {
                                  const isSelected = focusPieCategories.includes(c.id);
                                  return (
                                    <button
                                      key={c.id}
                                      onClick={() => {
                                        setFocusPieCategories(prev => 
                                          prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                        );
                                      }}
                                      className={cn(
                                        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                        isSelected ? "bg-blue-50/50 text-blue-600" : "text-slate-750 hover:bg-slate-50"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                        <span className="truncate">{c.name}</span>
                                      </div>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-500" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Tag Dropdown */}
                        <Popover open={focusPieTagOpen} onOpenChange={setFocusPieTagOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                              <Filter className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-[11px] truncate max-w-[90px]">
                                {focusPieTags.length === 0
                                  ? 'Tag'
                                  : focusPieTags.length === tags.length
                                    ? 'All Tags'
                                    : focusPieTags.length === 1
                                      ? `#${focusPieTags[0]}`
                                      : `${focusPieTags.length} Tags`}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by Tag</span>
                              <button
                                onClick={() => setFocusPieTags([])}
                                className={cn(
                                  "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  focusPieTags.length === 0 ? "bg-rose-50/60 text-rose-605 font-extrabold" : "text-slate-500 hover:bg-slate-50"
                                )}
                              >
                                <span>Clear Filters</span>
                                {focusPieTags.length === 0 && <Check className="h-3.5 w-3.5 text-rose-500" />}
                              </button>
                              <button
                                onClick={() => setFocusPieTags(tags.map(t => t.name))}
                                className={cn(
                                  "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  focusPieTags.length === tags.length ? "bg-blue-50 text-blue-600 font-extrabold" : "text-slate-755 hover:bg-slate-50"
                                )}
                              >
                                <span>All Tags</span>
                                {focusPieTags.length === tags.length && <Check className="h-3.5 w-3.5 text-blue-500" />}
                              </button>
                              <div className="h-[1px] bg-slate-100 my-1" />
                              <div className="max-h-[160px] overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
                                {tags.map(t => {
                                  const isSelected = focusPieTags.includes(t.name);
                                  return (
                                    <button
                                      key={t.id}
                                      onClick={() => {
                                        setFocusPieTags(prev => 
                                          prev.includes(t.name) ? prev.filter(name => name !== t.name) : [...prev, t.name]
                                        );
                                      }}
                                      className={cn(
                                        "flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                        isSelected ? "bg-blue-50/50 text-blue-600" : "text-slate-750 hover:bg-slate-50"
                                      )}
                                    >
                                      <span className="truncate">#{t.name}</span>
                                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-500" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Tasks Toggle button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFocusPieShowTasks(!focusPieShowTasks)}
                          className={cn(
                            "rounded-xl h-9 px-3 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all border",
                            focusPieShowTasks 
                              ? "bg-blue-50 border-blue-200/80 text-blue-600 hover:bg-blue-100/50" 
                              : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <CheckSquare className={cn("h-3.5 w-3.5 transition-colors", focusPieShowTasks ? "text-blue-500" : "text-slate-400")} />
                          Tasks
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-8 p-6 md:p-8 pt-0 min-h-[300px]">
                      {focusPieData.totalSeconds === 0 ? (
                        <div className="w-full h-full min-h-[220px] flex items-center justify-center">
                          <EmptyStateIcon Icon={LayoutGrid} />
                        </div>
                      ) : (
                        <>
                          {/* Pie Chart Donut (Slightly Bigger) */}
                          <div className="h-[240px] w-[240px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%" debounce={0}>
                              <PieChart>
                                <Pie
                                  data={focusPieData.data}
                                  innerRadius={70}
                                  outerRadius={95}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                  isAnimationActive={false}
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
                                    <span className="text-slate-700 truncate w-18" title={item.name}>{item.name}</span>
                                  </div>
                                  <span className="text-slate-900 shrink-0 font-extrabold">
                                    {formatSecondsFriendly(item.value)}{' '}
                                    <span className="text-slate-400 font-semibold text-[10px]">({item.percentage}%)</span>
                                  </span>
                                </div>
                                
                                {/* Tiny matching progress bar (Thinner for elegant look) */}
                                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
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
                    className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer flex flex-col justify-between"
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-600" />
                          Focus Trend
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                          <span>{getCardRangeLabel(focusTrendTimeframe, focusTrendRefDate, focusTrendCustomStart, focusTrendCustomEnd)}</span>
                          {!isRefDateCurrent(focusTrendTimeframe, focusTrendRefDate) && (
                            <button
                              type="button"
                              onClick={() => setFocusTrendRefDate(new Date())}
                              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                            >
                              • Reset to Today
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('focusTrend', -1)}
                          disabled={focusTrendTimeframe === 'custom'}
                          title="Previous period"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </Button>
                        <CardTimeframeSelector 
                          timeframe={focusTrendTimeframe}
                          onChangeTimeframe={(tf) => { setFocusTrendTimeframe(tf); setFocusTrendRefDate(new Date()); }}
                          customStart={focusTrendCustomStart}
                          customEnd={focusTrendCustomEnd}
                          onChangeCustomRange={(s: string, e: string) => { setFocusTrendCustomStart(s); setFocusTrendCustomEnd(e); }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('focusTrend', 1)}
                          disabled={focusTrendTimeframe === 'custom'}
                          title="Next period"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[380px] p-6 md:p-8 pt-0">
                      {focusTrendData.every(d => d['Focused Time'] === 0) ? (
                        <EmptyStateIcon Icon={Clock} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%" debounce={0}>
                          <AreaChart data={focusTrendData} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorFocusTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600,  }} tickFormatter={(val) => formatSecondsFriendly(Math.round(val * 3600))} />
                            <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={focusTrendTimeframe} showFocus={true} showTasks={false} />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Area type="monotone" dataKey="Focused Time" name="Focused Hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocusTrend)" isAnimationActive={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ROW 2: Heatmap Activity Grid & Session Durations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
                  
                  {/* Heatmap Activity Grid (Card 1) */}
                  <Card 
                    className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer flex flex-col justify-between"
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Activity className="h-5 w-5 text-blue-600" />
                          Focus Activity Map
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                          <span>{getCardRangeLabel(focusHeatmapTimeframe, focusHeatmapRefDate, focusHeatmapCustomStart, focusHeatmapCustomEnd)}</span>
                          {!isRefDateCurrent(focusHeatmapTimeframe, focusHeatmapRefDate) && (
                            <button
                              type="button"
                              onClick={() => setFocusHeatmapRefDate(new Date())}
                              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                            >
                              • Reset to Today
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('focusHeatmap', -1)}
                          disabled={focusHeatmapTimeframe === 'custom'}
                          title="Previous period"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </Button>
                        <CardTimeframeSelector 
                          timeframe={focusHeatmapTimeframe}
                          onChangeTimeframe={(tf) => { setFocusHeatmapTimeframe(tf); setFocusHeatmapRefDate(new Date()); }}
                          customStart={focusHeatmapCustomStart}
                          customEnd={focusHeatmapCustomEnd}
                          onChangeCustomRange={(s: string, e: string) => { setFocusHeatmapCustomStart(s); setFocusHeatmapCustomEnd(e); }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('focusHeatmap', 1)}
                          disabled={focusHeatmapTimeframe === 'custom'}
                          title="Next period"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 pt-0 flex-1 flex flex-col justify-center min-h-[280px]">
                      <FocusHeatmap 
                        timeframe={focusHeatmapTimeframe}
                        customStart={focusHeatmapCustomStart}
                        customEnd={focusHeatmapCustomEnd}
                        sessions={sessions}
                        refDate={focusHeatmapRefDate}
                      />
                    </CardContent>
                  </Card>

                  {/* Focus Session Lengths (Card 2) */}
                  <Card 
                    className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80 cursor-pointer flex flex-col justify-between"
                  >
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-600" />
                          Session Durations
                        </CardTitle>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 whitespace-nowrap flex-nowrap">
                          <span>{getCardRangeLabel(focusLengthTimeframe, focusLengthRefDate, focusLengthCustomStart, focusLengthCustomEnd)}</span>
                          {!isRefDateCurrent(focusLengthTimeframe, focusLengthRefDate) && (
                            <button
                              type="button"
                              onClick={() => setFocusLengthRefDate(new Date())}
                              className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider animate-in fade-in slide-in-from-left-1 duration-200 whitespace-nowrap shrink-0"
                            >
                              • Reset to Today
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-xl p-0.5 shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('focusLength', -1)}
                          disabled={focusLengthTimeframe === 'custom'}
                          title="Previous period"
                        >
                          <ChevronLeft className="h-4.5 w-4.5" />
                        </Button>
                        <CardTimeframeSelector 
                          timeframe={focusLengthTimeframe}
                          onChangeTimeframe={(tf) => { setFocusLengthTimeframe(tf); setFocusLengthRefDate(new Date()); }}
                          customStart={focusLengthCustomStart}
                          customEnd={focusLengthCustomEnd}
                          onChangeCustomRange={(s: string, e: string) => { setFocusLengthCustomStart(s); setFocusLengthCustomEnd(e); }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                          onClick={() => navigateRefDate('focusLength', 1)}
                          disabled={focusLengthTimeframe === 'custom'}
                          title="Next period"
                        >
                          <ChevronRight className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {focusLengthData.every(d => d['Sessions'] === 0) ? (
                        <EmptyStateIcon Icon={Zap} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%" debounce={0}>
                          <BarChart data={focusLengthData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => Math.round(val).toString()} />
                            <Tooltip content={<CustomTooltip sessions={sessions} tasks={tasks} timeframe={focusLengthTimeframe} showFocus={true} showTasks={false} />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Sessions" name="Focus Sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35} isAnimationActive={false}>
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
    <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl p-5 md:p-6 transition-[shadow,border-color] duration-300 hover:shadow-2xl hover:border-slate-200/80">
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
function EmptyStateIcon({ 
  Icon, 
  title = "No focus activity logged yet", 
  description = "Start focus sessions or complete tasks during this period to see your insights here!" 
}: { 
  Icon: any; 
  title?: string; 
  description?: string; 
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 min-h-[220px]">
      <div className="h-11 w-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-slate-400/80" />
      </div>
      <p className="text-xs font-bold text-slate-500 mb-0.5">{title}</p>
      <p className="text-[10px] text-slate-400/80 max-w-[200px] leading-normal font-medium">{description}</p>
    </div>
  );
}
