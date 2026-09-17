import React, { useEffect, useState } from 'react';
import { Compass, Calendar, Sparkles, MapPin, Plus, Check, Loader2 } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  location: string;
  tag: string;
  price: string;
  duration?: string;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  type?: string;
}

export const TripSpotlightBanner: React.FC<{
  destination: string;
  dates?: string;
  isLocalMode: boolean;
}> = ({ destination = "Goa", dates = "Upcoming", isLocalMode }) => {
  const [data, setData] = useState<{ destination: string; famous_activities: Activity[]; upcoming_events: UpcomingEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const targetDest = destination || 'Goa';
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    fetch(`${baseUrl}/api/trips/${encodeURIComponent(targetDest)}/highlights`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch((err) => console.error("Error loading spotlight:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [destination]);

  const handleAddToItinerary = async (item: Activity | UpcomingEvent, itemType: 'activity' | 'event') => {
    setAddingId(item.id);
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const payload = {
        destination,
        item_id: item.id,
        item_type: itemType,
        title: item.title,
        location: 'location' in item ? item.location : item.venue,
        tag: 'tag' in item ? item.tag : (item.type || 'Event'),
        price: 'price' in item ? item.price : 'Free',
      };

      const res = await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddedIds((prev) => ({ ...prev, [item.id]: true }));
      }
    } catch (err) {
      console.error("Failed to add to itinerary:", err);
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-center gap-2 text-slate-400 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        Curating real-time spotlight for {destination}...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-6 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950/90 border border-emerald-500/20 p-4 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Compass className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {isLocalMode ? `Next Stop • ${data.destination}` : `Active Itinerary • ${data.destination}`}
            </span>
            <h3 className="text-sm font-bold text-white">Must-Do Highlights & Events</h3>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-300 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-emerald-400" /> {dates}
        </span>
      </div>

      {/* Horizontal Carousel */}
      <div className="mt-3.5 flex gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
        {data.famous_activities?.map((act) => {
          const isAdded = !!addedIds[act.id];
          const isAdding = addingId === act.id;

          return (
            <div
              key={act.id}
              className="w-56 shrink-0 snap-start p-3 rounded-xl bg-slate-800/40 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] mb-1.5">
                  <span className="text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {act.tag}
                  </span>
                  <span className="text-slate-300 font-medium">{act.price}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{act.title}</h4>
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 line-clamp-1">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" /> {act.location}
                </p>
              </div>

              {/* Add to Itinerary Button */}
              <button
                type="button"
                disabled={isAdded || isAdding}
                onClick={() => handleAddToItinerary(act, 'activity')}
                className={`mt-3 w-full py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isAdded
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/5 hover:bg-emerald-500 hover:text-slate-950 text-slate-200'
                }`}
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                ) : isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Added to Trip
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add to Itinerary
                  </>
                )}
              </button>
            </div>
          );
        })}

        {/* Live Upcoming Event Card */}
        {data.upcoming_events?.map((evt) => {
          const isAdded = !!addedIds[evt.id];
          const isAdding = addingId === evt.id;

          return (
            <div
              key={evt.id}
              className="w-56 shrink-0 snap-start p-3 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-900/40 to-transparent border border-amber-500/20 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3 h-3" /> Happening Live
                </div>
                <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{evt.title}</h4>
                <p className="text-[11px] text-amber-200/80 font-medium mt-1">{evt.date}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{evt.venue}</p>
              </div>

              <button
                type="button"
                disabled={isAdded || isAdding}
                onClick={() => handleAddToItinerary(evt, 'event')}
                className={`mt-3 w-full py-1.5 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isAdded
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-500/10 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-amber-500/20'
                }`}
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-amber-400" /> Added to Trip
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Add to Itinerary
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
