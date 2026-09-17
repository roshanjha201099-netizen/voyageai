import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { useNavigation } from '../../context/NavigationContext';
import { getApiBaseUrl, DEFAULT_HEADERS } from '../../config/apiConfig';
import {
  Compass, MapPin, Sparkles, Plus, Check, Calendar,
  Clock, Tag, Star, Navigation, Layers
} from 'lucide-react';
import type { ActivityItem, EventItem } from '../../types';

export const ExplorePage: React.FC = () => {
  const { userLocationName, userLocation } = useApp();
  const { currentTrip } = useTrip();
  const { navigateToMap, exploreFocusTarget, setExploreFocusTarget } = useNavigation();

  // Context switch state: 'gps' or 'trip'
  const [contextMode, setContextMode] = useState<'gps' | 'trip'>('gps');

  // Active Category filter
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  // Spotlight Data fetched from backend or mock
  const [spotlightDestination, setSpotlightDestination] = useState<string>('Goa');
  const [spotlightOverview, setSpotlightOverview] = useState<string>('Sun-kissed beaches, Portuguese heritage, and thriving coastal gastronomy.');
  const [spotlightActivities, setSpotlightActivities] = useState<ActivityItem[]>([]);
  const [spotlightEvents, setSpotlightEvents] = useState<EventItem[]>([]);
  const [isLoadingSpotlight, setIsLoadingSpotlight] = useState<boolean>(false);

  // Optimistic "Added to Itinerary" state tracker
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);

  // Highlight ref for deep-linked place
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const activeDestinationName = contextMode === 'trip' && currentTrip?.destination?.name
    ? currentTrip.destination.name
    : 'Goa';

  // 1. Fetch AI Destination Highlights from /api/trips/:destination/highlights
  useEffect(() => {
    let isMounted = true;
    const fetchHighlights = async () => {
      setIsLoadingSpotlight(true);
      const dest = activeDestinationName;
      setSpotlightDestination(dest);

      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/trips/${encodeURIComponent(dest)}/highlights`, {
          headers: DEFAULT_HEADERS,
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data) {
            setSpotlightOverview(data.overview || `${dest} top attractions and experiences.`);
            if (data.activities && Array.isArray(data.activities) && data.activities.length > 0) {
              setSpotlightActivities(data.activities);
            } else {
              setSpotlightActivities(getMockActivities(dest));
            }
            if (data.events && Array.isArray(data.events) && data.events.length > 0) {
              setSpotlightEvents(data.events);
            } else {
              setSpotlightEvents(getMockEvents(dest));
            }
            setIsLoadingSpotlight(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[EXPLORE] Failed to fetch spotlight highlights, using mock data:', err);
      }

      if (isMounted) {
        setSpotlightActivities(getMockActivities(dest));
        setSpotlightEvents(getMockEvents(dest));
        setIsLoadingSpotlight(false);
      }
    };

    fetchHighlights();

    return () => {
      isMounted = false;
    };
  }, [activeDestinationName]);

  // 2. Handle deep link from Map mode
  useEffect(() => {
    if (exploreFocusTarget?.placeId) {
      if (exploreFocusTarget.category) {
        setActiveCategory(exploreFocusTarget.category);
      }
      const el = cardRefs.current[exploreFocusTarget.placeId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Clear focus target after handling
      const timer = setTimeout(() => {
        setExploreFocusTarget(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [exploreFocusTarget, setExploreFocusTarget]);

  // Handle Add to Itinerary with optimistic updates
  const handleAddToItinerary = async (item: ActivityItem) => {
    setAddingId(item.id);
    // Optimistic UI update
    setAddedItemIds((prev) => new Set(prev).add(item.id));

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          trip_id: currentTrip?.id || 'active_trip',
          destination: spotlightDestination,
          item_id: item.id,
          title: item.title,
          location: item.location,
          tag: item.tag || item.category,
          price: `₹${item.cost}`,
        }),
      });
    } catch (err) {
      console.warn('[EXPLORE] Add to itinerary API warning:', err);
    } finally {
      setAddingId(null);
    }
  };

  const categories = ['All', 'Food', 'Sights', 'Events', 'Nightlife', 'Culture', 'Adventure'];

  const filteredActivities = spotlightActivities.filter((act) => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Events') return false;
    const catLower = (act.category || '').toLowerCase();
    const tagLower = (act.tag || '').toLowerCase();
    const filterLower = activeCategory.toLowerCase();
    return catLower.includes(filterLower) || tagLower.includes(filterLower);
  });

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn text-slate-100">

      {/* ── 1. Top Bar & Mode Context Switcher ── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
              <Compass className="w-6 h-6 text-emerald-500 animate-spin-slow" />
              Explore & Discover
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Curated experiences, AI spot highlights & itinerary builder
            </p>
          </div>

          <button
            onClick={() => navigateToMap({
              id: 'user-live',
              name: userLocationName || 'Live Location',
              coordinates: userLocation || [26.2376, 86.2021],
              zoom: 16
            })}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/20 press-scale"
          >
            <Navigation className="w-3.5 h-3.5 fill-emerald-400" /> Map Mode
          </button>
        </div>

        {/* Context Switcher (Live GPS vs Trip Context) */}
        <div className="p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 flex gap-1">
          <button
            onClick={() => setContextMode('gps')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              contextMode === 'gps'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>Near Me ({userLocationName ? userLocationName.split(',')[0] : 'GPS Live'})</span>
          </button>

          <button
            onClick={() => setContextMode('trip')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              contextMode === 'trip'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Trip ({activeDestinationName})</span>
          </button>
        </div>
      </div>

      {/* ── 2. AI Destination Spotlight Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> AI Destination Spotlight
            </span>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" /> 4.9 Superb
            </span>
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {spotlightDestination} Highlights
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {spotlightOverview}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-4 text-xs font-medium text-slate-400 border-t border-white/10">
            <div className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> {spotlightActivities.length} Top Places
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <Calendar className="w-3.5 h-3.5" /> {spotlightEvents.length} Live Events
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`press-scale shrink-0 px-4 py-2 rounded-full text-xs font-extrabold transition-all border ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── 4. Upcoming Events Carousel (Shown when 'All' or 'Events' selected) ── */}
      {(activeCategory === 'All' || activeCategory === 'Events') && spotlightEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-500" />
              Upcoming Events & Festivals
            </h3>
            <span className="text-xs text-amber-500 font-bold">Live in {spotlightDestination}</span>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {spotlightEvents.map((evt) => (
              <div
                key={evt.id}
                className="shrink-0 w-64 rounded-2xl bg-slate-900/90 border border-white/10 overflow-hidden shadow-lg space-y-2 p-3"
              >
                <div className="h-32 rounded-xl overflow-hidden relative bg-slate-800">
                  <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-[10px] font-bold text-amber-300 border border-white/10">
                    {evt.tag || evt.category}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{evt.title}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-emerald-400" /> {evt.date} • {evt.time}
                  </p>
                  <p className="text-[11px] text-emerald-400 font-bold mt-1">₹{evt.price} per ticket</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Filtered Activity Cards List ── */}
      {activeCategory !== 'Events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-500" />
              Must-Visit Places & Activities ({filteredActivities.length})
            </h3>
          </div>

          {isLoadingSpotlight ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
              Loading AI-curated destination highlights...
            </div>
          ) : (
            filteredActivities.map((act) => {
              const isAdded = addedItemIds.has(act.id);
              const isFocusTarget = exploreFocusTarget?.placeId === act.id;

              return (
                <div
                  key={act.id}
                  ref={(el) => { cardRefs.current[act.id] = el; }}
                  className={`group rounded-3xl overflow-hidden bg-slate-900 border transition-all duration-300 shadow-xl ${
                    isFocusTarget
                      ? 'border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20'
                      : 'border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  {/* Card Cover Image with Gradient Overlay */}
                  <div className="h-48 relative overflow-hidden bg-slate-800">
                    <img
                      src={act.photos?.[0] || getFallbackImage(act.category)}
                      alt={act.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                    {/* Tag Pill */}
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-extrabold text-emerald-300 border border-white/10 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-emerald-400" />
                      {act.tag || act.category}
                    </span>

                    {/* Duration & Rating */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-slate-300 border border-white/10 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> {act.duration}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-white/10 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" /> {act.rating || 4.8}
                      </span>
                    </div>

                    {/* Title & Location Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-black text-white leading-tight drop-shadow-md">
                        {act.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Content & Action CTAs */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {act.description}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                      <span className="font-extrabold text-emerald-400">
                        {act.cost > 0 ? `Est. ₹${act.cost}` : 'Free Entry'}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Secondary View on Map button */}
                        <button
                          onClick={() => navigateToMap({
                            id: act.id,
                            name: act.title,
                            category: act.category,
                            coordinates: act.coordinates,
                            zoom: 17,
                            highlight: true,
                            address: act.location,
                          })}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs flex items-center gap-1.5 press-scale"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                          View on Map
                        </button>

                        {/* Prominent Add to Itinerary Button with Optimistic State */}
                        <button
                          onClick={() => handleAddToItinerary(act)}
                          disabled={isAdded || addingId === act.id}
                          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all press-scale ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4 stroke-[3]" /> Added to Trip
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 stroke-[3]" /> Add to Itinerary
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};

// Fallback image provider
function getFallbackImage(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('food') || cat.includes('culinary')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('beach') || cat.includes('sights')) {
    return 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('culture') || cat.includes('heritage')) {
    return 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
}

// Fallback Mock Activities generator
function getMockActivities(dest: string): ActivityItem[] {
  return [
    {
      id: 'act-baga-beach',
      title: 'Baga Beach Water Sports & Sunset Sunset',
      category: 'Adventure',
      tag: 'Adventure',
      time: '04:00 PM',
      duration: '2 hours',
      location: `Baga Beach, ${dest}`,
      coordinates: [15.5553, 73.7517],
      cost: 1200,
      description: 'Experience exhilarating parasailing, jet-ski rides, and breathtaking coastal sunsets.',
      photos: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'],
      rating: 4.9,
    },
    {
      id: 'act-fort-aguada',
      title: 'Fort Aguada & Lighthouse Walk',
      category: 'Heritage',
      tag: 'Heritage',
      time: '09:30 AM',
      duration: '1.5 hours',
      location: `Candolim, ${dest}`,
      coordinates: [15.4924, 73.7737],
      cost: 0,
      description: '17th-century Portuguese fortress with sweeping ocean vistas and historical lighthouse.',
      photos: ['https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80'],
      rating: 4.8,
    },
    {
      id: 'act-fisherman-wharf',
      title: 'The Fisherman\'s Wharf Dining',
      category: 'Culinary',
      tag: 'Culinary',
      time: '01:00 PM',
      duration: '2 hours',
      location: `Cavelossim, ${dest}`,
      coordinates: [15.1764, 73.9431],
      cost: 1500,
      description: 'Authentic Goan crab curry and fresh riverbank seafood prepared with aromatic spices.',
      photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'],
      rating: 4.9,
    },
    {
      id: 'act-fontainhas',
      title: 'Fontainhas Latin Quarter Heritage Trail',
      category: 'Culture',
      tag: 'Culture',
      time: '08:00 AM',
      duration: '2 hours',
      location: `Panaji, ${dest}`,
      coordinates: [15.4989, 73.8311],
      cost: 500,
      description: 'Walk through colorful Portuguese colonial streets, ancient art galleries, and quaint cafes.',
      photos: ['https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'],
      rating: 4.7,
    },
  ];
}

// Fallback Mock Events generator
function getMockEvents(dest: string): EventItem[] {
  return [
    {
      id: 'evt-sunset-fest',
      title: 'Anjuna Beach Sunset & EDM Carnival',
      date: 'Tonight',
      time: '07:00 PM onwards',
      location: `Anjuna Beach, ${dest}`,
      coordinates: [15.5873, 73.7424],
      category: 'Festival',
      tag: 'Music & Vibes',
      price: 999,
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
      description: 'Live DJ beats, beachfront fire spinners, and local food stalls under the stars.',
    },
    {
      id: 'evt-seafood-fest',
      title: 'Panaji Seafood & Spice Tasting Fair',
      date: 'This Weekend',
      time: '12:00 PM - 10:00 PM',
      location: `Mandovi Promenade, ${dest}`,
      coordinates: [15.4989, 73.8311],
      category: 'Food',
      tag: 'Gastronomy',
      price: 300,
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      description: 'Top local chefs present traditional Goan crab, kingfish, and feni cocktail pairings.',
    },
  ];
}
