import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { MapPin, Sparkles, Wallet, CloudRain, RefreshCw, Navigation, Car } from 'lucide-react';

export const ItineraryView: React.FC = () => {
  const { openCabModal, openInAppNavigation, openSwapAssistant } = useApp();
  const { currentTrip, currentItinerary, optimizeDayItinerary, optimizeBudget, weatherReplan } = useTrip();

  const [expandedDayNumber, setExpandedDayNumber] = useState<number>(1);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optStatusMessage, setOptStatusMessage] = useState<string | null>(null);

  const days = currentItinerary?.days || [];
  const selectedDay = days.find(d => d.dayNumber === expandedDayNumber) || days[0];

  const handleOptimizeCurrentDay = async () => {
    if (!currentTrip?.id || !selectedDay?.id) return;
    setIsOptimizing(true);
    setOptStatusMessage("Calculating shortest transit route & optimizing day flow in PostgreSQL...");
    try {
      const res = await optimizeDayItinerary(currentTrip.id, selectedDay.id, "MINIMIZE_TRAVEL_TIME");
      setOptStatusMessage(res.message || "Day flow optimized!");
      setTimeout(() => setOptStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to optimize day flow");
      setOptStatusMessage(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRunBudgetOptimization = async () => {
    if (!currentTrip?.id) return;
    setIsOptimizing(true);
    setOptStatusMessage("Analyzing expenses against budget in PostgreSQL...");
    try {
      const res = await optimizeBudget(currentTrip.id);
      const recs = res.recommendations || [];
      alert(`AI Budget Optimization Analysis:\nProjected Total: ₹${res.projectedCost}\nTarget Budget: ₹${res.targetBudget}\nSavings Recommended: ₹${res.savingsRequired}\n\nKey Suggestions:\n` +
        recs.map((r: any, i: number) => `${i+1}. ${r.reason}`).join('\n')
      );
      setOptStatusMessage("Budget analysis complete!");
      setTimeout(() => setOptStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to run budget optimization");
      setOptStatusMessage(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRunWeatherReplan = async () => {
    if (!currentTrip?.id) return;
    setIsOptimizing(true);
    setOptStatusMessage("Checking weather forecasts & outdoor activities...");
    try {
      const res = await weatherReplan(currentTrip.id);
      const recs = res.recommendations || [];
      alert(`AI Weather Replanning Alert:\nCondition: ${res.forecast?.condition || 'Rain Alert'}\nImpacted Outdoor Activities: ${res.affectedActivities?.length || 0}\n\nProposed Swaps:\n` +
        recs.map((r: any, i: number) => `${i+1}. ${r.reason || 'Replace with indoor activity'}`).join('\n')
      );
      setOptStatusMessage("Weather replan analysis complete!");
      setTimeout(() => setOptStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to run weather replan");
      setOptStatusMessage(null);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-screen-title text-white">Trip Itinerary</h1>
          <p className="text-meta mt-1">{days.length} Days Journey · {currentTrip?.title || 'Active Package'}</p>
        </div>

        {/* AI Suite Quick Trigger Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunBudgetOptimization}
            disabled={isOptimizing}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/20 transition-all press-scale"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Budget AI</span>
          </button>
          <button
            onClick={handleRunWeatherReplan}
            disabled={isOptimizing}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-500/20 transition-all press-scale"
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>Weather AI</span>
          </button>
        </div>
      </div>

      {optStatusMessage && (
        <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs font-mono text-teal-300 flex items-center gap-2 animate-fadeIn shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-teal-400" />
          <span>{optStatusMessage}</span>
        </div>
      )}

      {/* Day Pills Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {days.map(day => (
          <button
            key={day.id || day.dayNumber}
            onClick={() => setExpandedDayNumber(day.dayNumber)}
            className={`press-scale shrink-0 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
              expandedDayNumber === day.dayNumber
                ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-lg shadow-teal-500/20'
                : 'bg-[#0D1117] text-slate-300 border-white/10 hover:border-teal-500/40'
            }`}
          >
            Day {day.dayNumber}
          </button>
        ))}
      </div>

      {/* Connected Day Timeline */}
      {selectedDay && (
        <div key={selectedDay.id || selectedDay.dayNumber} className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0D1117] border border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-white">{selectedDay.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{selectedDay.date || `Day ${selectedDay.dayNumber}`}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold text-xs border border-teal-500/30">
              {selectedDay.activities.length} Activities
            </span>
          </div>

          <div className="space-y-0 pl-1">
            {selectedDay.activities.map((act, idx) => {
              const isDone = act.isConfirmed;
              return (
                <div key={act.id} className="flex gap-3 py-2">
                  {/* Vertical Timeline Marker Line */}
                  <div className="flex flex-col items-center w-6 shrink-0 pt-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                      isDone ? 'bg-teal-500 text-slate-950 border-teal-300' : 'bg-slate-900 text-teal-400 border-teal-500/40'
                    }`}>
                      {idx + 1}
                    </div>
                    {idx < selectedDay.activities.length - 1 && (
                      <div className={`w-0.5 flex-1 my-1 ${isDone ? 'bg-teal-500/40' : 'bg-white/10'}`} />
                    )}
                  </div>

                  {/* Activity Detail Content Card */}
                  <div className="flex-1 p-4 rounded-2xl bg-[#0D1117] border border-white/10 hover:border-teal-500/40 transition-all space-y-2 shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`text-sm font-black ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
                          {act.title}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span>{act.locationName || currentTrip?.destination?.name || 'Destination'}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-teal-300 block">{act.timeSlot}</span>
                        {act.estimatedCostInr != null && (
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">₹{act.estimatedCostInr}</span>
                        )}
                      </div>
                    </div>

                    {act.description && (
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{act.description}</p>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openInAppNavigation({
                            title: act.title,
                            locationName: act.locationName || 'Destination',
                            coordinates: [act.latitude || 25.5941, act.longitude || 85.1376],
                            dayNumber: selectedDay.dayNumber
                          })}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold flex items-center gap-1 border border-white/10 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5 text-teal-400" />
                          <span>Navigate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openCabModal(act.locationName || act.title)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-500/30 transition-all"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Ride</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSwapAssistant({
                          tripId: currentTrip?.id || '',
                          activityId: act.id,
                          activityName: act.title,
                          selectedDay: selectedDay.dayNumber,
                          destination: currentTrip?.destination?.name
                        })}
                        className="px-2.5 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-black flex items-center gap-1 border border-teal-500/30 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Swap AI</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleOptimizeCurrentDay}
            disabled={isOptimizing}
            className="w-full py-3.5 press-scale flex items-center justify-center gap-2 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-300 font-extrabold text-xs hover:bg-teal-500/20 transition-all disabled:opacity-50 shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>{isOptimizing ? 'Optimizing Day Route...' : 'Optimize Day 2 Route Flow'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
