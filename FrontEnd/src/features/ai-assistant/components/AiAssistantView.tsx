import * as React from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useAiAssistantStore } from '@/store/useAiAssistantStore';
import { TaskStatus } from '@/types/index';
import { api } from '@/api/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DayPickerCalendar } from '@/components/ui/calendar';
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
  RotateCcw,
  Trash2,
  XCircle,
  Clock
} from 'lucide-react';

interface DeadlineWizardTask {
  id: number;
  title: string;
  deadline: string;
}

interface OverdueWizardTask {
  id: number;
  title: string;
  deadline: string;
  action: 'change' | 'cancel' | 'delete';
}

const formatSchedulingError = (msg: string) => {
  let formatted = msg;
  // Remove task ID e.g., "Task 153 (Long Hours)" -> "Task (Long Hours)"
  formatted = formatted.replace(/Task \d+ \((.*?)\)/g, "Task '$1'");
  
  // Format minutes to xhxm e.g., "540 minutes" -> "9h 0m"
  formatted = formatted.replace(/\b(\d+)\s*minutes\b/g, (match, p1) => {
    const mins = parseInt(p1, 10);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  });

  // Convert 24h times to AM/PM (e.g. 17:00 to 05:00 PM), optional if backend sends it.
  formatted = formatted.replace(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g, (match, hStr, mStr) => {
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h.toString().padStart(2, '0')}:${mStr} ${ampm}`;
  });

  return formatted;
};

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
    tasks, tags, categories, dummyCategoryId,
    fetchTasks, updateTask, deleteTask, assignTags, updateTaskStatus
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

  // ── Scheduling Pipeline ──────────────────────────────────────────────────
  const checkMissingDeadlines = () => {
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
          payload: { tasks: missingDeadlines.map(t => ({ id: t.id, title: t.title, deadline: '' })) },
          completed: false
        }]);
        setIsProcessing(false);
      }, 600);
      return true;
    }
    return false;
  };

  const checkOverdueTasks = () => {
    const now = new Date();
    const overdueTasks = tasks.filter(
      t => t.status !== TaskStatus.Done &&
           t.status !== TaskStatus.Cancelled &&
           t.deadline && !t.deadline.startsWith('0001-01-01') &&
           new Date(t.deadline) < now
    );

    if (overdueTasks.length > 0) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: 'assistant-overdue-' + Date.now(), sender: 'assistant',
          text: `You have **${overdueTasks.length}** overdue task${overdueTasks.length > 1 ? 's' : ''}. We can't schedule them in the past! Please choose how to handle them:`,
          timestamp: new Date(), type: 'overdue-wizard',
          payload: { tasks: overdueTasks.map(t => ({ id: t.id, title: t.title, deadline: (t.deadline || '').split('T')[0], action: 'change' })) },
          completed: false
        }]);
        setIsProcessing(false);
      }, 600);
      return true;
    }
    return false;
  };

  const promptWorkHours = () => {
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: 'assistant-work-hours-' + Date.now(), sender: 'assistant',
        text: `Almost ready! What are your working hours for the scheduled tasks?`,
        timestamp: new Date(), type: 'work-hours-wizard',
        completed: false
      }]);
      setIsProcessing(false);
    }, 600);
  };

  const handleScheduleClickDirectly = async (addUserMessage = false) => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (addUserMessage) {
      setMessages(prev => [...prev, {
        id: 'usr-sched-' + Date.now(), sender: 'user',
        text: 'Schedule my tasks', timestamp: new Date(), type: 'text'
      }]);
    }

    if (checkMissingDeadlines()) return;
    if (checkOverdueTasks()) return;
    promptWorkHours();
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
  const handleWizardSubmit = async (messageId: string, wizardTasks: DeadlineWizardTask[]) => {
    setIsProcessing(true);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, completed: true } : m));
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
            const dateStr = wt.deadline.includes('T') ? wt.deadline : `${wt.deadline}T23:59:59`;
            await updateTask(original.id, { deadline: dateStr });
          }
        }
      }

      await fetchTasks();
      await new Promise(resolve => setTimeout(resolve, 850));
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      
      const stateTasks = useTaskStore.getState().tasks;
      const now = new Date();
      const overdueTasks = stateTasks.filter(
        t => t.status !== TaskStatus.Done &&
             t.status !== TaskStatus.Cancelled &&
             t.deadline && !t.deadline.startsWith('0001-01-01') &&
             new Date(t.deadline) < now
      );

      if (overdueTasks.length > 0) {
        setMessages(prev => [...prev, {
          id: 'assistant-overdue-' + Date.now(), sender: 'assistant',
          text: `You have **${overdueTasks.length}** overdue task${overdueTasks.length > 1 ? 's' : ''}. We can't schedule them in the past! Please choose how to handle them:`,
          timestamp: new Date(), type: 'overdue-wizard',
          payload: { tasks: overdueTasks.map(t => ({ id: t.id, title: t.title, deadline: (t.deadline || '').split('T')[0], action: 'change' })) },
          completed: false
        }]);
        setIsProcessing(false);
      } else {
        promptWorkHours();
      }
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

  const handleOverdueWizardSubmit = async (messageId: string, wizardTasks: OverdueWizardTask[]) => {
    setIsProcessing(true);
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, completed: true } : m));
    setMessages(prev => [...prev, {
      id: 'usr-wiz-overdue-save-' + Date.now(), sender: 'user',
      text: "Actions applied to overdue tasks — let's move on!", timestamp: new Date(), type: 'text'
    }]);

    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'assistant',
      text: 'Applying actions to your overdue tasks…',
      timestamp: new Date(), type: 'loading'
    }]);

    try {
      for (const wt of wizardTasks) {
        const original = tasks.find(t => t.id === wt.id);
        if (!original) continue;

        if (wt.action === 'delete') {
          await deleteTask(original.id);
        } else if (wt.action === 'cancel') {
          await updateTaskStatus(original.id, TaskStatus.Cancelled);
        } else if (wt.action === 'change' && wt.deadline) {
          const dateStr = wt.deadline.includes('T') ? wt.deadline : `${wt.deadline}T23:59:59`;
          await updateTask(original.id, { deadline: dateStr });
        }
      }

      await fetchTasks();
      await new Promise(resolve => setTimeout(resolve, 850));
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      promptWorkHours();
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(), sender: 'assistant',
        text: `Something went wrong while saving: ${getErrorMessage(err)}`,
        timestamp: new Date(), type: 'text'
      }]);
      setIsProcessing(false);
    }
  };

  const handleWorkHoursWizardSubmit = async (messageId: string, start: string, end: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, completed: true } : m));
    setMessages(prev => [...prev, {
      id: 'usr-wiz-hours-' + Date.now(), sender: 'user',
      text: `Working hours set: ${start} to ${end}.`, timestamp: new Date(), type: 'text'
    }]);
    await runSchedulingEngine(start, end);
  };

  // ── Scheduling engine ────────────────────────────────────────────────────
  const runSchedulingEngine = async (start: string, end: string) => {
    setIsProcessing(true);
    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: loadingId, sender: 'assistant',
      text: 'Running the scheduling engine — finding the best slots for each task…',
      timestamp: new Date(), type: 'loading'
    }]);

    try {
      // Append seconds since TimeSpan expects HH:mm:ss
      const startParam = `${start}:00`;
      const endParam = `${end}:00`;
      const response = await api.post(`/SmartSchedule/update-auto-fill-blank-time?workDayStart=${startParam}&workDayEnd=${endParam}`);
      
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
      let errMsg = getErrorMessage(err);
      errMsg = formatSchedulingError(errMsg);
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
                        onSubmit={(tasks) => handleWizardSubmit(message.id, tasks)}
                        isProcessing={isProcessing}
                        isCompleted={message.completed}
                      />
                    )}

                    {/* Overdue Wizard */}
                    {message.type === 'overdue-wizard' && message.payload && (
                      <OverdueWizard
                        initialTasks={message.payload.tasks}
                        onSubmit={(tasks) => handleOverdueWizardSubmit(message.id, tasks)}
                        isProcessing={isProcessing}
                        isCompleted={message.completed}
                      />
                    )}

                    {/* Work Hours Wizard */}
                    {message.type === 'work-hours-wizard' && (
                      <WorkHoursWizard
                        onSubmit={(start, end) => handleWorkHoursWizardSubmit(message.id, start, end)}
                        isProcessing={isProcessing}
                        isCompleted={message.completed}
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
/* ─────────────────────────────────────────────────────────────────────────────
   Wizard Date Picker Helper
   ───────────────────────────────────────────────────────────────────────────── */
function WizardDatePicker({ value, onChange, disabled, title }: { value: string; onChange: (v: string) => void; disabled?: boolean; title?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);

  const dateObj = value ? new Date(value + 'T12:00:00') : undefined;

  const handleSelect = (d: Date | undefined) => {
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${day}`);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center justify-between w-full h-8 text-xs font-semibold bg-card border border-border focus:border-blue-400 rounded-lg px-2.5 outline-none cursor-pointer text-left transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            !value && "text-muted-foreground"
          )}
        >
          <span>{value ? new Date(value + 'T12:00:00').toLocaleDateString() : 'mm/dd/yyyy'}</span>
          <Calendar className="h-3.5 w-3.5 opacity-50 dark:text-white" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 bg-card border border-border rounded-2xl shadow-xl dark:shadow-none" align="start">
        {title && (
          <div className="flex items-center justify-between border-b border-border pb-2 px-1 select-none mb-2">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
              {title}
            </span>
          </div>
        )}
        <DayPickerCalendar
          mode="single"
          selected={dateObj}
          onSelect={handleSelect}
          className="rounded-xl border border-transparent p-0"
        />
        <div className="flex gap-2 border-t border-border pt-2 shrink-0 mt-2">
          <button
            type="button"
            onClick={() => handleSelect(new Date())}
            className="flex-1 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-all border border-blue-100/50 shadow-sm dark:shadow-none text-center"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleSelect(undefined)}
            className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-red-600 dark:text-red-400 bg-muted hover:bg-red-500/10 rounded-lg cursor-pointer transition-all border border-border"
          >
            Clear
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Deadline Wizard
   ───────────────────────────────────────────────────────────────────────────── */
function DeadlineWizard({
  initialTasks, onSubmit, isProcessing, isCompleted
}: {
  initialTasks: DeadlineWizardTask[];
  onSubmit: (tasks: DeadlineWizardTask[]) => void;
  isProcessing: boolean;
  isCompleted?: boolean;
}) {
  const [wizardTasks, setWizardTasks] = React.useState<DeadlineWizardTask[]>(initialTasks);
  const [selectedIds, setSelectedIds] = React.useState<number[]>(initialTasks.map(t => t.id));
  const [bulkDate, setBulkDate] = React.useState('');

  const disabled = isProcessing || isCompleted;

  const toggleSelect = (id: number) => {
    if (disabled) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (disabled) return;
    setSelectedIds(selectedIds.length === wizardTasks.length ? [] : wizardTasks.map(t => t.id));
  };

  const handleApplyBulkDate = () => {
    if (!bulkDate || disabled) return;
    setWizardTasks(prev => prev.map(t => selectedIds.includes(t.id) ? { ...t, deadline: bulkDate } : t));
  };

  const handleDateChange = (id: number, dateVal: string) => {
    if (disabled) return;
    setWizardTasks(prev => prev.map(t => t.id === id ? { ...t, deadline: dateVal } : t));
  };

  const isFormValid = wizardTasks.every(t => !!t.deadline);

  return (
    <div className="mt-3 space-y-3">
      {/* Bulk assign */}
      <div className={cn("p-3 rounded-xl border space-y-2", disabled ? "border-slate-200 bg-slate-50 opacity-50" : "border-blue-100 bg-blue-500/10")}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Assign to multiple</span>
          <button
            type="button"
            onClick={toggleSelectAll}
            disabled={disabled}
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {selectedIds.length === wizardTasks.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 min-w-[120px]">
            <WizardDatePicker
              value={bulkDate}
              onChange={setBulkDate}
              disabled={disabled}
              title="Bulk Date"
            />
          </div>
          <Button
            type="button"
            onClick={handleApplyBulkDate}
            disabled={!bulkDate || selectedIds.length === 0 || disabled}
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
                isChecked ? "border-blue-200 dark:border-blue-500/30 shadow-xs dark:shadow-none" : "border-slate-150 opacity-70",
                disabled && "opacity-60"
              )}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => toggleSelect(t.id)}
                disabled={disabled}
                className="h-4 w-4 shrink-0 cursor-pointer"
              />
              <span
                onClick={() => toggleSelect(t.id)}
                className="text-xs font-semibold text-foreground truncate flex-1 cursor-pointer select-none"
              >
                {t.title}
              </span>
              <div className="w-[120px] shrink-0">
                <WizardDatePicker
                  value={t.deadline}
                  onChange={(val) => handleDateChange(t.id, val)}
                  disabled={disabled}
                />
              </div>
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
          disabled={!isFormValid || disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-4 rounded-xl shadow-xs dark:shadow-none shrink-0"
        >
          {isProcessing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Scheduling…</>
          ) : (
            isCompleted ? 'Saved' : 'Schedule Now'
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

  const getSectionStyles = (color: string) => {
    switch (color) {
      case 'emerald': return { bg: 'bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20', title: 'text-emerald-700 dark:text-emerald-400', icon: <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />, iconBg: 'bg-emerald-500/20 dark:bg-emerald-500/30' };
      case 'blue': return { bg: 'bg-blue-500/10 border-blue-100 dark:border-blue-500/20', title: 'text-blue-700 dark:text-blue-400', icon: <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />, iconBg: 'bg-blue-500/20 dark:bg-blue-500/30' };
      case 'amber': return { bg: 'bg-amber-500/10 border-amber-100 dark:border-amber-500/20', title: 'text-amber-700 dark:text-amber-400', icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />, iconBg: 'bg-amber-500/20 dark:bg-amber-500/30' };
      case 'purple': return { bg: 'bg-purple-500/10 border-purple-100 dark:border-purple-500/20', title: 'text-purple-700 dark:text-purple-400', icon: <Lightbulb className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />, iconBg: 'bg-purple-500/20 dark:bg-purple-500/30' };
      default: return { bg: 'bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20', title: 'text-indigo-700 dark:text-indigo-400', icon: <Quote className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />, iconBg: 'bg-indigo-500/20 dark:bg-indigo-500/30' };
    }
  };

  return (
    <div className="mt-3 space-y-3 animate-in zoom-in-95 duration-300">


      {/* Sections */}
      <div className="space-y-2.5">
        {sections.map((sect) => {
          const s = getSectionStyles(sect.color);
          const isQuote = sect.color === 'indigo';
          return (
            <div key={sect.title} className={cn("p-3.5 rounded-xl border", s.bg, isQuote && "relative overflow-hidden")}>
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
  if (!content) {
    return [{ title: 'Report', body: 'No content available.', icon: '📝', color: 'blue' }];
  }

  const sections = [
    { key: 'achievements', header: 'Achievements Summary', icon: '🏆', color: 'emerald' },
    { key: 'analysis', header: 'Performance and Time Analysis', icon: '📈', color: 'blue' },
    { key: 'improvements', header: 'Points for Improvement', icon: '⚠️', color: 'amber' },
    { key: 'tips', header: 'Smart Tips for the Next Day', icon: '💡', color: 'purple' },
    { key: 'quote', header: 'Our Encouraging Saying Today', icon: '✨', color: 'indigo' },
  ];

  const result: ParsedSection[] = [];
  const foundHeaders: { index: number, section: typeof sections[0] }[] = [];
  
  sections.forEach(sec => {
    const idx = content.toLowerCase().indexOf(sec.header.toLowerCase());
    if (idx !== -1) {
      foundHeaders.push({ index: idx, section: sec });
    }
  });

  foundHeaders.sort((a, b) => a.index - b.index);

  for (let i = 0; i < foundHeaders.length; i++) {
    const current = foundHeaders[i];
    const next = foundHeaders[i + 1];
    
    const startOfBody = current.index + current.section.header.length;
    const endIndex = next ? next.index : content.length;
    
    let bodyText = content.substring(startOfBody, endIndex).trim();
    bodyText = bodyText.replace(/^[:\-\s]+/, ''); // remove leading colon or dashes
    bodyText = bodyText.replace(/^#+\s/gm, ''); // remove any rogue markdown headers
    bodyText = bodyText.replace(/^\s*-\s*/, '');
    bodyText = bodyText.replace(/\n\s*-\s*/g, '\n• ');
    bodyText = bodyText.replace(/\n\s*•\s*/g, '\n• ');
    bodyText = bodyText.replace(/\*\*(.*?)\*\*/g, '$1');

    // Remove task IDs like (ID 134) or (Task 134)
    bodyText = bodyText.replace(/\s*\((?:ID|Task)\s*\d+\)/gi, '');

    const formatMin = (minsStr: string) => {
      const mins = parseInt(minsStr, 10);
      if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
      }
      return `${mins}m`;
    };

    // Convert "X-Y minutes" or "X to Y minutes"
    bodyText = bodyText.replace(/(\d+)\s*(?:-|to)\s*(\d+)\s*-?\s*minutes?/gi, (match, p1, p2) => {
      return `${formatMin(p1)}-${formatMin(p2)}`;
    });
    
    // Convert "X minutes", "X-minute", "X minutes (Y hours)" into "Xh Ym"
    bodyText = bodyText.replace(/(\d+)\s*-?\s*minutes?(?:\s*\(\s*\d+(?:\.\d+)?\s*hours?\s*\))?/gi, (match, p1) => {
      return formatMin(p1);
    });

    // Convert 24-hour time (e.g. 21:00) to 12-hour AM/PM format (e.g. 9:00 PM)
    bodyText = bodyText.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (match, h, m) => {
      let hh = parseInt(h, 10);
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12 || 12;
      return `${hh}:${m} ${ampm}`;
    });

    // Clean up trailing # chars
    bodyText = bodyText.replace(/[#\s]+$/, '');
    
    if (bodyText) {
      result.push({
        title: current.section.header,
        body: bodyText,
        icon: current.section.icon,
        color: current.section.color
      });
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

/* ─────────────────────────────────────────────────────────────────────────────
   Wizard Time Picker Helper
   ───────────────────────────────────────────────────────────────────────────── */
function WizardTimePicker({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [h, m] = value.split(':');
  let hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;

  const handleHour = (newH: number) => {
    let military = newH;
    if (ampm === 'PM' && newH < 12) military += 12;
    if (ampm === 'AM' && newH === 12) military = 0;
    onChange(`${military.toString().padStart(2, '0')}:${m}`);
  };
  const handleMin = (newM: number) => {
    onChange(`${h}:${newM.toString().padStart(2, '0')}`);
  };
  const handleAmPm = (newAmPm: 'AM'|'PM') => {
    let military = hh;
    if (newAmPm === 'PM' && military < 12) military += 12;
    if (newAmPm === 'AM' && military === 12) military = 0;
    onChange(`${military.toString().padStart(2, '0')}:${m}`);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center justify-between w-full h-9 text-sm font-semibold bg-muted/50 border border-border focus:border-blue-400 rounded-xl px-3 outline-none cursor-pointer text-left transition-colors",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 opacity-50 dark:text-white" />
            <span>{hh.toString().padStart(2, '0')}:{m} {ampm}</span>
          </div>
          <Clock className="h-4 w-4 opacity-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5 bg-card border border-border rounded-xl shadow-xl dark:shadow-none flex" align="start">
         <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
         <div className="flex flex-col h-48 w-14 overflow-y-auto no-scrollbar gap-1 px-1" ref={(el) => { if(el && isOpen) el.querySelector('[data-active=true]')?.scrollIntoView({block: 'center'}); }}>
           {Array.from({length: 12}, (_, i) => i + 1).map(x => (
             <button key={x} data-active={hh === x} onClick={() => handleHour(x)} className={cn("py-1.5 rounded-md text-xs font-bold transition-all shrink-0", hh === x ? "bg-blue-600 text-white" : "hover:bg-muted text-foreground")}>{x.toString().padStart(2, '0')}</button>
           ))}
         </div>
         <div className="w-[1px] bg-border my-1 shrink-0" />
         <div className="flex flex-col h-48 w-14 overflow-y-auto no-scrollbar gap-1 px-1" ref={(el) => { if(el && isOpen) el.querySelector('[data-active=true]')?.scrollIntoView({block: 'center'}); }}>
           {Array.from({length: 60}, (_, i) => i).map(x => (
             <button key={x} data-active={mm === x} onClick={() => handleMin(x)} className={cn("py-1.5 rounded-md text-xs font-bold transition-all shrink-0", mm === x ? "bg-blue-600 text-white" : "hover:bg-muted text-foreground")}>{x.toString().padStart(2, '0')}</button>
           ))}
         </div>
         <div className="w-[1px] bg-border my-1 shrink-0" />
         <div className="flex flex-col gap-1 px-1 justify-center shrink-0">
           <button onClick={() => handleAmPm('AM')} className={cn("py-2 px-2 rounded-md text-xs font-black transition-all", ampm === 'AM' ? "bg-blue-600 text-white" : "hover:bg-muted text-foreground")}>AM</button>
           <button onClick={() => handleAmPm('PM')} className={cn("py-2 px-2 rounded-md text-xs font-black transition-all", ampm === 'PM' ? "bg-blue-600 text-white" : "hover:bg-muted text-foreground")}>PM</button>
         </div>
      </PopoverContent>
    </Popover>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Overdue Wizard
   ───────────────────────────────────────────────────────────────────────────── */
function OverdueWizard({
  initialTasks, onSubmit, isProcessing, isCompleted
}: {
  initialTasks: OverdueWizardTask[];
  onSubmit: (tasks: OverdueWizardTask[]) => void;
  isProcessing: boolean;
  isCompleted?: boolean;
}) {
  const [tasks, setTasks] = React.useState<OverdueWizardTask[]>(initialTasks);

  const disabled = isProcessing || isCompleted;

  const updateAction = (id: number, action: 'change' | 'cancel' | 'delete') => {
    if (disabled) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, action } : t));
  };

  const updateDate = (id: number, dateVal: string) => {
    if (disabled) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, deadline: dateVal } : t));
  };

  const isValid = tasks.every(t => t.action !== 'change' || !!t.deadline);

  return (
    <div className="mt-3 space-y-3">
      <div className="space-y-3 max-h-64 overflow-y-auto pr-0.5">
        {tasks.map(t => (
          <div key={t.id} className={cn("p-3 bg-card rounded-xl border border-amber-100 dark:border-amber-500/20 shadow-xs dark:shadow-none space-y-3 transition-all", disabled && "opacity-60")}>
            <span className="text-xs font-bold text-foreground block">{t.title}</span>
            <div className="flex bg-muted rounded-lg p-1">
              <button
                disabled={disabled}
                onClick={() => updateAction(t.id, 'change')}
                className={cn("flex-1 text-xs font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50", t.action === 'change' ? "bg-blue-600 text-white shadow-sm dark:shadow-none" : "text-muted-foreground hover:text-foreground")}
              >
                <Calendar className="h-3 w-3 dark:text-white" /> Change
              </button>
              <button
                disabled={disabled}
                onClick={() => updateAction(t.id, 'cancel')}
                className={cn("flex-1 text-xs font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50", t.action === 'cancel' ? "bg-slate-500 text-white shadow-sm dark:shadow-none" : "text-muted-foreground hover:text-foreground")}
              >
                <XCircle className="h-3 w-3" /> Cancel
              </button>
              <button
                disabled={disabled}
                onClick={() => updateAction(t.id, 'delete')}
                className={cn("flex-1 text-xs font-bold py-1.5 rounded-md flex items-center justify-center gap-1.5 transition-all disabled:opacity-50", t.action === 'delete' ? "bg-red-500 text-white shadow-sm dark:shadow-none" : "text-muted-foreground hover:text-foreground")}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
            {t.action === 'change' && (
              <div className="relative">
                <WizardDatePicker
                  value={t.deadline}
                  onChange={(val) => updateDate(t.id, val)}
                  disabled={disabled}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Button
        onClick={() => onSubmit(tasks)}
        disabled={!isValid || disabled}
        className="w-full bg-[#E57A00] hover:bg-[#CC6D00] text-white font-bold text-xs h-10 rounded-xl"
      >
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {isCompleted ? "Actions Applied" : "Apply Actions"}
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Work Hours Wizard
   ───────────────────────────────────────────────────────────────────────────── */
function WorkHoursWizard({
  onSubmit, isProcessing, isCompleted
}: {
  onSubmit: (start: string, end: string) => void;
  isProcessing: boolean;
  isCompleted?: boolean;
}) {
  const [start, setStart] = React.useState('09:00');
  const [end, setEnd] = React.useState('17:00');

  const disabled = isProcessing || isCompleted;

  const isValid = (() => {
    const s = parseInt(start.replace(':', ''), 10);
    const e = parseInt(end.replace(':', ''), 10);
    return s < e;
  })();

  return (
    <div className={cn("mt-3 p-4 bg-card rounded-2xl border border-border space-y-4 shadow-sm dark:shadow-none transition-all", disabled && "opacity-60")}>
      <p className="text-[11px] font-medium text-muted-foreground">
        Set your preferred working hours to help me fit your tasks effectively.
      </p>
      
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Start Time</label>
          <WizardTimePicker value={start} onChange={setStart} disabled={disabled} />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">End Time</label>
          <WizardTimePicker value={end} onChange={setEnd} disabled={disabled} />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={() => onSubmit(start, end)}
          disabled={!isValid || disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-5 rounded-full"
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isCompleted ? "Scheduled" : "Start Scheduling"}
        </Button>
      </div>
    </div>
  );
}
}