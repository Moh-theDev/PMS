import * as React from 'react';
import { Plus, Flag, Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';

interface TaskQuickCreateProps {
  onAddTask: (title: string, priority: number, deadline: string | null) => Promise<void>;
}

export function TaskQuickCreate({ onAddTask }: TaskQuickCreateProps) {
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<number>(3); // Default Low
  const [deadline, setDeadline] = React.useState<string | null>(null);
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const [deadlineOpen, setDeadlineOpen] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await onAddTask(title.trim(), priority, deadline);
      setTitle('');
      setPriority(3); // Reset to Mid
      setDeadline(null); // Reset deadline
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityInfo = (p: number) => {
    switch (p) {
      case 10: return { label: 'High', bg: 'bg-red-50 hover:bg-red-100/80 border-red-100 text-red-600' };
      case 6:return { label: 'Mid', bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-100 text-amber-600' };
      case 3: 
      default: return { label: 'Low', bg: 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/60 text-slate-500' };
    }
  };

  const activePriority = getPriorityInfo(priority);

  const formatDeadlineFriendly = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="px-8 py-3 w-full animate-fade-in">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full flex flex-col gap-2">
        <div className="relative flex items-center bg-white border border-slate-200/80 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/8 transition-all shadow-sm rounded-2xl p-1.5 min-h-[50px]">
          <Plus className="absolute left-4 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Capture a task instantly..."
            className="flex-1 pl-10 pr-4 bg-transparent border-none outline-none text-sm placeholder:text-slate-400 font-semibold text-slate-900 focus:ring-0"
          />

          {/* Inline controls */}
          <div className="flex items-center gap-1.5 pr-2 shrink-0">
            {/* Active Deadline Badge */}
            {deadline && (
              <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100/60 px-2.5 py-1 rounded-xl shadow-sm animate-in fade-in zoom-in-95 duration-200 select-none">
                <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                <span>{formatDeadlineFriendly(deadline)}</span>
                <button
                  type="button"
                  onClick={() => setDeadline(null)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-blue-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-0.5 cursor-pointer shrink-0"
                  title="Remove deadline"
                >
                  <X className="h-2 w-2" />
                </button>
              </span>
            )}

            {/* Importance Popover */}
            <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-8 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-[10px] font-extrabold cursor-pointer active:scale-95 shadow-sm shrink-0",
                    activePriority.bg
                  )}
                  title="Set importance"
                >
                  <Flag className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span className="hidden sm:inline">{activePriority.label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-slate-400 tracking-wider px-2.5 py-1 uppercase select-none">Importance</span>
                  <button
                    type="button"
                    onClick={() => { setPriority(10); setPriorityOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer w-full text-left"
                  >
                    <Flag className="h-3.5 w-3.5 text-red-500 fill-current shrink-0" />
                    High Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority(6); setPriorityOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer w-full text-left"
                  >
                    <Flag className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />
                    Mid Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority(3); setPriorityOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer w-full text-left"
                  >
                    <Flag className="h-3.5 w-3.5 text-slate-400 fill-current shrink-0" />
                    Low Priority
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Deadline Popover */}
            <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-xl border border-slate-200/60 hover:border-blue-500/40 hover:ring-4 hover:ring-blue-500/5 bg-white text-slate-500 hover:text-blue-600 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm shrink-0",
                    deadline && "border-blue-500/40 text-blue-600 hover:bg-blue-50/50"
                  )}
                  title="Set deadline date"
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50">
                <DayPickerCalendar
                  mode="single"
                  selected={deadline ? new Date(deadline) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setDeadline(date.toISOString());
                    } else {
                      setDeadline(null);
                    }
                    setDeadlineOpen(false);
                  }}
                  className="rounded-xl border border-transparent"
                />
              </PopoverContent>
            </Popover>

            {title.trim() && (
              <button
                type="submit"
                className="h-8 px-3 text-xs font-black text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
              >
                Add
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
