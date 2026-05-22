import * as React from 'react';
import { useParams } from 'react-router-dom';
import { 
  MoreHorizontal, 
  Filter, 
  ListFilter, 
  Calendar, 
  Plus, 
  Circle,
  Flag,
  Tag as TagIcon,
  Clock,
  Trash2,
  X,
  Inbox,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { type Task, TaskStatus } from '@/types/index';
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
    getTasksByList 
  } = useTaskStore();

  const [selectedTaskId, setSelectedTaskId] = React.useState<number | null>(null);
  const [newTitle, setNewTitle] = React.useState('');
  
  // Drag to Resize Details Panel State
  const [detailsWidth, setDetailsWidth] = React.useState(450);
  const dividerRef = React.useRef<HTMLDivElement>(null);

  // Conflict Resolution Modal State
  const [conflictModalOpen, setConflictModalOpen] = React.useState(false);
  const [conflictMessage, setConflictMessage] = React.useState('');
  const [conflictOptions, setConflictOptions] = React.useState<string[]>([]);
  const [conflictedTaskId, setConflictedTaskId] = React.useState<number | null>(null);

  // Initial Fetch on load
  React.useEffect(() => {
    fetchTasks();
    fetchCategories();
    fetchTags();
  }, [fetchTasks, fetchCategories, fetchTags]);

  const currentTag = tags.find(t => String(t.id) === tagId || t.name === tagId);
  const currentTasks = tagId 
    ? tasks.filter(t => currentTag && t.tags?.includes(currentTag.name)) 
    : getTasksByList(listId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  // Divider Mouse Drag Handlers
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = detailsWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Subtract deltaX because panel is on the right side
      const newWidth = Math.max(320, Math.min(750, startWidth - deltaX));
      setDetailsWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [detailsWidth]);

  // Quick Task Creation
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Check if listId represents a categoryId
    const categoryIdNum = !['inbox', 'today', 'upcoming'].includes(listId) ? Number(listId) : undefined;
    
    try {
      await addTask({
        title: newTitle.trim(),
        durationInMinutes: 30, // Default duration
        priority: 5,
        effortLevel: 3,
      }, categoryIdNum);
      setNewTitle('');
    } catch (err) {
      // handled in store
    }
  };

  // Task Deletion with Conflict checking
  const handleDeleteTask = async (id: number) => {
    try {
      const result = await deleteTask(id);
      if (result.hasScheduleConflict) {
        setConflictedTaskId(id);
        setConflictMessage(result.message || 'This task is currently scheduled. Deleting it will cause conflicts.');
        setConflictOptions(result.options || ['ClearSlot', 'Cancel']);
        setConflictModalOpen(true);
      } else {
        if (selectedTaskId === id) {
          setSelectedTaskId(null);
        }
      }
    } catch (err) {
      // error handled in store
    }
  };

  // Resolve Deletion Conflict
  const handleResolveDelete = async (option: string, newTaskId?: number) => {
    if (conflictedTaskId === null) return;
    await resolveDelete(conflictedTaskId, option, newTaskId);
    if (selectedTaskId === conflictedTaskId) {
      setSelectedTaskId(null);
    }
    setConflictedTaskId(null);
  };

  // Helper to determine list view heading
  const getViewTitle = () => {
    if (tagId) {
      const currentTag = tags.find(t => String(t.id) === tagId || t.name === tagId);
      return currentTag ? `Label: #${currentTag.name}` : 'Tag View';
    }
    if (listId === 'inbox') return 'Inbox Workspace';
    if (listId === 'today') return "Today's Agenda";
    if (listId === 'upcoming') return 'Upcoming Schedule';
    
    const category = categories.find(c => String(c.id) === listId);
    if (category) return category.name;

    return 'Tasks';
  };

  // Group tasks
  const todayStr = new Date().toISOString().split('T')[0];
  
  const overdueTasks = currentTasks.filter(t => {
    if (t.status === TaskStatus.Done) return false;
    const deadline = t.deadline?.split('T')[0];
    return deadline && deadline < todayStr;
  });

  const activeTasks = currentTasks.filter(t => {
    if (t.status === TaskStatus.Done) return false;
    const deadline = t.deadline?.split('T')[0];
    return !deadline || deadline >= todayStr;
  });

  const completedTasks = currentTasks.filter(t => t.status === TaskStatus.Done);

  return (
    <div className="flex h-full bg-slate-50/50 select-none">
      
      {/* Left Pane: Task list */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="px-10 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 capitalize">{getViewTitle()}</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Systematically track and organize your incoming objectives.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg border p-1 shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                <ListFilter className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 text-slate-400 bg-white border-slate-200">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Task Entry Form */}
        <div className="px-10 py-4 w-full">
          <form onSubmit={handleQuickCreate} className="max-w-4xl mx-auto w-full relative">
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Press Enter to quickly capture a task..." 
              className="pl-12 pr-20 h-14 bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-base shadow-sm rounded-xl"
            />
            {newTitle.trim() && (
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                Save
              </button>
            )}
          </form>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1 px-10 pt-4">
          <div className="max-w-4xl mx-auto w-full space-y-10 pb-20">
            {isLoading && tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Clock className="h-8 w-8 animate-spin" />
                <span className="text-sm font-medium">Loading tasks from cloud...</span>
              </div>
            ) : currentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white p-8">
                <Inbox className="h-12 w-12 text-slate-300 mb-3" />
                <span className="text-sm font-bold text-slate-800">Clear Workspace</span>
                <span className="text-xs text-slate-500 font-semibold text-center mt-1">No tasks currently assigned to this list view. Try adding a new task!</span>
              </div>
            ) : null}

            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1 bg-red-50 text-red-600 rounded-md">
                    <Clock className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Overdue Items</span>
                  <Badge variant="destructive" className="font-bold text-[10px] px-1.5 py-0">{overdueTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {overdueTasks.map((task) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      isSelected={selectedTaskId === task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      onToggle={(checked) => updateTaskStatus(task.id, checked ? TaskStatus.Done : TaskStatus.Todo)}
                      isOverdue
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Active/Focus Section */}
            {activeTasks.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Active Tasks</span>
                    <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 font-bold text-[10px] px-1.5 py-0">{activeTasks.length}</Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {activeTasks.map((task) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      isSelected={selectedTaskId === task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      onToggle={(checked) => updateTaskStatus(task.id, checked ? TaskStatus.Done : TaskStatus.Todo)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Section */}
            {completedTasks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
                    <CheckIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Completed Objectives</span>
                  <Badge variant="secondary" className="bg-emerald-100/50 text-emerald-600 font-bold text-[10px] px-1.5 py-0">{completedTasks.length}</Badge>
                </div>
                <div className="space-y-2 opacity-70">
                  {completedTasks.map((task) => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      isSelected={selectedTaskId === task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      onToggle={(checked) => updateTaskStatus(task.id, checked ? TaskStatus.Done : TaskStatus.Todo)}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* Draggable Divider (Rendered only when task is selected) */}
      {selectedTask && (
        <div 
          ref={dividerRef}
          onMouseDown={handleMouseDown}
          className="w-1.5 cursor-col-resize hover:bg-blue-500 bg-slate-200/80 transition-all select-none self-stretch z-10 shrink-0"
        />
      )}

      {/* Right Pane: Task details resizable split pane */}
      {selectedTask && (
        <aside 
          className="border-l bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl shrink-0 overflow-hidden"
          style={{ width: `${detailsWidth}px` }}
        >
          {/* Details Pane Header */}
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                <Inbox className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Task Definition</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleDeleteTask(selectedTask.id)}
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-white border transparent hover:border-slate-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-white border transparent hover:border-slate-200" 
                onClick={() => setSelectedTaskId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Details Scroll Content */}
          <ScrollArea className="flex-1 p-8">
            <div className="space-y-8 pb-10">
              
              {/* Title Header */}
              <div className="flex items-start gap-4">
                <Checkbox 
                  checked={selectedTask.status === TaskStatus.Done}
                  onCheckedChange={(checked) => updateTaskStatus(selectedTask.id, checked ? TaskStatus.Done : TaskStatus.Todo)}
                  className="mt-2 h-7 w-7 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
                />
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) => updateTask(selectedTask.id, { title: e.target.value })}
                  className="text-2xl font-bold tracking-tight text-slate-900 leading-tight bg-transparent border-none outline-none focus:ring-0 w-full p-0"
                />
              </div>

              {/* Attributes Form Details */}
              <div className="grid grid-cols-1 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                
                {/* Status Selection */}
                <DetailRow icon={Circle} label="Status">
                  <select
                    value={selectedTask.status}
                    onChange={(e) => updateTaskStatus(selectedTask.id, Number(e.target.value) as TaskStatus)}
                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-900 cursor-pointer p-0"
                  >
                    <option value={TaskStatus.Todo}>To Do</option>
                    <option value={TaskStatus.InProgress}>In Progress</option>
                    <option value={TaskStatus.Done}>Completed</option>
                    <option value={TaskStatus.Cancelled}>Cancelled</option>
                    <option value={TaskStatus.Paused}>Paused</option>
                  </select>
                </DetailRow>

                {/* Duration In Minutes */}
                <DetailRow icon={Clock} label="Duration">
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="number"
                      min={1}
                      value={selectedTask.durationInMinutes}
                      onChange={(e) => updateTask(selectedTask.id, { durationInMinutes: Number(e.target.value) || 30 })}
                      className="w-16 bg-transparent border-none outline-none text-sm font-bold text-slate-900 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Minutes</span>
                  </div>
                </DetailRow>

                {/* Priority Selection */}
                <DetailRow icon={Flag} label="Priority">
                  <div className="flex items-center gap-3 w-full">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={selectedTask.priority}
                      onChange={(e) => updateTask(selectedTask.id, { priority: Number(e.target.value) })}
                      className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
                    />
                    <span className="text-sm font-bold text-slate-900 shrink-0 w-6 text-right">
                      {selectedTask.priority}
                    </span>
                  </div>
                </DetailRow>

                {/* Effort Level Selection */}
                <DetailRow icon={Flag} label="Effort Level">
                  <select
                    value={selectedTask.effortLevel}
                    onChange={(e) => updateTask(selectedTask.id, { effortLevel: Number(e.target.value) })}
                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-900 cursor-pointer p-0"
                  >
                    <option value={1}>1 - Low Effort</option>
                    <option value={2}>2 - Moderately Low</option>
                    <option value={3}>3 - Medium Effort</option>
                    <option value={4}>4 - High Effort</option>
                    <option value={5}>5 - Maximum Effort</option>
                  </select>
                </DetailRow>

                {/* Category Selection */}
                <DetailRow icon={FolderOpen} label="Category">
                  <select
                    value={selectedTask.categoryId || ''}
                    onChange={(e) => updateTask(selectedTask.id, { categoryId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-slate-900 cursor-pointer p-0"
                  >
                    <option value="">No Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </DetailRow>

                <Separator className="bg-slate-200/50 my-1" />

                {/* Earliest Start Date Constraint */}
                <DetailRow icon={Calendar} label="Earliest Start">
                  <input
                    type="datetime-local"
                    value={selectedTask.earliestStart ? selectedTask.earliestStart.slice(0, 16) : ''}
                    onChange={(e) => updateTask(selectedTask.id, { earliestStart: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 cursor-pointer p-0"
                  />
                </DetailRow>

                {/* Latest End Date Constraint */}
                <DetailRow icon={Calendar} label="Latest End">
                  <input
                    type="datetime-local"
                    value={selectedTask.latestEnd ? selectedTask.latestEnd.slice(0, 16) : ''}
                    onChange={(e) => updateTask(selectedTask.id, { latestEnd: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 cursor-pointer p-0"
                  />
                </DetailRow>

                {/* Deadline Constraint */}
                <DetailRow icon={Calendar} label="Deadline">
                  <input
                    type="datetime-local"
                    value={selectedTask.deadline ? selectedTask.deadline.slice(0, 16) : ''}
                    onChange={(e) => updateTask(selectedTask.id, { deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-900 cursor-pointer p-0"
                  />
                </DetailRow>

                {/* Labels/Tags Row */}
                <div className="flex gap-4 items-start pt-2 border-t border-slate-200/50">
                  <div className="w-24 group flex items-center gap-2 shrink-0 mt-2">
                    <TagIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Labels</span>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                    {selectedTask.tags && selectedTask.tags.map((tag: string) => (
                      <Badge key={tag} className="bg-white text-slate-600 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-sm flex items-center gap-1.5">
                        #{tag} 
                        <X 
                          onClick={() => {
                            const foundTag = tags.find(tg => tg.name === tag);
                            if (foundTag) removeTag(selectedTask.id, foundTag.id);
                          }}
                          className="h-3 w-3 cursor-pointer text-slate-400 hover:text-slate-900" 
                        />
                      </Badge>
                    ))}
                    
                    {/* Add label option */}
                    <div className="relative group/tag">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignTags(selectedTask.id, [Number(e.target.value)]);
                            e.target.value = '';
                          }
                        }}
                        className="h-7 px-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 outline-none cursor-pointer"
                      >
                        <option value="">+ Add Tag</option>
                        {tags.filter(t => !selectedTask.tags?.includes(t.name)).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Description */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <ListFilter className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Description</span>
                </div>
                <div className="p-1 bg-white border border-slate-100 rounded-xl focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/5 transition-all shadow-sm">
                  <textarea 
                    className="w-full min-h-55 bg-transparent border-none resize-none focus:ring-0 text-[15px] leading-relaxed text-slate-700 placeholder:text-slate-300 p-4 font-medium outline-none"
                    placeholder="Document technical requirements, links, and detailed notes..."
                    value={selectedTask.description || ''}
                    onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                  />
                </div>
              </div>

            </div>
          </ScrollArea>
          
          <div className="p-6 border-t flex items-center justify-between text-xs font-semibold text-slate-400 bg-slate-50/30 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>Synced with cloud database</span>
            </div>
          </div>
        </aside>
      )}

      {/* Conflict Resolution Dialog Portal */}
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

function TaskItem({ 
  task, 
  isSelected, 
  onClick, 
  onToggle,
  isOverdue 
}: { 
  task: Task, 
  isSelected: boolean, 
  onClick: () => void,
  onToggle: (checked: boolean) => void,
  isOverdue?: boolean
}) {
  const isCompleted = task.status === TaskStatus.Done;
  
  // Format dates elegantly
  const getTaskBadgeText = () => {
    if (isCompleted) return 'Completed';
    if (isOverdue) return 'Overdue';
    if (task.deadline) {
      return new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return 'Active';
  };

  return (
    <div 
      className={cn(
        "task-card group flex items-center gap-4 p-4 rounded-xl cursor-pointer bg-white border shadow-sm transition-all hover:shadow hover:border-slate-200",
        isSelected && "border-blue-600 ring-4 ring-blue-600/5",
        !isSelected && "border-slate-100"
      )}
      onClick={onClick}
    >
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isCompleted} 
          onCheckedChange={onToggle}
          className="h-5 w-5 rounded-md border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <span className={cn(
            "text-[15px] font-bold truncate text-slate-900",
            isCompleted && "line-through text-slate-400 font-medium"
          )}>
            {task.title}
          </span>
          <div className="flex items-center gap-3 shrink-0">
             <div className="hidden sm:flex gap-1.5">
               {task.tags && task.tags.map((tag: string) => (
                 <span key={tag} className="text-[10px] font-bold text-slate-400">#{tag}</span>
               ))}
             </div>
             <Badge 
              variant={isOverdue ? "destructive" : isCompleted ? "secondary" : "outline"} 
              className={cn(
                "h-7 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-bold border-transparent transition-colors shadow-sm",
                isCompleted && "bg-emerald-50 text-emerald-600 hover:bg-emerald-100/80",
                !isOverdue && !isCompleted && "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
             >
                {isOverdue && <div className="h-1.5 w-1.5 rounded-full bg-white opacity-80" />}
                {isCompleted && <CheckIcon className="h-3 w-3" />}
                {!isOverdue && !isCompleted && <Clock className="h-3 w-3 text-slate-400" />}
                {getTaskBadgeText()}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ 
  icon: Icon, 
  label, 
  children 
}: { 
  icon: any, 
  label: string, 
  children: React.ReactNode 
}) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-24 flex items-center gap-2 shrink-0">
        <Icon className="h-4 w-4 text-slate-400 animate-pulse" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 flex items-center bg-white hover:bg-slate-50 border border-slate-200/50 hover:border-slate-300 px-3.5 py-2.5 rounded-xl transition-all shadow-sm">
        {children}
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
