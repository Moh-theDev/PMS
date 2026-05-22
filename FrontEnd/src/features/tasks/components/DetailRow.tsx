import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}

export function DetailRow({ icon: Icon, label, children }: DetailRowProps) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="w-24 flex items-center gap-2 shrink-0">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 flex items-center bg-white hover:bg-slate-50 border border-slate-200/50 hover:border-slate-300 px-3.5 py-2.5 rounded-xl transition-all shadow-sm">
        {children}
      </div>
    </div>
  );
}
