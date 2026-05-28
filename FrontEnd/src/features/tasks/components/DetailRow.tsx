import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function DetailRow({ icon: Icon, label, children, onClick, className }: DetailRowProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-4 py-1.5 min-h-[42px] group transition-all duration-200 rounded-xl px-1",
        onClick && "cursor-pointer hover:bg-slate-100/30",
        className
      )}
      onClick={onClick}
    >
      <div className="w-28 flex items-center gap-2.5 shrink-0 select-none">
        <Icon className={cn(
          "h-4.5 w-4.5 text-slate-400/80 transition-colors duration-200",
          onClick && "group-hover:text-blue-500"
        )} />
        <span className={cn(
          "text-[10.5px] font-bold text-slate-400 uppercase tracking-widest transition-colors duration-200",
          onClick && "group-hover:text-slate-700"
        )}>
          {label}
        </span>
      </div>
      <div 
        className="flex-1 min-w-0" 
        onClick={(e) => {
          // If clicking inside the content itself, prevent triggering double click on row
          if (onClick) {
            e.stopPropagation();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
