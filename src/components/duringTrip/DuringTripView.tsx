import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Zap, Sun, Car, MapPin, Compass, Sparkles, Navigation, Phone } from 'lucide-react';

export const DuringTripView: React.FC = () => {
  const navigate = useNavigate();
  const { openCabModal, openAiAssistant, userProfile, openInAppNavigation, setTripView } = useApp();

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      
      {/* Live Trip Banner */}
      <div className="glass-panel p-6 lg:p-8 rounded-3xl border border-white/10 bg-[#111622] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-teal-400" />
              <span>LIVE TRIP MODE • DAY 1 ACTIVE</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Good morning, {userProfile.name.split(' ')[0]}.
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">Here's your live itinerary & contextual updates for today in Goa.</p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
            <Sun className="w-5 h-5 text-slate-300" />
            <div>
              <span className="font-mono font-bold text-base text-white">31°C</span>
              <p className="text-[11px] text-slate-400">Sunny • Vagator Beach</p>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Current Activity Highlight */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-[#111622]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Happening Now</span>
            <span className="text-xs font-mono font-bold text-white">09:30 AM</span>
          </div>

          <div>
            <h3 className="font-extrabold text-lg text-white">Arrival at Mopa International Airport</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> North Goa Airport (GOX) Gate 4
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
            Flight 6E-204 landed safely. Collect baggage at Belt 3.
          </div>
        </div>

        {/* Next Up & Cab Status */}
        <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 bg-[#111622]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Activity (in 45 mins)</span>
            <span className="text-xs font-mono font-bold text-teal-300">Cab Arriving in 12 min</span>
          </div>

          <div>
            <h3 className="font-extrabold text-lg text-white">Airport Transfer to W Goa Resort</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <Car className="w-3.5 h-3.5 text-slate-400" /> Driver: Rajesh Kumar (GA-03-Z-8821)
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-400 font-mono">Est. Transit: 45 mins</span>
            <button 
              onClick={() => openCabModal('W Goa Oceanfront Resort')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10"
            >
              Track Driver
            </button>
          </div>
        </div>

      </div>

      {/* QUICK CONTEXTUAL ACTIONS */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-[#111622]">
        <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Quick Actions</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-medium text-slate-200">
          <button 
            onClick={() => {
              setTripView('rides');
              navigate('/trip/rides');
            }}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all"
          >
            <Car className="w-5 h-5 text-teal-400" />
            <span>Book Cab</span>
          </button>

          <button 
            onClick={() => openInAppNavigation({
              title: "Mopa International Airport Transfer",
              locationName: "North Goa Airport (GOX) Gate 4",
              coordinates: [15.7533, 73.8744],
              dayNumber: 1
            })}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all"
          >
            <Navigation className="w-5 h-5 text-slate-300" />
            <span>Navigate</span>
          </button>

          <button 
            onClick={() => openAiAssistant("Can we move today's beach visit to tomorrow?")}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all"
          >
            <Sparkles className="w-5 h-5 text-teal-400" />
            <span>Change Plan</span>
          </button>

          <button 
            onClick={() => {
              setTripView('food');
              navigate('/trip/food');
            }}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all"
          >
            <Compass className="w-5 h-5 text-slate-300" />
            <span>Find Food</span>
          </button>

          <button 
            onClick={() => openAiAssistant()}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-2 transition-all"
          >
            <Sparkles className="w-5 h-5 text-teal-400" />
            <span>Ask AI</span>
          </button>

          <button 
            onClick={() => alert('Emergency Tourist Helpline: 112 / Goa Police Tourist Counter: 0832-2419440')}
            className="p-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 flex flex-col items-center gap-2 transition-all"
          >
            <Phone className="w-5 h-5 text-rose-400" />
            <span>Emergency</span>
          </button>
        </div>
      </div>

    </div>
  );
};
