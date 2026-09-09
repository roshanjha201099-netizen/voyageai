import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles } from 'lucide-react';

export const FloatingAIButton: React.FC = () => {
  const { openAiAssistant, aiContextLabel, isAiOpen, selectedHotel, isCabModalOpen } = useApp();

  // Hide when other overlays are open
  if (isAiOpen || selectedHotel || isCabModalOpen) return null;

  return (
    <button
      onClick={() => openAiAssistant()}
      className="fixed z-30 right-4 press-scale animate-scaleIn"
      style={{ bottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 12px)' }}
      aria-label={`Ask VoyageAI: ${aiContextLabel}`}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-teal-500 text-slate-950 font-semibold text-[13px] shadow-lg shadow-teal-500/25 hover:bg-teal-400 transition-colors">
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline">{aiContextLabel}</span>
      </div>
    </button>
  );
};
