import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

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
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Interactive AI Travel Planner</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          Plan your next trip with <span className="text-teal-400">AI</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Describe in natural language or customize preferences. Our AI engine generates complete structured itineraries with stays, cabs, and activities.
        </p>
      </div>

      {/* Input Box */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-[#111622]">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Natural Language Prompt</span>
        </div>

        <textarea
          rows={3}
          value={naturalPrompt}
          onChange={(e) => setNaturalPrompt(e.target.value)}
          placeholder="e.g. I want to visit Goa for 4 days with 3 friends. Budget is ₹25,000 per person. We love beaches, seafood, and historic forts."
          className="w-full glass-input rounded-2xl p-4 text-xs sm:text-sm focus:border-teal-500 text-white"
        />

        {/* Form Fields */}
        <div className="pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          
          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Destination</label>
            <input 
              type="text" 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
              className="w-full glass-input rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Starting Location</label>
            <input 
              type="text" 
              value={startLocation} 
              onChange={(e) => setStartLocation(e.target.value)} 
              className="w-full glass-input rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Travel Dates</label>
            <input 
              type="text" 
              value={dates} 
              onChange={(e) => setDates(e.target.value)} 
              className="w-full glass-input rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">No. of Travellers</label>
            <input 
              type="number" 
              value={travellers} 
              onChange={(e) => setTravellers(Number(e.target.value))} 
              className="w-full glass-input rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Max Budget (₹)</label>
            <input 
              type="number" 
              value={budget} 
              onChange={(e) => setBudget(Number(e.target.value))} 
              className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-400 font-medium">Travel Style</label>
            <select 
              value={travelStyle} 
              onChange={(e) => setTravelStyle(e.target.value)} 
              className="w-full glass-input rounded-xl px-3 py-2 text-white bg-[#0C101A]"
            >
              <option>Balanced Explorer</option>
              <option>Relaxed Luxury</option>
              <option>High Energy Nightlife</option>
              <option>Backpacker Budget</option>
            </select>
          </div>

        </div>

        {plannerError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️ {plannerError}</span>
          </div>
        )}

        {/* Generate Trigger */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Itinerary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Itinerary</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* GENERATING STEPPER LOADER */}
      {isGenerating && (
        <div className="glass-panel p-8 rounded-3xl text-center space-y-3 border border-white/10 bg-[#111622]">
          <Sparkles className="w-8 h-8 text-teal-400 animate-pulse mx-auto" />
          <h3 className="text-base font-bold text-white">Generating Itinerary...</h3>
          <p className="text-xs font-mono text-slate-400">{stepText}</p>
        </div>
      )}

      {/* GENERATED ITINERARY PREVIEW */}
      {hasGenerated && !isGenerating && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Summary Banner */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#111622] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 text-xs font-bold uppercase border border-teal-500/20">
                  AI Plan Ready
                </span>
                <span className="text-xs text-slate-400">{dates}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white mt-1">{destination} 4-Day Getaway</h2>
              <p className="text-xs text-slate-300 mt-1">
                Estimated Budget: <span className="font-mono font-bold text-teal-400">₹{budget.toLocaleString()}</span> for {travellers} travellers ({travelStyle})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={handleGenerate}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
              <button 
                onClick={handleApplyToActiveTrip}
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <span>Save & Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-teal-500/30 bg-[#080B11] space-y-4">
            <div className="flex items-center gap-3 text-teal-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-extrabold text-white text-base">Gemini AI Generated Your Package</h3>
            </div>
            <p className="text-xs text-slate-300">
              Your 4-day itinerary for <strong>{destination}</strong> has been generated with Pydantic validation and stored in PostgreSQL.
            </p>
            <button
              onClick={handleApplyToActiveTrip}
              className="w-full py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>View Full Trip Package Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
