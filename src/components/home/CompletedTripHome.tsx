import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../../features/trip/types';
import { CheckCircle2, Plus, ArrowRight, Award } from 'lucide-react';

interface CompletedTripHomeProps {
  trip: Trip;
}

export const CompletedTripHome: React.FC<CompletedTripHomeProps> = ({ trip }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto animate-fadeIn">
      
      {/* Completed Hero Banner */}
      <div className="surface-card p-6 space-y-4 border-emerald-500/30 bg-emerald-950/20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <Award className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Trip Completed</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">{trip.title}</h1>
          <p className="text-xs text-slate-400">
            {trip.destination.name} · {trip.startDate} to {trip.endDate}
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Duration</span>
            <span className="font-extrabold text-sm text-white">{trip.progress.totalDays} Days</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Travelers</span>
            <span className="font-extrabold text-sm text-white">{trip.travelers.length}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Budget</span>
            <span className="font-extrabold text-sm text-emerald-400">{trip.budgetLevel || 'Moderate'}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => navigate('/trips/new')}
            className="cta-primary flex-1 py-3.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Plan Another Trip</span>
          </button>
          
          <button
            onClick={() => navigate('/trip')}
            className="px-4 py-3.5 rounded-2xl bg-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-700"
          >
            <span>View Summary</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
