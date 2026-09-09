import React from 'react';
import { useApp } from '../../context/AppContext';
import type { AppUIState } from '../../types';
import { Sliders, RefreshCw, AlertTriangle, Layers } from 'lucide-react';

export const StateInspectorBar: React.FC = () => {
  const { appUIState, setAppUIState } = useApp();

  const states: { id: AppUIState; label: string; icon: React.ElementType }[] = [
    { id: 'ready', label: 'Ready State', icon: Layers },
    { id: 'loading', label: 'Loading State', icon: RefreshCw },
    { id: 'error', label: 'Error State', icon: AlertTriangle },
  ];

  return (
    <div className="bg-slate-950/90 border-b border-white/10 px-4 py-1.5 text-xs text-slate-300 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-bold text-teal-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3 h-3 text-teal-400" /> State Inspector:
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {states.map((s) => {
            const Icon = s.icon;
            const isActive = appUIState === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setAppUIState(s.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3 h-3 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
