import * as React from 'react';
import { cn } from '@/lib/utils';
import { Circle, Flag, Clock, Calendar, Tag as TagIcon, FolderOpen, X, ChevronDown, Plus, Minus, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { type Task, type Category, type Tag, type UpdateTaskDto, TaskStatus } from '@/types/index';
import { DetailRow } from './DetailRow';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';

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
          "w-full bg-white hover:bg-slate-50/80 border border-slate-200/60 hover:border-blue-500/40 hover:ring-4 hover:ring-blue-500/5 px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center justify-between text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer min-h-[38px]",
          isOpen && "border-blue-500/50 ring-4 ring-blue-500/5 bg-slate-50/50",
          className
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {activeOption?.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/5" style={{ backgroundColor: activeOption.color }} />
          )}
          <span className="truncate font-bold">{activeOption?.label || placeholder}</span>
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform duration-250 shrink-0 ml-1.5", isOpen && "rotate-180 text-blue-500")} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-60 overflow-y-auto">
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
                    "w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl flex items-center justify-between transition-all cursor-pointer",
                    isActive 
                      ? "bg-blue-50/80 text-blue-600 hover:bg-blue-50" 
                      : "hover:bg-slate-100/80"
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
function ClickableDatePicker({
  value,
  onChange,
  isOpen,
  onOpenChange
}: {
  value?: string | null;
  onChange: (val: string | null) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { date, hour, minute, ampm } = React.useMemo(() => parseDateTime(value), [value]);
  const hasValidValue = value && !value.startsWith('0001-01-01');

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    const finalVal = buildDateTime(selectedDate, hour, minute, ampm);
    onChange(finalVal);
  };

  const handleHourSelect = (selectedHour: number) => {
    const activeDate = date || new Date();
    const finalVal = buildDateTime(activeDate, selectedHour, minute, ampm);
    onChange(finalVal);
  };

  const handleMinuteSelect = (selectedMinute: number) => {
    const activeDate = date || new Date();
    const finalVal = buildDateTime(activeDate, hour, selectedMinute, ampm);
    onChange(finalVal);
  };

  const handleAmpmSelect = (selectedAmpm: 'AM' | 'PM') => {
    const activeDate = date || new Date();
    const finalVal = buildDateTime(activeDate, hour, minute, selectedAmpm);
    onChange(finalVal);
  };

  // Generate strict lists
  const hoursList = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  // Auto-scroll selected hour and minute when opened
  const hourScrollRef = React.useRef<HTMLDivElement>(null);
  const minuteScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen, hour, minute]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div 
          className="relative w-full cursor-pointer group flex items-center justify-between bg-white hover:bg-slate-50/80 border border-slate-200/60 hover:border-blue-500/40 hover:ring-4 hover:ring-blue-500/5 px-3 py-2 rounded-xl transition-all shadow-sm min-h-[38px]"
        >
          <span className={cn(
            "text-xs font-semibold",
            hasValidValue ? "text-slate-800 font-bold" : "text-slate-400"
          )}>
            {hasValidValue ? formatDateFriendly(value) : 'Not set'}
          </span>
          
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {hasValidValue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation(); // VERY IMPORTANT: Stop click from opening popover!
                  onChange(null);
                }}
                className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Clear date"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500 transition-colors duration-200" />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 bg-white border border-slate-200 shadow-2xl rounded-2xl animate-fade-in flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 z-50">
        {/* Left: Calendar */}
        <div className="p-3">
          <DayPickerCalendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="rounded-xl border border-transparent"
          />
        </div>

        {/* Right: Scrollable Time Columns */}
        <div className="flex flex-col w-56 p-4 gap-3 bg-slate-50/50 rounded-b-2xl md:rounded-b-none md:rounded-r-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Set Time
            </span>
            {value && (
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')} {ampm}
              </span>
            )}
          </div>

          <div className="flex flex-1 items-stretch gap-1.5 h-[220px]">
            {/* Hours Column */}
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 tracking-wider text-center select-none uppercase">Hour</span>
              <div 
                ref={hourScrollRef}
                className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 scrollbar-thin select-none max-h-[190px]"
                style={{ scrollbarWidth: 'thin' }}
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
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {h.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-[1px] bg-slate-100 self-stretch my-2 shrink-0" />

            {/* Minutes Column */}
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 tracking-wider text-center select-none uppercase">Min</span>
              <div 
                ref={minuteScrollRef}
                className="flex-1 overflow-y-auto pr-0.5 flex flex-col gap-1 scrollbar-thin select-none max-h-[190px]"
                style={{ scrollbarWidth: 'thin' }}
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
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-[1px] bg-slate-100 self-stretch my-2 shrink-0" />

            {/* AM/PM Period Column */}
            <div className="w-14 flex flex-col gap-1 shrink-0">
              <span className="text-[9px] font-black text-slate-400 tracking-wider text-center select-none uppercase">Period</span>
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
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "text-slate-700 hover:bg-slate-100 border border-slate-200/40"
                      )}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-1 border-t border-slate-100 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const activeHour = now.getHours() % 12 || 12;
                const activeMin = now.getMinutes();
                const activeAmpm = now.getHours() >= 12 ? 'PM' : 'AM';
                onChange(buildDateTime(now, activeHour, activeMin, activeAmpm));
              }}
              className="flex-1 py-1.5 text-[10px] font-extrabold text-blue-600 bg-blue-50 hover:bg-blue-100/80 rounded-lg cursor-pointer transition-all border border-blue-100/50 shadow-sm"
            >
              Use Today
            </button>
            {hasValidValue && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  onOpenChange(false);
                }}
                className="px-3 py-1.5 text-[10px] font-extrabold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg cursor-pointer transition-all border border-slate-200/50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
          "h-6 px-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100/80 active:scale-[0.98] rounded-lg border border-blue-100/60 outline-none cursor-pointer transition-all flex items-center gap-1 shadow-sm",
          className
        )}
      >
        <Plus className="h-2.5 w-2.5" />
        Tag
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[140px] max-h-48 overflow-y-auto">
          {availableTags.length === 0 ? (
            <span className="block px-3.5 py-2.5 text-[10px] font-bold text-slate-400 select-none">No tags left</span>
          ) : (
            availableTags.map((t) => (
              <div key={t.id} className="px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onAssign(t.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[10px] font-extrabold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100/80 flex items-center gap-1.5 transition-all cursor-pointer"
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
  categories: Category[];
  tags: Tag[];
  onUpdateTask: (id: number, updates: UpdateTaskDto) => void;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  onAssignTags: (taskId: number, tagIds: number[]) => void;
  onRemoveTag: (taskId: number, tagId: number) => void;
}

export function TaskDetailFields({
  task,
  categories,
  tags,
  onUpdateTask,
  onUpdateStatus,
  onAssignTags,
  onRemoveTag,
}: TaskDetailFieldsProps) {
  // Duration controlled state
  const [durationVal, setDurationVal] = React.useState(task.durationInMinutes);
  const [durationError, setDurationError] = React.useState<'min' | 'max' | null>(null);

  React.useEffect(() => {
    setDurationVal(task.durationInMinutes);
  }, [task.durationInMinutes]);

  const handleDurationChange = (newVal: number) => {
    let finalVal = newVal;
    let err: 'min' | 'max' | null = null;
    if (newVal > 180) {
      finalVal = 180;
      err = 'max';
    } else if (newVal < 5) {
      finalVal = 5;
      err = 'min';
    }
    setDurationVal(finalVal);
    setDurationError(err);
    onUpdateTask(task.id, { durationInMinutes: finalVal });

    if (err) {
      setTimeout(() => {
        setDurationError(null);
      }, 3000);
    }
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

      {/* Title input field */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === TaskStatus.Done}
          onCheckedChange={(val) =>
            onUpdateStatus(task.id, val === true ? TaskStatus.Done : TaskStatus.Todo)
          }
          className={cn(
            "mt-1 h-5 w-5 rounded shrink-0 cursor-pointer transition-all",
            task.priority >= 8 
              ? 'border-red-500 hover:border-red-600 focus-visible:ring-red-500/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
              : task.priority > 4 
                ? 'border-amber-500 hover:border-amber-600 focus-visible:ring-amber-500/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500'
                : 'border-slate-300 hover:border-slate-400 focus-visible:ring-slate-500/20 data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500'
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
          className="flex-1 text-xl font-bold tracking-tight text-slate-900 leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
        />
      </div>

      {/* Attribute grid */}
      <div className="grid grid-cols-1 gap-1.5 p-5 bg-slate-50 rounded-2xl border border-slate-100/60 shadow-inner shadow-slate-900/5">

        {/* Status Dropdown */}
        <DetailRow icon={Circle} label="Status">
          <CustomDropdown
            value={task.status}
            options={statusOptions}
            onChange={(val) => onUpdateStatus(task.id, val as TaskStatus)}
          />
        </DetailRow>

        {/* Duration incrementer */}
        <DetailRow icon={Clock} label="Duration">
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between bg-white border border-slate-200/50 hover:border-slate-300 rounded-xl px-3 py-1 shadow-sm w-full min-h-[38px] transition-colors">
              <button
                type="button"
                onClick={() => handleDurationChange(durationVal - 5)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm cursor-pointer select-none active:scale-95 shrink-0"
                title="Decrease duration"
              >
                <Minus className="h-3 w-3" />
              </button>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={durationVal === 0 ? '' : durationVal}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    setDurationVal(val);
                  }}
                  onBlur={() => {
                    handleDurationChange(durationVal);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleDurationChange(durationVal);
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-12 text-center bg-transparent border-none outline-none text-xs font-bold text-slate-800 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">min</span>
              </div>
              <button
                type="button"
                onClick={() => handleDurationChange(durationVal + 5)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm cursor-pointer select-none active:scale-95 shrink-0"
                title="Increase duration"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {durationError && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 animate-in fade-in slide-in-from-top-1 duration-200 self-start">
                {durationError === 'max' ? '⚠️ Maximum duration is 180 minutes' : '⚠️ Minimum duration is 5 minutes'}
              </span>
            )}
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
        <DetailRow icon={Flag} label="Effort">
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
            onChange={(val) => onUpdateTask(task.id, { earliestStart: val })}
            isOpen={startOpen}
            onOpenChange={setStartOpen}
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
            onChange={(val) => onUpdateTask(task.id, { latestEnd: val })}
            isOpen={endOpen}
            onOpenChange={setEndOpen}
          />
        </DetailRow>

        {/* Deadline picker */}
        <DetailRow 
          icon={Calendar} 
          label="Deadline"
          onClick={() => setDeadlineOpen(true)}
        >
          <ClickableDatePicker
            value={task.deadline}
            onChange={(val) => onUpdateTask(task.id, { deadline: val })}
            isOpen={deadlineOpen}
            onOpenChange={setDeadlineOpen}
          />
        </DetailRow>

        {/* Tags Label Row */}
        <div className="flex gap-4 items-start pt-2 mt-1 border-t border-slate-200/50">
          <div className="w-24 flex items-center gap-2 shrink-0 mt-2">
            <TagIcon className="h-4 w-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Labels</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 items-center pt-1.5">
            {task.tags?.map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white text-slate-600 border border-slate-200 hover:border-slate-300 rounded-lg px-2 py-0.5 text-[10px] font-bold gap-1 shrink-0 transition-colors shadow-sm select-none"
              >
                #{tag}
                <X
                  className="h-2.5 w-2.5 cursor-pointer text-slate-400 hover:text-red-500 hover:scale-110 transition-all"
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
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</span>
        <div className="p-1 bg-white border border-slate-200/80 rounded-xl focus-within:border-blue-500/80 focus-within:ring-4 focus-within:ring-blue-500/8 transition-all shadow-sm">
          <textarea
            className="w-full min-h-32 bg-transparent border-none resize-none focus:ring-0 text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 p-3 font-semibold outline-none"
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
