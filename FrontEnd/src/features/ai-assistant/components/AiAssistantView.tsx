import * as React from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useAiAssistantStore } from '@/store/useAiAssistantStore';
import { TaskStatus } from '@/types/index';
import { api } from '@/api/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Send
} from 'lucide-react';



interface DeadlineWizardTask {
  id: number;
  title: string;
  deadline: string;
}

// Error formatting helper to avoid [object Object]
const getErrorMessage = (err: any): string => {
  if (!err) return 'Operation failed.';
  
  // If the error has a response from Axios
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      if (data.Details && typeof data.Details === 'string') return data.Details;
      if (data.details && typeof data.details === 'string') return data.details;
      if (data.message && typeof data.message === 'string') return data.message;
      if (data.Message && typeof data.Message === 'string') return data.Message;
      
      // If it's a validation errors object (e.g. ASP.NET core ModelState errors)
      if (data.errors && typeof data.errors === 'object') {
        const errorList = Object.entries(data.errors)
          .map(([key, val]) => {
            const msgs = Array.isArray(val) ? val.join(', ') : String(val);
            return `${key}: ${msgs}`;
          })
          .join('\n');
        if (errorList) return errorList;
      }
      
      try {
        return JSON.stringify(data);
      } catch (e) {
        return 'Invalid response object';
      }
    }
  }
  
  // If it's a standard JS/Axios error
  if (err.message) {
    if (typeof err.message === 'string') return err.message;
    try {
      return JSON.stringify(err.message);
    } catch (e) {
      return 'Unknown error message';
    }
  }

  // If the error itself is a string
  if (typeof err === 'string') return err;
  
  // If the error itself is an object
  try {
    return JSON.stringify(err);
  } catch (e) {
    return String(err) || 'Operation failed.';
  }
};

export function AiAssistantView() {
  const { 
    tasks, 
    tags,
    fetchTasks, 
    addTask, 
    deleteTask, 
    assignTags,
    updateTaskStatus
  } = useTaskStore();

  const {
    messages,
    isProcessing,
    inputValue,
    setMessages,
    setIsProcessing,
    setInputValue
  } = useAiAssistantStore();

  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Fetch tasks on mount
  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Auto scroll to bottom
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Reusable scheduling execution flow
  const handleScheduleClickDirectly = async (addUserMessage = false) => {
    if (isProcessing) return;

    setIsProcessing(true);

    if (addUserMessage) {
      setMessages(prev => [
        ...prev,
        {
          id: 'usr-sched-' + Date.now(),
          sender: 'user',
          text: 'Schedule my tasks',
          timestamp: new Date(),
          type: 'text'
        }
      ]);
    }

    // Identify active tasks missing deadlines
    const missingDeadlines = tasks.filter(
      (t) =>
        t.status !== TaskStatus.Done &&
        t.status !== TaskStatus.Cancelled &&
        (!t.deadline || t.deadline.startsWith('0001-01-01'))
    );

    if (missingDeadlines.length > 0) {
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          {
            id: 'assistant-wizard-' + Date.now(),
            sender: 'assistant',
            text: `I found ${missingDeadlines.length} active tasks that are currently missing a deadline. Before running the scheduling engine, please assign a deadline date to each of them below:`,
            timestamp: new Date(),
            type: 'deadline-wizard',
            payload: {
              tasks: missingDeadlines.map(t => ({
                id: t.id,
                title: t.title,
                deadline: ''
              }))
            }
          }
        ]);
        setIsProcessing(false);
      }, 600);
    } else {
      await runSchedulingEngine();
    }
  };

  // Reusable report compilation flow
  const handleReportClickDirectly = async (addUserMessage = false) => {
    if (isProcessing) return;

    setIsProcessing(true);

    if (addUserMessage) {
      setMessages(prev => [
        ...prev,
        {
          id: 'usr-rep-' + Date.now(),
          sender: 'user',
          text: 'Generate daily report',
          timestamp: new Date(),
          type: 'text'
        }
      ]);
    }

    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: loadingId,
        sender: 'assistant',
        text: 'Fetching logs and compiling your daily productivity performance metrics via Gemini AI...',
        timestamp: new Date(),
        type: 'loading'
      }
    ]);

    try {
      const response = await api.post('/AiReport/generate-daily');
      
      setMessages(prev => prev.filter(m => m.id !== loadingId));

      setMessages(prev => [
        ...prev,
        {
          id: 'report-resp-' + Date.now(),
          sender: 'assistant',
          timestamp: new Date(),
          type: 'report-view',
          payload: {
            score: response.data.productivityScore,
            content: response.data.content
          }
        }
      ]);
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));

      const errMsg = getErrorMessage(err);
      setMessages(prev => [
        ...prev,
        {
          id: 'assistant-resp-' + Date.now(),
          sender: 'assistant',
          text: `⚠️ **Report Compiler Warning**:\n\n${errMsg}`,
          timestamp: new Date(),
          type: 'text'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit all custom deadlines from wizard
  const handleWizardSubmit = async (wizardTasks: DeadlineWizardTask[]) => {
    setIsProcessing(true);
    
    // Add user message indicating deadlines saved
    setMessages(prev => [
      ...prev,
      {
        id: 'usr-wiz-save-' + Date.now(),
        sender: 'user',
        text: 'Applied deadlines, let\'s schedule!',
        timestamp: new Date(),
        type: 'text'
      }
    ]);

    // Add loading block
    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: loadingId,
        sender: 'assistant',
        text: 'Saving your deadlines and launching scheduling engine...',
        timestamp: new Date(),
        type: 'loading'
      }
    ]);

    try {
      // 1. Update deadlines sequentially to guarantee database integrity
      for (const wt of wizardTasks) {
        if (wt.deadline) {
          // Re-create the task to bypass the C# backend update deadline bug!
          const original = tasks.find(t => t.id === wt.id);
          if (original) {
            // Delete the old task
            await deleteTask(original.id);
            // Append standard T23:59:59 ISO extension for deadline date to give the engine maximum schedule space
            const dateStr = wt.deadline.includes('T') ? wt.deadline : `${wt.deadline}T23:59:59`;
            
            // Create a new task with the exact same attributes and the specified deadline
            const created = await addTask({
              title: original.title,
              description: original.description || undefined,
              durationInMinutes: original.durationInMinutes || 30,
              priority: original.priority || 5,
              effortLevel: original.effortLevel || 3,
              deadline: dateStr,
            }, original.categoryId);

            // Re-assign status if not default Todo (0)
            if (original.status !== 0) {
              await updateTaskStatus(created.id, original.status);
            }

            // Re-assign tags if the original task had tags
            if (original.tags && original.tags.length > 0) {
              const tagIdsToAssign = original.tags
                .map(tagName => tags.find(tag => tag.name === tagName)?.id)
                .filter((id): id is number => id !== undefined);
              if (tagIdsToAssign.length > 0) {
                await assignTags(created.id, tagIdsToAssign);
              }
            }
          }
        }
      }

      // Refresh Zustand store tasks list
      await fetchTasks();

      // Brief delay to allow DB commits to settle completely
      await new Promise(resolve => setTimeout(resolve, 850));

      // 2. Clear loading and continue to execute scheduling engine
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      await runSchedulingEngine();
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      setMessages(prev => [
        ...prev,
        {
          id: 'error-' + Date.now(),
          sender: 'assistant',
          text: `Failed to save task deadlines: ${getErrorMessage(err)}`,
          timestamp: new Date(),
          type: 'text'
        }
      ]);
      setIsProcessing(false);
    }
  };

  // Execute AutoFill API call
  const runSchedulingEngine = async () => {
    const loadingId = 'assistant-loading-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: loadingId,
        sender: 'assistant',
        text: 'Running Smart Scheduling engine. Calculating optimum slots around your existing commitments...',
        timestamp: new Date(),
        type: 'loading'
      }
    ]);

    try {
      const response = await api.post('/SmartSchedule/auto-fill-blank-times');
      
      // Update UI Task state
      await fetchTasks();

      setMessages(prev => prev.filter(m => m.id !== loadingId));

      const status = response.data?.Status;
      const message = response.data?.Message || 'All tasks scheduled successfully.';

      if (status === 'No Action Needed') {
        setMessages(prev => [
          ...prev,
          {
            id: 'assistant-resp-' + Date.now(),
            sender: 'assistant',
            text: `ℹ️ **No Action Needed**:\n${message}`,
            timestamp: new Date(),
            type: 'text'
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: 'assistant-resp-' + Date.now(),
            sender: 'assistant',
            text: `✅ **Tasks Scheduled**\n\nAll of your open tasks have been successfully aligned and scheduled on your calendar around your commitments! Check your Today/Upcoming views to see your new start and end slots!`,
            timestamp: new Date(),
            type: 'text'
          }
        ]);
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== loadingId));

      const errMsg = getErrorMessage(err);
      const isConflict = err.response?.status === 422 || errMsg.toLowerCase().includes('conflict');
      
      setMessages(prev => [
        ...prev,
        {
          id: 'assistant-resp-' + Date.now(),
          sender: 'assistant',
          text: isConflict 
            ? `⚠️ **Scheduling Conflict Detected**:\n\nThe scheduling engine was unable to allocate tasks due to a clash:\n\n*${errMsg}*\n\nTry adjusting task deadlines or duration requirements, then try again.`
            : `❌ **Scheduling Fault**:\n${errMsg}`,
          timestamp: new Date(),
          type: 'text'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bottom Input Submission handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    setInputValue('');

    // 1. Add User Message
    const userMsgId = 'usr-msg-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text,
        timestamp: new Date(),
        type: 'text'
      }
    ]);

    setIsProcessing(true);

    const lowerText = text.toLowerCase();
    setTimeout(async () => {
      if (lowerText.includes('schedule') || lowerText.includes('calendar') || lowerText.includes('fill')) {
        setIsProcessing(false);
        await handleScheduleClickDirectly(false);
      } else if (lowerText.includes('report') || lowerText.includes('daily') || lowerText.includes('performance')) {
        setIsProcessing(false);
        await handleReportClickDirectly(false);
      } else {
        // Guided Help Bubble
        setMessages(prev => [
          ...prev,
          {
            id: 'assistant-guided-' + Date.now(),
            sender: 'assistant',
            text: "I am operating in Guided Mode to guarantee successful API outputs! \n\nType **'schedule'** to initiate Smart Task Scheduling on your calendar, or **'report'** to compile your daily performance report.\n\nYou can also click the quick-action pills directly above the message bar below!",
            timestamp: new Date(),
            type: 'text'
          }
        ]);
        setIsProcessing(false);
      }
    }, 400);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-50/40 overflow-hidden font-sans select-none">
      {/* Premium Ambient Light Glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="px-8 pt-7 pb-4 flex items-center justify-between shrink-0 border-b border-slate-100 bg-white/40 backdrop-blur-md z-15">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-blue-600 animate-pulse animate-duration-2000" />
            AI Assistant
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Deterministic scheduler & AI Productivity Coach</p>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-8 pt-6">
          <div className="max-w-3xl mx-auto w-full pb-36 space-y-6">
            {messages.map((message) => {
              const isUser = message.sender === 'user';
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col max-w-[85%] w-fit animate-in fade-in slide-in-from-bottom-3 duration-300",
                    isUser ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {/* Sender Badge */}
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                    {isUser ? 'You' : 'AI Assistant'}
                  </span>

                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl shadow-sm text-sm font-semibold leading-relaxed border transition-all w-full",
                      isUser
                        ? "bg-blue-600 text-white border-blue-700 rounded-tr-none"
                        : "bg-white/80 backdrop-blur-md text-slate-700 border-slate-100 rounded-tl-none"
                    )}
                  >
                    {/* Plain Text with formatting */}
                    {message.text && (
                      <div className="whitespace-pre-line leading-relaxed font-semibold">
                        {message.text.replace(/\*\*(.*?)\*\*/g, '$1')}
                      </div>
                    )}

                    {/* Controlled Options */}
                    {message.type === 'options' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                        <button
                          onClick={() => handleScheduleClickDirectly(true)}
                          disabled={isProcessing}
                          className="flex flex-col text-left p-4 rounded-xl border border-blue-100/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 hover:from-blue-50 hover:to-indigo-50/60 text-blue-900 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">
                            <Calendar className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                            Schedule My Tasks
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold leading-normal">
                            Auto-schedule incomplete tasks around your existing timeline slots using logic constraints.
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mt-3">
                            Start Engine <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>

                        <button
                          onClick={() => handleReportClickDirectly(true)}
                          disabled={isProcessing}
                          className="flex flex-col text-left p-4 rounded-xl border border-emerald-100/50 bg-gradient-to-br from-emerald-50/40 to-teal-50/20 hover:from-emerald-50 hover:to-teal-50/50 text-emerald-950 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer group disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1.5">
                            <BarChart3 className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
                            Daily Report
                          </div>
                          <span className="text-[11px] text-slate-500 font-semibold leading-normal">
                            Generate a smart analytical report of your daily achievements, time tracking metrics, and sayings.
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-3">
                            Compile Analysis <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Loading status */}
                    {message.type === 'loading' && (
                      <div className="flex items-center gap-3 py-1 font-semibold text-slate-500 text-xs">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                        <span>Analyzing logic matrices...</span>
                      </div>
                    )}

                    {/* Deadline Assignment Wizard */}
                    {message.type === 'deadline-wizard' && message.payload && (
                      <DeadlineWizard 
                        initialTasks={message.payload.tasks} 
                        onSubmit={handleWizardSubmit} 
                        isProcessing={isProcessing}
                      />
                    )}

                    {/* AI Productivity Report Card */}
                    {message.type === 'report-view' && message.payload && (
                      <ReportPresenter 
                        score={message.payload.score} 
                        content={message.payload.content} 
                      />
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[8px] font-bold text-slate-400 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message input bar at the bottom */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent border-t border-slate-100/30 shrink-0 z-10 space-y-3">
        <div className="max-w-3xl mx-auto w-full">
          
          {/* Quick-action Suggestion Chips above the input */}
          {!isProcessing && (
            <div className="flex flex-wrap items-center gap-2 mb-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <button
                type="button"
                onClick={() => handleScheduleClickDirectly(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold shadow-xs transition-all cursor-pointer select-none active:scale-95"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                Schedule My Tasks
              </button>
              <button
                type="button"
                onClick={() => handleReportClickDirectly(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-xs font-bold shadow-xs transition-all cursor-pointer select-none active:scale-95"
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                Daily Report
              </button>
            </div>
          )}

          {/* Form message input */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-slate-200/80 focus-within:border-blue-500/80 focus-within:ring-4 focus-within:ring-blue-500/5 rounded-2xl shadow-sm transition-all">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isProcessing}
              placeholder={isProcessing ? "AI Coach is typing..." : "Type 'schedule' or 'report'..."}
              className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 placeholder:text-slate-400 font-semibold p-0 text-slate-800"
            />
            <Button
              type="submit"
              disabled={isProcessing || !inputValue.trim()}
              size="icon"
              className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer active:scale-95 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Deadline Wizard Form Component with Bulk Assignment Features
   ───────────────────────────────────────────────────────────────────────────── */
function DeadlineWizard({
  initialTasks,
  onSubmit,
  isProcessing
}: {
  initialTasks: DeadlineWizardTask[];
  onSubmit: (tasks: DeadlineWizardTask[]) => void;
  isProcessing: boolean;
}) {
  const [wizardTasks, setWizardTasks] = React.useState<DeadlineWizardTask[]>(initialTasks);
  const [selectedIds, setSelectedIds] = React.useState<number[]>(
    initialTasks.map(t => t.id) // check all by default
  );
  const [bulkDate, setBulkDate] = React.useState('');

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === wizardTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(wizardTasks.map(t => t.id));
    }
  };

  const handleApplyBulkDate = () => {
    if (!bulkDate) return;
    setWizardTasks(prev =>
      prev.map(t =>
        selectedIds.includes(t.id) ? { ...t, deadline: bulkDate } : t
      )
    );
  };

  const handleDateChange = (id: number, dateVal: string) => {
    setWizardTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, deadline: dateVal } : t))
    );
  };

  const isFormValid = wizardTasks.every(t => !!t.deadline);

  return (
    <div className="mt-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 w-full space-y-4 max-w-full overflow-hidden text-slate-700">
      
      {/* Bulk Action Panel */}
      <div className="p-3 bg-white rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/20 to-indigo-50/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-1">
            ⚡ Bulk Action Panel
          </span>
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {selectedIds.length === wizardTasks.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            disabled={isProcessing}
            min={new Date().toISOString().split('T')[0]}
            className="flex-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 focus:border-blue-400 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          />
          <Button
            type="button"
            onClick={handleApplyBulkDate}
            disabled={!bulkDate || selectedIds.length === 0 || isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] h-8 rounded-lg shadow-sm transition-all"
          >
            Apply to ({selectedIds.length}) Selected
          </Button>
        </div>
      </div>

      {/* Tasks List with Checkboxes */}
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {wizardTasks.map((t) => {
          const isChecked = selectedIds.includes(t.id);
          return (
            <div 
              key={t.id} 
              className={cn(
                "flex items-center gap-3 p-3 bg-white rounded-xl border transition-all",
                isChecked ? "border-blue-100 ring-2 ring-blue-500/5 shadow-sm" : "border-slate-150 opacity-75 hover:opacity-100"
              )}
            >
              {/* Checkbox handles its own click */}
              <div className="shrink-0">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleSelect(t.id)}
                  className="h-4 w-4 rounded border-slate-350 cursor-pointer"
                />
              </div>

              {/* Task Title click also toggles select */}
              <span 
                onClick={() => toggleSelect(t.id)}
                className="text-xs font-bold text-slate-800 truncate flex-1 pr-2 cursor-pointer select-none hover:text-blue-600 transition-colors"
              >
                {t.title}
              </span>

              {/* Date Input */}
              <input
                type="date"
                value={t.deadline}
                onChange={(e) => handleDateChange(t.id, e.target.value)}
                disabled={isProcessing}
                min={new Date().toISOString().split('T')[0]}
                className="text-xs font-bold text-slate-700 bg-slate-50/80 border border-slate-200 focus:border-blue-400 rounded-lg px-2 py-1 outline-none cursor-pointer shrink-0"
              />
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          All deadlines required
        </span>
        <Button
          onClick={() => onSubmit(wizardTasks)}
          disabled={!isFormValid || isProcessing}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-sm transition-all"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Scheduling...
            </>
          ) : (
            'Apply Deadlines & Schedule'
          )}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Premium AI Report Presenter Component
   ───────────────────────────────────────────────────────────────────────────── */
function ReportPresenter({ score, content }: { score: number; content: string }) {
  const sections = React.useMemo(() => {
    return parseReportContent(content);
  }, [content]);

  // Color mapping utilities
  const scoreColors = (() => {
    if (score >= 80) return { text: 'text-emerald-600', ring: 'stroke-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200/50' };
    if (score >= 50) return { text: 'text-amber-600', ring: 'stroke-amber-500', bg: 'bg-amber-50', border: 'border-amber-200/50' };
    return { text: 'text-rose-600', ring: 'stroke-rose-500', bg: 'bg-rose-50', border: 'border-rose-200/50' };
  })();

  const getSectionStyles = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: 'bg-emerald-50/40 border-emerald-100/50',
          title: 'text-emerald-700',
          icon: <Trophy className="h-4 w-4 text-emerald-600" />,
          iconBg: 'bg-emerald-100'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50/40 border-blue-100/50',
          title: 'text-blue-700',
          icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
          iconBg: 'bg-blue-100'
        };
      case 'amber':
        return {
          bg: 'bg-amber-50/40 border-amber-100/50',
          title: 'text-amber-700',
          icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
          iconBg: 'bg-amber-100'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50/40 border-purple-100/50',
          title: 'text-purple-700',
          icon: <Lightbulb className="h-4 w-4 text-purple-600" />,
          iconBg: 'bg-purple-100'
        };
      default:
        return {
          bg: 'bg-indigo-50/40 border-indigo-100/50',
          title: 'text-indigo-700',
          icon: <Quote className="h-4 w-4 text-indigo-600" />,
          iconBg: 'bg-indigo-100'
        };
    }
  };

  // SVG parameters for circular score ring
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="mt-4 w-full sm:min-w-[420px] max-w-full space-y-6 animate-in zoom-in-95 duration-300 text-slate-700">
      
      {/* 1. Circular Productivity Score Card */}
      <div className={cn("p-5 border rounded-2xl flex items-center justify-between gap-4 shadow-xs bg-white", scoreColors.border)}>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Productivity Metric</span>
          <h3 className="text-lg font-bold text-slate-800">Coach Performance Score</h3>
          <p className="text-[11px] text-slate-500 font-semibold max-w-[220px]">
            {score >= 80 ? 'Exceptional focus! Keep up this high standard of efficiency.' : score >= 50 ? 'Stable progress. Good momentum today.' : 'Challenging day. Leverage our tips to rebuild focus tomorrow.'}
          </p>
        </div>

        {/* Circular Gauge */}
        <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
          <svg className="h-full w-full rotate-[-90deg]">
            <circle cx="32" cy="32" r={radius} className="stroke-slate-100 fill-none" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              className={cn("fill-none transition-all duration-1000", scoreColors.ring)}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className={cn("absolute text-xs font-bold tracking-tighter", scoreColors.text)}>
            {Math.round(score)}%
          </span>
        </div>
      </div>

      {/* 2. Structured Sections Container */}
      <div className="space-y-4">
        {sections.map((sect) => {
          const s = getSectionStyles(sect.color);
          const isQuote = sect.color === 'indigo';
          return (
            <div 
              key={sect.title} 
              className={cn(
                "p-4 rounded-2xl border transition-all hover:shadow-xs", 
                s.bg,
                isQuote && "bg-gradient-to-br from-indigo-50/50 to-pink-50/30 border-indigo-150/40 relative overflow-hidden"
              )}
            >
              {/* Quote background graphic */}
              {isQuote && (
                <div className="absolute right-[-10px] bottom-[-20px] text-indigo-500/10 font-serif text-8xl pointer-events-none select-none">
                  ”
                </div>
              )}

              {/* Title row */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className={cn("p-1.5 rounded-lg shrink-0", s.iconBg)}>
                  {s.icon}
                </div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider", s.title)}>
                  {sect.title}
                </h4>
              </div>

              {/* Body */}
              <div className={cn(
                "text-xs leading-relaxed font-semibold whitespace-pre-wrap",
                isQuote ? "text-indigo-900/90 italic pl-1 font-serif text-sm leading-normal" : "text-slate-600 pl-1"
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
   Markdown Parser Function
   ───────────────────────────────────────────────────────────────────────────── */
interface ParsedSection {
  title: string;
  body: string;
  icon: string;
  color: string;
}

function parseReportContent(content: string): ParsedSection[] {
  const sections = [
    { key: 'achievements', header: 'Daily Achievements Summary', icon: '🏆', color: 'emerald' },
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
        if (nextIndex !== -1) {
          endIndex = nextIndex;
        }
      }

      // Extract the block body
      const lineEndIndex = remainingText.indexOf('\n', currentIndex);
      const startOfBody = lineEndIndex !== -1 ? lineEndIndex + 1 : currentIndex + current.header.length;
      let bodyText = remainingText.substring(startOfBody, endIndex).trim();

      // Clean up markup indicators
      bodyText = bodyText.replace(/^\s*-\s*/, ''); // Remove leading dash
      bodyText = bodyText.replace(/\n\s*-\s*/g, '\n• '); // Convert sub-dashes to bullet unicode
      bodyText = bodyText.replace(/\n\s*•\s*/g, '\n• '); // Standardize bullets
      bodyText = bodyText.replace(/\*\*(.*?)\*\*/g, '$1'); // Clean bold markups if any

      result.push({
        title: current.header,
        body: bodyText,
        icon: current.icon,
        color: current.color
      });
    }
  }

  // Fallback if formatting was non-standard
  if (result.length === 0) {
    result.push({
      title: 'Daily Performance Report Summary',
      body: content.replace(/\*\*(.*?)\*\*/g, '$1'),
      icon: '📊',
      color: 'indigo'
    });
  }

  return result;
}
