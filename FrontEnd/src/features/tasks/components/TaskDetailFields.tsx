import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Circle, Flag, Clock, Calendar, Tag as TagIcon, FolderOpen, X, ChevronDown, Plus, Minus, Check, Trash2, Dumbbell, AlertCircle, ClockCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { type Task, type Category, type Tag, type UpdateTaskDto, TaskStatus } from '@/types/index';
import { DetailRow } from './DetailRow';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';
import { getTaskSessions } from '@/features/focus/services/timeTrackingService';

// Format date to local friendly representation
const formatDateFriendly = (dateStr?: string | null) => {
  if (!dateStr || dateStr.startsWith('0001-01-01')) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not set';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'Not set';
  }
};

// Parse date-time ISO string into separate visual components
const parseDateTime = (isoString?: string | null): { date: Date | undefined; hour: number; minute: number; ampm: 'AM' | 'PM' } => {
  if (!isoString || isoString.startsWith('0001-01-01')) {
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    const ampm: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return { date: undefined, hour, minute, ampm };
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      const now = new Date();
      let hour = now.getHours();
      const minute = now.getMinutes();
      const ampm: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      return { date: undefined, hour, minute, ampm };
    }
    let hour = d.getHours();
    const minute = d.getMinutes();
    const ampm: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return { date: d, hour, minute, ampm };
  } catch (e) {
    const now = new Date();
    let hour = now.getHours();
    const minute = now.getMinutes();
    const ampm: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return { date: undefined, hour, minute, ampm };
  }
};

// Build date-time ISO string from components
const buildDateTime = (date: Date, hour: number, minute: number, ampm: 'AM' | 'PM') => {
  const newDate = new Date(date);
  let militaryHour = hour;
  if (ampm === 'PM' && hour < 12) {
    militaryHour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    militaryHour = 0;
  }
  newDate.setHours(militaryHour, minute, 0, 0);
  return newDate.toISOString();
};

// Premium Custom Dropdown Component
function CustomDropdown<T extends string | number>({
  value,
  options,
  onChange,
  placeholder = "Select...",
  className
}: {
  value: T;
  options: { value: T; label: string; color?: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className="relative w-full animate-fade-in">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-card hover:bg-muted/80 border border-border hover:border-blue-500/40 hover:ring-4 hover:ring-blue-500/5 px-3.5 py-2 rounded-xl transition-all shadow-sm dark:shadow-none flex items-center justify-between text-xs font-semibold text-foreground focus:outline-none cursor-pointer min-h-[38px]",
          isOpen && "border-blue-500/50 ring-4 ring-blue-500/5 bg-muted/50",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {activeOption?.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/5" style={{ backgroundColor: activeOption.color }} />
          )}
          <span className="truncate font-bold">{activeOption?.label || placeholder}</span>
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-250 shrink-0 ml-1.5", isOpen && "rotate-180 text-blue-500")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl dark:shadow-none py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <div key={opt.value} className="px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3.5 py-2 text-xs font-bold text-foreground hover:text-foreground rounded-xl flex items-center justify-between transition-all cursor-pointer",
                    isActive 
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10" 
                      : "hover:bg-muted/80"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.color && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/5" style={{ backgroundColor: opt.color }} />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 ml-1" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Clickable Date Picker with custom Popover calendar and scroll-bounded time columns
// Clickable Date Picker with custom Popover calendar and scroll-bounded time columns
function ClickableDatePicker({
  value,
  onChange,
  isOpen,
  onOpenChange,
  showClear = true,
  panelRef,
  title
}: {
  value?: string | null;
  onChange: (val: string | null) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showClear?: boolean;
  panelRef?: React.RefObject<HTMLElement | null>;
  title: string;
}) {
  // Staging state: store changes locally until "Apply" is clicked
  const [tempValue, setTempValue] = React.useState<string | null>(value || null);

  React.useEffect(() => {
    if (isOpen) {
      setTempValue(value || null);
    }
  }, [isOpen, value]);

  const { date, hour, minute, ampm } = React.useMemo(() => parseDateTime(tempValue), [tempValue]);
  const hasValidValue = value && !value.startsWith('0001-01-01');

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const finalVal = buildDateTime(selectedDate, hour, minute, ampm);
    setTempValue(finalVal);
  };

  const handleHourSelect = (selectedHour: number) => {
    const activeDate = date || new Date();
    const finalVal = buildDateTime(activeDate, selectedHour, minute, ampm);
    setTempValue(finalVal);
  };

  const handleMinuteSelect = (selectedMinute: number) => {
    const activeDate = date || new Date();
    const finalVal = buildDateTime(activeDate, hour, selectedMinute, ampm);
    setTempValue(finalVal);
  };

  const handleAmpmSelect = (selectedAmpm: 'AM' | 'PM') => {
    const activeDate = date || new Date();
    const finalVal = buildDateTime(activeDate, hour, minute, selectedAmpm);
    setTempValue(finalVal);
  };

  const hoursList = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  const hourScrollRef = React.useRef<HTMLDivElement>(null);
  const minuteScrollRef = React.useRef<HTMLDivElement>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (hourScrollRef.current) {
          const activeBtn = hourScrollRef.current.querySelector('[data-selected="true"]');
          if (activeBtn) {
            activeBtn.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }
        }
        if (minuteScrollRef.current) {
          const activeBtn = minuteScrollRef.current.querySelector('[data-selected="true"]');
          if (activeBtn) {
            activeBtn.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hour, minute]);

  React.useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        pickerRef.current && !pickerRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onOpenChange]);

  React.useEffect(() => {
    if (!isOpen || !panelRef?.current || !pickerRef.current) return;

    const panel = panelRef.current;
    const picker = pickerRef.current;

    const updatePosition = () => {
      const panelRect = panel.getBoundingClientRect();
      const pickerWidth = picker.offsetWidth;
      const spacing = 12;
      const leftScreenCoord = panelRect.left - pickerWidth - spacing;

      if (leftScreenCoord < 8) {
        const shiftX = 8 - leftScreenCoord;
        picker.style.transform = `translateX(${shiftX}px)`;
      } else {
        picker.style.transform = 'translateX(0px)';
      }
    };

    updatePosition();

    const observer = new ResizeObserver(() => {
      updatePosition();
    });
    observer.observe(panel);

    window.addEventListener('resize', updatePosition);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, panelRef]);

  const pickerContent = (
    <div 
      ref={pickerRef}
      className="absolute z-[9999] bg-card border border-border shadow-2xl dark:shadow-none rounded-2xl animate-fade-in flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100"
      style={{
        right: '100%',
        bottom: '8px',
        marginRight: '12px',
        willChange: 'transform',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Left: Calendar & Use Today / Clear */}
      <div className="p-3 flex flex-col gap-2">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-border pb-2 px-1 select-none">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
            {title}
          </span>
        </div>

        <DayPickerCalendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="rounded-xl border border-transparent"
        />
        <div className="flex gap-2 border-t border-border pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const activeHour = now.getHours() % 12 || 12;
              const activeMin = now.getMinutes();
              const activeAmpm = now.getHours() >= 12 ? 'PM' : 'AM';
              setTempValue(buildDateTime(now, activeHour, activeMin, activeAmpm));
            }}
            className="flex-1 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-all border border-blue-100/50 shadow-sm dark:shadow-none text-center"
          >
            Use Today
          </button>
          {showClear && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                onOpenChange(false);
              }}
              className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-red-600 dark:text-red-400 bg-muted hover:bg-red-55 rounded-lg cursor-pointer transition-all border border-border"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right: Scrollable Time Columns & Green Apply Button */}
      <div className="flex flex-col w-70 p-4 gap-3 bg-muted/50 rounded-b-2xl md:rounded-b-none md:rounded-r-2xl">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Set Time
          </span>
          
          <div className='flex items-center'>
          
          {tempValue && !tempValue.startsWith('0001-01-01') && (
            <span className="text-[5px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
              {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')} {ampm}
            </span>
          )}
          <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="z-10 p-1.5 rounded-full text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all cursor-pointer"
        title="Close date picker"
        >
        <X className="h-4 w-4 stroke-[2.5]" />
          </button> 
        </div>

        </div>

        <div className="flex flex-1 items-stretch gap-1.5 h-[220px]">
          {/* Hours Column */}
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[9px] font-black text-muted-foreground tracking-wider text-center select-none uppercase">Hour</span>
            <div 
              ref={hourScrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-1 select-none max-h-[190px] no-scrollbar"
            >
              {hoursList.map((h) => {
                const isSelected = hour === h;
                return (
                  <button
                    key={h}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => handleHourSelect(h)}
                    className={cn(
                      "text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      isSelected 
                        ? "bg-blue-600 text-white shadow-sm dark:shadow-none" 
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {h.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-[1px] bg-muted self-stretch my-2 shrink-0" />

          {/* Minutes Column */}
          <div className="flex-1 flex flex-col gap-1">
            <span className="text-[9px] font-black text-muted-foreground tracking-wider text-center select-none uppercase">Min</span>
            <div 
              ref={minuteScrollRef}
              className="flex-1 overflow-y-auto flex flex-col gap-1 select-none max-h-[190px] no-scrollbar"
            >
              {minutesList.map((m) => {
                const isSelected = minute === m;
                return (
                  <button
                    key={m}
                    type="button"
                    data-selected={isSelected}
                    onClick={() => handleMinuteSelect(m)}
                    className={cn(
                      "text-center py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                      isSelected 
                        ? "bg-blue-600 text-white shadow-sm dark:shadow-none" 
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {m.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-[1px] bg-muted self-stretch my-2 shrink-0" />

          {/* AM/PM Period Column */}
          <div className="w-14 flex flex-col gap-1 shrink-0">
            <span className="text-[9px] font-black text-muted-foreground tracking-wider text-center select-none uppercase">Period</span>
            <div className="flex-1 flex flex-col gap-1.5 justify-center max-h-[190px]">
              {(['AM', 'PM'] as const).map((period) => {
                const isSelected = ampm === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => handleAmpmSelect(period)}
                    className={cn(
                      "py-2.5 text-xs font-black rounded-lg transition-all cursor-pointer text-center",
                      isSelected 
                        ? "bg-blue-600 text-white shadow-sm dark:shadow-none" 
                        : "text-foreground hover:bg-muted border border-border"
                    )}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Green Apply Button */}
        <div className="flex gap-2 mt-1 border-t border-border pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onChange(tempValue);
              onOpenChange(false);
            }}
            className="flex-1 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-100 shadow-sm dark:shadow-none text-center cursor-pointer active:scale-95 transition-all"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative w-full cursor-pointer group flex items-center justify-between bg-card hover:bg-muted/80 border border-border hover:border-blue-500/40 hover:ring-4 hover:ring-blue-500/5 px-3 py-2 rounded-xl transition-all shadow-sm dark:shadow-none min-h-[38px]"
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className={cn(
          "text-xs font-semibold",
          hasValidValue ? "text-foreground font-bold" : "text-muted-foreground"
        )}>
          {hasValidValue ? formatDateFriendly(value) : 'Not set'}
        </span>
        
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {hasValidValue && showClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // VERY IMPORTANT: Stop click from opening popover!
                onChange(null);
              }}
              className="w-5 h-5 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
              title="Clear date"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <Calendar className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-500 transition-colors duration-200" />
        </div>
      </div>

      {isOpen && panelRef?.current ? createPortal(pickerContent, panelRef.current) : (isOpen && typeof document !== 'undefined' ? createPortal(pickerContent, document.body) : null)}
    </>
  );
}

// Custom Tag Selector Dropdown
function CustomTagSelector({
  tags,
  taskTags,
  onAssign,
  className
}: {
  tags: Tag[];
  taskTags?: string[];
  onAssign: (tagId: number) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableTags = tags.filter((t) => !taskTags?.includes(t.name));

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-6 px-2.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 active:scale-[0.98] rounded-lg border border-blue-100/60 outline-none cursor-pointer transition-all flex items-center gap-1 shadow-sm dark:shadow-none",
          className
        )}
      >
        <Plus className="h-2.5 w-2.5" />
        Tag
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl dark:shadow-none py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[140px] max-h-48 overflow-y-auto">
          {availableTags.length === 0 ? (
            <span className="block px-3.5 py-2.5 text-[10px] font-bold text-muted-foreground select-none">No tags left</span>
          ) : (
            availableTags.map((t) => (
              <div key={t.id} className="px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onAssign(t.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-extrabold text-foreground hover:text-foreground rounded-xl hover:bg-muted/80 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="text-blue-500 font-black">#</span>
                  <span className="truncate">{t.name}</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface TaskDetailFieldsProps {
  task: Task;
  panelRef?: React.RefObject<HTMLElement | null>;
  categories: Category[];
  tags: Tag[];
  onUpdateTask: (id: number, updates: UpdateTaskDto) => void;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  onAssignTags: (taskId: number, tagIds: number[]) => void;
  onRemoveTag: (taskId: number, tagId: number) => void;
}

export function TaskDetailFields({
  task,
  panelRef,
  categories,
  tags,
  onUpdateTask,
  onUpdateStatus,
  onAssignTags,
  onRemoveTag,
}: TaskDetailFieldsProps) {
  const clearStartEnd = useTaskStore((state) => state.clearStartEnd);
  // Duration controlled state
  const [durationVal, setDurationVal] = React.useState(task.durationInMinutes);
  const [dateError, setDateError] = React.useState<string | null>(null);

  // Focused time state for time-tracking summation
  const [focusedSeconds, setFocusedSeconds] = React.useState<number>(0);

  React.useEffect(() => {
    async function loadFocusedTime() {
      try {
        const dbSessions = await getTaskSessions(task.id);
        const userId = useAuthStore.getState().user?.id || 'default';
        
        let manualStr = localStorage.getItem(`pms_manual_sessions_${userId}`);
        if (!manualStr && localStorage.getItem('pms_manual_sessions')) {
          manualStr = localStorage.getItem('pms_manual_sessions');
          localStorage.setItem(`pms_manual_sessions_${userId}`, manualStr || '[]');
        }
        const manualSessions = JSON.parse(manualStr || '[]');
        
        const activeDbSeconds = dbSessions
          .reduce((sum, s) => sum + (s.accumulatedSeconds || 0), 0);
          
        const manualSeconds = manualSessions
          .filter((s: any) => s.taskId === task.id)
          .reduce((sum: number, s: any) => sum + (s.accumulatedSeconds || 0), 0);
          
        setFocusedSeconds(activeDbSeconds + manualSeconds);
      } catch (err) {
        console.error('Failed to load focused time', err);
        setFocusedSeconds(0);
      }
    }
    loadFocusedTime();
  }, [task.id]);

  const formatFocusedTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) return '0m';
    if (totalSeconds < 60) return `${Math.floor(totalSeconds)}s`;
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    
    return parts.join(' ');
  };

  React.useEffect(() => {
    setDurationVal(task.durationInMinutes);
  }, [task.durationInMinutes]);

  const handleDurationChange = (newVal: number) => {
    const finalVal = Math.max(0, newVal);
    setDurationVal(finalVal);
    onUpdateTask(task.id, { durationInMinutes: finalVal });
  };

  // Date picker open states
  const [startOpen, setStartOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  const [deadlineOpen, setDeadlineOpen] = React.useState(false);

  // Dropdown list options
  const statusOptions = [
    { value: TaskStatus.Todo, label: 'To Do', color: '#64748b' },
    { value: TaskStatus.InProgress, label: 'In Progress', color: '#f97316' },
    { value: TaskStatus.Done, label: 'Completed', color: '#10b981' },
    { value: TaskStatus.Cancelled, label: 'Cancelled', color: '#ef4444' },
    { value: TaskStatus.Paused, label: 'Paused', color: '#3b82f6' }
  ];

  const effortOptions = [
    { value: 1, label: '1 · Low' },
    { value: 2, label: '2 · Moderate' },
    { value: 3, label: '3 · Medium' },
    { value: 4, label: '4 · High' },
    { value: 5, label: '5 · Maximum' }
  ];

  const priorityOptions = [
    { value: 3, label: 'Low', color: '#64748b' },
    { value: 6, label: 'Mid', color: '#d97706' },
    { value: 10, label: 'High', color: '#ef4444' }
  ];

  const mappedPriority = (() => {
    const p = task.priority;
    if (p <= 4) return 3;
    if (p <= 7) return 6;
    return 10;
  })();

  const categoryOptions = React.useMemo(() => {
    return [
      { value: 0, label: 'No Category' },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
        color: c.color
      }))
    ];
  }, [categories]);

  return (
    <div className="space-y-8 select-none">
      {/* Toast Date Validation Error Alert */}
      <AnimatePresence>
        {dateError && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-4 py-3.5 rounded-xl shadow-lg dark:shadow-none shadow-rose-900/10 text-rose-700 dark:text-rose-400 text-xs font-bold max-w-xs sm:max-w-sm"
          >
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <span className="flex-1 leading-relaxed">{dateError}</span>
            <button 
              type="button"
              onClick={() => setDateError(null)} 
              className="ml-2 p-0.5 text-rose-400 hover:text-rose-600 dark:text-rose-400 rounded-md hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title input field */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === TaskStatus.Done || task.status === TaskStatus.Cancelled}
          onCheckedChange={(val) =>
            onUpdateStatus(task.id, val === true ? TaskStatus.Done : TaskStatus.Todo)
          }
          icon={task.status === TaskStatus.Cancelled ? <X className="h-3 w- stroke-3" /> : <Check className="h-3.5 w-3.5" />}
          className={cn(
            "mt-1 h-5 w-5 rounded shrink-0 cursor-pointer transition-all",
            task.priority >= 8 
              ? 'border-red-500 hover:border-red-600 focus-visible:ring-red-500/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
              : task.priority > 4 
                ? 'border-amber-500 hover:border-amber-600 focus-visible:ring-amber-500/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500'
                : 'border-border hover:border-border focus-visible:ring-slate-500/20 data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500'
          )}
        />
        <input
          type="text"
          defaultValue={task.title}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== task.title) {
              onUpdateTask(task.id, { title: e.target.value.trim() });
            }
          }}
          className="flex-1 text-xl font-bold tracking-tight text-foreground leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
        />
      </div>

      {/* Attribute grid */}
      <div className="grid grid-cols-1 gap-1.5 p-5 bg-muted rounded-2xl border border-border shadow-inner shadow-slate-900/5">

        {/* Status Dropdown */}
        <DetailRow icon={Circle} label="Status">
          <CustomDropdown
            value={task.status}
            options={statusOptions}
            onChange={(val) => onUpdateStatus(task.id, val as TaskStatus)}
          />
        </DetailRow>

        {/* Est. Time hours & minutes input */}
        <DetailRow icon={Clock} label="Est. Time">
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between bg-card border border-border hover:border-border rounded-xl px-3 py-1 shadow-sm dark:shadow-none w-full min-h-[38px] transition-colors">
              <button
                type="button"
                disabled={durationVal <= 5}
                onClick={() => handleDurationChange(durationVal - 5)}
                className="w-6 h-6 rounded-full bg-muted hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm dark:shadow-none cursor-pointer select-none active:scale-95 shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                title="Decrease duration"
              >
                <Minus className="h-3 w-3" />
              </button>
              <div className="flex-1 flex items-center justify-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={0}
                    value={Math.floor(durationVal / 60).toString()}
                    placeholder="0"
                    onChange={(e) => {
                      const hours = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10));
                      const mins = durationVal % 60;
                      handleDurationChange(hours * 60 + mins);
                    }}
                    className="w-4 text-center bg-transparent border-none outline-none text-xs font-bold text-foreground p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0 focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-wide">h</span>
                </div>
                <span className="text-slate-300 font-bold select-none">:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={(durationVal % 60).toString()}
                    placeholder="00"
                    onChange={(e) => {
                      const mins = e.target.value === '' ? 0 : Math.max(0, Math.min(59, parseInt(e.target.value, 10)));
                      const hours = Math.floor(durationVal / 60);
                      handleDurationChange(hours * 60 + mins);
                    }}
                    className="w-4 text-center bg-transparent border-none outline-none text-xs font-bold text-foreground p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0 focus:outline-none"
                  />
                  <span className="text-[9px] text-muted-foreground font-extrabold uppercase tracking-wide">m</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDurationChange(durationVal + 5)}
                className="w-6 h-6 rounded-full bg-muted hover:bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shadow-sm dark:shadow-none cursor-pointer select-none active:scale-95 shrink-0"
                title="Increase duration"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            
            <AnimatePresence>
              {durationVal > 0 && durationVal < 5 && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-200 dark:border-amber-500/20 leading-tight">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>Tasks usually take at least 5 minutes. Consider increasing the estimate or breaking down a larger task.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DetailRow>

        {/* Focused Time display */}
        <DetailRow icon={ClockCheck} label="Focused Time">
          <div className="flex items-center justify-center bg-card border border-border rounded-xl px-3 py-2 shadow-sm dark:shadow-none w-full min-h-[38px] transition-colors select-none text-foreground text-xs font-bold">
            <span className={cn(focusedSeconds > 0 ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-muted-foreground font-semibold")}>
              {formatFocusedTime(focusedSeconds)}
            </span>
          </div>
        </DetailRow>

        {/* Priority dropdown */}
        <DetailRow icon={Flag} label="Priority">
          <CustomDropdown
            value={mappedPriority}
            options={priorityOptions}
            onChange={(val) => onUpdateTask(task.id, { priority: val })}
          />
        </DetailRow>

        {/* Effort level dropdown */}
        <DetailRow icon={Dumbbell} label="Effort">
          <CustomDropdown
            value={task.effortLevel}
            options={effortOptions}
            onChange={(val) => onUpdateTask(task.id, { effortLevel: val })}
          />
        </DetailRow>

        {/* Category dropdown */}
        <DetailRow icon={FolderOpen} label="Category">
          <CustomDropdown
            value={task.categoryId ?? 0}
            options={categoryOptions}
            onChange={(val) => onUpdateTask(task.id, { categoryId: val })}
            placeholder="No Category"
          />
        </DetailRow>

        <Separator className="my-1.5 opacity-60" />

        {/* Start Date & Time picker */}
        <DetailRow 
          icon={Calendar} 
          label="Starts"
          onClick={() => setStartOpen(true)}
        >
          <ClickableDatePicker
            value={task.earliestStart}
            onChange={(val) => {
              if (val) {
                const newStart = new Date(val).getTime();
                if (task.latestEnd && !task.latestEnd.startsWith('0001-01-01')) {
                  const end = new Date(task.latestEnd).getTime();
                  if (newStart > end) {
                    setDateError("Start date cannot be after the ends date");
                    setTimeout(() => setDateError(null), 4000);
                    return;
                  }
                }
                if (task.deadline && !task.deadline.startsWith('0001-01-01')) {
                  const ddl = new Date(task.deadline).getTime();
                  if (newStart > ddl) {
                    setDateError("Start date cannot be after the deadline");
                    setTimeout(() => setDateError(null), 4000);
                    return;
                  }
                }
              }
              onUpdateTask(task.id, { earliestStart: val });
            }}
            isOpen={startOpen}
            onOpenChange={setStartOpen}
            showClear={false}
            panelRef={panelRef}
            title="Starts"
          />
        </DetailRow>

        {/* End Date & Time picker */}
        <DetailRow 
          icon={Calendar} 
          label="Ends"
          onClick={() => setEndOpen(true)}
        >
          <ClickableDatePicker
            value={task.latestEnd}
            onChange={(val) => {
              if (val) {
                const newEnd = new Date(val).getTime();
                if (task.earliestStart && !task.earliestStart.startsWith('0001-01-01')) {
                  const start = new Date(task.earliestStart).getTime();
                  if (newEnd < start) {
                    setDateError("Ends date cannot be before the start date");
                    setTimeout(() => setDateError(null), 4000);
                    return;
                  }
                }
                if (task.deadline && !task.deadline.startsWith('0001-01-01')) {
                  const ddl = new Date(task.deadline).getTime();
                  if (newEnd > ddl) {
                    setDateError("Ends date cannot be after the deadline");
                    setTimeout(() => setDateError(null), 4000);
                    return;
                  }
                }
              }
              onUpdateTask(task.id, { latestEnd: val });
            }}
            isOpen={endOpen}
            onOpenChange={setEndOpen}
            showClear={false}
            panelRef={panelRef}
            title="Ends"
          />
        </DetailRow>

        {/* Clear Schedule Action utilizing dedicated backend endpoint */}
        {((task.earliestStart && !task.earliestStart.startsWith('0001-01-01')) || 
          (task.latestEnd && !task.latestEnd.startsWith('0001-01-01'))) && (
          <div className="flex px-4 py-1.5 justify-end animate-fade-in">
            <button
              type="button"
              onClick={() => clearStartEnd(task.id)}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs dark:shadow-none active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Schedule
            </button>
          </div>
        )}

        <Separator className="my-1.5 opacity-60" />

        {/* Deadline picker */}
        <DetailRow 
          icon={Calendar} 
          label="Deadline"
          onClick={() => setDeadlineOpen(true)}
        >
          <ClickableDatePicker
            value={task.deadline}
            onChange={(val) => {
              if (val) {
                const newDdl = new Date(val).getTime();
                if (task.earliestStart && !task.earliestStart.startsWith('0001-01-01')) {
                  const start = new Date(task.earliestStart).getTime();
                  if (newDdl < start) {
                    setDateError("Deadline cannot be before the start date");
                    setTimeout(() => setDateError(null), 4000);
                    return;
                  }
                }
                if (task.latestEnd && !task.latestEnd.startsWith('0001-01-01')) {
                  const end = new Date(task.latestEnd).getTime();
                  if (newDdl < end) {
                    setDateError("Deadline cannot be before the ends date");
                    setTimeout(() => setDateError(null), 4000);
                    return;
                  }
                }
              }
              onUpdateTask(task.id, { deadline: val });
            }}
            isOpen={deadlineOpen}
            onOpenChange={setDeadlineOpen}
            showClear={true}
            panelRef={panelRef}
            title="Deadline"
          />
        </DetailRow>



        {/* Tags Label Row */}
        <div className="flex gap-4 items-start pt-2 mt-1 border-t border-border">
          <div className="w-28 flex items-center gap-2.5 shrink-0 mt-2 select-none">
            <TagIcon className="h-4.5 w-4.5 text-muted-foreground" />
            <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-widest">Labels</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 items-center pt-1.5">
            {task.tags?.map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-card text-muted-foreground border border-border hover:border-border rounded-lg px-2 py-0.5 text-[10px] font-bold gap-1 shrink-0 transition-colors shadow-sm dark:shadow-none select-none"
              >
                #{tag}
                <X
                  className="h-2.5 w-2.5 cursor-pointer text-muted-foreground hover:text-red-500 hover:scale-110 transition-all"
                  onClick={() => {
                    const found = tags.find((tg) => tg.name === tag);
                    if (found) onRemoveTag(task.id, found.id);
                  }}
                />
              </Badge>
            ))}
            <CustomTagSelector
              tags={tags}
              taskTags={task.tags}
              onAssign={(id) => onAssignTags(task.id, [id])}
            />
          </div>
        </div>
      </div>

      {/* Description note box */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes</span>
        <div className="p-1 bg-card border border-border rounded-xl focus-within:border-blue-500/80 focus-within:ring-4 focus-within:ring-blue-500/8 transition-all shadow-sm dark:shadow-none">
          <textarea
            className="w-full min-h-32 bg-transparent border-none resize-none focus:ring-0 text-sm leading-relaxed text-foreground placeholder:text-slate-300 p-3 font-semibold outline-none"
            placeholder="Add notes, links, or context..."
            defaultValue={task.description || ''}
            onBlur={(e) =>
              onUpdateTask(task.id, { description: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
