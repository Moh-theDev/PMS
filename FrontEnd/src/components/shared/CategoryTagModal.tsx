import * as React from 'react';
import { Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTaskStore } from '@/store/useTaskStore';

export interface CategoryTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  type: 'tag' | 'category';
  initialData?: { id: number; name: string; color?: string };
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f59e0b', // orange
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
];

export function CategoryTagModal({ isOpen, onClose, mode, type, initialData }: CategoryTagModalProps) {
  const { addCategory, updateCategory, addTag, updateTag } = useTaskStore();
  
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState<string | undefined>(undefined);
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isCustomColorOpen, setIsCustomColorOpen] = React.useState(false);
  const [hexInput, setHexInput] = React.useState('');

  const EXTENDED_PALETTE = [
    '#64748b', '#94a3b8', '#cbd5e1', '#ef4444', '#f97316', '#f59e0b',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];

  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setColor(initialData?.color);
      setError('');
      setHexInput(initialData?.color || '');
    } else {
      setIsCustomColorOpen(false);
    }
  }, [isOpen, initialData]);

  const validateName = (val: string) => {
    if (!val.trim()) return "Name is required";
    if (type === 'tag') {
      const forbiddenPattern = /[\\/'"#:*?><| ]/;
      if (forbiddenPattern.test(val)) {
        return "Tag name can't contain \\ / ' \" # : * ? > < | Space";
      }
    }
    return "";
  };

  const handleSave = async () => {
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      if (mode === 'create') {
        if (type === 'category') {
          await addCategory(name.trim(), color);
        } else {
          await addTag(name.trim(), color);
        }
      } else if (mode === 'edit' && initialData) {
        if (type === 'category') {
          await updateCategory(initialData.id, name.trim(), color);
        } else {
          await updateTag(initialData.id, name.trim(), color);
        }
      }
      onClose();
    } catch (err) {
      setError(`Failed to ${mode} ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="category-tag-modal-description" className="max-w-md bg-card border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {mode === 'create' ? 'Add' : 'Edit'} {type === 'category' ? 'list' : 'tag'}
          </DialogTitle>
          <DialogDescription id="category-tag-modal-description" className="sr-only">
            Add or edit a tag or list and choose its color.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div className="space-y-1.5">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={type === 'category' ? 'List name' : 'Tag name'}
              className={cn("bg-background border-border", error && "border-destructive focus-visible:ring-destructive")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            {error && <p className="text-[11px] font-medium text-destructive">{error}</p>}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground block">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setColor(undefined)}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all",
                  !color ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                )}
                title="None"
              >
                <div className="h-4 w-4 rounded-full bg-muted border border-border relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-500/80 rotate-45 transform w-[1px] h-[150%] left-1/2 -top-1/4"></div>
                </div>
              </button>

              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all",
                    color === c ? "border-primary" : "border-transparent hover:scale-110"
                  )}
                >
                  <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: c }} />
                </button>
              ))}

              <Popover modal={true} open={isCustomColorOpen} onOpenChange={setIsCustomColorOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all relative overflow-hidden",
                      (color && !PRESET_COLORS.includes(color)) ? "border-primary bg-primary/10" : "border-transparent hover:scale-110 hover:bg-muted"
                    )}
                    title="Choose custom color"
                  >
                    <Palette className="h-3.5 w-3.5 text-muted-foreground z-10" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 bg-popover border-border shadow-xl rounded-xl space-y-4">
                  <div className="grid grid-cols-6 gap-2">
                    {EXTENDED_PALETTE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setColor(c); setHexInput(c); setIsCustomColorOpen(false); }}
                        className={cn(
                          "h-6 w-6 rounded-md hover:scale-110 transition-transform shadow-sm border border-transparent",
                          color === c ? "ring-2 ring-primary border-background" : ""
                        )}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground w-8">HEX</div>
                    <Input
                      value={hexInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHexInput(val);
                        if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
                          setColor(val.toUpperCase());
                        }
                      }}
                      placeholder="#FFFFFF"
                      className="h-8 text-sm font-mono flex-1 uppercase px-2"
                      maxLength={7}
                    />
                    <div 
                      className="h-6 w-6 rounded-md border border-border shrink-0 shadow-sm transition-colors" 
                      style={{ backgroundColor: /^#([0-9A-F]{3}){1,2}$/i.test(hexInput) ? hexInput : color || 'transparent' }} 
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !name.trim()}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
