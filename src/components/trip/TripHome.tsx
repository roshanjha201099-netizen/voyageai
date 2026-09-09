import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, Check, Circle, ArrowRight, Navigation, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PackageInclusions } from '../travel/PackageInclusions';

export const TripHome: React.FC = () => {
  const { activeTrip, openCabModal, openAiAssistant, expenses } = useApp();
  const navigate = useNavigate();

  const currentDay = activeTrip.currentDay || 2;
  const todayItinerary = activeTrip.itinerary.find(d => d.dayNumber === currentDay) || activeTrip.itinerary[1];
  const activities = todayItinerary?.activities || [];

  const currentIdx = activities.findIndex(a => !a.isCompleted);
  const currentActivity = currentIdx >= 0 ? activities[currentIdx] : activities[0];
  const nextActivity = currentIdx >= 0 && currentIdx + 1 < activities.length ? activities[currentIdx + 1] : null;

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── AI CONCIERGE TIP ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 via-[#111624] to-[#111624] border border-teal-500/30 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">AI Concierge Tip</p>
            <p className="text-xs text-slate-300 mt-0.5">Beach visit ends soon. Want lunch recommendations nearby?</p>
          </div>
        </div>
        <button
          onClick={() => openAiAssistant("Recommend lunch near Baga Beach")}
          className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
        >
          Show
        </button>
      </div>

      {/* ── NOW HERO CARD ── */}
      {currentActivity && (
        <div className="surface-card p-5 space-y-3.5 border-teal-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-br from-[#141A24] to-[#0A0D14]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
              Happening Now
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">{currentActivity.time} ({currentActivity.duration})</span>
          </div>

          <h2 className="text-xl font-extrabold text-white">{currentActivity.title}</h2>
          
          <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
            {currentActivity.location}
          </p>

          <p className="text-xs text-slate-400 leading-relaxed">{currentActivity.description}</p>

          <button
            onClick={() => openCabModal(currentActivity.location)}
            className="cta-primary text-xs py-3 w-full"
          >
            <Navigation className="w-4 h-4" />
            <span>Get Directions / Book Cab</span>
          </button>
        </div>
      )}

      {/* ── UP NEXT CARD ── */}
      {nextActivity && (
        <button
          onClick={() => openCabModal(nextActivity.location)}
          className="w-full surface-card p-4 text-left press-scale flex items-center justify-between hover:border-white/20 transition-all"
        >
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Up Next ({nextActivity.time})</span>
            <h3 className="text-sm font-bold text-white mt-0.5">{nextActivity.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{nextActivity.location}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      )}

      {/* ── YOUR TRIP INCLUDES (Package Summary) ── */}
      {activeTrip.inclusions && (
        <PackageInclusions
          hotelName={activeTrip.inclusions.hotelName}
          hotelNights={activeTrip.inclusions.hotelNights}
          transfers={activeTrip.inclusions.transfers}
          activitiesCount={activeTrip.inclusions.activitiesCount}
          diningCount={activeTrip.inclusions.diningCount}
          onItemClick={(type) => navigate(type === 'activities' ? '/trip/itinerary' : type === 'transport' ? '/trip/bookings' : '/trip/guide')}
        />
      )}

      {/* ── TIMELINE STORYTELLING ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-section font-bold text-white">Day {currentDay} Timeline</h3>
          <button onClick={() => navigate('/trip/itinerary')} className="text-xs font-semibold text-teal-400 hover:underline">
            Full Itinerary
          </button>
        </div>

        <div className="space-y-2.5">
          {activities.map((act) => {
            const isDone = act.isCompleted;
            const isCurrent = act.id === currentActivity?.id;

            return (
              <div
                key={act.id}
                onClick={() => openCabModal(act.location)}
                className={`surface-card p-4 transition-all cursor-pointer ${
                  isCurrent ? 'border-teal-500/50 bg-teal-950/20' : isDone ? 'opacity-50' : 'hover:border-white/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    {isDone ? (
                      <div className="p-1 rounded-full bg-teal-500/20 text-teal-400">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-5 h-5 rounded-full bg-teal-400 ring-4 ring-teal-400/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-950" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-bold text-sm ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {act.title}
                      </h4>
                      <span className="text-xs font-mono text-slate-400 shrink-0 ml-2">{act.time}</span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" /> {act.location}
                    </p>

                    {act.photos && act.photos.length > 0 && !isDone && (
                      <div className="mt-2.5 h-28 rounded-xl overflow-hidden relative">
                        <img src={act.photos[0]} alt={act.title} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SPENDING SUMMARY CARD ── */}
      <div
        onClick={() => navigate('/trip/expenses')}
        className="surface-card p-4 cursor-pointer flex items-center justify-between hover:border-white/20 transition-all"
      >
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip Budget Spent</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-extrabold text-white font-mono">₹{totalSpent.toLocaleString()}</span>
            <span className="text-xs text-slate-400">/ ₹{activeTrip.budgetTotal.toLocaleString()}</span>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500" />
      </div>

    </div>
  );
};
