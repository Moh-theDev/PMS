import { useNavigate } from 'react-router-dom';
import { Clock, FolderOpen, X } from 'lucide-react';
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
}

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
];

export function TaskItem({ task, isSelected, onClick, onToggle, isOverdue, categories, tags, onRemoveTag }: TaskItemProps) {
  const navigate = useNavigate();
  const isCompleted = task.status === TaskStatus.Done;
  const category = categories?.find((c) => c.id === task.categoryId);
  const categoryColor = category ? CATEGORY_COLORS[category.id % CATEGORY_COLORS.length] : null;

  const badgeText = (() => {
    if (isCompleted) return 'Done';
    if (isOverdue) return 'Overdue';
    if (task.deadline) {
      return new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return null;
  })();

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3.5 py-2.5 rounded-lg cursor-pointer bg-white border transition-all',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
          : 'border-slate-100 hover:border-slate-200 hover:shadow-sm',
        isCompleted && 'opacity-55'
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(val) => onToggle(val === true)}
          className={cn(
            'h-4 w-4 rounded transition-all',
            task.priority >= 8 
              ? 'border-red-500 hover:border-red-600 focus-visible:ring-red-500/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
              : task.priority > 4 
                ? 'border-amber-500 hover:border-amber-600 focus-visible:ring-amber-500/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500'
                : 'border-slate-300 hover:border-slate-400 focus-visible:ring-slate-500/20 data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500'
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
          'flex-1 text-sm font-medium truncate text-slate-800',
          isCompleted && 'line-through text-slate-400'
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
                  className="group/tag inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200/80 px-2 py-0.5 rounded border border-slate-200/50 cursor-pointer transition-all select-none"
                >
                  #{tagName}
                  {onRemoveTag && tagObj && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemoveTag(task.id, tagObj.id);
                      }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-0.5 rounded transition-colors shrink-0"
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </span>
              );
            })}
            {task.tags.length > 2 && (
              <span className="text-[10px] text-slate-400 font-bold">+{task.tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Status / date badge */}
        {badgeText && (
          <Badge
            variant={isOverdue ? 'destructive' : 'secondary'}
            className={cn(
              'h-5 px-2 text-[10px] font-semibold rounded-md gap-1',
              isCompleted && 'bg-emerald-100 text-emerald-600 hover:bg-emerald-100',
              !isOverdue && !isCompleted && 'bg-slate-100 text-slate-500'
            )}
          >
            {isOverdue && <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />}
            {isCompleted && (
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {!isOverdue && !isCompleted && <Clock className="h-2.5 w-2.5 text-slate-400" />}
            {badgeText}
          </Badge>
        )}
      </div>
    </div>
  );
}
