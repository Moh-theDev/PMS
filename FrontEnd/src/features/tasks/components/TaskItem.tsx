import { useNavigate } from 'react-router-dom';
import { Clock, FolderOpen, X, Check, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { type Task, type Category, type Tag, TaskStatus } from '@/types/index';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  onToggle: (checked: boolean) => void;
  isOverdue?: boolean;
  categories?: Category[];
  tags?: Tag[];
  onRemoveTag?: (taskId: number, tagId: number) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
  isSortable?: boolean;
}

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

export function TaskItem({ task, isSelected, onClick, onToggle, isOverdue, categories, tags, onRemoveTag, onContextMenu, isSortable }: TaskItemProps) {
  const navigate = useNavigate();
  const isCompleted = task.status === TaskStatus.Done;
  const isCancelled = task.status === TaskStatus.Cancelled;
  const isClosed = isCompleted || isCancelled;
  const category = categories?.find((c) => c.id === task.categoryId);
  const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : null;

  const badgeText = (() => {
    if (isCompleted) return 'Done';
    if (isCancelled) return 'Cancelled';
    if (isOverdue) return 'Overdue';
    if (task.deadline && !task.deadline.startsWith('0001-01-01')) {
      return new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return null;
  })();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isSortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer bg-card border transition-all',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm dark:shadow-none'
          : 'border-border hover:border-border hover:shadow-sm dark:shadow-none',
        isClosed && 'opacity-55',
        isDragging && 'shadow-lg border-blue-500 ring-2 ring-blue-500/20'
      )}
      onClick={onClick}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, task);
        }
      }}
    >
      {/* Drag Handle */}
      {isSortable && (
        <div 
          className="w-4 shrink-0 flex justify-center items-center cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Checkbox */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isClosed}
          onCheckedChange={(val) => onToggle(val === true)}
          icon={isCancelled ? <X className="h-3 w-3 stroke-3" /> : <Check className="h-3.5 w-3.5" />}
          className={cn(
            'h-4 w-4 rounded transition-all',
            task.priority >= 8 
              ? 'border-red-500 hover:border-red-600 focus-visible:ring-red-500/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
              : task.priority > 4 
                ? 'border-amber-500 hover:border-amber-600 focus-visible:ring-amber-500/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500'
                : 'border-border hover:border-border focus-visible:ring-slate-500/20 data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500'
          )}
        />
      </div>

      {/* Category color dot */}
      {categoryColor && (
        <span
          className="h-2 w-2 rounded-full shrink-0 ring-1 ring-white"
          style={{ backgroundColor: categoryColor }}
          title={category?.name}
        />
      )}

      {/* Title */}
      <span
        className={cn(
          'flex-1 text-sm font-medium truncate text-foreground',
          isClosed && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </span>

      {/* Right side metadata */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Category label — shown on wider layout */}
        {category && (
          <span
            className="hidden md:flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: `${categoryColor}18`, color: categoryColor ?? '#64748b' }}
          >
            <FolderOpen className="h-2.5 w-2.5" />
            {category.name}
          </span>
        )}

        {/* Tag pills */}
        {task.tags && task.tags.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            {task.tags.slice(0, 2).map((tagName: string) => {
              const tagObj = tags?.find((tg) => tg.name === tagName);
              return (
                <span
                  key={tagName}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (tagObj) {
                      navigate(`/tasks/tag/${tagObj.id}`);
                    }
                  }}
                  className="group/tag inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-0.5 rounded border border-border cursor-pointer transition-all select-none"
                >
                  #{tagName}
                  {onRemoveTag && tagObj && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemoveTag(task.id, tagObj.id);
                      }}
                      className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 p-0.5 rounded transition-colors shrink-0"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
              );
            })}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-muted-foreground font-bold">+{task.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Status / date badge */}
        {badgeText && (
          <Badge
            variant={isOverdue ? 'destructive' : 'secondary'}
            className={cn(
              'h-5 px-2 text-[10px] font-semibold rounded-md gap-1',
              isCompleted && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20',
              isCancelled && 'bg-rose-500/20 text-rose-600 dark:text-rose-600 hover:bg-rose-500/20',
              !isOverdue && !isClosed && 'bg-muted text-muted-foreground'
            )}
          >
            {isOverdue && <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />}
            {isCompleted && (
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isCancelled && (
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {!isOverdue && !isClosed && <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
            {badgeText}
          </Badge>
        )}
      </div>
    </div>
  );
}
