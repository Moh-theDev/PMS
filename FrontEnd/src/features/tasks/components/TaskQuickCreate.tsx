import * as React from 'react';
import { Plus, Flag, Calendar as CalendarIcon, X, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';
import { useTaskStore } from '@/store/useTaskStore';

interface TaskQuickCreateProps {
  onAddTask: (title: string, priority: number, deadline: string | null, customTags?: string[]) => Promise<void>;
}

export function TaskQuickCreate({ onAddTask }: TaskQuickCreateProps) {
  const { tags } = useTaskStore();
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<number>(3); // Default Low
  const [deadline, setDeadline] = React.useState<string | null>(null);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const [deadlineOpen, setDeadlineOpen] = React.useState(false);

  // Floating menus state
  const [menuType, setMenuType] = React.useState<'none' | 'tag' | 'priority'>('none');
  const [menuSearch, setMenuSearch] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await onAddTask(title.trim(), priority, deadline, selectedTags);
      setTitle('');
      setPriority(3); // Reset to Low
      setDeadline(null); // Reset deadline
      setSelectedTags([]); // Reset tags
      setMenuType('none');
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityInfo = (p: number) => {
    switch (p) {
      case 10: return { label: 'High', bg: 'bg-red-500/10 hover:bg-red-500/20 border-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:border-red-500/50 dark:text-red-600 dark:text-red-500' };
      case 6:return { label: 'Mid', bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-100 text-amber-600 dark:bg-background dark:hover:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-400' };
      case 3: 
      default: return { label: 'Low', bg: 'bg-muted hover:bg-muted/80 border-border text-muted-foreground dark:bg-background dark:hover:bg-gray-500/20 dark:border-gray-500/50 text-muted-foreground' };
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

  const parseDateShortcut = (text: string) => {
    const dateRegex = /(?:^|\s)@(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|\d{1,2}[\/\-]\d{1,2})\s/i;
    const match = text.match(dateRegex);
    if (match) {
      const shortcut = match[1].toLowerCase();
      let newDate = new Date();
      if (shortcut === 'today') {
        // keep today
      } else if (shortcut === 'tomorrow') {
        newDate.setDate(newDate.getDate() + 1);
      } else if (/\d{1,2}[\/\-]\d{1,2}/.test(shortcut)) {
        const parts = shortcut.split(/[\/\-]/);
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        newDate.setMonth(month);
        newDate.setDate(day);
        if (newDate.getTime() < new Date().getTime() - 86400000) {
          newDate.setFullYear(newDate.getFullYear() + 1);
        }
      } else {
        const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const shortDays = ['sun','mon','tue','wed','thu','fri','sat'];
        let targetDay = days.indexOf(shortcut);
        if (targetDay === -1) targetDay = shortDays.indexOf(shortcut);
        const currentDay = newDate.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7;
        newDate.setDate(newDate.getDate() + diff);
      }
      setDeadline(newDate.toISOString());
      return text.replace(match[0], ' ');
    }
    return text;
  };

  const parsePriorityShortcut = (text: string) => {
    const prioRegex = /(?:^|\s)!(high|mid|low|none)\s/i;
    const match = text.match(prioRegex);
    if (match) {
      const p = match[1].toLowerCase();
      if (p === 'high') setPriority(10);
      else if (p === 'mid') setPriority(6);
      else if (p === 'low' || p === 'none') setPriority(3);
      return text.replace(match[0], ' ');
    }
    return text;
  };

  const parseTagShortcut = (text: string) => {
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)\s/i;
    const match = text.match(tagRegex);
    if (match) {
      const t = match[1];
      if (!selectedTags.includes(t)) {
        setSelectedTags((prev) => [...prev, t]);
      }
      return text.replace(match[0], ' ');
    }
    return text;
  };

  const checkIncompleteShortcuts = (text: string) => {
    const tagMatch = text.match(/(?:^|\s)#([^ \s]*)$/);
    if (tagMatch) {
      setMenuType('tag');
      setMenuSearch(tagMatch[1].toLowerCase());
      setSelectedIndex(0);
      return;
    }
    const prioMatch = text.match(/(?:^|\s)!([a-zA-Z]*)$/);
    if (prioMatch) {
      setMenuType('priority');
      setMenuSearch(prioMatch[1].toLowerCase());
      setSelectedIndex(0);
      return;
    }
    setMenuType('none');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newText = e.target.value;
    newText = parseDateShortcut(newText);
    newText = parsePriorityShortcut(newText);
    newText = parseTagShortcut(newText);
    setTitle(newText);
    checkIncompleteShortcuts(newText);
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagName));
  };

  // Menu Options
  const filteredTags = React.useMemo(() => {
    if (menuType !== 'tag') return [];
    const filtered = tags.filter((t) => t.name.toLowerCase().includes(menuSearch));
    // Provide option to create if exact match not found
    if (menuSearch && !filtered.find((t) => t.name.toLowerCase() === menuSearch)) {
      filtered.push({ id: -1, name: menuSearch }); // dummy tag for creation
    }
    return filtered.slice(0, 5);
  }, [tags, menuSearch, menuType]);

  const priorityOptions = React.useMemo(() => {
    const opts = [
      { label: 'High', value: 10, icon: <Flag className="h-3 w-3 text-red-500 fill-current shrink-0" /> },
      { label: 'Mid', value: 6, icon: <Flag className="h-3 w-3 text-amber-500 fill-current shrink-0" /> },
      { label: 'Low', value: 3, icon: <Flag className="h-3 w-3 text-muted-foreground fill-current shrink-0" /> },
      { label: 'None', value: 3, icon: <Flag className="h-3 w-3 text-muted-foreground shrink-0" /> },
    ];
    if (!menuSearch) return opts;
    return opts.filter(o => o.label.toLowerCase().includes(menuSearch));
  }, [menuSearch]);

  const maxIndex = menuType === 'tag' ? filteredTags.length - 1 : menuType === 'priority' ? priorityOptions.length - 1 : 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (menuType !== 'none') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (menuType === 'tag' && filteredTags[selectedIndex]) {
          const t = filteredTags[selectedIndex].name;
          if (!selectedTags.includes(t)) setSelectedTags([...selectedTags, t]);
          setTitle((prev) => prev.replace(/(?:^|\s)#([^ \s]*)$/, ' '));
        } else if (menuType === 'priority' && priorityOptions[selectedIndex]) {
          setPriority(priorityOptions[selectedIndex].value);
          setTitle((prev) => prev.replace(/(?:^|\s)!([a-zA-Z]*)$/, ' '));
        }
        setMenuType('none');
      } else if (e.key === 'Escape') {
        setMenuType('none');
      }
    }
  };

  return (
    <div className="px-8 py-3 w-full animate-fade-in relative z-20">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto w-full flex flex-col gap-2 relative">
        <div className="relative flex flex-wrap items-center bg-card border border-border focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/8 transition-all shadow-sm dark:shadow-none rounded-2xl p-1.5 min-h-[50px]">
          
          <div className="flex flex-wrap items-center flex-1 pl-4 gap-1.5">
            <Plus className="h-4 w-4 text-muted-foreground pointer-events-none" />
            
            {selectedTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-100/60 px-2.5 py-1 rounded-xl shadow-sm dark:shadow-none select-none shrink-0">
                <Hash className="h-2.5 w-2.5 shrink-0" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-indigo-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-0.5 cursor-pointer shrink-0"
                >
                  <X className="h-2 w-2" />
                </button>
              </span>
            ))}
            
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              placeholder="Capture a task instantly..."
              className="flex-1 min-w-[150px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground font-semibold text-foreground focus:ring-0 py-2.5 pr-4"
            />
          </div>

          {/* Inline controls */}
          <div className="flex items-center gap-1.5 pr-2 shrink-0 self-end mb-1 mt-1">
            {/* Active Deadline Badge */}
            {deadline && (
              <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-100/60 px-2.5 py-1 rounded-xl shadow-sm dark:shadow-none animate-in fade-in zoom-in-95 duration-200 select-none">
                <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                <span>{formatDeadlineFriendly(deadline)}</span>
                <button
                  type="button"
                  onClick={() => setDeadline(null)}
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-blue-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ml-0.5 cursor-pointer shrink-0"
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
                    "h-8 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-[10px] font-extrabold cursor-pointer active:scale-95 shadow-sm dark:shadow-none shrink-0",
                    activePriority.bg
                  )}
                  title="Set importance"
                >
                  <Flag className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span className="hidden sm:inline">{activePriority.label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1.5 bg-card border border-border rounded-2xl shadow-xl dark:shadow-none z-50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-muted-foreground tracking-wider px-2.5 py-1 uppercase select-none">Importance</span>
                  <button
                    type="button"
                    onClick={() => { setPriority(10); setPriorityOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  >
                    <Flag className="h-3.5 w-3.5 text-red-500 fill-current shrink-0" />
                    High Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority(6); setPriorityOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  >
                    <Flag className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />
                    Mid Priority
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPriority(3); setPriorityOpen(false); }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  >
                    <Flag className="h-3.5 w-3.5 text-muted-foreground fill-current shrink-0" />
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
                    "h-8 w-8 rounded-xl border border-border hover:border-blue-500/40 hover:ring-4 hover:ring-blue-500/5 bg-card text-muted-foreground hover:text-blue-600 dark:text-blue-400 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm dark:shadow-none shrink-0",
                    deadline && "border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                  )}
                  title="Set deadline date"
                >
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 bg-card border border-border rounded-2xl shadow-xl dark:shadow-none z-50">
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
                className="h-8 px-3 text-xs font-black text-white bg-foreground hover:bg-foreground rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm dark:shadow-none dark:text-white dark:bg-background dark:border-blue-600/50 dark:border dark:hover:bg-blue-600"
              >
                Add
              </button>
            )}
          </div>
        </div>

        {/* Floating NLP Menu */}
        {menuType !== 'none' && (
          <div className="absolute top-[60px] left-8 w-64 bg-card border border-border rounded-2xl shadow-xl dark:shadow-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-1">
            {menuType === 'tag' && (
              <div className="flex flex-col py-1">
                <div className="px-3 py-1.5 border-b border-border text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider bg-muted/30">Tags</div>
                {filteredTags.map((tag, idx) => (
                  <div
                    key={tag.name}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs font-bold cursor-pointer transition-colors",
                      idx === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => {
                      if (!selectedTags.includes(tag.name)) setSelectedTags([...selectedTags, tag.name]);
                      setTitle((prev) => prev.replace(/(?:^|\s)#([^ \s]*)$/, ' '));
                      setMenuType('none');
                      inputRef.current?.focus();
                    }}
                  >
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    {tag.id === -1 ? `Create "${tag.name}"` : tag.name}
                  </div>
                ))}
              </div>
            )}
            {menuType === 'priority' && (
              <div className="flex flex-col py-1">
                <div className="px-3 py-1.5 border-b border-border text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider bg-muted/30">Priorities</div>
                {priorityOptions.map((opt, idx) => (
                  <div
                    key={opt.label}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-xs font-bold cursor-pointer transition-colors",
                      idx === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    onClick={() => {
                      setPriority(opt.value);
                      setTitle((prev) => prev.replace(/(?:^|\s)!([a-zA-Z]*)$/, ' '));
                      setMenuType('none');
                      inputRef.current?.focus();
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
