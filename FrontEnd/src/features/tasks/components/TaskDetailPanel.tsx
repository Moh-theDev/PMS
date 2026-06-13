import * as React from 'react';
import { Inbox, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Task, type TaskStatus } from '@/types/index';
import { type Category, type Tag, type UpdateTaskDto } from '@/types/index';
import { TaskDetailFields } from './TaskDetailFields';

interface TaskDetailPanelProps {
  task: Task;
  panelRef: React.RefObject<HTMLElement | null>;
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
  onDelete: (id: number) => void;
  onUpdateTask: (id: number, updates: UpdateTaskDto) => void;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  onAssignTags: (taskId: number, tagIds: number[]) => void;
  onRemoveTag: (taskId: number, tagId: number) => void;
}

export function TaskDetailPanel({
  task,
  panelRef,
  categories,
  tags,
  onClose,
  onDelete,
  onUpdateTask,
  onUpdateStatus,
  onAssignTags,
  onRemoveTag,
}: TaskDetailPanelProps) {
  return (
    <aside
      ref={panelRef as React.RefObject<HTMLElement>}
      className="border-l bg-card flex flex-col shrink-0 overflow-visible relative animate-in slide-in-from-right duration-200"
      style={{ width: '420px', willChange: 'width', minWidth: '400px', maxWidth: '750px' }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b flex items-center justify-between bg-muted/80 shrink-0">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center shadow-sm dark:shadow-none">
            <Inbox className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Task Details</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
            onClick={() => onDelete(task.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Scrollable fields */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          <TaskDetailFields
            task={task}
            panelRef={panelRef}
            categories={categories}
            tags={tags}
            onUpdateTask={onUpdateTask}
            onUpdateStatus={onUpdateStatus}
            onAssignTags={onAssignTags}
            onRemoveTag={onRemoveTag}
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t flex items-center gap-2 text-[11px] font-medium text-muted-foreground bg-muted/50 shrink-0">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Synced
      </div>
    </aside>
  );
}
