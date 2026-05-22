import * as React from 'react';
import { Plus } from 'lucide-react';

interface TaskQuickCreateProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function TaskQuickCreate({ value, onChange, onSubmit }: TaskQuickCreateProps) {
  return (
    <div className="px-8 py-3 w-full">
      <form onSubmit={onSubmit} className="max-w-4xl mx-auto w-full relative">
        <Plus className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Press Enter to quickly capture a task..."
          className="w-full pl-11 pr-20 h-11 bg-white border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/8 transition-all text-sm shadow-sm rounded-xl outline-none placeholder:text-slate-400 font-medium text-slate-900"
        />
        {value.trim() && (
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            Add
          </button>
        )}
      </form>
    </div>
  );
}
