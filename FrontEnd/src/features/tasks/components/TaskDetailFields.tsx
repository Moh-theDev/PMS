import { Circle, Flag, Clock, Calendar, Tag as TagIcon, FolderOpen, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { type Task, type Category, type Tag, type UpdateTaskDto, TaskStatus } from '@/types/index';
import { DetailRow } from './DetailRow';

interface TaskDetailFieldsProps {
  task: Task;
  categories: Category[];
  tags: Tag[];
  onUpdateTask: (id: number, updates: UpdateTaskDto) => void;
  onUpdateStatus: (id: number, status: TaskStatus) => void;
  onAssignTags: (taskId: number, tagIds: number[]) => void;
  onRemoveTag: (taskId: number, tagId: number) => void;
}

export function TaskDetailFields({
  task,
  categories,
  tags,
  onUpdateTask,
  onUpdateStatus,
  onAssignTags,
  onRemoveTag,
}: TaskDetailFieldsProps) {
  return (
    <div className="space-y-8">

      {/* Title row */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === TaskStatus.Done}
          onCheckedChange={(val) =>
            onUpdateStatus(task.id, val === true ? TaskStatus.Done : TaskStatus.Todo)
          }
          className="mt-1 h-5 w-5 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0"
        />
        <input
          type="text"
          defaultValue={task.title}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== task.title) {
              onUpdateTask(task.id, { title: e.target.value.trim() });
            }
          }}
          className="flex-1 text-xl font-bold tracking-tight text-slate-900 leading-tight bg-transparent border-none outline-none focus:ring-0 p-0 resize-none"
        />
      </div>

      {/* Attribute rows */}
      <div className="grid grid-cols-1 gap-3 p-5 bg-slate-50 rounded-xl border border-slate-100">

        {/* Status */}
        <DetailRow icon={Circle} label="Status">
          <select
            value={task.status}
            onChange={(e) => onUpdateStatus(task.id, Number(e.target.value) as TaskStatus)}
            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 cursor-pointer p-0"
          >
            <option value={TaskStatus.Todo}>To Do</option>
            <option value={TaskStatus.InProgress}>In Progress</option>
            <option value={TaskStatus.Done}>Completed</option>
            <option value={TaskStatus.Cancelled}>Cancelled</option>
            <option value={TaskStatus.Paused}>Paused</option>
          </select>
        </DetailRow>

        {/* Duration */}
        <DetailRow icon={Clock} label="Duration">
          <div className="flex items-center gap-2 w-full">
            <input
              type="number"
              min={1}
              defaultValue={task.durationInMinutes}
              onBlur={(e) =>
                onUpdateTask(task.id, { durationInMinutes: Number(e.target.value) || 30 })
              }
              className="w-14 bg-transparent border-none outline-none text-sm font-semibold text-slate-800 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-slate-400 font-medium">min</span>
          </div>
        </DetailRow>

        {/* Priority */}
        <DetailRow icon={Flag} label="Priority">
          <div className="flex items-center gap-3 w-full">
            <input
              type="range"
              min={1}
              max={10}
              defaultValue={task.priority}
              onMouseUp={(e) =>
                onUpdateTask(task.id, { priority: Number((e.target as HTMLInputElement).value) })
              }
              onTouchEnd={(e) =>
                onUpdateTask(task.id, { priority: Number((e.target as HTMLInputElement).value) })
              }
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
            />
            <span className="text-sm font-bold text-slate-800 w-5 text-right shrink-0">
              {task.priority}
            </span>
          </div>
        </DetailRow>

        {/* Effort Level */}
        <DetailRow icon={Flag} label="Effort">
          <select
            value={task.effortLevel}
            onChange={(e) => onUpdateTask(task.id, { effortLevel: Number(e.target.value) })}
            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 cursor-pointer p-0"
          >
            <option value={1}>1 · Low</option>
            <option value={2}>2 · Moderate</option>
            <option value={3}>3 · Medium</option>
            <option value={4}>4 · High</option>
            <option value={5}>5 · Maximum</option>
          </select>
        </DetailRow>

        {/* Category */}
        <DetailRow icon={FolderOpen} label="Category">
          <select
            value={task.categoryId ?? ''}
            onChange={(e) =>
              onUpdateTask(task.id, {
                categoryId: e.target.value ? Number(e.target.value) : 0,
              })
            }
            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-800 cursor-pointer p-0"
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </DetailRow>

        <Separator className="my-0.5" />

        {/* Earliest Start */}
        <DetailRow icon={Calendar} label="Starts">
          <input
            type="datetime-local"
            defaultValue={task.earliestStart ? task.earliestStart.slice(0, 16) : ''}
            onBlur={(e) =>
              onUpdateTask(task.id, {
                earliestStart: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
            className="w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer p-0"
          />
        </DetailRow>

        {/* Latest End */}
        <DetailRow icon={Calendar} label="Ends">
          <input
            type="datetime-local"
            defaultValue={task.latestEnd ? task.latestEnd.slice(0, 16) : ''}
            onBlur={(e) =>
              onUpdateTask(task.id, {
                latestEnd: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
            className="w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer p-0"
          />
        </DetailRow>

        {/* Deadline */}
        <DetailRow icon={Calendar} label="Deadline">
          <input
            type="datetime-local"
            defaultValue={task.deadline ? task.deadline.slice(0, 16) : ''}
            onBlur={(e) =>
              onUpdateTask(task.id, {
                deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined,
              })
            }
            className="w-full bg-transparent border-none outline-none text-xs font-semibold text-slate-800 cursor-pointer p-0"
          />
        </DetailRow>

        {/* Tags */}
        <div className="flex gap-3 items-start pt-1 border-t border-slate-200/60">
          <div className="w-24 flex items-center gap-2 shrink-0 mt-2.5">
            <TagIcon className="h-4 w-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Labels</span>
          </div>
          <div className="flex-1 flex flex-wrap gap-1.5 items-center pt-2">
            {task.tags?.map((tag: string) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-white text-slate-600 border border-slate-200 hover:border-slate-300 rounded-md px-2 py-0.5 text-[11px] font-semibold gap-1"
              >
                #{tag}
                <X
                  className="h-2.5 w-2.5 cursor-pointer text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={() => {
                    const found = tags.find((tg) => tg.name === tag);
                    if (found) onRemoveTag(task.id, found.id);
                  }}
                />
              </Badge>
            ))}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onAssignTags(task.id, [Number(e.target.value)]);
                  e.target.value = '';
                }
              }}
              className="h-6 px-2 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-100 outline-none cursor-pointer transition-colors"
            >
              <option value="">+ Tag</option>
              {tags
                .filter((t) => !task.tags?.includes(t.name))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes</span>
        <div className="p-1 bg-white border border-slate-200 rounded-xl focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/8 transition-all shadow-sm">
          <textarea
            className="w-full min-h-32 bg-transparent border-none resize-none focus:ring-0 text-sm leading-relaxed text-slate-700 placeholder:text-slate-300 p-3 font-medium outline-none"
            placeholder="Add notes, links, or context..."
            defaultValue={task.description || ''}
            onBlur={(e) =>
              onUpdateTask(task.id, { description: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
