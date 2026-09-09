import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { MapPin, Plane, ChevronDown, Check, Sparkles, X } from 'lucide-react';

export const ContextSwitcher: React.FC = () => {
  const { userLocationName, setAiPromptQuery, setIsAiOpen } = useApp();
  const { currentTrip } = useTrip();
  const [isOpen, setIsOpen] = useState(false);
  const [activeContextMode, setActiveContextMode] = useState<'near_you' | 'trip'>('near_you');

  const locationText = userLocationName || 'Patna, Bihar';
  const tripTitle = currentTrip?.title || 'Goa Trip';
  const tripDaysLeft = currentTrip ? 'Starts in 10 days' : 'Upcoming Trip';

  const handleSelectContext = (mode: 'near_you' | 'trip') => {
    setActiveContextMode(mode);
    setIsOpen(false);
    if (mode === 'near_you') {
      setAiPromptQuery(`What is interesting near my physical location in ${locationText}?`);
    } else {
      setAiPromptQuery(`Show me details for my upcoming ${tripTitle}.`);
    }
  };

  return (
    <div className="relative">
      {/* Context Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full surface-card px-4 py-3.5 flex items-center justify-between border-teal-500/30 hover:border-teal-400 press-scale shadow-lg transition-all"
        aria-label="Switch travel context"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            activeContextMode === 'near_you' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/40' : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
          }`}>
            {activeContextMode === 'near_you' ? <MapPin className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
          </div>

          <div className="text-left min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block leading-tight">
              {activeContextMode === 'near_you' ? '📍 Active Location' : '✈️ Active Trip'}
            </span>
            <span className="text-base font-bold text-white truncate block">
              {activeContextMode === 'near_you' ? locationText : tripTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          <span className="text-xs font-bold text-teal-400 hidden sm:inline">Switch</span>
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-400' : ''}`} />
        </div>
      </button>

      {/* Context Switcher Bottom Sheet / Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0D1117] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-5 shadow-2xl animate-slideUp">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-white">Select Active Context</h3>
                <p className="text-xs text-slate-400">Choose where VoyageAI focuses recommendations</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Option 1: Physical GPS / Near You */}
              <button
                type="button"
                onClick={() => handleSelectContext('near_you')}
                className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  activeContextMode === 'near_you'
                    ? 'bg-teal-500/10 border-teal-500 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Near You (Current Location)</h4>
                    <p className="text-xs text-slate-400">{locationText}</p>
                  </div>
                </div>
                {activeContextMode === 'near_you' && <Check className="w-5 h-5 text-teal-400" />}
              </button>

              {/* Option 2: Active / Upcoming Trip */}
              {currentTrip && (
                <button
                  type="button"
                  onClick={() => handleSelectContext('trip')}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    activeContextMode === 'trip'
                      ? 'bg-blue-500/10 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Plane className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{tripTitle}</h4>
                      <p className="text-xs text-slate-400">{currentTrip.destination.name} · {tripDaysLeft}</p>
                    </div>
                  </div>
                  {activeContextMode === 'trip' && <Check className="w-5 h-5 text-blue-400" />}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAiOpen(true);
              }}
              className="w-full py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-teal-400 font-extrabold text-sm flex items-center justify-center gap-2 hover:bg-slate-850"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Ask VoyageAI about this context</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
};
