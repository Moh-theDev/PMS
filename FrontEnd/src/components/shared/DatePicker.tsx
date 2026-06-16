import * as React from 'react';

import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date: string; // ISO date string yyyy-MM-dd
  onDateChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({ date, onDateChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const parsedDate = date ? new Date(date) : undefined;

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Need local date string yyyy-mm-dd
      const tzOffset = selectedDate.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(selectedDate.getTime() - tzOffset)).toISOString().split('T')[0];
      onDateChange(localISOTime);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "h-7 px-2 py-0.5 justify-start text-left font-semibold text-xs border-0 bg-transparent hover:bg-muted text-muted-foreground shadow-none",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
          {date && parsedDate ? parsedDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start">
        <Calendar
          mode="single"
          selected={parsedDate}
          onSelect={handleSelect}
          className="bg-card dark:bg-card border-border dark:border-border text-foreground dark:text-foreground shadow-lg dark:shadow-none"
        />
      </PopoverContent>
    </Popover>
  );
}
