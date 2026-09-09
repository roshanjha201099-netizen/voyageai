import React from 'react';
import { Sparkles, Clock, ArrowRight, X } from 'lucide-react';

export interface AIChangeItem {
  id: string;
  title: string;
  reason: string;
  beforeTime: string;
  beforeTitle: string;
  afterTime: string;
  afterTitle: string;
}

interface AIChangePreviewModalProps {
  change: AIChangeItem | null;
  onApply: () => void;
  onKeep: () => void;
}

export const AIChangePreviewModal: React.FC<AIChangePreviewModalProps> = ({ change, onApply, onKeep }) => {
  if (!change) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#0D1117] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-slideUp">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">VoyageAI Suggestion</h3>
              <p className="text-xs text-slate-400">Review itinerary adjustment</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onKeep}
            className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Change Reason */}
        <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs text-teal-200 font-semibold">
          {change.reason}
        </div>

        {/* Before & After Comparison */}
        <div className="space-y-3">
          {/* Before */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-400 block">
              BEFORE (Current Plan)
            </span>
            <div className="flex items-center justify-between text-sm font-bold text-white">
              <span>{change.beforeTitle}</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {change.beforeTime}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-teal-400 rotate-90" />
          </div>

          {/* After */}
          <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/40 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-400 block">
              AFTER (Suggested Plan)
            </span>
            <div className="flex items-center justify-between text-sm font-bold text-white">
              <span>{change.afterTitle}</span>
              <span className="text-xs text-teal-300 flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5" />
                {change.afterTime}
              </span>
            </div>
          </div>
        </div>

        {/* Decision Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onKeep}
            className="py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-extrabold text-sm hover:bg-slate-850"
          >
            Keep Current
          </button>

          <button
            type="button"
            onClick={onApply}
            className="py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/20 press-scale"
          >
            Apply Change
          </button>
        </div>

      </div>
    </div>
  );
};
