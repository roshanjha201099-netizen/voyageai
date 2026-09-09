import React from 'react';
import { useApp } from '../../context/AppContext';
import type { TripView } from '../../types';
import { Sun, Calendar, Users, Sparkles, BookOpen } from 'lucide-react';
import { ItineraryView } from '../itinerary/ItineraryView';
import { MapView } from '../map/MapView';
import { BookingsPage } from '../bookings/BookingsPage';
import { ExpenseTracker } from '../expenses/ExpenseTracker';

export const TripDashboard: React.FC = () => {
  const { activeTrip, tripView, setTripView, openAiAssistant } = useApp();

  const subNavs: { id: TripView; label: string }[] = [
    { id: 'home', label: 'Overview' },
    { id: 'timeline', label: 'Itinerary' },
    { id: 'map', label: 'Map' },
    { id: 'reservations', label: 'Bookings' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'guide', label: 'Guide' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="surface-card p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white">
              {activeTrip.destination.toUpperCase()} GETAWAY
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> {activeTrip.dates}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-slate-400" /> {activeTrip.travellersCount} Travellers</span>
              <span className="flex items-center gap-1.5"><Sun className="w-4 h-4 text-slate-400" /> {activeTrip.weather.temp}°C {activeTrip.weather.condition}</span>
            </div>
          </div>
          <button
            onClick={() => openAiAssistant("Optimize my Goa itinerary budget")}
            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Assist
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-6 border-t border-white/10 mt-6 no-scrollbar">
          {subNavs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTripView(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                tripView === tab.id
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tripView === 'home' && <ItineraryView />}
      {tripView === 'timeline' && <ItineraryView />}
      {tripView === 'map' && <MapView />}
      {tripView === 'reservations' && <BookingsPage />}
      {tripView === 'expenses' && <ExpenseTracker />}
      {tripView === 'guide' && (
        <div className="surface-card p-6 space-y-4">
          <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-400" />
            Goa Destination Guide
          </h3>
        </div>
      )}
    </div>
  );
};
