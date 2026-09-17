import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, ArrowRight, Compass, Ticket } from 'lucide-react';

export interface ActivityItem {
  id: string;
  title: string;
  category: string;
  tag: string;
  price: string;
  location?: string;
}

export const TripSpotlightBanner: React.FC<{
  tripDestination: string;
  tripDates?: string;
  isLocalMode: boolean;
}> = ({ tripDestination, tripDates = "Upcoming Trip", isLocalMode }) => {
  const [highlights, setHighlights] = useState<any>(null);

  useEffect(() => {
    if (!tripDestination) return;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    fetch(`${baseUrl}/api/trips/${encodeURIComponent(tripDestination)}/highlights`)
      .then((res) => res.json())
      .then((data) => setHighlights(data))
      .catch((err) => console.error("Highlights load error:", err));
  }, [tripDestination]);

  if (!highlights) return null;

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/80 border border-emerald-500/20 p-4 shadow-xl backdrop-blur-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Compass className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 truncate">
              {isLocalMode ? `Next Stop: ${tripDestination}` : `Active Itinerary: ${tripDestination}`}
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
              Must-Do Activities & Events
            </h3>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium bg-white/5 px-2.5 py-1 rounded-full border border-white/5 shrink-0">
          <Calendar className="w-3 h-3 text-emerald-400" /> {tripDates}
        </span>
      </div>

      {/* Horizontal Carousel for Activities */}
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
        {highlights.famous_activities?.map((act: any) => (
          <div
            key={act.id}
            className="w-56 shrink-0 snap-start p-3 rounded-xl bg-slate-800/60 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-emerald-300 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10">
                  {act.tag}
                </span>
                <span className="text-slate-400 font-medium">{act.price}</span>
              </div>
              <div className="text-xs font-bold text-slate-100 line-clamp-1 mt-1">
                {act.title}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {act.location}
              </div>
            </div>

            <button 
              type="button" 
              className="mt-3 w-full py-1.5 text-[11px] font-semibold text-slate-200 bg-white/5 hover:bg-emerald-500 hover:text-slate-950 rounded-lg transition-colors flex items-center justify-center gap-1"
            >
              <Ticket className="w-3 h-3" /> Explore
            </button>
          </div>
        ))}

        {/* Live / Upcoming Event Card */}
        {highlights.upcoming_events?.[0] && (
          <div className="w-56 shrink-0 snap-start p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">
                <Sparkles className="w-3 h-3" /> Event Alert
              </div>
              <div className="text-xs font-bold text-white line-clamp-1">
                {highlights.upcoming_events[0].title}
              </div>
              <div className="text-[11px] text-slate-300 mt-1">
                {highlights.upcoming_events[0].date}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {highlights.upcoming_events[0].venue}
              </div>
            </div>
            <div className="mt-3 text-[10px] font-bold text-amber-400 flex items-center justify-end gap-1">
              Happening Live <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
