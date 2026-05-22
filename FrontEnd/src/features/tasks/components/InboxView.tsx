import * as React from 'react';
import { useParams } from 'react-router-dom';
import { Filter, ListFilter, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskStatus, type UpdateTaskDto } from '@/types/index';
import { TaskQuickCreate } from './TaskQuickCreate';
import { TaskList } from './TaskList';
import { TaskDetailPanel } from './TaskDetailPanel';
import { ResizableDivider } from './ResizableDivider';
import { ConflictResolutionModal } from './ConflictResolutionModal';

export function InboxView() {
  const { listId = 'inbox', tagId } = useParams();

  const {
    tasks,
    categories,
    tags,
    isLoading,
    fetchTasks,
    fetchCategories,
    fetchTags,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    resolveDelete,
    assignTags,
    removeTag,
    getTasksByList,
  } = useTaskStore();

  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  const panelRef = React.useRef<HTMLElement | null>(null);

  // Conflict modal state
  const [conflictModalOpen, setConflictModalOpen] = React.useState(false);
  const [conflictMessage, setConflictMessage] = React.useState('');
  const [conflictOptions, setConflictOptions] = React.useState<string[]>([]);
  const [conflictedTaskId, setConflictedTaskId] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchTags();
  }, [fetchTasks, fetchCategories, fetchTags]);

  // Filtered task list
  const currentTag = tags.find((t) => String(t.id) === tagId || t.name === tagId);
  const currentTasks = tagId
    ? tasks.filter((t) => currentTag && t.tags?.includes(currentTag.name))
    : getTasksByList(listId);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Group tasks
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = currentTasks.filter(
    (t) => t.status !== TaskStatus.Done && t.deadline && t.deadline.split('T')[0] < today
  );
  const activeTasks = currentTasks.filter(
    (t) =>
      t.status !== TaskStatus.Done &&
      (!t.deadline || t.deadline.split('T')[0] >= today)
  );
  const completedTasks = currentTasks.filter((t) => t.status === TaskStatus.Done);

  // View title
  const viewTitle = (() => {
    if (tagId) return currentTag ? `#${currentTag.name}` : 'Label';
    if (listId === 'inbox') return 'Inbox';
    if (listId === 'today') return "Today";
    if (listId === 'upcoming') return 'Upcoming';
    const cat = categories.find((c) => String(c.id) === listId);
    return cat ? cat.name : 'Tasks';
  })();

  const viewSubtitle = (() => {
    if (listId === 'today') return "Your tasks due today";
    if (listId === 'upcoming') return "Scheduled ahead";
    return "Capture and organise your work";
  })();

  // Handlers
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const categoryIdNum = !['inbox', 'today', 'upcoming'].includes(listId) ? Number(listId) : undefined;
    try {
      const createdTask = await addTask({ title: newTitle.trim(), durationInMinutes: 30, priority: 5, effortLevel: 3 }, categoryIdNum);
      if (tagId) {
        const activeTag = tags.find((t) => String(t.id) === tagId || t.name === tagId);
        if (activeTag) {
          await assignTags(createdTask.id, [activeTag.id]);
        }
      }
      setNewTitle('');
    } catch { /* handled in store */ }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const result = await deleteTask(id);
      if (result.hasScheduleConflict) {
        setConflictedTaskId(id);
        setConflictMessage(result.message || 'This task is scheduled. Choose how to resolve:');
        setConflictOptions(result.options || ['ClearSlot', 'Cancel']);
        setConflictModalOpen(true);
      } else if (selectedTaskId === id) {
        setSelectedTaskId(null);
      }
    } catch { /* handled in store */ }
  };

  const handleResolveDelete = async (option: string, newTaskId?: number) => {
    if (conflictedTaskId === null) return;
    await resolveDelete(conflictedTaskId, option, newTaskId);
    if (selectedTaskId === conflictedTaskId) setSelectedTaskId(null);
    setConflictedTaskId(null);
  };

  const handleUpdateTask = (id: number, updates: UpdateTaskDto) => {
    updateTask(id, updates);
  };

  return (
    <div className="flex h-full bg-slate-50/40 overflow-hidden">

      {/* ── Left pane ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="px-8 pt-7 pb-4 flex items-start justify-between shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 capitalize">{viewTitle}</h1>
            <p className="text-sm text-slate-400 mt-1 font-medium">{viewSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                <ListFilter className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-slate-200 text-slate-400">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Quick create */}
        <TaskQuickCreate value={newTitle} onChange={setNewTitle} onSubmit={handleQuickCreate} />

        {/* Task list */}
        <ScrollArea className="flex-1 px-8 pt-2">
          <div className="max-w-4xl mx-auto w-full pb-20">
            <TaskList
              overdueTasks={overdueTasks}
              activeTasks={activeTasks}
              completedTasks={completedTasks}
              categories={categories}
              tags={tags}
              onRemoveTag={removeTag}
              selectedTaskId={selectedTaskId}
              isLoading={isLoading}
              onSelectTask={setSelectedTaskId}
              onToggleStatus={(task, checked) =>
                updateTaskStatus(task.id, checked ? TaskStatus.Done : TaskStatus.Todo)
              }
            />
          </div>
        </ScrollArea>
      </div>

      {/* ── Draggable divider ─────────────────────── */}
      {selectedTask && (
        <ResizableDivider
          panelRef={panelRef}
          minWidth={280}
          maxWidth={720}
          onResizeEnd={() => { /* panelRef already has the width — nothing extra needed */ }}
        />
      )}

      {/* ── Right pane: Task detail ───────────────── */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          panelRef={panelRef}
          categories={categories}
          tags={tags}
          onClose={() => setSelectedTaskId(null)}
          onDelete={handleDeleteTask}
          onUpdateTask={handleUpdateTask}
          onUpdateStatus={updateTaskStatus}
          onAssignTags={assignTags}
          onRemoveTag={removeTag}
        />
      )}

      {/* Conflict modal */}
      <ConflictResolutionModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        message={conflictMessage}
        options={conflictOptions}
        tasks={tasks}
        onResolve={handleResolveDelete}
      />
    </div>
  );
}
