import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ArrowRight, Compass, Utensils, Map, Car, Wallet } from 'lucide-react';

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
    { label: 'What is near me?', icon: Compass, prompt: 'What famous places and attractions are near me?' },
    { label: 'Famous local food?', icon: Utensils, prompt: 'What food and restaurants are famous near me?' },
    { label: 'Show me the map', icon: Map, prompt: 'Show me the interactive map for my current location.' },
    { label: 'Find me a ride', icon: Car, prompt: 'Find me a cab or auto ride nearby.' },
    { label: 'How much spent?', icon: Wallet, prompt: 'Show me my trip budget and expenses.' },
  ];

  return (
    <div className="surface-card p-5 space-y-4 border-teal-500/30 bg-teal-950/20 shadow-xl rounded-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white">Ask VoyageAI</h2>
            <p className="text-xs text-slate-400">Your personal calm travel assistant</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask anything... e.g. What's nearby?"
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-4 pr-12 text-slate-100 text-sm font-medium focus:outline-none focus:border-teal-500 shadow-inner"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center press-scale disabled:opacity-40"
          aria-label="Send query to VoyageAI"
        >
          <ArrowRight className="w-5 h-5 font-extrabold" />
        </button>
      </form>

      {/* 1-Tap Quick Question Chips */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
          One-Tap Quick Questions
        </span>
        <div className="flex flex-wrap gap-2">
          {quickChips.map((chip, idx) => {
            const Icon = chip.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => openAiAssistant(chip.prompt)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 text-slate-200 text-xs font-bold flex items-center gap-2 press-scale transition-all"
              >
                <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
