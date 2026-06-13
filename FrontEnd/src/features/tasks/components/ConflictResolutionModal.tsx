import * as React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, RefreshCw, Slash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type Task } from '@/types/index';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  options: string[];
  tasks: Task[];
  onResolve: (option: string, newTaskId?: number) => Promise<void>;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  message,
  options,
  tasks,
  onResolve,
}: ConflictResolutionModalProps) {
  const [selectedOption, setSelectedOption] = React.useState<string>('');
  const [selectedReplacementId, setSelectedReplacementId] = React.useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedOption(options[0] || '');
      setSelectedReplacementId('');
      setIsSubmitting(false);
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  // Filter possible replacement tasks (e.g., Status = Done/2 or others)
  const availableReplacements = tasks.filter(t => t.status === 2); // Done status is 2

  const handleSubmit = async () => {
    if (!selectedOption) return;
    if (selectedOption === 'ReplaceTask' && !selectedReplacementId) {
      alert('Please select a replacement task.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onResolve(selectedOption, selectedOption === 'ReplaceTask' ? Number(selectedReplacementId) : undefined);
      onClose();
    } catch (err) {
      alert('Failed to resolve conflict.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const optionCards = [
    {
      id: 'ReplaceTask',
      title: 'Replace Task',
      description: 'Replace this task in the schedule with another completed task.',
      icon: RefreshCw,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    },
    {
      id: 'ClearSlot',
      title: 'Clear Schedule Slot',
      description: 'Remove this task from the scheduled slot and leave the slot empty.',
      icon: Slash,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 border-amber-200 dark:border-amber-500/30',
    },
    {
      id: 'ReplanSchedule',
      title: 'Replan Schedule',
      description: 'Trigger a re-planning cycle for the remaining items.',
      icon: RefreshCw,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
    },
    {
      id: 'Cancel',
      title: 'Cancel Deletion',
      description: 'Cancel this delete request and keep the task intact.',
      icon: X,
      color: 'text-muted-foreground bg-muted border-border',
    },
  ];

  const renderedOptions = optionCards.filter(oc => options.includes(oc.id));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm animate-in fade-in duration-200" 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-card rounded-2xl border border-border shadow-2xl dark:shadow-none p-8 flex flex-col gap-6 animate-in zoom-in-95 duration-200 select-none">
        
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">Schedule Conflict Detected</h2>
            <p className="text-xs text-muted-foreground mt-1 font-semibold leading-relaxed">
              This task cannot be deleted directly because it is assigned to an active schedule. Please choose a resolution option:
            </p>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conflict Message */}
        <div className="p-4 bg-red-500/10 border border-red-100/50 rounded-xl">
          <p className="text-xs text-red-800 font-semibold">{message}</p>
        </div>

        {/* Options Selector */}
        <div className="flex flex-col gap-2">
          {renderedOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedOption === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:bg-muted/50",
                  isSelected 
                    ? "border-blue-600 bg-blue-500/10 ring-4 ring-blue-50" 
                    : "border-border bg-card"
                )}
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border", opt.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-foreground block">{opt.title}</span>
                  <span className="text-xs text-muted-foreground font-semibold leading-relaxed block mt-0.5">{opt.description}</span>
                  
                  {/* Select replacement task dropdown if selected */}
                  {opt.id === 'ReplaceTask' && isSelected && (
                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                        Select Completed Replacement Task:
                      </label>
                      {availableReplacements.length > 0 ? (
                        <select
                          value={selectedReplacementId}
                          onChange={(e) => setSelectedReplacementId(Number(e.target.value))}
                          className="w-full h-10 px-3 rounded-lg border border-border focus:border-blue-600 text-xs font-semibold focus:ring-4 focus:ring-blue-600/5 transition-all outline-none"
                        >
                          <option value="">-- Choose a task --</option>
                          {availableReplacements.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-red-500 font-semibold italic">
                          No completed tasks (Done) are currently available to replace this task.
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={cn(
                  "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors mt-0.5",
                  isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-border"
                )}>
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-2">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-xs font-bold text-muted-foreground hover:text-foreground h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (selectedOption === 'ReplaceTask' && !selectedReplacementId)}
            className="bg-foreground hover:bg-foreground text-background text-xs font-bold h-10 px-6 rounded-xl shrink-0"
          >
            {isSubmitting ? 'Resolving...' : 'Confirm Resolution'}
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}
