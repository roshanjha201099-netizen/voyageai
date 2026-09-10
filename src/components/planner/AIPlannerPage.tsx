import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { Sparkles, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export const AIPlannerPage: React.FC = () => {
  const { setActiveTab } = useApp();
  const { createTrip, setCurrentTripId } = useTrip();

  const [naturalPrompt, setNaturalPrompt] = useState(
    'I want to visit Goa for 4 days with my friends. Budget is ₹25,000 per person. We like beaches, nightlife and good food.'
  );

  const [destination, setDestination] = useState('Goa');
  const [startLocation, setStartLocation] = useState('Mumbai');
  const [dates, setDates] = useState('12–16 September 2026');
  const [travellers, setTravellers] = useState(4);
  const [budget, setBudget] = useState(30000);
  const [travelStyle, setTravelStyle] = useState('Balanced Explorer');

  const [isGenerating, setIsGenerating] = useState(false);
  const [stepText, setStepText] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setPlannerError(null);
    const destLower = destination.trim().toLowerCase();
    const nonIndianKeywords = [
      'paris', 'tokyo', 'london', 'bali', 'new york', 'rome', 'italy', 'japan', 'france',
      'usa', 'dubai', 'singapore', 'thailand', 'bangkok', 'maldives', 'switzerland', 'spain'
    ];
    if (nonIndianKeywords.some(k => destLower.includes(k))) {
      setPlannerError('VoyageAI currently supports destinations within India only. Please enter a destination within India (e.g. Goa, Kerala, Manali, Jaipur).');
      return;
    }

    setIsGenerating(true);
    setHasGenerated(false);
    setStepText("Invoking Gemini AI & generating structured itinerary in PostgreSQL...");

    try {
      const newTrip = await createTrip({
        title: `${destination} AI Travel Package`,
        destination: { name: destination, country: 'India' },
        startDate: '2026-10-15',
        endDate: '2026-10-18',
        travelersCount: Math.max(1, travellers),
        budgetLevel: 'MODERATE'
      });

      setCreatedTripId(newTrip.id);
      setIsGenerating(false);
      setHasGenerated(true);
    } catch (err: any) {
      console.error("AI Planner creation error:", err);
      setPlannerError(err.message || "Failed to generate AI itinerary. Please ensure backend services are active.");
      setIsGenerating(false);
    }
  };

  const handleApplyToActiveTrip = () => {
    if (createdTripId) {
      setCurrentTripId(createdTripId);
    }
    setActiveTab('trips');
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto animate-fadeIn">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F0EE] border border-[#D9DEDA] text-[#355F58] text-xs font-bold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#355F58]" />
          <span>Interactive AI Travel Planner</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1F2522] tracking-tight">
          Plan your trip with <span className="text-[#355F58]">VoyageAI</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#5F6863] max-w-xl mx-auto font-medium">
          Describe in natural language or customize options below. Our AI engine builds personalized itineraries with stays, rides, and activities.
        </p>
      </div>

      {/* Input Box */}
      <div className="p-6 rounded-3xl border border-[#D9DEDA] space-y-4 bg-white shadow-xs text-[#1F2522]">
        <div className="flex items-center gap-2 text-xs font-extrabold text-[#355F58] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#355F58]" />
          <span>Natural Language Prompt</span>
        </div>

        <textarea
          rows={3}
          value={naturalPrompt}
          onChange={(e) => setNaturalPrompt(e.target.value)}
          placeholder="e.g. I want to visit Goa for 4 days with 3 friends. Budget is ₹25,000 per person. We love beaches, seafood, and historic forts."
          className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl p-4 text-xs sm:text-sm text-[#1F2522] font-medium outline-none"
        />

        {/* Form Fields */}
        <div className="pt-4 border-t border-[#D9DEDA] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          
          <div className="space-y-1">
            <label className="text-[#5F6863] font-bold">Destination</label>
            <input 
              type="text" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl px-3.5 py-2.5 text-[#1F2522] font-semibold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#5F6863] font-bold">Starting Location</label>
            <input 
              type="text" 
              value={startLocation} 
              onChange={(e) => setStartLocation(e.target.value)} 
              className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl px-3.5 py-2.5 text-[#1F2522] font-semibold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#5F6863] font-bold">Travel Dates</label>
            <input 
              type="text" 
              value={dates} 
              onChange={(e) => setDates(e.target.value)} 
              className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl px-3.5 py-2.5 text-[#1F2522] font-semibold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#5F6863] font-bold">No. of Travellers</label>
            <input 
              type="number" 
              value={travellers} 
              onChange={(e) => setTravellers(Number(e.target.value))} 
              className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl px-3.5 py-2.5 text-[#1F2522] font-semibold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#5F6863] font-bold">Max Budget (₹)</label>
            <input 
              type="number" 
              value={budget} 
              onChange={(e) => setBudget(Number(e.target.value))} 
              className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl px-3.5 py-2.5 text-[#1F2522] font-mono font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[#5F6863] font-bold">Travel Style</label>
            <select 
              value={travelStyle} 
              onChange={(e) => setTravelStyle(e.target.value)} 
              className="w-full bg-[#F0F2EF] border border-[#D9DEDA] focus:border-[#355F58] rounded-2xl px-3.5 py-2.5 text-[#1F2522] font-semibold outline-none cursor-pointer"
            >
              <option>Balanced Explorer</option>
              <option>Relaxed Luxury</option>
              <option>High Energy Nightlife</option>
              <option>Backpacker Budget</option>
            </select>
          </div>

        </div>

        {plannerError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{plannerError}</span>
          </div>
        )}

        {/* Generate Trigger */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-xs shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 press-scale"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Generating Itinerary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Generate Itinerary</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* GENERATING STEPPER LOADER */}
      {isGenerating && (
        <div className="p-8 rounded-3xl text-center space-y-3 border border-[#D9DEDA] bg-white shadow-xs">
          <Sparkles className="w-8 h-8 text-[#355F58] animate-pulse mx-auto" />
          <h3 className="text-base font-extrabold text-[#1F2522]">Generating Itinerary...</h3>
          <p className="text-xs font-mono text-[#5F6863]">{stepText}</p>
        </div>
      )}

      {/* GENERATED ITINERARY PREVIEW */}
      {hasGenerated && !isGenerating && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Summary Banner */}
          <div className="p-6 rounded-3xl border border-[#D9DEDA] bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8F0EE] text-[#355F58] text-xs font-extrabold uppercase border border-[#D9DEDA]">
                  AI Plan Ready
                </span>
                <span className="text-xs text-[#5F6863] font-medium">{dates}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-[#1F2522] mt-1">{destination} 4-Day Getaway</h2>
              <p className="text-xs text-[#5F6863] mt-1 font-medium">
                Estimated Budget: <span className="font-mono font-bold text-[#355F58]">₹{budget.toLocaleString()}</span> for {travellers} travellers ({travelStyle})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handleGenerate}
                className="px-4 py-2.5 rounded-2xl bg-[#F0F2EF] hover:bg-[#E4E8E4] text-xs font-bold text-[#1F2522] border border-[#D9DEDA] flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#355F58]" /> Regenerate
              </button>
              <button 
                onClick={handleApplyToActiveTrip}
                className="px-6 py-2.5 rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 transition-all press-scale"
              >
                <span>Save & Open Dashboard</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 rounded-3xl border border-[#D9DEDA] bg-[#E8F0EE] space-y-4 shadow-xs">
            <div className="flex items-center gap-3 text-[#355F58]">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-extrabold text-[#1F2522] text-base">VoyageAI Generated Your Package</h3>
            </div>
            <p className="text-xs text-[#5F6863] font-medium">
              Your 4-day itinerary for <strong>{destination}</strong> has been generated and stored safely.
            </p>
            <button
              onClick={handleApplyToActiveTrip}
              className="w-full py-3.5 bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 press-scale"
            >
              <span>View Full Trip Package Dashboard</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
