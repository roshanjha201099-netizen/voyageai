import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState, type AppDispatch } from '../../store';
import { fetchNearbyPlaces } from '../../store';
import { useAuth } from '../../auth/AuthContext';
import { useTrip } from '../../features/trip/TripContext';
import { useApp } from '../../context/AppContext';
import { TripSpotlightBanner } from './TripSpotlightBanner';
import { formatDateRange } from './tripDates';
import { AskVoyageAICard } from '../ai/AskVoyageAICard';
import { PlaceDetailSheet, type PlaceDetailItem } from '../common/PlaceDetailSheet';
import { Navigation, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistance } from '../../services/tourGuideApi';
import { isMockPayload } from '../../utils/mockIndicator';

export const HomePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { userProfile } = useAuth();
  const { currentTrip } = useTrip();
  const { userLocation, userLocationName, openInAppNavigation, requestGPSLocation } = useApp();
  const navigate = useNavigate();

  const [selectedPlace, setSelectedPlace] = useState<PlaceDetailItem | null>(null);

  // Redux-cached nearby places and loading state
  const { places: rawNearbyPlaces, loading: isLoadingNearby } = useSelector(
    (state: RootState) => state.nearby
  );

  const firstName = userProfile?.firstName || 'Traveler';

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Dispatch Redux fetch on coordinates available (thunk condition automatically guards against <500m refetches)
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      requestGPSLocation().catch(() => { });
    }

    const lat = userLocation ? userLocation[0] : 22.5726;
    const lng = userLocation ? userLocation[1] : 88.3639;

    dispatch(fetchNearbyPlaces({ lat, lng, radius: 5000 }));
  }, [userLocation, requestGPSLocation, dispatch]);

  // Transform raw Redux places to UI PlaceDetailItem shape
  const nearbyPlaces: PlaceDetailItem[] = useMemo(() => {
    if (!rawNearbyPlaces || rawNearbyPlaces.length === 0) return [];
    return rawNearbyPlaces.slice(0, 6).map((p, idx) => ({
      id: p.id || `poi-${idx}`,
      name: p.name,
      category: (p.category || 'ATTRACTION').toUpperCase().replace('_', ' '),
      rating: 4.5 + (idx % 4) * 0.1,
      distanceText: p.distanceMeters ? formatDistance(p.distanceMeters) : 'Near you',
      durationText: '45 mins',
      estimatedCost: 0,
      address: p.address || p.description || `${p.category || 'POI'} in ${userLocationName || 'Current Location'}`,
      description: p.description || `Popular ${p.category || 'attraction'} located near your physical coordinates.`,
      latitude: p.latitude || (userLocation ? userLocation[0] : 22.5726),
      longitude: p.longitude || (userLocation ? userLocation[1] : 88.3639),
      is_mock: Boolean(p.is_mock || p._isMock),
    }));
  }, [rawNearbyPlaces, userLocation, userLocationName]);

  const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
  const tripRange = currentTrip ? formatDateRange(currentTrip.startDate, currentTrip.endDate) : null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-28 animate-fadeIn overflow-x-hidden">
      {/* Greeting */}
      <div className="space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2522] tracking-tight">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-sm font-medium text-[#5F6863]">Where would you like to explore today?</p>
      </div>

      {/* Destination and highlights */}
      <TripSpotlightBanner
        destination={currentTrip ? (currentTrip.destination?.name || currentTrip.title) : userLocationName}
        latitude={currentTrip?.destination?.latitude ?? (userLocation ? userLocation[0] : 22.5726)}
        longitude={currentTrip?.destination?.longitude ?? (userLocation ? userLocation[1] : 88.3639)}
        startDate={currentTrip?.startDate}
        endDate={currentTrip?.endDate}
        isLocalMode={!currentTrip}
      />

      <AskVoyageAICard />

      {/* Near you */}
      <section aria-labelledby="near-you-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="near-you-heading" className="text-xl font-extrabold text-[#1F2522]">
            Near you
          </h2>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="py-2 text-sm font-semibold text-[#355F58] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#355F58]"
          >
            Open map
          </button>
        </div>

        {isLoadingNearby ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">Finding places near you</span>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[148px] rounded-3xl bg-white border border-[#D9DEDA] animate-pulse motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : nearbyPlaces.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C9D0CC] p-6 text-center">
            <p className="text-sm font-semibold text-[#1F2522]">No places to show right now</p>
            <p className="mt-1 text-xs text-[#5F6863]">Open the map to look further out.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyPlaces.map((poi) => {
              const isMock = isMockPayload(poi);
              return (
                <article key={poi.id} className="rounded-3xl bg-white border border-[#D9DEDA] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-[#355F58]">{sentenceCase(poi.category || 'Attraction')}</p>
                        {isMock && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Demo Spot
                          </span>
                        )}
                      </div>
                      <h3 className="mt-0.5 text-base sm:text-lg font-bold text-[#1F2522] truncate">{poi.name}</h3>
                      <p className="text-xs text-[#5F6863] truncate">{poi.address}</p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[#1F2522]">{poi.distanceText}</p>
                      {poi.rating ? (
                        <p className="mt-0.5 flex items-center justify-end gap-1 text-xs font-semibold text-[#8A5A00]">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                          <span>{Number(poi.rating).toFixed(1)}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openInAppNavigation({
                        title: poi.name,
                        locationName: poi.address || poi.name,
                        coordinates: [poi.latitude || 25.6, poi.longitude || 85.1],
                      })
                    }
                    className="min-h-[48px] rounded-xl bg-[#E8F0EE] text-[#355F58] hover:bg-[#DCE9E5] text-sm font-bold flex items-center justify-center gap-1.5 transition-colors press-scale focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#355F58]"
                  >
                    <Navigation className="w-4 h-4" aria-hidden="true" />
                    <span>Directions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPlace(poi)}
                    className="min-h-[48px] rounded-xl border border-[#D9DEDA] text-[#1F2522] hover:bg-[#F0F2EF] text-sm font-semibold flex items-center justify-center transition-colors press-scale focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#355F58]"
                  >
                    Details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </section>

      {/* Current trip */}
      {currentTrip && (
        <section className="rounded-3xl bg-white border border-[#D9DEDA] p-5">
          <p className="text-sm font-semibold text-[#355F58]">{currentTrip.destination.name}</p>
          <h3 className="mt-1 text-xl sm:text-2xl font-extrabold text-[#1F2522]">{currentTrip.title}</h3>
          <p className="mt-1 text-sm text-[#5F6863]">
            {tripRange ?? `${currentTrip.startDate} to ${currentTrip.endDate}`} ({currentTrip.totalDays} days)
          </p>

          <button
            type="button"
            onClick={() => navigate('/trip/itinerary')}
            className="mt-4 w-full min-h-[52px] rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white text-base font-bold transition-colors press-scale focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#355F58]"
          >
            View trip plan
          </button>
        </section>
      )}

      {/* Place details bottom sheet */}
      <PlaceDetailSheet item={selectedPlace} onClose={() => setSelectedPlace(null)} />
    </div>
  );
};

