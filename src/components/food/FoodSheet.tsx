import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { BottomSheet } from '../common/BottomSheet';
import type { RestaurantPlace } from '../../utils/destinationData';
import { Star, MapPin, Navigation, Car, Heart, RefreshCw } from 'lucide-react';
import { getApiBaseUrl, DEFAULT_HEADERS } from '../../config/apiConfig';

export const FoodSheet: React.FC = () => {
  const { isFoodSheetOpen, setIsFoodSheetOpen, openCabModal, openInAppNavigation, toggleSavePlace, userProfile, activeTrip, userLocation, userLocationName } = useApp();
  const { currentTrip } = useTrip();

  const activeDestName = currentTrip?.destination?.name || (typeof activeTrip?.destination === 'string' ? activeTrip.destination : userLocationName || 'Nearby');
  const activeDestCoords: [number, number] | null = userLocation || (
    currentTrip?.destination?.latitude && currentTrip?.destination?.longitude
      ? [currentTrip.destination.latitude, currentTrip.destination.longitude]
      : null
  );

  const [dynamicRestaurants, setDynamicRestaurants] = useState<RestaurantPlace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'All' | 'Local Special' | 'Pure Veg'>('All');

  const categories = ['All', 'Local Special', 'Pure Veg'] as const;

  useEffect(() => {
    if (!isFoodSheetOpen) return;
    if (!activeDestCoords) {
      setDynamicRestaurants([]);
      return;
    }
    setIsLoading(true);

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/places/nearby?lat=${activeDestCoords[0]}&lng=${activeDestCoords[1]}&category=food&limit=25`;

    fetch(url, { headers: DEFAULT_HEADERS })
      .then(res => res.json())
      .then(data => {
        const rawItems = Array.isArray(data) ? data : (data.places || data.results || []);
        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const formatted: RestaurantPlace[] = rawItems.map((p: any, idx: number) => ({
            id: p.id || `food-${idx}`,
            name: p.name || 'Local Eatery',
            rating: p.rating || 4.5,
            cuisine: p.cuisine ? (Array.isArray(p.cuisine) ? p.cuisine : [p.cuisine]) : ['Local Dining', 'Regional Food'],
            priceRange: p.price_approx || '₹₹',
            location: p.address || p.description || activeDestName,
            coordinates: [p.latitude || activeDestCoords[0], p.longitude || activeDestCoords[1]],
            distanceKm: p.distance_meters ? Number((p.distance_meters / 1000).toFixed(1)) : 1.2,
            openingHours: '10:00 AM – 11:00 PM',
            photos: p.photos && p.photos.length > 0 ? p.photos : ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'],
            dietary: ['Vegetarian Friendly', 'Dine-in']
          }));
          setDynamicRestaurants(formatted);
        } else {
          setDynamicRestaurants([]);
        }
      })
      .catch(err => {
        console.warn("Dynamic food places fetch error:", err);
        setDynamicRestaurants([]);
      })
      .finally(() => setIsLoading(false));
  }, [isFoodSheetOpen, activeDestCoords, activeDestName]);

  const displayRestaurants = dynamicRestaurants.filter(r => {
    if (filter === 'Local Special') return r.cuisine.some(c => c.toLowerCase().includes('local') || c.toLowerCase().includes('special') || c.toLowerCase().includes('thali') || c.toLowerCase().includes('signature'));
    if (filter === 'Pure Veg') return (r.dietary || []).some(d => d.toLowerCase().includes('veg'));
    return true;
  });

  return (
    <BottomSheet
      isOpen={isFoodSheetOpen}
      onClose={() => setIsFoodSheetOpen(false)}
      height="expanded"
      title={`Food & Dining in ${activeDestName}`}
    >
      <div className="p-4 space-y-4">
        {isLoading && (
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            <span>Fetching live nearby dining spots for {activeDestName}...</span>
          </div>
        )}
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`press-scale shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === cat
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Restaurant Cards List */}
        <div className="space-y-3">
          {displayRestaurants.map(r => {
            const isSaved = userProfile.savedPlaces.includes(r.name);
            return (
              <div key={r.id} className="surface-card p-4 space-y-3">
                <div className="flex gap-3">
                  <img
                    src={r.photos[0]}
                    alt={r.name}
                    className="w-20 h-20 rounded-xl object-cover shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-base text-white truncate">{r.name}</h4>
                      <button
                        onClick={() => toggleSavePlace(r.name)}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
                        aria-label="Save restaurant"
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      {r.location} · <span className="font-mono text-teal-300">{r.distanceKm} km</span>
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" /> {r.rating}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-mono font-bold text-teal-400">{r.priceRange}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-300 truncate">{r.cuisine.join(', ')}</span>
                    </div>
                  </div>
                </div>

                {/* 1-Tap Action Buttons */}
                <div className="flex gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => {
                      setIsFoodSheetOpen(false);
                      openCabModal(r.name);
                    }}
                    className="flex-1 touch-target press-scale py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-500/15"
                  >
                    <Car className="w-4 h-4" /> Book Cab Ride
                  </button>
                  <button
                    onClick={() => {
                      if (r.coordinates && r.coordinates[0] && r.coordinates[1]) {
                        openInAppNavigation({
                          title: r.name,
                          locationName: r.location,
                          coordinates: r.coordinates,
                        });
                        setIsFoodSheetOpen(false);
                      }
                    }}
                    className="flex-1 touch-target press-scale py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-4 h-4 text-teal-400" /> Directions
                  </button>
                </div>
              </div>
            );
          })}

          {displayRestaurants.length === 0 && !isLoading && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No dining spots found around this location.
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};
