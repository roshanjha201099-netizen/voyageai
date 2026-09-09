import React from 'react';
import { Check } from 'lucide-react';

interface PreferenceOptionProps {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string | React.ReactNode;
  selected: boolean;
  onSelect: (id: string) => void;
  mode?: 'single' | 'multiple';
}

export const PreferenceOption: React.FC<PreferenceOptionProps> = ({
  id,
  label,
  subtitle,
  icon,
  selected,
  onSelect,
  mode = 'multiple',
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      aria-pressed={selected}
      aria-label={`${label} (${mode} selection)`}
      className={`
        relative w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3
        min-h-[56px] select-none touch-manipulation active:scale-[0.98]
        ${selected
          ? 'bg-teal-500/10 border-teal-500 text-white shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/40'
          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
        }
      `}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <span className="text-2xl flex-shrink-0 leading-none">
            {typeof icon === 'string' ? icon : icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-base leading-tight ${selected ? 'text-teal-300 font-bold' : 'text-slate-100'}`}>
            {label}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 leading-snug line-clamp-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className={`
        w-6 h-6 rounded-full border flex items-center justify-center transition-all flex-shrink-0
        ${selected
          ? 'bg-teal-500 border-teal-400 text-slate-950 scale-100'
          : 'border-slate-700 bg-slate-800/50 text-transparent scale-90'
        }
      `}>
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </div>
    </button>
  );
};
