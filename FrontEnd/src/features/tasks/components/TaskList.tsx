import { type ReactNode, useState } from 'react';
import { Clock, Calendar, Inbox as InboxIcon, ChevronRight } from 'lucide-react';
import { type Task, type Category, type Tag } from '@/types/index';
import { cn } from '@/lib/utils';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  overdueTasks: Task[];
  activeTasks: Task[];
  completedTasks: Task[];
  categories: Category[];
  tags: Tag[];
  onRemoveTag?: (taskId: number, tagId: number) => void;
  selectedTaskId: number | null;
  isLoading: boolean;
  onSelectTask: (id: number) => void;
  onToggleStatus: (task: Task, checked: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

interface SectionHeaderProps {
  icon: ReactNode;
  label: string;
  count: number;
  color: 'red' | 'blue' | 'green';
  isCollapsed: boolean;
  onToggle: () => void;
}

function SectionHeader({ icon, label, count, color, isCollapsed, onToggle }: SectionHeaderProps) {
  const colorMap = {
    red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-500/20 text-red-600 dark:text-red-400' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' },
    green: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' },
  };
  const c = colorMap[color];

  return (
    <div 
      className="flex items-center gap-2 mb-3 cursor-pointer select-none group/hdr hover:opacity-85 transition-opacity"
      onClick={onToggle}
    >
      <div className={`p-1 ${c.bg} ${c.text} rounded-md shrink-0`}>{icon}</div>
      <span className="text-xs font-bold text-foreground">{label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${c.badge} shrink-0`}>{count}</span>
      <ChevronRight 
        className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ml-auto mr-1",
          !isCollapsed && "rotate-90 text-muted-foreground"
        )}
      />
    </div>
  );
}

export function TaskList({
  overdueTasks,
  activeTasks,
  completedTasks,
  categories,
  tags,
  onRemoveTag,
  selectedTaskId,
  isLoading,
  onSelectTask,
  onToggleStatus,
  onContextMenu,
}: TaskListProps) {
  const totalTasks = overdueTasks.length + activeTasks.length + completedTasks.length;

  const [isOverdueCollapsed, setIsOverdueCollapsed] = useState(false);
  const [isActiveCollapsed, setIsActiveCollapsed] = useState(false);
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false);

  if (isLoading && totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Clock className="h-7 w-7 animate-spin" />
        <span className="text-sm font-medium">Loading tasks...</span>
      </div>
    );
  }

  if (totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-border rounded-xl bg-card/60 p-8">
        <InboxIcon className="h-10 w-10 text-slate-300 mb-3" />
        <span className="text-sm font-bold text-foreground">All clear</span>
        <span className="text-xs text-muted-foreground font-medium text-center mt-1 max-w-[240px]">
          No tasks in this view. Add one above to get started!
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <section>
          <SectionHeader
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Overdue"
            count={overdueTasks.length}
            color="red"
            isCollapsed={isOverdueCollapsed}
            onToggle={() => setIsOverdueCollapsed(!isOverdueCollapsed)}
          />
          {!isOverdueCollapsed && (
            <div className="space-y-1.5">
              {overdueTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  categories={categories}
                  tags={tags}
                  onRemoveTag={onRemoveTag}
                  isSelected={selectedTaskId === task.id}
                  onClick={() => onSelectTask(task.id)}
                  onToggle={(checked) => onToggleStatus(task, checked)}
                  onContextMenu={onContextMenu}
                  isOverdue
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Active */}
      {activeTasks.length > 0 && (
        <section>
          <SectionHeader
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Active"
            count={activeTasks.length}
            color="blue"
            isCollapsed={isActiveCollapsed}
            onToggle={() => setIsActiveCollapsed(!isActiveCollapsed)}
          />
          {!isActiveCollapsed && (
            <div className="space-y-1.5">
              {activeTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  categories={categories}
                  tags={tags}
                  onRemoveTag={onRemoveTag}
                  isSelected={selectedTaskId === task.id}
                  onClick={() => onSelectTask(task.id)}
                  onToggle={(checked) => onToggleStatus(task, checked)}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Completed & Cancelled */}
      {completedTasks.length > 0 && (
        <section>
          <SectionHeader
            icon={
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            label="Completed & Cancelled"
            count={completedTasks.length}
            color="green"
            isCollapsed={isCompletedCollapsed}
            onToggle={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
          />
          {!isCompletedCollapsed && (
            <div className="space-y-1.5">
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  categories={categories}
                  tags={tags}
                  onRemoveTag={onRemoveTag}
                  isSelected={selectedTaskId === task.id}
                  onClick={() => onSelectTask(task.id)}
                  onToggle={(checked) => onToggleStatus(task, checked)}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
