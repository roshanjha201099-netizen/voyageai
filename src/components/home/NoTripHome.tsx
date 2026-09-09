import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Plus, Compass, Sparkles, MapPin, ArrowRight } from 'lucide-react';
import { mockDestinations } from '../../data/mockData';

export const NoTripHome: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const firstName = userProfile?.firstName || 'Traveler';

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto animate-fadeIn">
      
      {/* Header Greeting */}
      <div className="pt-2 space-y-1">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>VoyageAI Companion</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Where are you heading next, {firstName}?
        </h1>
        <p className="text-sm text-slate-400">
          Plan a trip to keep your itinerary, stays, rides & expenses in one place.
        </p>
      </div>

      {/* Main Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-white">Ready for your next adventure?</h3>
            <p className="text-xs text-slate-400">Takes less than 60 seconds to set up</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/trips/new')}
            className="cta-primary flex-1 py-3.5 text-sm font-bold shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Plan a Trip</span>
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/explore')}
            className="px-4 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-sm font-bold border border-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Compass className="w-4 h-4 text-teal-400" />
            <span>Explore Destinations</span>
          </button>
        </div>
      </div>

      {/* Featured Destination Ideas */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
            Popular Destinations
          </h3>
          <button
            onClick={() => navigate('/explore')}
            className="text-xs text-teal-400 font-semibold flex items-center gap-1 hover:underline"
          >
            <span>See all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mockDestinations.slice(0, 2).map(dest => (
            <div
              key={dest.id}
              onClick={() => navigate('/trips/new')}
              className="surface-card overflow-hidden cursor-pointer group hover:border-teal-500/50 transition-all"
            >
              <div className="h-32 w-full relative overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-white font-bold text-sm">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" />
                  <span>{dest.name}</span>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">{dest.bestTimeToVisit}</span>
                <span className="text-teal-400 font-bold">Plan Trip →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
