import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../../features/trip/types';
import { Calendar, MapPin, Clock, ArrowRight, CheckCircle2, Luggage, Plus } from 'lucide-react';

interface UpcomingTripHomeProps {
  trip: Trip;
}

export const UpcomingTripHome: React.FC<UpcomingTripHomeProps> = ({ trip }) => {
  const navigate = useNavigate();

  const calculateDaysUntilDeparture = () => {
    const today = new Date();
    const start = new Date(trip.startDate);
    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const daysLeft = calculateDaysUntilDeparture();

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto animate-fadeIn">
      
      {/* Upcoming Banner */}
      <div className="surface-card p-5 space-y-4 border-blue-500/30 bg-blue-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>Upcoming Trip</span>
          </div>

          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 font-extrabold text-xs">
            Starts in {daysLeft} day{daysLeft > 1 ? 's' : ''}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-white">{trip.title}</h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>{trip.destination.name}</span>
            <span>·</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{trip.startDate} → {trip.endDate}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => navigate('/trip')}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
          >
            <span>View Trip Details</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => navigate('/trips/new')}
            className="px-3.5 py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-1 hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </button>
        </div>
      </div>

      {/* Trip Preparation Checklist */}
      <div className="surface-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Luggage className="w-4 h-4 text-teal-400" />
          <span>Departure Readiness Checklist</span>
        </div>

        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Destination preferences snapshot saved</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{trip.travelers.length} traveler{trip.travelers.length > 1 ? 's' : ''} configured</span>
          </div>
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Budget style set to {trip.budgetLevel || 'Moderate'}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
