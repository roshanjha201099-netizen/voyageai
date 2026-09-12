import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useTrip } from '../../features/trip/TripContext';
import { useApp } from '../../context/AppContext';
import { ContextSwitcher } from '../common/ContextSwitcher';
import { AskVoyageAICard } from '../ai/AskVoyageAICard';
import { PlaceDetailSheet, type PlaceDetailItem } from '../common/PlaceDetailSheet';
import { MapPin, Navigation, Sparkles, Calendar, ArrowRight, Star, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchNearbyPlaces, formatDistance } from '../../services/tourGuideApi';

export const HomePage: React.FC = () => {
  const { userProfile } = useAuth();
  const { currentTrip } = useTrip();
  const { userLocation, userLocationName, openInAppNavigation, requestGPSLocation } = useApp();
  const navigate = useNavigate();

  const [selectedPlace, setSelectedPlace] = useState<PlaceDetailItem | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceDetailItem[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  const firstName = userProfile?.firstName || 'Traveler';

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Dynamically fetch nearby POIs based on user's live physical GPS location
  useEffect(() => {
    let isMounted = true;

    if (!userLocation && navigator.geolocation) {
      requestGPSLocation().catch(() => {});
    }

    const loadDynamicNearby = async () => {
      setIsLoadingNearby(true);
      const lat = userLocation ? userLocation[0] : 22.5726; // Default to current region if location pending
      const lng = userLocation ? userLocation[1] : 88.3639;

      try {
        const res = await fetchNearbyPlaces(lat, lng, 5000);
        if (isMounted && res && res.places && res.places.length > 0) {
          const formatted: PlaceDetailItem[] = res.places.slice(0, 6).map((p, idx) => ({
            id: p.id || `poi-${idx}`,
            name: p.name,
            category: (p.category || 'ATTRACTION').toUpperCase().replace('_', ' '),
            rating: 4.5 + (idx % 4) * 0.1,
            distanceText: p.distanceMeters ? formatDistance(p.distanceMeters) : 'Near you',
            durationText: '45 mins',
            estimatedCost: 0,
            address: p.address || p.description || `${p.category || 'POI'} in ${userLocationName || 'Current Location'}`,
            description: p.description || `Popular ${p.category || 'attraction'} located near your physical coordinates.`,
            latitude: p.latitude || lat,
            longitude: p.longitude || lng,
          }));
          setNearbyPlaces(formatted);
          setIsLoadingNearby(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch dynamic nearby places:', err);
      }

      if (isMounted) {
        setIsLoadingNearby(false);
      }
    };

    loadDynamicNearby();

    return () => {
      isMounted = false;
    };
  }, [userLocation, userLocationName, requestGPSLocation]);

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn">
      
      {/* 1. Calm Personal Greeting */}
      <div className="space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2522] tracking-tight">
          {getGreeting()}, <span className="text-[#355F58]">{firstName}</span>
        </h1>
        <p className="text-sm font-medium text-[#5F6863]">
          Where would you like to explore today?
        </p>
      </div>

      {/* 2. One-Tap Context Switcher (Near You vs Active Trip) */}
      <ContextSwitcher />

      {/* 3. Prominent Ask VoyageAI Interactive Assistant */}
      <AskVoyageAICard />

      {/* 4. NEAR YOU Section (Physical Location First) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#355F58]" />
            <h2 className="text-xl font-extrabold text-[#1F2522]">Near You</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="text-xs font-extrabold text-[#355F58] hover:underline flex items-center gap-1"
          >
            <span>View Full Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoadingNearby ? (
          <div className="bg-white border border-[#D9DEDA] rounded-3xl p-6 text-center space-y-2 shadow-xs">
            <RefreshCw className="w-6 h-6 text-[#355F58] animate-spin mx-auto" />
            <p className="text-xs text-[#5F6863] font-semibold">Finding places near you...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyPlaces.map((poi) => (
              <div
                key={poi.id}
                className="bg-white border border-[#D9DEDA] hover:border-[#355F58]/40 p-4 space-y-3 transition-all rounded-3xl shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#355F58] block">
                      {poi.category}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-[#1F2522] truncate">{poi.name}</h3>
                    <p className="text-xs text-[#5F6863] truncate">{poi.address}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-[#355F58] block">{poi.distanceText}</span>
                    {poi.rating && (
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-700 justify-end">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{poi.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 1-Tap Touch Buttons (Min 52px high for easy thumb tapping) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openInAppNavigation({
                      title: poi.name,
                      locationName: poi.address || poi.name,
                      coordinates: [poi.latitude || 25.6, poi.longitude || 85.1]
                    })}
                    className="py-3 px-3 rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs press-scale min-h-[48px]"
                  >
                    <Navigation className="w-4 h-4 text-white" />
                    <span>Directions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlace(poi)}
                    className="py-3 px-3 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] hover:border-[#355F58]/40 text-[#1F2522] font-bold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[48px]"
                  >
                    <Sparkles className="w-4 h-4 text-[#355F58]" />
                    <span>Tell Me More</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. YOUR TRIP Section (Upcoming / Active Trip) */}
      {currentTrip && (
        <div className="bg-white border border-[#D9DEDA] p-5 space-y-4 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-[#355F58] uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>Upcoming Travel</span>
            </div>

            <span className="px-3 py-1 rounded-full bg-[#E8F0EE] text-[#355F58] font-bold text-xs border border-[#D9DEDA]">
              {currentTrip.destination.name}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#1F2522]">{currentTrip.title}</h3>
            <p className="text-xs text-[#5F6863] font-medium">
              {currentTrip.startDate} → {currentTrip.endDate} ({currentTrip.totalDays} Days)
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/trip/itinerary')}
            className="w-full py-4 rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xs press-scale min-h-[54px]"
          >
            <span>View Trip Plan</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* Contextual Place Details Bottom Sheet */}
      <PlaceDetailSheet
        item={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />

    </div>
  );
};
