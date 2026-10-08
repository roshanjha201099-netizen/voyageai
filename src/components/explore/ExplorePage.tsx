import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { useNavigation } from '../../context/NavigationContext';
import { getApiBaseUrl, DEFAULT_HEADERS } from '../../config/apiConfig';
import {
  Compass, MapPin, Sparkles, Plus, Check, Calendar,
  Clock, Tag, Star, Navigation, Layers, Bookmark
} from 'lucide-react';
import type { ActivityItem, EventItem } from '../../types';
import { AddToItineraryModal, type AddToItineraryPayload } from '../itinerary/AddToItineraryModal';
import { sanitizeLocationName } from '../../utils/locationSanitizer';
import { isMockPayload } from '../../utils/mockIndicator';
import { MockCardAlert } from '../common/MockCardAlert';

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const { userLocationName, userLocation } = useApp();
  const { currentTrip, refetchItinerary } = useTrip();
  const { navigateToMap, exploreFocusTarget, setExploreFocusTarget } = useNavigation();

  // Dynamic live location city name
  const liveLocationCity = sanitizeLocationName(userLocationName);
  const liveCityName = liveLocationCity;
  const hasActiveTrip = Boolean(currentTrip?.destination?.name);

  // Context switch state: 'gps' or 'trip'
  const [contextMode, setContextMode] = useState<'gps' | 'trip'>('gps');

  // Active Category filter
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Spotlight Data fetched from backend or dynamic fallback
  const activeDestinationName = (contextMode === 'trip' && currentTrip?.destination?.name)
    ? currentTrip.destination.name
    : liveLocationCity;

  const [spotlightDestination, setSpotlightDestination] = useState<string>(activeDestinationName);
  const [spotlightOverview, setSpotlightOverview] = useState<string>('');
  const [spotlightActivities, setSpotlightActivities] = useState<ActivityItem[]>([]);
  const [spotlightEvents, setSpotlightEvents] = useState<EventItem[]>([]);
  const [isLoadingSpotlight, setIsLoadingSpotlight] = useState<boolean>(false);

  // Day picker modal state & added item day map
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<ActivityItem | null>(null);
  const [addedItemDays, setAddedItemDays] = useState<Map<string, number>>(new Map());

  // Saved Places Management State & Handlers
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchSavedPlaces = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/user/saved-places`, { headers: DEFAULT_HEADERS });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setSavedPlaceIds(new Set(data.map((p: any) => p.place_id || p.id)));
            return;
          }
        }
      } catch (err) {
        console.warn('[FETCH SAVED PLACES WARN]', err);
      }
      try {
        const local = localStorage.getItem('voyage_saved_places');
        if (local) {
          const parsed = JSON.parse(local);
          setSavedPlaceIds(new Set(parsed));
        }
      } catch (e) { }
    };
    fetchSavedPlaces();
  }, []);

  const handleToggleSave = async (item: ActivityItem) => {
    const isSaved = savedPlaceIds.has(item.id);
    const nextSet = new Set(savedPlaceIds);
    if (isSaved) {
      nextSet.delete(item.id);
    } else {
      nextSet.add(item.id);
    }
    setSavedPlaceIds(nextSet);

    try {
      localStorage.setItem('voyage_saved_places', JSON.stringify(Array.from(nextSet)));
    } catch (e) { }

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/user/saved-places`, {
        method: isSaved ? 'DELETE' : 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          place_id: item.id,
          title: item.title,
          category: item.category,
          location: item.location,
          coordinates: item.coordinates
        })
      });
    } catch (err) {
      console.warn('[SAVE PLACE ERROR]', err);
    }
  };

  const handleNavigate = (item: ActivityItem) => {
    if (item.coordinates && item.coordinates.length === 2 && item.coordinates[0] !== 0) {
      const [lat, lng] = item.coordinates;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title + ' ' + item.location)}`, '_blank');
    }
  };

  const handleAskAI = (item: ActivityItem) => {
    window.dispatchEvent(new CustomEvent('voyage:ai-query', {
      detail: { query: `Tell me more about ${item.title} in ${item.location}. What are the must-try items, best timings, and local tips?` }
    }));
  };

  // Highlight ref for deep-linked place
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 1. Fetch AI Destination Highlights from /api/trips/:destination/highlights
  useEffect(() => {
    let isMounted = true;
    const fetchHighlights = async () => {
      setIsLoadingSpotlight(true);
      const dest = activeDestinationName;

      const queryParams: string[] = [];
      if (contextMode === 'gps') {
        if (userLocation && userLocation[0] && userLocation[1]) {
          queryParams.push(`lat=${userLocation[0]}&lng=${userLocation[1]}`);
        }
        if (dest) {
          queryParams.push(`destination=${encodeURIComponent(dest)}`);
        }
      } else {
        if (dest) {
          queryParams.push(`destination=${encodeURIComponent(dest)}`);
        }
        if (currentTrip?.destination?.latitude && currentTrip?.destination?.longitude) {
          queryParams.push(`lat=${currentTrip.destination.latitude}&lng=${currentTrip.destination.longitude}`);
        }
      }

      const baseUrl = getApiBaseUrl();
      const endpoint = `${baseUrl}/api/trips/highlights?${queryParams.join('&')}`;

      try {
        const res = await fetch(endpoint, {
          headers: DEFAULT_HEADERS,
        });

        if (res.ok) {
          const json = await res.json();

          if (isMounted) {
            const fetchedActs = Array.isArray(json?.activities)
              ? json.activities
              : Array.isArray(json?.famous_activities)
                ? json.famous_activities
                : [];

            const fetchedEvts = Array.isArray(json?.events)
              ? json.events
              : Array.isArray(json?.upcoming_events)
                ? json.upcoming_events
                : [];

            setSpotlightDestination(json?.destination || dest);
            setSpotlightOverview(json?.overview || '');
            setSpotlightActivities(fetchedActs);
            setSpotlightEvents(fetchedEvts);
            setIsLoadingSpotlight(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn('[EXPLORE] Failed to fetch spotlight highlights:', err);
      }

      if (isMounted) {
        setSpotlightActivities([]);
        setSpotlightEvents([]);
        setIsLoadingSpotlight(false);
      }
    };

    fetchHighlights();

    return () => {
      isMounted = false;
    };
  }, [activeDestinationName, contextMode]);

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

  // Handle Add to Itinerary confirmation from modal
  const handleConfirmAddToItinerary = async (payload: AddToItineraryPayload) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddedItemDays((prev) => new Map(prev).set(payload.item_id, payload.day_number));
        if (refetchItinerary) {
          await refetchItinerary(currentTrip?.id || payload.trip_id);
        }
      }
    } catch (err) {
      console.warn('[EXPLORE] Add to itinerary API error:', err);
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
    <div className="w-full max-w-xl mx-auto px-4 pb-28 space-y-6 bg-white text-gray-900 overflow-x-hidden animate-fadeIn min-h-screen">

      {/* ── 1. Top Header ── */}
      <div className="space-y-3 pt-2 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 tracking-tight truncate">
              <Compass className="w-6 h-6 text-[#1F5A3F] shrink-0" />
              Explore &amp; Discover
            </h1>
            <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">
              Curated experiences, AI spot highlights &amp; itinerary builder
            </p>
          </div>

          <button
            onClick={() => navigateToMap({
              id: 'user-live',
              name: liveCityName,
              coordinates: userLocation || [26.2376, 86.2021],
              zoom: 16
            })}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-[#1F5A3F] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all press-scale shrink-0"
          >
            <Navigation className="w-3.5 h-3.5 fill-[#1F5A3F]" />
            Map Mode
          </button>
        </div>

        {/* ── 2. Context Switcher (Near Me vs Trip) ── */}
        <div className="p-1 rounded-2xl bg-gray-50 border border-gray-200 flex gap-1 w-full max-w-full">
          <button
            onClick={() => setContextMode('gps')}
            className={`flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${contextMode === 'gps' || !hasActiveTrip
                ? 'bg-[#1F5A3F] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
              }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Near Me ({liveCityName})</span>
          </button>

          {hasActiveTrip ? (
            <button
              onClick={() => setContextMode('trip')}
              className={`flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${contextMode === 'trip'
                  ? 'bg-[#1F5A3F] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Trip ({currentTrip?.destination?.name})</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/trips')}
              className="flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-600 border border-dashed border-gray-300 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Plan a Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. AI Destination Spotlight Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-[#1F5A3F] p-5 shadow-lg w-full max-w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 w-full max-w-full">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90 text-[11px] font-semibold flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3" /> AI Destination Spotlight
            </span>
            <span className="text-xs font-semibold text-amber-200 flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-200" /> 4.9 Superb
            </span>
          </div>

          <div className="w-full max-w-full">
            <h2 className="text-xl font-semibold text-white tracking-tight break-words">
              {spotlightDestination} Highlights
            </h2>
            <p className="text-xs text-white/75 mt-1 leading-relaxed break-words">
              {spotlightOverview}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-4 text-xs font-medium text-white/70 border-t border-white/15 flex-wrap">
            <div className="flex items-center gap-1 text-white">
              <Check className="w-3.5 h-3.5" /> {spotlightActivities.length} Top Places
            </div>
            <div className="flex items-center gap-1 text-white">
              <Calendar className="w-3.5 h-3.5" /> {spotlightEvents.length} Live Events
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Category Filter Pills ── */}
      <div className="w-full max-w-full flex items-center gap-5 overflow-x-auto no-scrollbar border-b border-gray-200">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`press-scale shrink-0 pb-2.5 text-xs font-semibold transition-all relative ${isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {cat}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#1F5A3F] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── 4. Upcoming Events Carousel (Shown when 'All' or 'Events' selected) ── */}
      {(activeCategory === 'All' || activeCategory === 'Events') && spotlightEvents.length > 0 && (
        <div className="space-y-3 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#1F5A3F] shrink-0" />
              Upcoming Events &amp; Festivals
            </h3>
            <span className="text-xs text-[#1F5A3F] font-semibold truncate">Live in {spotlightDestination}</span>
          </div>

          <div className="w-full max-w-full flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {spotlightEvents.map((evt) => (
              <div
                key={evt.id}
                className="shrink-0 w-64 rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm space-y-2 p-3"
              >
                <div className="h-32 rounded-xl overflow-hidden relative bg-gray-100">
                  <img src={evt.image} alt={evt.title} className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold text-[#1F5A3F] border border-gray-200">
                    {evt.tag || evt.category}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{evt.title}</h4>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-400" /> {evt.date} • {evt.time}
                  </p>
                  <p className="text-[11px] text-[#1F5A3F] font-semibold mt-1">₹{evt.price} per ticket</p>
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
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#1F5A3F]" />
              Must-Visit Places &amp; Activities ({filteredActivities.length})
            </h3>
          </div>

          {isLoadingSpotlight ? (
            <div className="py-12 text-center text-xs font-medium text-gray-400 animate-pulse">
              Loading AI-curated destination highlights...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-xs font-medium text-gray-400 bg-gray-50 rounded-3xl border border-gray-200 p-6">
              No active spotlights found in this immediate area. Expand your radius or search nearby hubs.
            </div>
          ) : (
            filteredActivities.map((act) => {
              if (isMockPayload(act)) {
                return (
                  <MockCardAlert
                    key={act.id}
                    title={act.title}
                    location={act.location}
                    headsUp={act.description || 'MOCK: Live data failed to fetch from backend'}
                  />
                );
              }

              const isFocusTarget = exploreFocusTarget?.placeId === act.id;

              return (
                <div
                  key={act.id}
                  ref={(el) => { cardRefs.current[act.id] = el; }}
                  className={`group rounded-3xl overflow-hidden bg-white border transition-all duration-300 shadow-sm ${isFocusTarget
                      ? 'border-[#1F5A3F] ring-2 ring-[#1F5A3F]/30'
                      : 'border-gray-200 hover:border-[#1F5A3F]/40'
                    }`}
                >
                  {/* Card Cover Image with Gradient Overlay */}
                  <div className="h-48 relative overflow-hidden bg-gray-100">
                    <img
                      src={act.photos?.[0] || getFallbackImage(act.category)}
                      alt={act.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Tag Pill */}
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-semibold text-[#1F5A3F] border border-white/40 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {act.tag || act.category}
                    </span>

                    {/* Duration & Rating */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[11px] font-semibold text-gray-600 border border-white/40 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500" /> {act.duration}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[11px] font-semibold text-amber-600 border border-white/40 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500" /> {act.rating || 4.8}
                      </span>
                    </div>

                    {/* Title & Location Overlay */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-lg font-semibold text-white leading-tight drop-shadow-md">
                        {act.title}
                      </h3>
                      <p className="text-xs text-white/85 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{act.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Content & Action CTAs */}
                  <div className="p-4 space-y-3">
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {act.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs gap-2">
                      <span className="font-semibold text-[#1F5A3F]">
                        {act.cost > 0 ? `Est. ₹${act.cost}` : 'Free Entry'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* 1. Navigate / Directions (Both Modes) */}
                        <button
                          onClick={() => handleNavigate(act)}
                          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200 transition-all press-scale"
                          title="Get Directions in Google Maps"
                        >
                          <Navigation className="w-3.5 h-3.5 text-[#1F5A3F]" />
                        </button>

                        {/* 2. Save Place / Bookmark (Both Modes) */}
                        <button
                          onClick={() => handleToggleSave(act)}
                          className={`p-2 rounded-xl border transition-all press-scale ${savedPlaceIds.has(act.id)
                              ? 'bg-[#1F5A3F]/10 text-[#1F5A3F] border-[#1F5A3F]/30'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-200'
                            }`}
                          title={savedPlaceIds.has(act.id) ? 'Saved' : 'Save Place'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${savedPlaceIds.has(act.id) ? 'fill-[#1F5A3F] text-[#1F5A3F]' : ''}`} />
                        </button>

                        {/* 3. Ask AI (Both Modes) */}
                        <button
                          onClick={() => handleAskAI(act)}
                          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-200 transition-all press-scale flex items-center gap-1"
                          title="Ask AI Concierge"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        </button>

                        {/* 4. Add to Itinerary (ONLY IN TRIP MODE) */}
                        {contextMode === 'trip' && (
                          <button
                            onClick={() => setSelectedPlaceForModal(act)}
                            className={`px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all press-scale ${addedItemDays.has(act.id)
                                ? 'bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/30'
                                : 'bg-[#1F5A3F] hover:bg-[#194B34] text-white shadow-sm'
                              }`}
                          >
                            {addedItemDays.has(act.id) ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Added to Day {addedItemDays.get(act.id)}
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Add to Itinerary</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Day Picker Bottom Sheet Modal */}
      <AddToItineraryModal
        isOpen={Boolean(selectedPlaceForModal)}
        onClose={() => setSelectedPlaceForModal(null)}
        place={selectedPlaceForModal}
        currentTrip={currentTrip}
        onConfirm={handleConfirmAddToItinerary}
      />

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


