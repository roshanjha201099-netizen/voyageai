import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { type RootState, type AppDispatch } from '../../store';
import { fetchMapNearbyPlaces } from '../../store';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  Crosshair, ExternalLink, Volume2, VolumeX, Loader2,
  Plus, Check, ArrowLeft, RefreshCw
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getApiBaseUrl, DEFAULT_FETCH_OPTIONS } from '../../config/apiConfig';
import { useAudioGuide } from '../../hooks/useAudioGuide';
import { createUserLocationIcon, createPoiIcon } from './mapIcons';
import { AddToItineraryModal, type AddToItineraryPayload } from '../itinerary/AddToItineraryModal';
import { sanitizeLocationName } from '../../utils/locationSanitizer';

export interface PlaceItem {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  address?: string;
  rating?: number;
  price_approx?: string;
  description?: string;
}

// Basemap: Google Maps roadmap tiles
const GOOGLE_MAPS_TILES = {
  url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  maxZoom: 20,
  attribution: '&copy; Google Maps',
};

const CATEGORY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sights', label: 'Sights' },
  { key: 'food', label: 'Food' },
  { key: 'hotels', label: 'Stays' },
  { key: 'experiences', label: 'Experiences' },
] as const;

const sentenceCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

const formatDistance = (meters?: number) => {
  if (meters === undefined || meters === null) return 'Nearby';
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
};

// Fixed app chrome this page sits between — adjust to match the real header/bottom-nav height.
const HEADER_HEIGHT = 64;
const BOTTOM_NAV_HEIGHT = 72;

export const MapView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { userLocation, userLocationName, isFollowMode, setIsFollowMode } = useApp();
  const { currentTrip, refetchItinerary } = useTrip();
  const { mapFocusTarget, setMapFocusTarget, navigateToExplore } = useNavigation();

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Coordinates anchor
  const defaultCoords: [number, number] = useMemo(() => [
    userLocation?.[0] || currentTrip?.destination?.latitude || 26.2376,
    userLocation?.[1] || currentTrip?.destination?.longitude || 86.2021
  ], [userLocation, currentTrip]);

  // Read places & loading state from Redux store
  const { places: rawMapPlaces, loading: isMapLoading } = useSelector(
    (state: RootState) => state.mapPlaces
  );

  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<'hotels' | 'food' | 'sights' | 'experiences' | 'all'>('all');
  const [showSearchArea, setShowSearchArea] = useState(false);

  // Transform raw cached Redux places to PlaceItem shape with relative distance
  const places: PlaceItem[] = useMemo(() => {
    if (!rawMapPlaces || rawMapPlaces.length === 0) return [];
    const centerLat = userLocation ? userLocation[0] : defaultCoords[0];
    const centerLng = userLocation ? userLocation[1] : defaultCoords[1];

    return rawMapPlaces.map((p: any) => ({
      id: p.id || `poi-${p.latitude}-${p.longitude}`,
      name: p.name || 'Unnamed Spot',
      category: (p.category || 'sights').toLowerCase(),
      latitude: p.latitude,
      longitude: p.longitude,
      distanceMeters: p.distance_meters || p.distanceMeters || Math.round(calculateDistance(centerLat, centerLng, p.latitude, p.longitude)),
      address: p.address || p.description || 'Near live location',
      rating: p.rating || 4.7,
      price_approx: p.price_approx || '₹500 - ₹1,500',
      description: p.description || 'Popular local spot on your route.',
    }));
  }, [rawMapPlaces, userLocation, defaultCoords]);

  // Audio Guide hooks
  const { playBase64Audio, stopAudio } = useAudioGuide();
  const [playingPlaceId, setPlayingPlaceId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  // Day picker modal state & added place day map
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<any | null>(null);
  const [addedPlaceDays, setAddedPlaceDays] = useState<Map<string, number>>(new Map());

  // Handle Add to Itinerary confirmation from modal
  const handleConfirmAddToItinerary = async (payload: AddToItineraryPayload) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddedPlaceDays((prev) => new Map(prev).set(payload.item_id, payload.day_number));
        if (refetchItinerary) {
          await refetchItinerary(currentTrip?.id || payload.trip_id);
        }
      }
    } catch (err) {
      console.warn('[MAP] Add to itinerary error:', err);
    }
  };

  // Refs for Leaflet event closures
  const activeCategoryRef = useRef(activeCategory);
  const isFollowModeRef = useRef(isFollowMode);
  const hasUserPannedRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);

  useEffect(() => { activeCategoryRef.current = activeCategory; }, [activeCategory]);
  useEffect(() => { isFollowModeRef.current = isFollowMode; }, [isFollowMode]);

  // Leaflet map & layer refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Closest place auto-calculation for bottom mini-sheet
  const closestPlace = useMemo(() => {
    if (selectedPlace) return selectedPlace;
    if (!places || places.length === 0) return null;
    return [...places].sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999))[0];
  }, [selectedPlace, places]);

  // Handle Play TTS Narration
  const handlePlayNarration = useCallback(async (place: PlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (playingPlaceId === place.id) {
      stopAudio();
      setPlayingPlaceId(null);
      return;
    }

    setAudioLoadingId(place.id);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/tts/speak`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'POST',
        body: JSON.stringify({
          place_name: place.name,
          category: place.category,
          address: place.address || '',
          place_id: place.id,
          language: 'hi-IN',
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.audio_base64) {
        await playBase64Audio(data.audio_base64);
        setPlayingPlaceId(place.id);
      }
    } catch (err) {
      console.warn('[MAP TTS] Narration failed:', err);
    } finally {
      setAudioLoadingId(null);
    }
  }, [playingPlaceId, playBase64Audio, stopAudio]);

  // Dispatch Redux fetch on coordinates/category change (guarded by < 500m condition)
  useEffect(() => {
    const lat = userLocation ? userLocation[0] : defaultCoords[0];
    const lng = userLocation ? userLocation[1] : defaultCoords[1];
    dispatch(fetchMapNearbyPlaces({ lat, lng, radius: 5000, limit: 40, category: activeCategory }));
  }, [userLocation, defaultCoords, activeCategory, dispatch]);

  // Handler for user clicking "Search this area" after panning
  const handleSearchThisArea = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const center = map.getCenter();
    setShowSearchArea(false);
    dispatch(fetchMapNearbyPlaces({
      lat: center.lat,
      lng: center.lng,
      radius: 5000,
      limit: 40,
      category: activeCategory,
      force: true, // Bypasses condition guard to refresh markers for the new viewport
    }));
  };

  // ── MAP INITIALIZATION & CLEANUP ──
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Initialize once

    const initialLat = defaultCoords[0];
    const initialLng = defaultCoords[1];

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer(GOOGLE_MAPS_TILES.url, {
      maxZoom: GOOGLE_MAPS_TILES.maxZoom,
      subdomains: GOOGLE_MAPS_TILES.subdomains,
      attribution: GOOGLE_MAPS_TILES.attribution,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Handle user manual pan event
    const handleDragStart = () => {
      if (!isProgrammaticMoveRef.current) {
        hasUserPannedRef.current = true;
        setShowSearchArea(true);
        if (isFollowModeRef.current) {
          setIsFollowMode(false);
        }
      }
    };

    map.on('dragstart', handleDragStart);

    return () => {
      map.off('dragstart', handleDragStart);
      markersLayer.clearLayers();
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      markersMapRef.current.clear();
      tileLayerRef.current = null;
    };
  }, []); // Run once on mount

  // Update User Radar Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = userLocation ? userLocation[0] : defaultCoords[0];
    const lng = userLocation ? userLocation[1] : defaultCoords[1];

    if (!userMarkerRef.current) {
      const userIcon = createUserLocationIcon();
      const marker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 3000 }).addTo(map);
      userMarkerRef.current = marker;
    } else {
      if (!map.hasLayer(userMarkerRef.current)) {
        userMarkerRef.current.addTo(map);
      }
      userMarkerRef.current.setLatLng([lat, lng]);
    }

    if (isFollowMode && !hasUserPannedRef.current) {
      isProgrammaticMoveRef.current = true;
      map.panTo([lat, lng], { animate: true, duration: 0.8 });
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 850);
    }
  }, [userLocation, defaultCoords, isFollowMode]);

  // Filter & Diff Markers
  const filteredPlaces = useMemo(() => {
    if (activeCategory === 'all') return places;
    return places.filter(p => p.category === activeCategory);
  }, [places, activeCategory]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    const existingMap = markersMapRef.current;
    const nextIds = new Set(filteredPlaces.map(p => p.id));

    // Remove obsolete markers
    existingMap.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        layer.removeLayer(marker);
        existingMap.delete(id);
      }
    });

    // Add or update markers
    filteredPlaces.forEach(place => {
      const isSelected = selectedPlace?.id === place.id;
      const icon = createPoiIcon(place.category, isSelected);

      let marker = existingMap.get(place.id);
      if (!marker) {
        marker = L.marker([place.latitude, place.longitude], { icon });
        marker.on('click', () => {
          setSelectedPlace(place);
          setIsFollowMode(false);
          map.flyTo([place.latitude, place.longitude], 17, { animate: true, duration: 1.2 });
        });
        layer.addLayer(marker);
        existingMap.set(place.id, marker);
      } else {
        marker.setIcon(icon);
      }
    });
  }, [filteredPlaces, selectedPlace, setIsFollowMode]);

  // ── BRIDGE LOGIC: Deep Link Target from Explore Mode ──
  useEffect(() => {
    if (mapFocusTarget && mapInstanceRef.current) {
      const map = mapInstanceRef.current;
      const { coordinates, id, name, category, zoom, address } = mapFocusTarget;

      isProgrammaticMoveRef.current = true;
      map.flyTo(coordinates, zoom || 17, { animate: true, duration: 1.5 });
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 1600);

      const targetPlace: PlaceItem = {
        id: id || `focus-${Date.now()}`,
        name: name || 'Target Place',
        category: (category || 'sights').toLowerCase(),
        latitude: coordinates[0],
        longitude: coordinates[1],
        address: address || 'Targeted location from Explore',
        distanceMeters: calculateDistance(
          userLocation ? userLocation[0] : defaultCoords[0],
          userLocation ? userLocation[1] : defaultCoords[1],
          coordinates[0],
          coordinates[1]
        ),
      };

      setSelectedPlace(targetPlace);
      setIsFollowMode(false);

      // Clear bridge state after focusing
      const timer = setTimeout(() => {
        setMapFocusTarget(null);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [mapFocusTarget, userLocation, defaultCoords, setMapFocusTarget, setIsFollowMode]);

  // Recenter handler
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    const targetCoords = userLocation || defaultCoords;
    setShowSearchArea(false);
    if (map) {
      hasUserPannedRef.current = false;
      setIsFollowMode(true);
      isProgrammaticMoveRef.current = true;
      map.flyTo(targetCoords, 16, { animate: true, duration: 1.2 });
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 1300);
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-[#EFF1ED] select-none"
      style={{ height: `calc(100dvh - ${HEADER_HEIGHT}px - ${BOTTOM_NAV_HEIGHT}px)` }}
    >
      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top controls: back + recenter */}
      <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between pointer-events-none">
        <button
          type="button"
          onClick={() => navigateToExplore()}
          className="pointer-events-auto min-h-[40px] px-3.5 rounded-full bg-white hover:bg-gray-50 text-[#1F2522] border border-gray-200 shadow-sm font-semibold text-xs flex items-center gap-1.5 press-scale"
        >
          <ArrowLeft className="w-4 h-4 text-[#1F5A3F]" aria-hidden="true" />
          <span>Explore</span>
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Recenter on my location"
          title="Recenter on my location"
          className={`pointer-events-auto w-10 h-10 shrink-0 rounded-full border shadow-sm transition-colors press-scale flex items-center justify-center ${isFollowMode
            ? 'bg-[#1F5A3F] text-white border-[#1F5A3F]'
            : 'bg-white text-gray-600 border-gray-200 hover:border-[#1F5A3F]/40'
            }`}
        >
          <Crosshair className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Category filter row */}
      <div
        role="group"
        aria-label="Filter places by category"
        className="absolute top-[60px] left-3 right-3 z-[500] flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto py-1"
      >
        {CATEGORY_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setActiveCategory(key);
              setShowSearchArea(false);
            }}
            aria-pressed={activeCategory === key}
            className={`shrink-0 min-h-[32px] px-3.5 rounded-full text-xs font-semibold transition-colors border shadow-sm ${activeCategory === key
              ? 'bg-[#1F5A3F] text-white border-[#1F5A3F]'
              : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Floating "Search this area" button */}
      {showSearchArea && (
        <div className="absolute top-[106px] left-1/2 -translate-x-1/2 z-[500] pointer-events-auto animate-fadeIn">
          <button
            type="button"
            onClick={handleSearchThisArea}
            className="px-4 py-1.5 rounded-full bg-white text-[#1F5A3F] border border-gray-200 shadow-md font-semibold text-xs flex items-center gap-1.5 hover:bg-gray-50 press-scale"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMapLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Search this area</span>
          </button>
        </div>
      )}

      {/* Bottom mini-sheet: closest or selected place */}
      {closestPlace ? (
        <div className="absolute bottom-3 left-3 right-3 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/20 text-[10px] font-semibold uppercase">
                    {sentenceCase(closestPlace.category)}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {formatDistance(closestPlace.distanceMeters)}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {closestPlace.name}
                </h3>
                <p className="text-xs text-gray-500 truncate">
                  {closestPlace.address}
                </p>
              </div>

              {/* Audio Narration TTS Control */}
              <button
                type="button"
                onClick={(e) => handlePlayNarration(closestPlace, e)}
                disabled={audioLoadingId === closestPlace.id}
                aria-label={playingPlaceId === closestPlace.id ? 'Stop audio guide' : 'Play audio guide'}
                className={`w-10 h-10 shrink-0 rounded-full border transition-colors press-scale flex items-center justify-center ${playingPlaceId === closestPlace.id
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#1F5A3F]/40'
                  }`}
              >
                {audioLoadingId === closestPlace.id ? (
                  <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : playingPlaceId === closestPlace.id ? (
                  <VolumeX className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#1F5A3F]" aria-hidden="true" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedPlaceForModal(closestPlace)}
                className={`flex-1 min-h-[44px] px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors press-scale ${addedPlaceDays.has(closestPlace.id)
                  ? 'bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/30'
                  : 'bg-[#1F5A3F] hover:bg-[#194B34] text-white shadow-sm'
                  }`}
              >
                {addedPlaceDays.has(closestPlace.id) ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" /> Added to Day {addedPlaceDays.get(closestPlace.id)}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" /> Add to Itinerary
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigateToExplore(closestPlace.id, closestPlace.category)}
                className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold text-xs flex items-center gap-1.5 press-scale"
              >
                <span>Details</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#1F5A3F]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 right-3 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-lg text-center">
            <p className="text-sm font-semibold text-gray-900">No places found here yet</p>
            <p className="mt-0.5 text-xs text-gray-500">Try a different category, or pan the map to explore.</p>
          </div>
        </div>
      )}

      {/* Interactive Day Selection Modal */}
      <AddToItineraryModal
        isOpen={Boolean(selectedPlaceForModal)}
        onClose={() => setSelectedPlaceForModal(null)}
        place={selectedPlaceForModal ? {
          id: selectedPlaceForModal.id,
          title: selectedPlaceForModal.name,
          category: selectedPlaceForModal.category,
          location: sanitizeLocationName(selectedPlaceForModal.address || userLocationName),
          price_approx: selectedPlaceForModal.price_approx || 'Free Entry',
        } : null}
        currentTrip={currentTrip}
        onConfirm={handleConfirmAddToItinerary}
      />
    </div>
  );
};

// Distance calculation helper (Haversine Formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
