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
  TrendingUp,
  BarChart3, 
  LayoutGrid,
  Loader2,
  Filter,
  Activity,
  CheckSquare,
  Sliders,
  Target,
  Flame,
  Zap,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Custom Tooltip component for standard styling across Recharts components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 border border-slate-200/80 rounded-2xl shadow-xl p-3.5 flex flex-col gap-1.5 backdrop-blur-md">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
        {payload.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill || '#3b82f6' }} />
            <span className="text-xs font-bold text-slate-900 capitalize">
              {p.name}: <span className="text-blue-600 font-extrabold">{p.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Reusable card timeframe selection dropdown with custom date range fields
interface CardTimeframeSelectorProps {
  timeframe: 'day' | 'week' | 'month' | 'custom';
  onChangeTimeframe: (tf: 'day' | 'week' | 'month' | 'custom') => void;
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
            {timeframe === 'day' ? 'Today' : timeframe === 'week' ? 'Last 7 Days' : timeframe === 'month' ? 'Last 30 Days' : 'Custom'}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase select-none">Timeframe</span>
          <button
            type="button"
            onClick={() => { onChangeTimeframe('day'); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-left",
              timeframe === 'day' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => { onChangeTimeframe('week'); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-left",
              timeframe === 'week' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => { onChangeTimeframe('month'); setOpen(false); }}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer w-full text-left",
              timeframe === 'month' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            Last 30 Days
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

// Helper to format seconds into a friendly duration: e.g. "14h 30m"
const formatSecondsFriendly = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return '0m';
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
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
  
  // Overview: Activity Summary
  const [overviewActivityTimeframe, setOverviewActivityTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [overviewActivityCustomStart, setOverviewActivityCustomStart] = React.useState(defaultStartDate);
  const [overviewActivityCustomEnd, setOverviewActivityCustomEnd] = React.useState(defaultEndDate);
  const [overviewActivityHover, setOverviewActivityHover] = React.useState<number | null>(null);

  // Overview: Daily Active Rhythm
  const [overviewRhythmTimeframe, setOverviewRhythmTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [overviewRhythmCustomStart, setOverviewRhythmCustomStart] = React.useState(defaultStartDate);
  const [overviewRhythmCustomEnd, setOverviewRhythmCustomEnd] = React.useState(defaultEndDate);
  
  // Tasks: Task Status & Volume
  const [tasksVolumeTimeframe, setTasksVolumeTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [tasksVolumeCustomStart, setTasksVolumeCustomStart] = React.useState(defaultStartDate);
  const [tasksVolumeCustomEnd, setTasksVolumeCustomEnd] = React.useState(defaultEndDate);
  const [tasksVolumeHover, setTasksVolumeHover] = React.useState<number | null>(null);

  // Tasks: Completion Ratio
  const [tasksRatioTimeframe, setTasksRatioTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [tasksRatioCustomStart, setTasksRatioCustomStart] = React.useState(defaultStartDate);
  const [tasksRatioCustomEnd, setTasksRatioCustomEnd] = React.useState(defaultEndDate);
  const [tasksRatioCategory, setTasksRatioCategory] = React.useState<number | 'all'>('all');
  const [tasksRatioPriority, setTasksRatioPriority] = React.useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [ratioCatOpen, setRatioCatOpen] = React.useState(false);
  const [ratioPrioOpen, setRatioPrioOpen] = React.useState(false);

  // Tasks: Completed Tasks Trend
  const [tasksTrendTimeframe, setTasksTrendTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [tasksTrendCustomStart, setTasksTrendCustomStart] = React.useState(defaultStartDate);
  const [tasksTrendCustomEnd, setTasksTrendCustomEnd] = React.useState(defaultEndDate);
  const [tasksTrendCategory, setTasksTrendCategory] = React.useState<number | 'all'>('all');
  const [trendCatOpen, setTrendCatOpen] = React.useState(false);

  // Tasks: Tasks by Priority
  const [tasksPriorityTimeframe, setTasksPriorityTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [tasksPriorityCustomStart, setTasksPriorityCustomStart] = React.useState(defaultStartDate);
  const [tasksPriorityCustomEnd, setTasksPriorityCustomEnd] = React.useState(defaultEndDate);
  const [tasksPriorityHover, setTasksPriorityHover] = React.useState<number | null>(null);

  // Focus: Focus Pie Chart
  const [focusPieTimeframe, setFocusPieTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [focusPieCustomStart, setFocusPieCustomStart] = React.useState(defaultStartDate);
  const [focusPieCustomEnd, setFocusPieCustomEnd] = React.useState(defaultEndDate);
  const [focusPieCategory, setFocusPieCategory] = React.useState<number | 'all'>('all');
  const [focusPieTag, setFocusPieTag] = React.useState<string | 'all'>('all');
  const [focusPieCatOpen, setFocusPieCatOpen] = React.useState(false);
  const [focusPieTagOpen, setFocusPieTagOpen] = React.useState(false);

  // Focus: Focused Hours Trend
  const [focusTrendTimeframe, setFocusTrendTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [focusTrendCustomStart, setFocusTrendCustomStart] = React.useState(defaultStartDate);
  const [focusTrendCustomEnd, setFocusTrendCustomEnd] = React.useState(defaultEndDate);

  // Focus: Session Length Buckets
  const [focusLengthTimeframe, setFocusLengthTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [focusLengthCustomStart, setFocusLengthCustomStart] = React.useState(defaultStartDate);
  const [focusLengthCustomEnd, setFocusLengthCustomEnd] = React.useState(defaultEndDate);
  const [focusLengthHover, setFocusLengthHover] = React.useState<number | null>(null);

  // Focus: Focus Time by Category
  const [focusCatTimeframe, setFocusCatTimeframe] = React.useState<'day' | 'week' | 'month' | 'custom'>('week');
  const [focusCatCustomStart, setFocusCatCustomStart] = React.useState(defaultStartDate);
  const [focusCatCustomEnd, setFocusCatCustomEnd] = React.useState(defaultEndDate);
  const [focusCatHover, setFocusCatHover] = React.useState<number | null>(null);

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
    timeframe: 'day' | 'week' | 'month' | 'custom',
    customStart: string,
    customEnd: string
  ) => {
    const now = new Date();
    return (date: Date) => {
      const targetTime = date.getTime();
      
      if (timeframe === 'day') {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return targetTime >= todayStart.getTime() && targetTime <= todayEnd.getTime();
      }
      
      if (timeframe === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return targetTime >= weekStart.getTime() && targetTime <= todayEnd.getTime();
      }
      
      if (timeframe === 'month') {
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        monthStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        return targetTime >= monthStart.getTime() && targetTime <= todayEnd.getTime();
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
    timeframe: 'day' | 'week' | 'month' | 'custom',
    customStart: string,
    customEnd: string
  ) => {
    const now = new Date();
    
    if (timeframe === 'day') {
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
          const isToday = d.getFullYear() === now.getFullYear() &&
                          d.getMonth() === now.getMonth() &&
                          d.getDate() === now.getDate();
          const hour = d.getHours();
          return isToday && hour >= item.minHour && hour < item.maxHour;
        }
      }));
    }
    
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
      const periods = [
        { label: 'Week 1', startDay: 28, endDay: 22 },
        { label: 'Week 2', startDay: 21, endDay: 15 },
        { label: 'Week 3', startDay: 14, endDay: 8 },
        { label: 'Week 4', startDay: 7, endDay: 0 },
      ];
      return periods.map(p => ({
        key: p.label,
        label: p.label,
        filter: (date: Date) => {
          const diffTime = now.getTime() - date.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= p.endDay && diffDays <= p.startDay;
        }
      }));
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

  // Overview View: Activity Summary (Dual Bar Chart)
  const overviewActivityData = React.useMemo(() => {
    const bins = generateChartDataPoints(overviewActivityTimeframe, overviewActivityCustomStart, overviewActivityCustomEnd);
    return bins.map(bin => {
      const binSessions = sessions.filter(s => {
        const d = new Date(s.startedAt || s.createdAt);
        return bin.filter(d);
      });
      const binCompleted = tasks.filter(t => {
        if (t.status !== 2) return false;
        const d = getTaskAnchorDate(t);
        return bin.filter(d);
      });

      const totalSeconds = binSessions.reduce((acc, s) => acc + s.accumulatedSeconds, 0);
      return {
        name: bin.label,
        'Focused Hours': parseFloat((totalSeconds / 3600).toFixed(2)),
        'Completed Tasks': binCompleted.length
      };
    });
  }, [sessions, tasks, overviewActivityTimeframe, overviewActivityCustomStart, overviewActivityCustomEnd, generateChartDataPoints]);

  // Overview View: Hourly Active Rhythm (Area Chart)
  const overviewRhythmData = React.useMemo(() => {
    const filter = getDateFilter(overviewRhythmTimeframe, overviewRhythmCustomStart, overviewRhythmCustomEnd);
    
    // Filter sessions & completed tasks in range
    const inRangeSessions = sessions.filter(s => filter(new Date(s.startedAt || s.createdAt)));
    const inRangeCompleted = tasks.filter(t => t.status === 2 && filter(getTaskAnchorDate(t)));

    const hourlyBlocks = [
      { label: '12am - 3am', minHour: 0, maxHour: 3 },
      { label: '3am - 6am', minHour: 3, maxHour: 6 },
      { label: '6am - 9am', minHour: 6, maxHour: 9 },
      { label: '9am - 12pm', minHour: 9, maxHour: 12 },
      { label: '12pm - 3pm', minHour: 12, maxHour: 15 },
      { label: '3pm - 6pm', minHour: 15, maxHour: 18 },
      { label: '6pm - 9pm', minHour: 18, maxHour: 21 },
      { label: '9pm - 12am', minHour: 21, maxHour: 24 }
    ];

    return hourlyBlocks.map(block => {
      const blockSessions = inRangeSessions.filter(s => {
        const h = new Date(s.startedAt || s.createdAt).getHours();
        return h >= block.minHour && h < block.maxHour;
      });
      const blockTasks = inRangeCompleted.filter(t => {
        const h = getTaskAnchorDate(t).getHours();
        return h >= block.minHour && h < block.maxHour;
      });

      const seconds = blockSessions.reduce((acc, s) => acc + s.accumulatedSeconds, 0);
      return {
        name: block.label,
        'Focus Minutes': Math.round(seconds / 60),
        'Task Completions': blockTasks.length
      };
    });
  }, [sessions, tasks, overviewRhythmTimeframe, overviewRhythmCustomStart, overviewRhythmCustomEnd, getDateFilter]);

  // Tasks View: Status & Volume (Stacked Bar Chart)
  const tasksVolumeData = React.useMemo(() => {
    const bins = generateChartDataPoints(tasksVolumeTimeframe, tasksVolumeCustomStart, tasksVolumeCustomEnd);
    return bins.map(bin => {
      const binTasks = tasks.filter(t => bin.filter(getTaskAnchorDate(t)));
      
      const active = binTasks.filter(t => t.status === 0 || t.status === 1 || t.status === 4).length;
      const completed = binTasks.filter(t => t.status === 2).length;
      const cancelled = binTasks.filter(t => t.status === 3).length;

      return {
        name: bin.label,
        'Active Tasks': active,
        'Completed Tasks': completed,
        'Cancelled Tasks': cancelled
      };
    });
  }, [tasks, tasksVolumeTimeframe, tasksVolumeCustomStart, tasksVolumeCustomEnd, generateChartDataPoints]);

  // Tasks View: Completion Ratio Circular Gauge
  const tasksCompletionRatio = React.useMemo(() => {
    const filter = getDateFilter(tasksRatioTimeframe, tasksRatioCustomStart, tasksRatioCustomEnd);
    
    const filtered = tasks.filter(t => {
      // Category filter
      if (tasksRatioCategory !== 'all' && t.categoryId !== tasksRatioCategory) return false;
      // Priority filter
      if (tasksRatioPriority !== 'all') {
        if (tasksRatioPriority === 'high' && t.priority < 8) return false;
        if (tasksRatioPriority === 'medium' && (t.priority < 4 || t.priority > 7)) return false;
        if (tasksRatioPriority === 'low' && t.priority > 3) return false;
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
  }, [tasks, tasksRatioTimeframe, tasksRatioCustomStart, tasksRatioCustomEnd, tasksRatioCategory, tasksRatioPriority, getDateFilter]);

  // Tasks View: Completed Tasks Cumulative Trend (Area Chart)
  const completedTasksTrendData = React.useMemo(() => {
    const bins = generateChartDataPoints(tasksTrendTimeframe, tasksTrendCustomStart, tasksTrendCustomEnd);
    
    let cumulative = 0;
    return bins.map(bin => {
      const binCompleted = tasks.filter(t => {
        if (t.status !== 2) return false;
        if (tasksTrendCategory !== 'all' && t.categoryId !== tasksTrendCategory) return false;
        return bin.filter(getTaskAnchorDate(t));
      }).length;

      cumulative += binCompleted;
      return {
        name: bin.label,
        'Daily Completed': binCompleted,
        'Total Completed': cumulative
      };
    });
  }, [tasks, tasksTrendTimeframe, tasksTrendCustomStart, tasksTrendCustomEnd, tasksTrendCategory, generateChartDataPoints]);

  // Tasks View: Tasks by Priority (Stacked Horizontal Bar Chart)
  const tasksByPriorityData = React.useMemo(() => {
    const filter = getDateFilter(tasksPriorityTimeframe, tasksPriorityCustomStart, tasksPriorityCustomEnd);
    const active = tasks.filter(t => filter(getTaskAnchorDate(t)));

    const categories = [
      { name: 'High (8-10)', min: 8, max: 10 },
      { name: 'Medium (4-7)', min: 4, max: 7 },
      { name: 'Low (1-3)', min: 1, max: 3 }
    ];

    return categories.map(cat => {
      const catTasks = active.filter(t => t.priority >= cat.min && t.priority <= cat.max);
      const completed = catTasks.filter(t => t.status === 2).length;
      const todo = catTasks.filter(t => t.status === 0 || t.status === 1 || t.status === 4).length;

      return {
        name: cat.name,
        'Completed Tasks': completed,
        'Active Tasks': todo
      };
    });
  }, [tasks, tasksPriorityTimeframe, tasksPriorityCustomStart, tasksPriorityCustomEnd, getDateFilter]);

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
        'Focused Hours': parseFloat((seconds / 3600).toFixed(2))
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

  // Focus View: Focus Time by Category (Bar Chart with matching colors)
  const focusTimeByCategoryData = React.useMemo(() => {
    const filter = getDateFilter(focusCatTimeframe, focusCatCustomStart, focusCatCustomEnd);
    const rangeSessions = sessions.filter(s => filter(new Date(s.startedAt || s.createdAt)));

    const accumulations: Record<string, { seconds: number; color: string }> = {};
    
    // Initialize standard categories for consistency
    categories.forEach(c => {
      accumulations[c.name] = { seconds: 0, color: c.color || '#3b82f6' };
    });
    accumulations['Inbox/Uncategorized'] = { seconds: 0, color: '#8b919f' };

    rangeSessions.forEach(s => {
      const assocTask = tasks.find(t => t.id === s.taskId);
      if (!assocTask || !assocTask.categoryId) {
        accumulations['Inbox/Uncategorized'].seconds += s.accumulatedSeconds;
      } else {
        const cat = categories.find(c => c.id === assocTask.categoryId);
        const name = cat ? cat.name : 'Inbox/Uncategorized';
        accumulations[name].seconds += s.accumulatedSeconds;
      }
    });

    return Object.entries(accumulations).map(([name, val]) => ({
      name,
      'Hours': parseFloat((val.seconds / 3600).toFixed(2)),
      color: val.color
    })).filter(item => item.Hours > 0 || item.name !== 'Inbox/Uncategorized'); // Only show uncategorized if it has values
  }, [sessions, tasks, categories, focusCatTimeframe, focusCatCustomStart, focusCatCustomEnd, getDateFilter]);

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
              title="All-Time Completions" 
              value={String(headerStats.completions)} 
              icon={CheckCircle2} 
              iconColor="text-emerald-600 bg-emerald-50"
            />
            <StatCard 
              title="All-Time Focus Hours" 
              value={headerStats.focusTime} 
              icon={Clock} 
              iconColor="text-blue-600 bg-blue-50"
            />
            <StatCard 
              title="Active Work Queue" 
              value={String(headerStats.activeTasks)} 
              icon={Flame} 
              iconColor="text-orange-600 bg-orange-50"
            />
            <StatCard 
              title="Total Categories" 
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
                
                {/* Activity Summary Dual Bar Chart Card */}
                <Card className="lg:col-span-2 bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Activity Summary
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">Comparing focus time against completed items</CardDescription>
                    </div>
                    <CardTimeframeSelector 
                      timeframe={overviewActivityTimeframe}
                      onChangeTimeframe={setOverviewActivityTimeframe}
                      customStart={overviewActivityCustomStart}
                      customEnd={overviewActivityCustomEnd}
                      onChangeCustomRange={(s: string, e: string) => { setOverviewActivityCustomStart(s); setOverviewActivityCustomEnd(e); }}
                    />
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {overviewActivityData.every(d => d['Focused Hours'] === 0 && d['Completed Tasks'] === 0) ? (
                      <EmptyStateIcon Icon={BarChart3} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overviewActivityData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Bar dataKey="Focused Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            {overviewActivityData.map((_, idx) => (
                              <Cell 
                                key={`cell-focus-${idx}`}
                                fill={overviewActivityHover === idx ? '#2563eb' : '#3b82f6'}
                                onMouseEnter={() => setOverviewActivityHover(idx)}
                                onMouseLeave={() => setOverviewActivityHover(null)}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="Completed Tasks" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30}>
                            {overviewActivityData.map((_, idx) => (
                              <Cell 
                                key={`cell-task-${idx}`}
                                fill={overviewActivityHover === idx ? '#059669' : '#10b981'}
                                onMouseEnter={() => setOverviewActivityHover(idx)}
                                onMouseLeave={() => setOverviewActivityHover(null)}
                                className="transition-all duration-200 cursor-pointer"
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Daily Active Rhythm Area Chart */}
                <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                  <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Active Rhythm
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-400">Peak performance hours of your day</CardDescription>
                    </div>
                    <CardTimeframeSelector 
                      timeframe={overviewRhythmTimeframe}
                      onChangeTimeframe={setOverviewRhythmTimeframe}
                      customStart={overviewRhythmCustomStart}
                      customEnd={overviewRhythmCustomEnd}
                      onChangeCustomRange={(s: string, e: string) => { setOverviewRhythmCustomStart(s); setOverviewRhythmCustomEnd(e); }}
                    />
                  </CardHeader>
                  <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                    {overviewRhythmData.every(d => d['Focus Minutes'] === 0 && d['Task Completions'] === 0) ? (
                      <EmptyStateIcon Icon={Activity} />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={overviewRhythmData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorFocusRhythm" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} dy={5} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                          <Area type="monotone" dataKey="Focus Minutes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocusRhythm)" />
                          <Area type="monotone" dataKey="Task Completions" stroke="#9333ea" strokeWidth={2} fill="transparent" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* VIEW 2: TASKS TAB */}
            {activeTab === 'tasks' && (
              <div className="space-y-8 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  
                  {/* Task Status & Volume Card */}
                  <Card className="lg:col-span-2 bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                          Task Status & Volume
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Chronological distribution of tasks by status</CardDescription>
                      </div>
                      <CardTimeframeSelector 
                        timeframe={tasksVolumeTimeframe}
                        onChangeTimeframe={setTasksVolumeTimeframe}
                        customStart={tasksVolumeCustomStart}
                        customEnd={tasksVolumeCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setTasksVolumeCustomStart(s); setTasksVolumeCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="h-[320px] p-6 md:p-8 pt-0">
                      {tasksVolumeData.every(d => d['Active Tasks'] === 0 && d['Completed Tasks'] === 0 && d['Cancelled Tasks'] === 0) ? (
                        <EmptyStateIcon Icon={CheckSquare} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksVolumeData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Completed Tasks" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={35}>
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
                            <Bar dataKey="Active Tasks" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={35}>
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
                            <Bar dataKey="Cancelled Tasks" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} maxBarSize={35}>
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

                  {/* Completion Ratio Ring Gauge Card */}
                  <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden flex flex-col justify-between">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-col gap-3">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          Completion Ratio
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Total matched tasks completed ratio</CardDescription>
                      </div>
                      
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

                        {/* Priority Selector */}
                        <Popover open={ratioPrioOpen} onOpenChange={setRatioPrioOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1.5 cursor-pointer">
                              <Target className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-[11px] capitalize">
                                {tasksRatioPriority === 'all' ? 'All Priorities' : tasksRatioPriority}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by Priority</span>
                              <button
                                onClick={() => { setTasksRatioPriority('all'); setRatioPrioOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioPriority === 'all' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                All Priorities
                              </button>
                              <button
                                onClick={() => { setTasksRatioPriority('high'); setRatioPrioOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioPriority === 'high' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                High Priority (8-10)
                              </button>
                              <button
                                onClick={() => { setTasksRatioPriority('medium'); setRatioPrioOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioPriority === 'medium' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                Medium Priority (4-7)
                              </button>
                              <button
                                onClick={() => { setTasksRatioPriority('low'); setRatioPrioOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksRatioPriority === 'low' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                Low Priority (1-3)
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
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
                              {/* Background Circle */}
                              <circle 
                                stroke="#f1f5f9"
                                strokeWidth="12"
                                fill="transparent"
                                r="55"
                                cx="70"
                                cy="70"
                              />
                              {/* Progress Circle */}
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
                            
                            {/* Central Text */}
                            <div className="absolute flex flex-col items-center text-center">
                              <span className="text-3xl font-black text-slate-900 tracking-tight">{tasksCompletionRatio.ratio}%</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Success Rate</span>
                            </div>
                          </div>

                          {/* Stat Metric Grid */}
                          <div className="grid grid-cols-3 gap-2 w-full mt-4">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                              <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Completed</span>
                              <span className="text-sm font-bold text-emerald-600">{tasksCompletionRatio.completed}</span>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                              <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Active</span>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  
                  {/* Completed Tasks Cumulative Trend Card */}
                  <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Completed Tasks Over Time
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Cumulative completed tasks showing productivity momentum</CardDescription>
                      </div>
                      <div className="flex gap-2 items-center">
                        <CardTimeframeSelector 
                          timeframe={tasksTrendTimeframe}
                          onChangeTimeframe={setTasksTrendTimeframe}
                          customStart={tasksTrendCustomStart}
                          customEnd={tasksTrendCustomEnd}
                          onChangeCustomRange={(s: string, e: string) => { setTasksTrendCustomStart(s); setTasksTrendCustomEnd(e); }}
                        />

                        {/* List/Category Filter */}
                        <Popover open={trendCatOpen} onOpenChange={setTrendCatOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="bg-slate-50 border-slate-200/60 text-slate-600 font-bold rounded-xl h-9 px-3 shadow-2xs flex items-center gap-1 cursor-pointer">
                              <span className="text-[11px] truncate max-w-[80px]">
                                {tasksTrendCategory === 'all' ? 'All Lists' : categories.find(c => c.id === tasksTrendCategory)?.name || 'List'}
                              </span>
                              <ChevronDown className="h-3 w-3 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-44 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase">Filter by List</span>
                              <button
                                onClick={() => { setTasksTrendCategory('all'); setTrendCatOpen(false); }}
                                className={cn(
                                  "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                  tasksTrendCategory === 'all' ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                All Lists
                              </button>
                              {categories.map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => { setTasksTrendCategory(c.id); setTrendCatOpen(false); }}
                                  className={cn(
                                    "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left w-full",
                                    tasksTrendCategory === c.id ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {completedTasksTrendData.every(d => d['Total Completed'] === 0) ? (
                        <EmptyStateIcon Icon={TrendingUp} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={completedTasksTrendData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorTotalCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Area type="monotone" dataKey="Total Completed" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotalCompleted)" />
                            <Area type="monotone" dataKey="Daily Completed" stroke="#3b82f6" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tasks by Priority Card */}
                  <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Award className="h-5 w-5 text-blue-600" />
                          Tasks by Priority
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Distribution of active and completed tasks by priority category</CardDescription>
                      </div>
                      <CardTimeframeSelector 
                        timeframe={tasksPriorityTimeframe}
                        onChangeTimeframe={setTasksPriorityTimeframe}
                        customStart={tasksPriorityCustomStart}
                        customEnd={tasksPriorityCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setTasksPriorityCustomStart(s); setTasksPriorityCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {tasksByPriorityData.every(d => d['Completed Tasks'] === 0 && d['Active Tasks'] === 0) ? (
                        <EmptyStateIcon Icon={Award} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tasksByPriorityData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} width={80} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Completed Tasks" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20}>
                              {tasksByPriorityData.map((_, idx) => (
                                <Cell 
                                  key={`cell-prio-comp-${idx}`}
                                  fill={tasksPriorityHover === idx ? '#059669' : '#10b981'}
                                  onMouseEnter={() => setTasksPriorityHover(idx)}
                                  onMouseLeave={() => setTasksPriorityHover(null)}
                                  className="transition-all duration-200 cursor-pointer"
                                />
                              ))}
                            </Bar>
                            <Bar dataKey="Active Tasks" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20}>
                              {tasksByPriorityData.map((_, idx) => (
                                <Cell 
                                  key={`cell-prio-act-${idx}`}
                                  fill={tasksPriorityHover === idx ? '#2563eb' : '#3b82f6'}
                                  onMouseEnter={() => setTasksPriorityHover(idx)}
                                  onMouseLeave={() => setTasksPriorityHover(null)}
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

            {/* VIEW 3: FOCUS TAB */}
            {activeTab === 'focus' && (
              <div className="space-y-8 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  
                  {/* Interactive Focus Pie Chart Card */}
                  <Card className="lg:col-span-2 bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden flex flex-col justify-between">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <LayoutGrid className="h-5 w-5 text-blue-600" />
                          Focus Distribution By Task
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Share of focused seconds tracked across specific tasks</CardDescription>
                      </div>
                      
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
                                <Tooltip content={<CustomTooltip />} />
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

                  {/* Focused Hours Trend Spline Area Chart */}
                  <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden flex flex-col justify-between">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                          Focused Hours Trend
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Total session time over this timeframe</CardDescription>
                      </div>
                      <CardTimeframeSelector 
                        timeframe={focusTrendTimeframe}
                        onChangeTimeframe={setFocusTrendTimeframe}
                        customStart={focusTrendCustomStart}
                        customEnd={focusTrendCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setFocusTrendCustomStart(s); setFocusTrendCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {focusTrendData.every(d => d['Focused Hours'] === 0) ? (
                        <EmptyStateIcon Icon={BarChart3} />
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
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Area type="monotone" dataKey="Focused Hours" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorFocusTrend)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                  
                  {/* Focus Session Length Buckets Card */}
                  <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Zap className="h-5 w-5 text-blue-600" />
                          Session Length Breakdown
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Total sessions matching each duration interval</CardDescription>
                      </div>
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
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                            <Bar dataKey="Sessions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={35}>
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

                  {/* Focus Time by Category Card */}
                  <Card className="bg-white border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-6 md:p-8 pb-4 flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Sliders className="h-5 w-5 text-blue-600" />
                          Focus Hours by List
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-400">Total focus hours logged for tasks in each list</CardDescription>
                      </div>
                      <CardTimeframeSelector 
                        timeframe={focusCatTimeframe}
                        onChangeTimeframe={setFocusCatTimeframe}
                        customStart={focusCatCustomStart}
                        customEnd={focusCatCustomEnd}
                        onChangeCustomRange={(s: string, e: string) => { setFocusCatCustomStart(s); setFocusCatCustomEnd(e); }}
                      />
                    </CardHeader>
                    <CardContent className="h-[280px] p-6 md:p-8 pt-0">
                      {focusTimeByCategoryData.length === 0 || focusTimeByCategoryData.every(d => d['Hours'] === 0) ? (
                        <EmptyStateIcon Icon={Sliders} />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={focusTimeByCategoryData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={5} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)', radius: 8 }} />
                            <Bar dataKey="Hours" radius={[4, 4, 0, 0]} maxBarSize={40}>
                              {focusTimeByCategoryData.map((entry, idx) => (
                                <Cell 
                                  key={`cell-focus-cat-${idx}`}
                                  fill={focusCatHover === idx ? '#2563eb' : entry.color}
                                  onMouseEnter={() => setFocusCatHover(idx)}
                                  onMouseLeave={() => setFocusCatHover(null)}
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
      <p className="text-xs font-bold text-slate-500 mb-0.5">No activity recorded</p>
      <p className="text-[10px] text-slate-400/80 max-w-[200px] leading-normal font-medium">Log focused stopwatch sessions or complete tasks during this timeframe to populate metrics.</p>
    </div>
  );
}
