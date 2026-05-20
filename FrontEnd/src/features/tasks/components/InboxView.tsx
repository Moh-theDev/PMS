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
  ExternalLink,
  Trash2,
  X,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStore } from '@/store/useTaskStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { type Task } from '@/types/index';

export function InboxView() {
  const { listId = 'inbox' } = useParams();
  const { tasks, getTasksByList, updateTask } = useTaskStore();
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  
  const currentTasks = getTasksByList(listId);
  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex h-full bg-slate-50/50">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="px-10 py-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Inbox className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Workspace</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 capitalize">{listId.replace('-', ' ')}</h1>
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

        {/* Task Entry */}
        <div className="px-10 py-4">
          <div className="relative group">
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              placeholder="Press Enter to quickly capture a task..." 
              className="pl-12 h-14 bg-white border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-base shadow-sm rounded-xl"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 opacity-0 group-focus-within:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                <Calendar className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                <Flag className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-4" />
              <Button size="sm" className="h-8 px-3 text-xs font-bold bg-slate-900 hover:bg-slate-800">Save</Button>
            </div>
          </div>
        </div>

        {/* Task List */}
        <ScrollArea className="flex-1 px-10 pt-4">
          <div className="space-y-10 pb-20">
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900">Today's Focus</span>
                  <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 font-bold text-[10px] px-1.5 py-0">3</Badge>
                </div>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-blue-600 hover:bg-blue-50">View all</Button>
              </div>
              <div className="space-y-2">
                {currentTasks.filter(t => t.id !== '3').map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    isSelected={selectedTaskId === task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    onToggle={(checked) => updateTask(task.id, { status: checked ? 'done' : 'todo' })}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-1 bg-red-50 text-red-600 rounded-md">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-slate-900">Overdue Items</span>
              </div>
              <div className="space-y-2">
                {currentTasks.filter(t => t.id === '3').map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    isSelected={selectedTaskId === task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    onToggle={(checked) => updateTask(task.id, { status: checked ? 'done' : 'todo' })}
                    isOverdue
                  />
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </div>

      {/* Detail Panel */}
      {selectedTask && (
        <aside className="w-[450px] border-l bg-white flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3 text-slate-500">
              <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                <Inbox className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Task Definition</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-white border transparent hover:border-slate-200">
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-white border transparent hover:border-slate-200">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-white border transparent hover:border-slate-200" onClick={() => setSelectedTaskId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-8">
            <div className="space-y-10">
              <div className="flex items-start gap-5">
                <Checkbox 
                  checked={selectedTask.status === 'done'}
                  onCheckedChange={(checked) => updateTask(selectedTask.id, { status: checked ? 'done' : 'todo' })}
                  className="mt-1.5 h-7 w-7 rounded-lg border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">{selectedTask.title}</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <DetailRow icon={Circle} label="Status" value="In Progress" />
                <DetailRow icon={Calendar} label="Due Date" value={selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unscheduled'} />
                <DetailRow icon={Flag} label="Priority" value={selectedTask.priority} isPriority />
                <DetailRow icon={Clock} label="Focus Units" value="2 Blocks (50m)" />
                <div className="flex gap-4">
                  <div className="w-24 group flex items-center gap-2 shrink-0">
                    <TagIcon className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Labels</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map(tag => (
                      <Badge key={tag} className="bg-white text-slate-600 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-sm">
                        #{tag} <X className="h-2.5 w-2.5 ml-2 cursor-pointer text-slate-400 hover:text-slate-900" />
                      </Badge>
                    ))}
                    <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100">
                      <Plus className="h-3 w-3 mr-1.5" /> Add Label
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <ListFilter className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.1em]">Documentation</span>
                </div>
                <div className="p-1 bg-white border border-slate-100 rounded-xl focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/5 transition-all">
                  <textarea 
                    className="w-full min-h-[300px] bg-transparent border-none resize-none focus:ring-0 text-[15px] leading-relaxed text-slate-700 placeholder:text-slate-300 p-4 font-medium"
                    placeholder="Document technical requirements, links, and detailed notes..."
                    value={selectedTask.description}
                    onChange={(e) => updateTask(selectedTask.id, { description: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t flex items-center justify-between text-xs font-semibold text-slate-400 bg-slate-50/30">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span>Synced with local cloud</span>
            </div>
            <Button variant="link" className="h-auto p-0 text-xs font-bold text-blue-600 hover:text-blue-700">Audit History</Button>
          </div>
        </aside>
      )}
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
  isOverdue?: boolean,
  key?: React.Key
}) {
  return (
    <div 
      className={cn(
        "task-card group flex items-center gap-4 p-4 rounded-xl cursor-pointer bg-white border shadow-sm transition-all",
        isSelected && "border-blue-600 ring-4 ring-blue-600/5",
        !isSelected && "border-slate-100"
      )}
      onClick={onClick}
    >
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={task.status === 'done'} 
          onCheckedChange={onToggle}
          className="h-5 w-5 rounded-md border-2 border-slate-200 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-[15px] font-bold truncate text-slate-900",
            task.status === 'done' && "line-through text-slate-400"
          )}>
            {task.title}
          </span>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex gap-1.5">
               {task.tags.map(tag => (
                 <span key={tag} className="text-[10px] font-bold text-slate-400">#{tag}</span>
               ))}
             </div>
             <Badge variant={isOverdue ? "destructive" : "secondary"} className={cn(
               "h-7 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-bold border-transparent transition-colors shadow-sm",
               !isOverdue && "bg-slate-50 text-slate-600 hover:bg-slate-100"
             )}>
                {isOverdue ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-white opacity-80" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {isOverdue ? 'Overdue' : 'Today'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, isPriority }: { icon: any, label: string, value: string, isPriority?: boolean }) {
  return (
    <div className="flex items-center gap-6 group">
      <div className="w-24 flex items-center gap-2 shrink-0">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 px-3 py-2 rounded-xl transition-all">
        {isPriority && (
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: value === 'high' ? '#ef4444' : value === 'medium' ? '#f59e0b' : '#3b82f6' }} />
        )}
        <span className="text-sm font-bold capitalize text-slate-900">{value}</span>
      </div>
    </div>
  );
}
