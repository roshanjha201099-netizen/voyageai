import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, Compass, Utensils, Map, Car } from 'lucide-react';

export const AskVoyageAICard: React.FC = () => {
  const { openAiAssistant } = useApp();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      openAiAssistant(query.trim());
      setQuery('');
    }
  };

  const quickChips = [
    { label: 'Nearby places', icon: Compass, prompt: 'What famous places and attractions are near me?' },
    { label: 'Local food', icon: Utensils, prompt: 'What food and restaurants are famous near me?' },
    { label: 'Show map', icon: Map, prompt: 'Show me the interactive map for my current location.' },
    { label: 'Find a ride', icon: Car, prompt: 'Find me a cab or auto ride nearby.' },
  ];

  return (
    <div className="surface-card p-5 space-y-4 border-teal-500/25 bg-[#151B23] shadow-xl rounded-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-white">Ask VoyageAI</h2>
          <p className="text-xs text-slate-400 font-medium">What would you like to do today?</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[#0B0F14] border border-white/10 rounded-2xl p-1.5 focus-within:border-teal-500 shadow-inner transition-all">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask anything... e.g. What is famous here?"
          className="flex-1 bg-transparent px-3 py-2 text-slate-100 text-sm font-medium focus:outline-none placeholder:text-slate-500 min-w-0"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="w-10 h-10 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center shrink-0 press-scale disabled:opacity-30 transition-all"
          aria-label="Send query to VoyageAI"
        >
          <ArrowRight className="w-5 h-5 font-bold" />
        </button>
      </form>

      {/* 1-Tap Quick Question Chips */}
      <div className="space-y-2 pt-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Quick Actions
        </span>
        <div className="grid grid-cols-2 gap-2">
          {quickChips.map((chip, idx) => {
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => openAiAssistant(chip.prompt)}
                className="py-3 px-3 rounded-2xl bg-[#1B222C] border border-white/10 hover:border-teal-500/40 text-slate-200 text-xs font-bold flex items-center gap-2 press-scale transition-all"
              >
                <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="truncate">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

