import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import type { Trip, ItineraryDay } from '../../features/trip/types';
import {
  MapPin, UtensilsCrossed, Car, Map as MapIcon, Wallet, Plus, RefreshCw, AlertCircle, Calendar,
  Navigation, Sparkles, Hotel
} from 'lucide-react';

interface ActiveTripHomeProps {
  trip: Trip;
}

export const ActiveTripHome: React.FC<ActiveTripHomeProps> = ({ trip }) => {
  const navigate = useNavigate();
  const { openAiAssistant, openCabModal, setActiveTab, setTripView, openSwapAssistant, openInAppNavigation } = useApp();
  const { currentItinerary, itineraryStatus, regenerateItinerary, stays, transports, expenses } = useTrip();

  // Day Selector Filter State ('ALL' or 1-indexed day number)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | 'ALL'>('ALL');

  const isGenerating = itineraryStatus === 'GENERATING' || trip.itineraryStatus === 'GENERATING';
  const isFailed = itineraryStatus === 'FAILED' || trip.itineraryStatus === 'FAILED';

  const coverUrl = trip.coverMedia?.url || trip.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';

  // Filter days based on tab selection
  const daysToRender: ItineraryDay[] = (currentItinerary?.days || []).filter(day => {
    if (selectedDayNumber === 'ALL') return true;
    return day.dayNumber === selectedDayNumber;
  });

  // Calculate budget meter totals
  const totalDays = trip.totalDays || currentItinerary?.days.length || 4;
  const targetBudget = 30000;
  const estimatedTotalCost = (currentItinerary?.days || []).reduce((sum, day) => {
    return sum + day.activities.reduce((actSum, act) => actSum + (act.estimatedCostInr || 0), 0);
  }, 0);

  const handleContextualAiAction = (promptText: string) => {
    const fullContextPrompt = `Trip: ${trip.title} (${trip.destination.name}). Selected Day: ${selectedDayNumber}. Prompt: ${promptText}`;
    openAiAssistant(fullContextPrompt);
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn">
      
      {/* 1. Hero / Package Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-teal-500/30 shadow-2xl bg-slate-900">
        <div className="h-44 w-full relative">
          <img
            src={coverUrl}
            alt={trip.destination.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080B11] via-[#080B11]/60 to-transparent" />
        </div>

        <div className="p-5 relative -mt-16 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-teal-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider shadow-lg shadow-teal-500/20">
                {trip.status === 'ACTIVE' ? 'Active Package' : 'Upcoming Package'}
              </span>
              <span className="text-xs font-bold text-teal-300">
                {totalDays} Days Journey
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/trips/new')}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-teal-300 text-xs font-bold flex items-center gap-1.5 border border-teal-500/30 backdrop-blur-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Package</span>
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{trip.destination.name} Package</h1>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                {trip.startDate} to {trip.endDate}
              </span>
              <span>·</span>
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                {trip.budgetLevel || 'MODERATE'} Tier
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Async Itinerary Generation / Error Banner */}
      {isGenerating && (
        <div className="bg-slate-900/90 border border-teal-500/40 rounded-3xl p-5 space-y-2 shadow-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/30">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">VoyageAI is organizing your complete package...</h4>
              <p className="text-xs text-slate-400">Vertex AI Llama-3.3-70B is building day-by-day recommendations for {trip.destination.name}.</p>
            </div>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center gap-3 text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Itinerary Generation Alert</h4>
              <p className="text-xs text-slate-400">Could not complete automatic itinerary generation.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => regenerateItinerary(trip.id)}
            className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-500/30 text-center transition-all"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* 3. Sticky Horizontally Scrollable Day Selector Pills */}
      {currentItinerary && currentItinerary.days.length > 0 && (
        <div className="sticky top-14 z-30 bg-[#080B11]/90 backdrop-blur-md py-2 -mx-4 px-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => setSelectedDayNumber('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                selectedDayNumber === 'ALL'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Days ({currentItinerary.days.length})
            </button>

            {currentItinerary.days.map(day => (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDayNumber(day.dayNumber)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  selectedDayNumber === day.dayNumber
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Day {day.dayNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Contextual Quick Actions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Actions</span>
          <span className="text-[11px] text-teal-400 font-semibold">{trip.destination.name} Intent</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setTripView('food');
              navigate('/trip/food');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 text-center space-y-1.5 press-scale"
          >
            <UtensilsCrossed className="w-5 h-5 text-teal-400 mx-auto" />
            <span className="block text-xs font-bold text-slate-200">Food</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTripView('rides');
              navigate('/trip/rides');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 text-center space-y-1.5 press-scale"
          >
            <Car className="w-5 h-5 text-teal-400 mx-auto" />
            <span className="block text-xs font-bold text-slate-200">Ride</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('trips');
              setTripView('map');
              navigate('/trip/map');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 text-center space-y-1.5 press-scale"
          >
            <MapIcon className="w-5 h-5 text-teal-400 mx-auto" />
            <span className="block text-xs font-bold text-slate-200">Map</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('trips');
              setTripView('expenses');
              navigate('/trip/expenses');
            }}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/40 text-center space-y-1.5 press-scale"
          >
            <Wallet className="w-5 h-5 text-teal-400 mx-auto" />
            <span className="block text-xs font-bold text-slate-200">Expenses</span>
          </button>
        </div>
      </div>

      {/* 5. Contextual AI Action Pills */}
      <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
          <Sparkles className="w-4 h-4" />
          <span>AI Trip Assistant Shortcuts</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleContextualAiAction('Make today more relaxed with less travel')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-teal-300 text-xs font-semibold border border-teal-500/30 hover:bg-teal-500/20 whitespace-nowrap"
          >
            Make More Relaxed
          </button>
          <button
            type="button"
            onClick={() => handleContextualAiAction('Find affordable local food options near my current activities')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-teal-300 text-xs font-semibold border border-teal-500/30 hover:bg-teal-500/20 whitespace-nowrap"
          >
            Find Cheap Local Food
          </button>
          <button
            type="button"
            onClick={() => handleContextualAiAction('Optimize schedule to avoid peak afternoon heat')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-teal-300 text-xs font-semibold border border-teal-500/30 hover:bg-teal-500/20 whitespace-nowrap"
          >
            Avoid Afternoon Heat
          </button>
        </div>
      </div>

      {/* 6. Dynamic Persisted Itinerary Timeline Cards */}
      {daysToRender.length > 0 && (
        <div className="space-y-4 pt-1">
          {daysToRender.map(day => (
            <div key={day.id} className="surface-card p-4 space-y-3.5 border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-sm text-white">{day.title}</h4>
                  {day.summary && <p className="text-xs text-slate-400 mt-0.5">{day.summary}</p>}
                </div>
                <span className="text-[11px] font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-md border border-teal-500/20 shrink-0">
                  Day {day.dayNumber}
                </span>
              </div>

              <div className="space-y-3">
                {day.activities.map(act => (
                  <div key={act.id} className="p-3.5 rounded-2xl bg-[#080B11] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-400">{act.timeSlot}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                        {act.activityType}
                      </span>
                    </div>

                    <h5 className="font-bold text-sm text-white">{act.title}</h5>
                    {act.description && <p className="text-xs text-slate-400">{act.description}</p>}

                    <div className="flex items-center justify-between text-xs pt-1 text-slate-400 border-t border-slate-900">
                      <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        {act.locationName || trip.destination.name}
                      </span>
                      {act.estimatedCostInr ? (
                        <span className="font-extrabold text-slate-200">₹{act.estimatedCostInr}</span>
                      ) : null}
                    </div>

                    {/* Activity Contextual Action Bar */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-900/80">
                      <button
                        type="button"
                        onClick={() => openInAppNavigation({
                          activityId: act.id,
                          title: act.title,
                          locationName: act.locationName || trip.destination.name,
                          coordinates: [act.latitude || 22.5726, act.longitude || 88.3639],
                          dayNumber: day.dayNumber,
                          tripTitle: trip.destination.name
                        })}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-bold flex items-center gap-1 border border-slate-700"
                      >
                        <Navigation className="w-3 h-3 text-teal-400" />
                        <span>Navigate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCabModal(act.locationName || trip.destination.name)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-bold flex items-center gap-1 border border-slate-700"
                      >
                        <Car className="w-3 h-3 text-teal-400" />
                        <span>Get Ride</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openSwapAssistant({
                          tripId: trip.id,
                          itineraryId: currentItinerary?.id,
                          dayId: day.id,
                          activityId: act.id,
                          selectedDay: day.dayNumber,
                          activityName: act.title,
                          activityDescription: act.description,
                          activityTime: act.timeSlot,
                          locationName: act.locationName || trip.destination.name,
                          latitude: act.latitude,
                          longitude: act.longitude,
                          estimatedCost: act.estimatedCostInr,
                          destination: trip.destination.name
                        })}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 border border-slate-700 ml-auto"
                      >
                        <Sparkles className="w-3 h-3 text-teal-400" />
                        <span>Swap</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 7. Package Extensibility Cards (Stay, Transport, Budget Meter) */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Package Dimensions</span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Stay Card */}
          <div className="surface-card p-4 space-y-2 border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Hotel className="w-4 h-4 text-teal-400" />
                <span>{stays.length > 0 ? stays[0].hotelName : 'Stay & Accommodations'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                stays.length > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
              }`}>
                {stays.length > 0 ? (stays[0].status || 'SELECTED') : 'RECOMMENDED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {stays.length > 0
                ? `${stays[0].locationName} • ${stays[0].nights} Nights (₹${stays[0].totalPrice.toLocaleString()})`
                : `Curated hotel selection in central ${trip.destination.name}.`}
            </p>
          </div>

          {/* Transport Card */}
          <div className="surface-card p-4 space-y-2 border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Car className="w-4 h-4 text-teal-400" />
                <span>{transports.length > 0 ? transports[0].providerName : 'Transit & Cab Pass'}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                transports.length > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
              }`}>
                {transports.length > 0 ? (transports[0].status || 'SELECTED') : 'RECOMMENDED'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {transports.length > 0
                ? `To ${transports[0].dropoffLocation} • ₹${transports[0].estimatedFare}`
                : `1-click ride bookings for day activities.`}
            </p>
          </div>
        </div>

        {/* Budget Meter */}
        {(() => {
          const totalExpensesCost = expenses.reduce((s, e) => s + e.amount, 0);
          const currentTotalCost = estimatedTotalCost + totalExpensesCost;
          return (
            <div className="surface-card p-4 space-y-2.5 border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Package Budget Estimation</span>
                <span className="font-extrabold text-teal-400">₹{currentTotalCost} / ₹{targetBudget}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (currentTotalCost / targetBudget) * 100)}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
};
