import * as React from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useAiAssistantStore } from '@/store/useAiAssistantStore';
import { TaskStatus } from '@/types/index';
import { api } from '@/api/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sparkles, 
  Calendar, 
  BarChart3, 
  Loader2, 
  AlertCircle, 
  ArrowRight,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Quote,
  Send,
  RotateCcw
} from 'lucide-react';

interface DeadlineWizardTask {
  id: number;
  title: string;
  deadline: string;
}

const getErrorMessage = (err: any): string => {
  if (!err) return 'Something went wrong.';
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      if (data.Details && typeof data.Details === 'string') return data.Details;
      if (data.details && typeof data.details === 'string') return data.details;
      if (data.message && typeof data.message === 'string') return data.message;
      if (data.Message && typeof data.Message === 'string') return data.Message;
      if (data.errors && typeof data.errors === 'object') {
        const errorList = Object.entries(data.errors)
          .map(([key, val]) => {
            const msgs = Array.isArray(val) ? val.join(', ') : String(val);
            return `${key}: ${msgs}`;
          })
          .join('\n');
        if (errorList) return errorList;
      }
      try { return JSON.stringify(data); } catch { return 'Invalid response'; }
    }
  }
  if (err.message) {
    if (typeof err.message === 'string') return err.message;
  }
  if (typeof err === 'string') return err;
  try { return JSON.stringify(err); } catch { return 'Operation failed.'; }
};

// Simple bold-text renderer: **text** → <strong>text</strong>
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function AiAssistantView() {
  const { 
    tasks, tags,
    fetchTasks, addTask, deleteTask, assignTags, updateTaskStatus
  } = useTaskStore();

  const {
    messages, isProcessing, inputValue,
    setMessages, setIsProcessing, setInputValue, resetChat
  } = useAiAssistantStore();

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { fetchTasks(); }, [fetchTasks]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Schedule flow ────────────────────────────────────────────────────────
  const handleScheduleClickDirectly = async (addUserMessage = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (addUserMessage) {
      setMessages(prev => [...prev, {
        id: 'usr-sched-' + Date.now(), sender: 'user',
        text: 'Schedule my tasks', timestamp: new Date(), type: 'text'
      }]);
    }

    const missingDeadlines = tasks.filter(
      t => t.status !== TaskStatus.Done &&
           t.status !== TaskStatus.Cancelled &&
           (!t.deadline || t.deadline.startsWith('0001-01-01'))
    );

    if (missingDeadlines.length > 0) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: 'assistant-wizard-' + Date.now(), sender: 'assistant',
          text: `I found **${missingDeadlines.length}** task${missingDeadlines.length > 1 ? 's' : ''} without a deadline. I need those before I can schedule everything properly — could you quickly assign dates below?`,
          timestamp: new Date(), type: 'deadline-wizard',
          payload: { tasks: missingDeadlines.map(t => ({ id: t.id, title: t.title, deadline: '' })) }
        }]);
        setIsProcessing(false);
      }, 600);
    } else {
      await runSchedulingEngine();
    }
  };

  // ── Report flow ──────────────────────────────────────────────────────────
  const handleReportClickDirectly = async (addUserMessage = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (addUserMessage) {
      setMessages(prev => [...prev, {
        id: 'usr-rep-' + Date.now(), sender: 'user',
        text: 'Generate report', timestamp: new Date(), type: 'text'
      }]);
    }

    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'assistant',
      text: "Crunching your day's data and putting together a report…",
      timestamp: new Date(), type: 'loading'
    }]);

    try {
      const response = await api.post('/AiReport/generate-daily');
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      setMessages(prev => [...prev, {
        id: 'report-resp-' + Date.now(), sender: 'assistant',
        timestamp: new Date(), type: 'report-view',
        payload: { score: response.data.productivityScore, content: response.data.content }
      }]);
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      setMessages(prev => [...prev, {
        id: 'assistant-resp-' + Date.now(), sender: 'assistant',
        text: `Hmm, I couldn't generate the report right now. Here's what went wrong:\n\n${getErrorMessage(err)}`,
        timestamp: new Date(), type: 'text'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Wizard submit ────────────────────────────────────────────────────────
  const handleWizardSubmit = async (wizardTasks: DeadlineWizardTask[]) => {
    setIsProcessing(true);
    setMessages(prev => [...prev, {
      id: 'usr-wiz-save-' + Date.now(), sender: 'user',
      text: "Got it, deadlines set — let's schedule!", timestamp: new Date(), type: 'text'
    }]);

    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'assistant',
      text: 'Saving your deadlines and firing up the scheduler…',
      timestamp: new Date(), type: 'loading'
    }]);

    try {
      for (const wt of wizardTasks) {
        if (wt.deadline) {
          const original = tasks.find(t => t.id === wt.id);
          if (original) {
            await deleteTask(original.id);
            const dateStr = wt.deadline.includes('T') ? wt.deadline : `${wt.deadline}T23:59:59`;
            const created = await addTask({
              title: original.title,
              description: original.description || undefined,
              durationInMinutes: original.durationInMinutes || 30,
              priority: original.priority || 5,
              effortLevel: original.effortLevel || 3,
              deadline: dateStr,
            }, original.categoryId);

            if (original.status !== 0) await updateTaskStatus(created.id, original.status);

            if (original.tags && original.tags.length > 0) {
              const tagIdsToAssign = original.tags
                .map(tagName => tags.find(tag => tag.name === tagName)?.id)
                .filter((id): id is number => id !== undefined);
              if (tagIdsToAssign.length > 0) await assignTags(created.id, tagIdsToAssign);
            }
          }
        }
      }

      await fetchTasks();
      await new Promise(resolve => setTimeout(resolve, 850));
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      await runSchedulingEngine();
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(), sender: 'assistant',
        text: `Something went wrong while saving the deadlines: ${getErrorMessage(err)}`,
        timestamp: new Date(), type: 'text'
      }]);
      setIsProcessing(false);
    }
  };

  // ── Scheduling engine ────────────────────────────────────────────────────
  const runSchedulingEngine = async () => {
    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'assistant',
      text: 'Running the scheduling engine — finding the best slots for each task…',
      timestamp: new Date(), type: 'loading'
    }]);

    try {
      const response = await api.post('/SmartSchedule/auto-fill-blank-times');
      await fetchTasks();
      setMessages(prev => prev.filter(m => m.id !== loadingId));

      const status = response.data?.Status;
      if (status === 'No Action Needed') {
        setMessages(prev => [...prev, {
          id: 'assistant-resp-' + Date.now(), sender: 'assistant',
          text: "All your tasks already have time slots assigned — nothing to change! You're all set 🎉",
          timestamp: new Date(), type: 'text'
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: 'assistant-resp-' + Date.now(), sender: 'assistant',
          text: 'Done! ✅ Your tasks have been scheduled across your calendar. Head over to **Today** or **Upcoming** to see the new time slots.',
          timestamp: new Date(), type: 'text'
        }]);
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      const errMsg = getErrorMessage(err);
      const isConflict = err.response?.status === 422 || errMsg.toLowerCase().includes('conflict');
      setMessages(prev => [...prev, {
        id: 'assistant-resp-' + Date.now(), sender: 'assistant',
        text: isConflict
          ? `Looks like there's a scheduling conflict — tasks couldn't all fit in the available slots.\n\n${errMsg}\n\nTry adjusting some deadlines or durations, then try again.`
          : `The scheduler ran into an issue:\n\n${errMsg}`,
        timestamp: new Date(), type: 'text'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Input send ───────────────────────────────────────────────────────────
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    setInputValue('');
    setMessages(prev => [...prev, {
      id: 'usr-msg-' + Date.now(), sender: 'user',
      text, timestamp: new Date(), type: 'text'
    }]);
    setIsProcessing(true);

    const lower = text.toLowerCase();
    setTimeout(async () => {
      if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('fill')) {
        setIsProcessing(false);
        await handleScheduleClickDirectly(false);
      } else if (lower.includes('report') || lower.includes('daily') || lower.includes('performance')) {
        setIsProcessing(false);
        await handleReportClickDirectly(false);
      } else {
        setMessages(prev => [...prev, {
          id: 'assistant-guided-' + Date.now(), sender: 'assistant',
          text: "I'm not sure what you mean, but I can help with two things right now:\n\n• Type **schedule** to auto-schedule your tasks on the calendar\n• Type **report** to get a summary of your day\n\nOr just tap one of the buttons below!",
          timestamp: new Date(), type: 'text'
        }]);
        setIsProcessing(false);
      }
    }, 400);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full bg-muted/30 overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px]" />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/70 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm dark:shadow-none shadow-blue-200">
            <Sparkles className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight leading-tight">AI Assistant</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Smart scheduling & insights</p>
          </div>
        </div>
        <button
          onClick={resetChat}
          disabled={isProcessing}
          title="Clear chat"
          className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear
        </button>
      </header>

      {/* ── Chat messages area ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative z-10 px-4 md:px-8 py-6 space-y-5">
        <div className="max-w-2xl mx-auto w-full">
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isUser ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  isUser
                    ? "bg-foreground text-background text-xs font-black"
                    : "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm dark:shadow-none shadow-blue-200"
                )}>
                  {isUser
                    ? <span className="text-[11px] font-black">You</span>
                    : <Sparkles className="h-3.5 w-3.5 text-white" />
                  }
                </div>

                {/* Bubble + timestamp */}
                <div className={cn("flex flex-col max-w-[80%]", isUser ? "items-end" : "items-start")}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs dark:shadow-none",
                    isUser
                      ? "bg-foreground text-background rounded-tr-sm"
                      : "bg-card border border-border text-foreground rounded-tl-sm"
                  )}>
                    {/* Text with bold support */}
                    {message.text && (
                      <div className="whitespace-pre-line font-medium text-[13px]">
                        <RichText text={message.text} />
                      </div>
                    )}

                    {/* Options cards (welcome) */}
                    {message.type === 'options' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                        <button
                          onClick={() => handleScheduleClickDirectly(true)}
                          disabled={isProcessing}
                          className="flex flex-col text-left p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 hover:from-blue-500/20 hover:to-indigo-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 group"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1.5">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center transition-colors">
                              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            Schedule Tasks
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            Automatically fit all your tasks into open time slots on your calendar.
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-2.5">
                            Let's go <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>

                        <button
                          onClick={() => handleReportClickDirectly(true)}
                          disabled={isProcessing}
                          className="flex flex-col text-left p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 group"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
                            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center transition-colors">
                              <BarChart3 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            Report
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            Get a personalized AI summary of your productivity, focus time, and achievements today.
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-2.5">
                            Generate <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Loading indicator */}
                    {message.type === 'loading' && (
                      <div className="flex items-center gap-2.5 mt-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                        <span className="text-xs text-muted-foreground font-medium italic">
                          {message.text}
                        </span>
                      </div>
                    )}

                    {/* Deadline Wizard */}
                    {message.type === 'deadline-wizard' && message.payload && (
                      <DeadlineWizard
                        initialTasks={message.payload.tasks}
                        onSubmit={handleWizardSubmit}
                        isProcessing={isProcessing}
                      />
                    )}

                    {/* Report Card */}
                    {message.type === 'report-view' && message.payload && (
                      <ReportPresenter
                        score={message.payload.score}
                        content={message.payload.content}
                      />
                    )}
                  </div>

                  <span className="text-[10px] text-muted-foreground font-medium mt-1 px-1">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing indicator when processing but no loading message */}
          {isProcessing && !messages.some(m => m.type === 'loading') && (
            <div className="flex gap-3 items-start animate-in fade-in duration-200 mb-5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm dark:shadow-none shadow-blue-200">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs dark:shadow-none flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────── */}
      <div className="relative z-10 border-t border-border bg-card/80 backdrop-blur-sm px-4 md:px-8 py-4 shrink-0">
        <div className="max-w-2xl mx-auto w-full space-y-3">
          {/* Quick chips */}
          {!isProcessing && (
            <div className="flex flex-wrap gap-2 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => handleScheduleClickDirectly(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-none"
              >
                <Calendar className="h-3 w-3" />
                Schedule Tasks
              </button>
              <button
                type="button"
                onClick={() => handleReportClickDirectly(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs dark:shadow-none"
              >
                <BarChart3 className="h-3 w-3" />
                Report
              </button>
            </div>
          )}

          {/* Input form */}
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2 bg-card border border-border focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/8 rounded-2xl px-4 py-2.5 shadow-xs dark:shadow-none transition-all"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isProcessing}
              placeholder={isProcessing ? 'Working on it…' : 'Type a message or use the buttons above…'}
              className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground font-medium text-foreground p-0"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(); }}
            />
            <Button
              type="submit"
              disabled={isProcessing || !inputValue.trim()}
              size="icon"
              className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs dark:shadow-none transition-all shrink-0 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Deadline Wizard
   ───────────────────────────────────────────────────────────────────────────── */
function DeadlineWizard({
  initialTasks, onSubmit, isProcessing
}: {
  initialTasks: DeadlineWizardTask[];
  onSubmit: (tasks: DeadlineWizardTask[]) => void;
  isProcessing: boolean;
}) {
  const [wizardTasks, setWizardTasks] = React.useState<DeadlineWizardTask[]>(initialTasks);
  const [selectedIds, setSelectedIds] = React.useState<number[]>(initialTasks.map(t => t.id));
  const [bulkDate, setBulkDate] = React.useState('');

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === wizardTasks.length ? [] : wizardTasks.map(t => t.id));

  const handleApplyBulkDate = () => {
    if (!bulkDate) return;
    setWizardTasks(prev => prev.map(t => selectedIds.includes(t.id) ? { ...t, deadline: bulkDate } : t));
  };

  const handleDateChange = (id: number, dateVal: string) =>
    setWizardTasks(prev => prev.map(t => t.id === id ? { ...t, deadline: dateVal } : t));

  const isFormValid = wizardTasks.every(t => !!t.deadline);

  return (
    <div className="mt-3 space-y-3">
      {/* Bulk assign */}
      <div className="p-3 rounded-xl border border-blue-100 bg-blue-500/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Assign to multiple</span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors cursor-pointer"
          >
            {selectedIds.length === wizardTasks.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            disabled={isProcessing}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 text-xs font-semibold text-foreground bg-card border border-border focus:border-blue-400 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          />
          <Button
            type="button"
            onClick={handleApplyBulkDate}
            disabled={!bulkDate || selectedIds.length === 0 || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] h-8 px-3 rounded-lg shrink-0"
          >
            Apply ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
        {wizardTasks.map((t) => {
          const isChecked = selectedIds.includes(t.id);
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2.5 p-2.5 bg-card rounded-xl border transition-all",
                isChecked ? "border-blue-200 dark:border-blue-500/30 shadow-xs dark:shadow-none" : "border-slate-150 opacity-70"
              )}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggleSelect(t.id)}
                className="h-4 w-4 shrink-0 cursor-pointer"
              />
              <span
                onClick={() => toggleSelect(t.id)}
                className="text-xs font-semibold text-foreground truncate flex-1 cursor-pointer select-none"
              >
                {t.title}
              </span>
              <input
                type="date"
                value={t.deadline}
                onChange={(e) => handleDateChange(t.id, e.target.value)}
                disabled={isProcessing}
                min={new Date().toISOString().split('T')[0]}
                className="text-xs font-semibold text-foreground bg-muted border border-border focus:border-blue-400 rounded-lg px-2 py-1 outline-none cursor-pointer shrink-0"
              />
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3 text-blue-400 shrink-0" />
          All tasks need a deadline to schedule
        </span>
        <Button
          onClick={() => onSubmit(wizardTasks)}
          disabled={!isFormValid || isProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs dark:shadow-none shrink-0"
        >
          {isProcessing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Scheduling…</>
          ) : (
            'Schedule Now'
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Report Presenter
   ───────────────────────────────────────────────────────────────────────────── */
function ReportPresenter({ score, content }: { score: number; content: string }) {
  const sections = React.useMemo(() => parseReportContent(content), [content]);

  const scoreColors = (() => {
    if (score >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', ring: 'stroke-emerald-500', bg: 'bg-emerald-500/10', label: 'Great day! 🎉', border: 'border-emerald-100 dark:border-emerald-500/20' };
    if (score >= 50) return { text: 'text-amber-600 dark:text-amber-400', ring: 'stroke-amber-500', bg: 'bg-amber-500/10', label: 'Decent progress 👍', border: 'border-amber-100 dark:border-amber-500/20' };
    return { text: 'text-rose-600 dark:text-rose-400', ring: 'stroke-rose-500', bg: 'bg-rose-500/10', label: 'Tough day — keep going 💪', border: 'border-rose-100 dark:border-rose-500/20' };
  })();

  const getSectionStyles = (color: string) => {
    switch (color) {
      case 'emerald': return { bg: 'bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20', title: 'text-emerald-700 dark:text-emerald-400', icon: <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />, iconBg: 'bg-emerald-500/20 dark:bg-emerald-500/30' };
      case 'blue': return { bg: 'bg-blue-500/10 border-blue-100 dark:border-blue-500/20', title: 'text-blue-700 dark:text-blue-400', icon: <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />, iconBg: 'bg-blue-500/20 dark:bg-blue-500/30' };
      case 'amber': return { bg: 'bg-amber-500/10 border-amber-100 dark:border-amber-500/20', title: 'text-amber-700 dark:text-amber-400', icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />, iconBg: 'bg-amber-500/20 dark:bg-amber-500/30' };
      case 'purple': return { bg: 'bg-purple-500/10 border-purple-100 dark:border-purple-500/20', title: 'text-purple-700 dark:text-purple-400', icon: <Lightbulb className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />, iconBg: 'bg-purple-500/20 dark:bg-purple-500/30' };
      default: return { bg: 'bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20', title: 'text-indigo-700 dark:text-indigo-400', icon: <Quote className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />, iconBg: 'bg-indigo-500/20 dark:bg-indigo-500/30' };
    }
  };

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="mt-3 space-y-3 animate-in zoom-in-95 duration-300">
      {/* Score card */}
      <div className={cn("p-4 rounded-xl border flex items-center gap-4 bg-card", scoreColors.border)}>
        <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
          <svg className="h-full w-full rotate-[-90deg]">
            <circle cx="28" cy="28" r={radius} className="stroke-slate-100 fill-none" strokeWidth="4" />
            <circle cx="28" cy="28" r={radius} className={cn("fill-none transition-all duration-1000", scoreColors.ring)}
              strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </svg>
          <span className={cn("absolute text-[11px] font-black", scoreColors.text)}>{Math.round(score)}%</span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Productivity Score</p>
          <p className={cn("text-sm font-black", scoreColors.text)}>{scoreColors.label}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-2.5">
        {sections.map((sect) => {
          const s = getSectionStyles(sect.color);
          const isQuote = sect.color === 'indigo';
          return (
            <div key={sect.title} className={cn("p-3.5 rounded-xl border", s.bg, isQuote && "relative overflow-hidden")}>
              {isQuote && (
                <div className="absolute right-1 bottom-[-16px] text-indigo-200 dark:text-indigo-900/50 font-serif text-7xl pointer-events-none select-none">"</div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0", s.iconBg)}>
                  {s.icon}
                </div>
                <h4 className={cn("text-[10px] font-bold uppercase tracking-wider", s.title)}>{sect.title}</h4>
              </div>
              <div className={cn(
                "text-xs leading-relaxed whitespace-pre-wrap",
                isQuote ? "text-indigo-900/80 dark:text-indigo-200/80 italic font-medium" : "text-muted-foreground font-medium"
              )}>
                {sect.body}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Report Parser
   ───────────────────────────────────────────────────────────────────────────── */
interface ParsedSection { title: string; body: string; icon: string; color: string; }

function parseReportContent(content: string): ParsedSection[] {
  const sections = [
    { key: 'achievements', header: 'Achievements Summary', icon: '🏆', color: 'emerald' },
    { key: 'analysis', header: 'Performance and Time Analysis', icon: '📈', color: 'blue' },
    { key: 'improvements', header: 'Points for Improvement', icon: '⚠️', color: 'amber' },
    { key: 'tips', header: 'Smart Tips for the Next Day', icon: '💡', color: 'purple' },
    { key: 'quote', header: 'Our Encouraging Saying Today', icon: '✨', color: 'indigo' },
  ];

  const result: ParsedSection[] = [];
  let remainingText = content;

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    const next = sections[i + 1];
    const currentIndex = remainingText.toLowerCase().indexOf(current.header.toLowerCase());
    if (currentIndex !== -1) {
      let endIndex = remainingText.length;
      if (next) {
        const nextIndex = remainingText.toLowerCase().indexOf(next.header.toLowerCase());
        if (nextIndex !== -1) endIndex = nextIndex;
      }
      const lineEndIndex = remainingText.indexOf('\n', currentIndex);
      const startOfBody = lineEndIndex !== -1 ? lineEndIndex + 1 : currentIndex + current.header.length;
      let bodyText = remainingText.substring(startOfBody, endIndex).trim();
      bodyText = bodyText.replace(/^\s*-\s*/, '');
      bodyText = bodyText.replace(/\n\s*-\s*/g, '\n• ');
      bodyText = bodyText.replace(/\n\s*•\s*/g, '\n• ');
      bodyText = bodyText.replace(/\*\*(.*?)\*\*/g, '$1');
      result.push({ title: current.header, body: bodyText, icon: current.icon, color: current.color });
    }
  }

  if (result.length === 0) {
    result.push({
      title: 'Report',
      body: content.replace(/\*\*(.*?)\*\*/g, '$1'),
      icon: '📊', color: 'indigo'
    });
  }

  return result;
}
