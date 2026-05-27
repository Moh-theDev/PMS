import * as React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Calendar, FolderOpen, AlertCircle, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTaskStore } from '@/store/useTaskStore';
import { type Task, TaskStatus } from '@/types/index';
import * as taskService from '@/features/tasks/services/taskService';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const { categories, fetchCategories } = useTaskStore();
  
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  
  const inputRef = React.useRef<HTMLInputElement>(null);
  
  // Make sure categories are fetched and states reset on open
  React.useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setQuery('');
      setResults([]);
      setIsLoading(false);
      setSelectedIndex(0);
      
      // Auto focus with a small timeout to let the entrance animation complete
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchCategories]);
  
  // Debounce search API calls
  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const tasks = await taskService.searchTasks(query.trim());
        setResults(tasks || []);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Failed to search tasks', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200); // 200ms debounce
    
    return () => clearTimeout(delayDebounceFn);
  }, [query]);
  
  const handleSelectTask = React.useCallback((task: Task) => {
    onClose();
    navigate(`/tasks/inbox?taskId=${task.id}`);
  }, [navigate, onClose]);
  
  // Handle Keyboard events
  React.useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelectTask(results[selectedIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, handleSelectTask]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[12vh]">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        {/* Modal content container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          className="relative w-full max-w-2xl bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xl z-10 font-sans flex flex-col max-h-[500px]"
        >
          {/* Header Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <Search className="h-5 w-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks by title..."
              className="flex-1 bg-transparent border-0 outline-none text-base text-slate-800 placeholder:text-slate-400 focus:ring-0 focus:outline-none p-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 bg-white text-slate-400 border border-slate-200/70 rounded shadow-sm">
                ESC
              </span>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-xs font-semibold">Searching your tasks...</span>
              </div>
            ) : query.trim() === '' ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 text-slate-400 select-none">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-500 shadow-sm">
                  <Search className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">Quick Search</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                  Type task keywords to search in real time. Use arrow keys to navigate and enter to select.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-6 text-slate-400 select-none">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No tasks found</h4>
                <p className="text-xs text-slate-400 mt-1">
                  We couldn't find any tasks matching <span className="font-semibold text-slate-600">"{query}"</span>
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="px-3 py-1.5 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Search Results ({results.length})
                  </span>
                </div>
                {results.map((task, index) => {
                  const isCompleted = task.status === TaskStatus.Done;
                  const category = categories.find((c) => c.id === task.categoryId);
                  const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : null;
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all border border-transparent',
                        isSelected
                          ? 'bg-slate-50 border-slate-100 shadow-sm'
                          : 'hover:bg-slate-50/50'
                      )}
                    >
                      {/* Custom Checkbox accent */}
                      <div
                        className={cn(
                          'h-4 w-4 rounded shrink-0 flex items-center justify-center transition-all border',
                          task.priority >= 8 
                            ? 'border-red-400' + (isCompleted ? ' bg-red-500 border-red-500 text-white' : '')
                            : task.priority > 4 
                              ? 'border-amber-400' + (isCompleted ? ' bg-amber-500 border-amber-500 text-white' : '')
                              : 'border-slate-300' + (isCompleted ? ' bg-slate-500 border-slate-500 text-white' : '')
                        )}
                      >
                        {isCompleted && (
                          <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24">
                            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Category dot indicator if categoryColor is present */}
                      {categoryColor && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0 ring-1 ring-white"
                          style={{ backgroundColor: categoryColor }}
                        />
                      )}
                      
                      {/* Title */}
                      <span
                        className={cn(
                          'flex-1 text-sm font-semibold truncate text-slate-700 transition-colors',
                          isSelected && 'text-slate-900',
                          isCompleted && 'line-through text-slate-400 group-hover:text-slate-400'
                        )}
                      >
                        {task.title}
                      </span>
                      
                      {/* Category Badge & Deadline */}
                      <div className="flex items-center gap-2 shrink-0">
                        {category && (
                          <span
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ backgroundColor: `${categoryColor}15`, color: categoryColor ?? '#64748b' }}
                          >
                            <FolderOpen className="h-2.5 w-2.5" />
                            {category.name}
                          </span>
                        )}
                        
                        {task.deadline && !task.deadline.startsWith('0001-01-01') && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200/40">
                            <Calendar className="h-3 w-3 text-slate-400/80" />
                            {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        
                        {/* Select hint action */}
                        {isSelected && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded px-1 py-0.5 shadow-sm animate-in fade-in duration-200">
                            <span>Select</span>
                            <CornerDownLeft className="h-2.5 w-2.5 text-slate-400" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Footer Shortcuts hint */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 font-bold flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-xs">↑↓</span> Navigate
              </span>
              <span className="flex items-center gap-1">
                <span className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-xs">↵</span> Select
              </span>
            </div>
            <span>Press <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded shadow-xs">ESC</kbd> to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
