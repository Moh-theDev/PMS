import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flag, 
  Calendar, 
  Tag as TagIcon, 
  FolderOpen, 
  Check, 
  Trash2, 
  ChevronRight,
  XCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Task, type Category, type Tag, TaskStatus, type UpdateTaskDto } from '@/types/index';

interface TaskContextMenuProps {
  x: number;
  y: number;
  task: Task;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];
  onUpdateTask: (id: number, updates: UpdateTaskDto) => void;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  onAssignTags: (taskId: number, tagIds: number[]) => void;
  onRemoveTag: (taskId: number, tagId: number) => void;
  onDelete: (id: number) => void;
}

export function TaskContextMenu({
  x,
  y,
  task,
  onClose,
  categories,
  tags,
  onUpdateTask,
  onUpdateStatus,
  onAssignTags,
  onRemoveTag,
  onDelete
}: TaskContextMenuProps) {
  const navigate = useNavigate();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = React.useState<'priority' | 'date' | 'list' | 'tags' | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Screen overflow adjustments
  const [adjustedCoords, setAdjustedCoords] = React.useState({ left: x, top: y });
  React.useLayoutEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let left = x;
      let top = y;
      if (x + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width - 8;
      }
      if (y + rect.height > window.innerHeight) {
        top = window.innerHeight - rect.height - 8;
      }
      setAdjustedCoords({ left, top });
    }
  }, [x, y]);

  // Priority handler
  const handlePrioritySelect = (p: number) => {
    onUpdateTask(task.id, { priority: p });
    onClose();
  };

  // Date handlers
  const handleDateSelect = (type: 'today' | 'tomorrow' | 'week') => {
    const today = new Date();
    today.setHours(17, 0, 0, 0); // Default to 5 PM
    let targetDate = today;

    if (type === 'tomorrow') {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (type === 'week') {
      targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 7);
    }

    onUpdateTask(task.id, { deadline: targetDate.toISOString() });
    onClose();
  };

  // List (Category) handler
  const handleCategorySelect = (categoryId?: number) => {
    onUpdateTask(task.id, { categoryId });
    onClose();
  };

  // Tag handler
  const handleTagToggle = (tag: Tag) => {
    const isAssigned = task.tags?.includes(tag.name);
    if (isAssigned) {
      onRemoveTag(task.id, tag.id);
    } else {
      onAssignTags(task.id, [tag.id]);
    }
    // Don't close menu immediately, allow multiple tag toggles
  };

  // Focus Mode starter
  const handleStartFocus = () => {
    localStorage.setItem('pms_selected_focus_task_id', String(task.id));
    navigate('/focus');
    onClose();
  };

  // Cancel toggler
  const handleToggleCancel = () => {
    const isCancelled = task.status === TaskStatus.Cancelled;
    onUpdateStatus(task.id, isCancelled ? TaskStatus.Todo : TaskStatus.Cancelled);
    onClose();
  };

  const isCancelled = task.status === TaskStatus.Cancelled;

  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] bg-white border border-slate-200/80 shadow-2xl rounded-2xl py-1.5 min-w-[200px] text-xs font-bold text-slate-700 animate-in fade-in slide-in-from-top-1 duration-150 select-none cursor-default"
      style={{
        left: `${adjustedCoords.left}px`,
        top: `${adjustedCoords.top}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Priority Submenu */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu('priority')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          type="button"
          className={cn(
            "w-full text-left px-3.5 py-2 hover:bg-slate-100/80 hover:text-slate-900 flex items-center justify-between transition-colors",
            activeSubmenu === 'priority' && "bg-slate-100/80 text-slate-900"
          )}
        >
          <span className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-slate-400" />
            Set Priority
          </span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
        </button>

        {activeSubmenu === 'priority' && (
          <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 min-w-[120px] z-50">
            <button
              onClick={() => handlePrioritySelect(10)}
              className="w-full text-left px-3 py-1.5 hover:bg-red-50 hover:text-red-600 flex items-center justify-between"
            >
              <span>High</span>
              {task.priority >= 8 && <Check className="h-3 w-3 text-red-500" />}
            </button>
            <button
              onClick={() => handlePrioritySelect(6)}
              className="w-full text-left px-3 py-1.5 hover:bg-amber-50 hover:text-amber-600 flex items-center justify-between"
            >
              <span>Medium</span>
              {task.priority > 4 && task.priority < 8 && <Check className="h-3 w-3 text-amber-500" />}
            </button>
            <button
              onClick={() => handlePrioritySelect(3)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 hover:text-slate-600 flex items-center justify-between"
            >
              <span>Low</span>
              {task.priority <= 4 && <Check className="h-3 w-3 text-slate-500" />}
            </button>
          </div>
        )}
      </div>

      {/* 2. Date Submenu */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu('date')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          type="button"
          className={cn(
            "w-full text-left px-3.5 py-2 hover:bg-slate-100/80 hover:text-slate-900 flex items-center justify-between transition-colors",
            activeSubmenu === 'date' && "bg-slate-100/80 text-slate-900"
          )}
        >
          <span className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            Set Date
          </span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
        </button>

        {activeSubmenu === 'date' && (
          <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 min-w-[130px] z-50">
            <button
              onClick={() => handleDateSelect('today')}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
            >
              Today
            </button>
            <button
              onClick={() => handleDateSelect('tomorrow')}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
            >
              Tomorrow
            </button>
            <button
              onClick={() => handleDateSelect('week')}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50"
            >
              Next Week
            </button>
            <div className="border-t border-slate-100 my-1" />
            <button
              onClick={() => {
                // Focus task to open Detail Panel (Custom option)
                onUpdateTask(task.id, {});
                onClose();
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-400 italic"
            >
              Custom picker...
            </button>
          </div>
        )}
      </div>

      {/* 3. List Submenu */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu('list')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          type="button"
          className={cn(
            "w-full text-left px-3.5 py-2 hover:bg-slate-100/80 hover:text-slate-900 flex items-center justify-between transition-colors",
            activeSubmenu === 'list' && "bg-slate-100/80 text-slate-900"
          )}
        >
          <span className="flex items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5 text-slate-400" />
            Move to List
          </span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
        </button>

        {activeSubmenu === 'list' && (
          <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 min-w-[160px] max-h-56 overflow-y-auto z-50">
            <button
              onClick={() => handleCategorySelect(undefined)}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
            >
              <span>Inbox (No List)</span>
              {!task.categoryId && <Check className="h-3 w-3 text-blue-500" />}
            </button>
            <div className="border-t border-slate-100 my-1" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="truncate">{cat.name}</span>
                </span>
                {task.categoryId === cat.id && <Check className="h-3 w-3 text-blue-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Tags Submenu */}
      <div 
        className="relative"
        onMouseEnter={() => setActiveSubmenu('tags')}
        onMouseLeave={() => setActiveSubmenu(null)}
      >
        <button
          type="button"
          className={cn(
            "w-full text-left px-3.5 py-2 hover:bg-slate-100/80 hover:text-slate-900 flex items-center justify-between transition-colors",
            activeSubmenu === 'tags' && "bg-slate-100/80 text-slate-900"
          )}
        >
          <span className="flex items-center gap-2">
            <TagIcon className="h-3.5 w-3.5 text-slate-400" />
            Assign Tags
          </span>
          <ChevronRight className="h-3 w-3 text-slate-400" />
        </button>

        {activeSubmenu === 'tags' && (
          <div className="absolute left-full top-0 ml-1 bg-white border border-slate-200/80 rounded-xl shadow-xl py-1 min-w-[150px] max-h-56 overflow-y-auto z-50">
            {tags.length === 0 ? (
              <span className="block px-3 py-1.5 text-slate-400 italic">No tags created</span>
            ) : (
              tags.map((tag) => {
                const isAssigned = task.tags?.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
                  >
                    <span>#{tag.name}</span>
                    {isAssigned && <Check className="h-3 w-3 text-blue-500" />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 my-1" />

      {/* 5. Start Focus Tracking */}
      <button
        type="button"
        onClick={handleStartFocus}
        className="w-full text-left px-3.5 py-2 hover:bg-slate-100/80 hover:text-slate-900 flex items-center gap-2 transition-colors text-blue-600"
      >
        <Play className="h-3.5 w-3.5 fill-blue-600 stroke-none" />
        Start Focus Mode
      </button>

      {/* 6. Cancel / Restore Task */}
      <button
        type="button"
        onClick={handleToggleCancel}
        className="w-full text-left px-3.5 py-2 hover:bg-slate-100/80 hover:text-slate-900 flex items-center gap-2 transition-colors"
      >
        {isCancelled ? (
          <>
            <RotateCcw className="h-3.5 w-3.5 text-emerald-500" />
            Restore Task
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            Cancel Task
          </>
        )}
      </button>

      <div className="border-t border-slate-100 my-1" />

      {/* 7. Delete Task */}
      <button
        type="button"
        onClick={() => {
          onDelete(task.id);
          onClose();
        }}
        className="w-full text-left px-3.5 py-2 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors text-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete Task
      </button>
    </div>
  );
}
