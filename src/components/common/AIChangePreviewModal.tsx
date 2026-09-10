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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1F2522]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-white border border-[#D9DEDA] rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-xl animate-slideUp text-[#1F2522]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D9DEDA] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8F0EE] border border-[#D9DEDA] text-[#355F58] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#355F58]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#1F2522]">VoyageAI Suggestion</h3>
              <p className="text-xs text-[#5F6863] font-medium">Review itinerary adjustment</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onKeep}
            className="w-9 h-9 rounded-full bg-[#F0F2EF] flex items-center justify-center text-[#5F6863] hover:text-[#1F2522]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Change Reason */}
        <div className="p-3.5 rounded-2xl bg-[#E8F0EE] border border-[#D9DEDA] text-xs text-[#355F58] font-bold">
          {change.reason}
        </div>

        {/* Before & After Comparison */}
        <div className="space-y-3">
          {/* Before */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 block">
              BEFORE (Current Plan)
            </span>
            <div className="flex items-center justify-between text-sm font-bold text-[#1F2522]">
              <span>{change.beforeTitle}</span>
              <span className="text-xs text-rose-700 flex items-center gap-1 font-semibold">
                <Clock className="w-3.5 h-3.5" />
                {change.beforeTime}
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="w-5 h-5 text-[#355F58] rotate-90" />
          </div>

          {/* After */}
          <div className="p-3.5 rounded-2xl bg-[#E8F0EE] border border-[#D9DEDA] space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#355F58] block">
              AFTER (Suggested Plan)
            </span>
            <div className="flex items-center justify-between text-sm font-bold text-[#1F2522]">
              <span>{change.afterTitle}</span>
              <span className="text-xs text-[#355F58] flex items-center gap-1 font-bold">
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
            className="py-3.5 rounded-2xl bg-[#F0F2EF] hover:bg-[#E4E8E4] border border-[#D9DEDA] text-[#1F2522] font-extrabold text-sm"
          >
            Keep Current
          </button>

          <button
            type="button"
            onClick={onApply}
            className="py-3.5 rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-sm shadow-xs press-scale"
          >
            Apply Change
          </button>
        </div>

      </div>
    </div>
  );
};
