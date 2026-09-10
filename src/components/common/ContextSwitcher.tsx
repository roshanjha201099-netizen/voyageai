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
      {/* Context Trigger Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-white border border-[#D9DEDA] hover:border-[#355F58]/40 rounded-2xl px-4 py-3 flex items-center justify-between press-scale shadow-xs transition-all"
        aria-label="Switch travel context"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            activeContextMode === 'near_you' ? 'bg-[#E8F0EE] text-[#355F58] border border-[#D9DEDA]' : 'bg-[#E8F0EE] text-[#355F58] border border-[#D9DEDA]'
          }`}>
            {activeContextMode === 'near_you' ? <MapPin className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
          </div>

          <div className="text-left min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5F6863] block leading-tight">
              {activeContextMode === 'near_you' ? 'Current Context' : 'Trip Context'}
            </span>
            <span className="text-sm sm:text-base font-extrabold text-[#1F2522] truncate block">
              {activeContextMode === 'near_you' ? locationText : tripTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[#5F6863] shrink-0">
          <span className="text-xs font-bold text-[#355F58]">Switch</span>
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#355F58]' : ''}`} />
        </div>
      </button>

      {/* Context Switcher Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1F2522]/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-[#D9DEDA] rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-xl animate-slideUp">
            
            <div className="flex items-center justify-between border-b border-[#D9DEDA] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#1F2522]">Choose Exploration Context</h3>
                <p className="text-xs text-[#5F6863] font-medium">Select where VoyageAI focuses recommendations</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-[#F0F2EF] flex items-center justify-center text-[#5F6863] hover:text-[#1F2522]"
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
                    ? 'bg-[#E8F0EE] border-[#355F58] text-[#1F2522] shadow-xs'
                    : 'bg-[#F0F2EF] border-[#D9DEDA] text-[#5F6863] hover:border-[#355F58]/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#355F58]/15 text-[#355F58] flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#1F2522]">Near You (Current Location)</h4>
                    <p className="text-xs text-[#5F6863]">{locationText}</p>
                  </div>
                </div>
                {activeContextMode === 'near_you' && <Check className="w-5 h-5 text-[#355F58]" />}
              </button>

              {/* Option 2: Active / Upcoming Trip */}
              {currentTrip && (
                <button
                  type="button"
                  onClick={() => handleSelectContext('trip')}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    activeContextMode === 'trip'
                      ? 'bg-[#E8F0EE] border-[#355F58] text-[#1F2522] shadow-xs'
                      : 'bg-[#F0F2EF] border-[#D9DEDA] text-[#5F6863] hover:border-[#355F58]/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#355F58]/15 text-[#355F58] flex items-center justify-center">
                      <Plane className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#1F2522]">{tripTitle}</h4>
                      <p className="text-xs text-[#5F6863]">{currentTrip.destination.name} · {tripDaysLeft}</p>
                    </div>
                  </div>
                  {activeContextMode === 'trip' && <Check className="w-5 h-5 text-[#355F58]" />}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsAiOpen(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] text-[#355F58] font-extrabold text-sm flex items-center justify-center gap-2 hover:border-[#355F58]/40"
            >
              <Sparkles className="w-4 h-4 text-[#355F58]" />
              <span>Ask VoyageAI about this context</span>
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

