import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { useNavigation } from '../../context/NavigationContext';
import {
  Crosshair, ExternalLink, Volume2, VolumeX, Loader2,
  Plus, Check, ArrowLeft
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getApiBaseUrl, DEFAULT_HEADERS, getAuthHeaders } from '../../config/apiConfig';
import { useAudioGuide } from '../../hooks/useAudioGuide';
import { createUserLocationIcon, createPoiIcon } from './mapIcons';
import { AddToItineraryModal, type ItineraryDayOption } from '../itinerary/AddToItineraryModal';
import { sanitizeLocationName } from '../../utils/locationSanitizer';
import { getCanonicalCategory, type CanonicalCategoryKey } from './mapCategoryConfig';

export interface PlaceItem {
  id: string;
  name: string;
  category: string;
  canonicalCategory?: CanonicalCategoryKey;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  address?: string;
  rating?: number;
  price_approx?: string;
  description?: string;
}

// Google Maps Platform Basemap
const googleApiKey = import.meta.env.VITE_GOOGLE_MAP_DEMO_KEY || '';
const GOOGLE_MAPS_TILES = {
  url: googleApiKey
    ? `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleApiKey}`
    : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
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
  const { userLocation, userLocationName, isFollowMode, setIsFollowMode } = useApp();
  const { currentTrip, currentItinerary, refetchItinerary } = useTrip();
  const { mapFocusTarget, setMapFocusTarget, navigateToExplore } = useNavigation();

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Coordinates anchor - dynamically resolved exclusively from GPS or trip destination
  const activeCoords: [number, number] | null = useMemo(() => {
    if (userLocation && typeof userLocation[0] === 'number' && typeof userLocation[1] === 'number') {
      return [userLocation[0], userLocation[1]];
    }
    if (currentTrip?.destination?.latitude && currentTrip?.destination?.longitude) {
      return [currentTrip.destination.latitude, currentTrip.destination.longitude];
    }
    return null;
  }, [userLocation, currentTrip]);

  const [allPlaces, setAllPlaces] = useState<PlaceItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<CanonicalCategoryKey>('all');
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);

  // Audio Guide hooks
  const { playBase64Audio, stopAudio } = useAudioGuide();
  const [playingPlaceId, setPlayingPlaceId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);

  // Day picker modal state & added place day map
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<any | null>(null);
  const [addedPlaceDays, setAddedPlaceDays] = useState<Map<string, number>>(new Map());
  const [isAddingToItinerary, setIsAddingToItinerary] = useState<boolean>(false);

  const modalDays: ItineraryDayOption[] = useMemo(() => {
    if (currentItinerary?.days && currentItinerary.days.length > 0) {
      return currentItinerary.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        title: d.title || `Day ${d.dayNumber}`,
      }));
    }
    const totalDays = currentTrip?.totalDays || 3;
    return Array.from({ length: Math.max(totalDays, 1) }, (_, i) => ({
      id: `day_${i + 1}`,
      dayNumber: i + 1,
      title: `Day ${i + 1} Highlights`,
    }));
  }, [currentItinerary, currentTrip]);

  // Handle Add to Itinerary confirmation from modal
  const handleConfirmAddToItinerary = async (dayId: string, timeSlot: string) => {
    if (!selectedPlaceForModal) return;
    setIsAddingToItinerary(true);

    const targetDay = modalDays.find((d) => d.id === dayId);
    const dayNumber = targetDay?.dayNumber || 1;
    const priceStr = selectedPlaceForModal.price_approx || 'Free Entry';
    const digits = priceStr.replace(/[^\d]/g, '');
    const costInt = digits ? parseInt(digits, 10) : 0;
    const loc = sanitizeLocationName(selectedPlaceForModal.address || userLocationName);

    const payload = {
      trip_id: currentTrip?.id || 'active_trip',
      destination: currentTrip?.destination?.name || userLocationName || 'Local Area',
      item_id: selectedPlaceForModal.id,
      day_id: dayId,
      day_number: dayNumber,
      time_slot: timeSlot,
      title: selectedPlaceForModal.name,
      location: loc,
      location_name: loc,
      tag: selectedPlaceForModal.category || 'spotlight',
      price: priceStr,
      estimated_cost_inr: costInt,
      activity_type: selectedPlaceForModal.category || 'spotlight',
      is_confirmed: true,
    };

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddedPlaceDays((prev) => new Map(prev).set(selectedPlaceForModal.id, dayNumber));
        setSelectedPlaceForModal(null);
        if (refetchItinerary) {
          await refetchItinerary(currentTrip?.id || payload.trip_id);
        }
      }
    } catch (err) {
      console.warn('[MAP] Add to itinerary error:', err);
    } finally {
      setIsAddingToItinerary(false);
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

  // Card scroller refs: lets a marker tap scroll its matching card into view
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
        method: 'POST',
        headers: DEFAULT_HEADERS,
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

  // Fetch ALL nearby POIs once per location anchor (never on category filter click!)
  const fetchMapPlaces = useCallback(async (
    centerLat: number,
    centerLng: number
  ) => {
    setIsLoadingPlaces(true);
    try {
      const baseUrl = getApiBaseUrl();
      // Fetch all nearby POIs in one call so category filtering is completely client-side
      const url = `${baseUrl}/api/places/nearby?lat=${centerLat}&lng=${centerLng}&radius=5000&limit=40`;

      const res = await fetch(url, { headers: DEFAULT_HEADERS });

      if (res.ok) {
        const data = await res.json();
        const rawItems = Array.isArray(data)
          ? data
          : (data.places || data.results || []);

        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const fetchedPlaces: PlaceItem[] = rawItems.map((p: any) => {
            const rawCat = p.category || 'Sight';
            const canonical = getCanonicalCategory(rawCat, p.name || '');
            return {
              id: p.id || `poi-${p.latitude}-${p.longitude}`,
              name: p.name || 'Unnamed Spot',
              category: rawCat,
              canonicalCategory: canonical,
              latitude: p.latitude,
              longitude: p.longitude,
              distanceMeters: p.distance_meters || p.distanceMeters || Math.round(calculateDistance(centerLat, centerLng, p.latitude, p.longitude)),
              address: p.address || p.description || 'Near live location',
              rating: p.rating || 4.7,
              price_approx: p.price_approx || '₹500 - ₹1,500',
              description: p.description || 'Popular local spot on your route.',
            };
          });
          setAllPlaces(fetchedPlaces);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[MAP] Failed to fetch nearby POIs:', err);
    } finally {
      setIsLoadingPlaces(false);
    }

    setAllPlaces([]);
  }, []);

  // Initial load: Only fetches when coordinates anchor changes
  useEffect(() => {
    if (!activeCoords) return;
    const [lat, lng] = activeCoords;
    fetchMapPlaces(lat, lng);
  }, [activeCoords, fetchMapPlaces]);

  // ── MAP INITIALIZATION & CLEANUP ──
  useEffect(() => {
    if (!mapContainerRef.current || !activeCoords) return;
    if (mapInstanceRef.current) return; // Initialize once

    const [initialLat, initialLng] = activeCoords;

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
    if (!map || !activeCoords) return;

    const [lat, lng] = userLocation || activeCoords;

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
  }, [userLocation, activeCoords, isFollowMode]);

  // Count of places in each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPlaces.length };
    for (const p of allPlaces) {
      const cat = p.canonicalCategory || getCanonicalCategory(p.category, p.name);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allPlaces]);

  // Instant client-side filter — NO network requests when category tab is selected
  const filteredPlaces = useMemo(() => {
    if (activeCategory === 'all') return allPlaces;
    return allPlaces.filter(p => (p.canonicalCategory || getCanonicalCategory(p.category, p.name)) === activeCategory);
  }, [allPlaces, activeCategory]);

  // Nearest-first order for the scrollable card row
  const sortedPlaces = useMemo(() => {
    return [...filteredPlaces].sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  }, [filteredPlaces]);

  // Selects a place from either a marker tap or a card tap, and flies the map to it
  const focusPlace = useCallback((place: PlaceItem) => {
    setSelectedPlace(place);
    setIsFollowMode(false);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([place.latitude, place.longitude], 17, { animate: true, duration: 1.2 });
    }
  }, [setIsFollowMode]);

  // When a marker is tapped (or a deep link focuses a place), scroll its card into view
  useEffect(() => {
    if (!selectedPlace) return;
    cardRefs.current.get(selectedPlace.id)?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedPlace]);

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
        marker.on('click', () => focusPlace(place));
        layer.addLayer(marker);
        existingMap.set(place.id, marker);
      } else {
        marker.setIcon(icon);
      }
    });
  }, [filteredPlaces, selectedPlace, focusPlace]);

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
          (userLocation ? userLocation[0] : (activeCoords ? activeCoords[0] : coordinates[0])),
          (userLocation ? userLocation[1] : (activeCoords ? activeCoords[1] : coordinates[1])),
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
  }, [mapFocusTarget, userLocation, activeCoords, setMapFocusTarget, setIsFollowMode]);

  // Recenter handler
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    const targetCoords = userLocation || activeCoords;
    if (map && targetCoords) {
      hasUserPannedRef.current = false;
      setIsFollowMode(true);
      isProgrammaticMoveRef.current = true;
      map.flyTo(targetCoords, 16, { animate: true, duration: 1.2 });
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 1300);
    }
  };

  if (!activeCoords) {
    return (
      <div
        className="relative w-full bg-[#EFF1ED] flex flex-col items-center justify-center p-6 text-center select-none"
        style={{ height: `calc(100dvh - ${HEADER_HEIGHT}px - ${BOTTOM_NAV_HEIGHT}px)` }}
      >
        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center mb-4 text-[#1F5A3F] animate-pulse">
          <Crosshair className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Locating Exploration Area...</h2>
        <p className="text-xs text-gray-500 max-w-xs mt-1 mb-6 leading-relaxed">
          Enable location access or set an active trip destination to explore Google Maps landmarks, dining, and stays.
        </p>
        <button
          type="button"
          onClick={() => navigateToExplore()}
          className="min-h-[44px] px-5 rounded-2xl bg-[#1F5A3F] hover:bg-[#194B34] text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-colors press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore Destinations</span>
        </button>
      </div>
    );
  }

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
        {CATEGORY_FILTERS.map(({ key, label }) => {
          const count = categoryCounts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                // Instant client-side filter — NO redundant network requests!
                setActiveCategory(key);
              }}
              aria-pressed={activeCategory === key}
              className={`shrink-0 min-h-[32px] px-3.5 rounded-full text-xs font-semibold transition-all border shadow-sm flex items-center gap-1.5 press-scale ${activeCategory === key
                  ? 'bg-[#1F5A3F] text-white border-[#1F5A3F]'
                  : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900'
                }`}
            >
              <span>{label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeCategory === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom sheet: scrollable row of place cards, nearest first */}
      {sortedPlaces.length > 0 ? (
        <div
          ref={cardScrollRef}
          className="absolute bottom-3 left-0 right-0 z-[500] flex gap-3 overflow-x-auto px-3 pb-1 snap-x snap-mandatory scrollbar-none pointer-events-auto animate-slideUp"
        >
          {sortedPlaces.map((place) => {
            const isSelected = selectedPlace?.id === place.id;
            return (
              <div
                key={place.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(place.id, el);
                  else cardRefs.current.delete(place.id);
                }}
                role="button"
                tabIndex={0}
                onClick={() => focusPlace(place)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    focusPlace(place);
                  }
                }}
                className={`w-[270px] sm:w-[300px] shrink-0 snap-center rounded-3xl bg-white border p-4 shadow-lg space-y-3 cursor-pointer transition-colors ${isSelected ? 'border-[#1F5A3F] ring-2 ring-[#1F5A3F]/20' : 'border-gray-200'
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/20 text-[10px] font-semibold uppercase">
                        {sentenceCase(place.category)}
                      </span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {formatDistance(place.distanceMeters)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {place.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {place.address}
                    </p>
                  </div>

                  {/* Audio Narration TTS Control */}
                  <button
                    type="button"
                    onClick={(e) => handlePlayNarration(place, e)}
                    disabled={audioLoadingId === place.id}
                    aria-label={playingPlaceId === place.id ? 'Stop audio guide' : 'Play audio guide'}
                    className={`w-10 h-10 shrink-0 rounded-full border transition-colors press-scale flex items-center justify-center ${playingPlaceId === place.id
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#1F5A3F]/40'
                      }`}
                  >
                    {audioLoadingId === place.id ? (
                      <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : playingPlaceId === place.id ? (
                      <VolumeX className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-[#1F5A3F]" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlaceForModal(place);
                    }}
                    className={`flex-1 min-h-[44px] px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors press-scale ${addedPlaceDays.has(place.id)
                        ? 'bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/30'
                        : 'bg-[#1F5A3F] hover:bg-[#194B34] text-white shadow-sm'
                      }`}
                  >
                    {addedPlaceDays.has(place.id) ? (
                      <>
                        <Check className="w-4 h-4" aria-hidden="true" /> Added to Day {addedPlaceDays.get(place.id)}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" aria-hidden="true" /> Add to Itinerary
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToExplore(place.id, place.category);
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold text-xs flex items-center gap-1.5 press-scale"
                  >
                    <span>Details</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#1F5A3F]" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : isLoadingPlaces ? (
        <div className="absolute bottom-3 left-3 right-3 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-lg flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 text-[#1F5A3F] animate-spin" />
            <p className="text-sm font-medium text-gray-700">Finding nearby places...</p>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 right-3 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-lg text-center">
            <p className="text-sm font-semibold text-gray-900">
              {activeCategory !== 'all' ? `No ${activeCategory} found nearby` : 'No places found here yet'}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {activeCategory !== 'all'
                ? `There are no spots categorized under "${activeCategory}" within 5km.`
                : 'Pan the map or move closer to explore.'}
            </p>
            {activeCategory !== 'all' && allPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#1F5A3F] text-white text-xs font-semibold press-scale hover:bg-[#194B34] transition-colors"
              >
                View all {allPlaces.length} places
              </button>
            )}
          </div>
        </div>
      )}

      {/* Interactive Day Selection Modal */}
      <AddToItineraryModal
        isOpen={Boolean(selectedPlaceForModal)}
        onClose={() => {
          if (!isAddingToItinerary) setSelectedPlaceForModal(null);
        }}
        itemTitle={selectedPlaceForModal?.name || ''}
        days={modalDays}
        isSubmitting={isAddingToItinerary}
        onConfirm={handleConfirmAddToItinerary}
        category={selectedPlaceForModal?.category}
        location={sanitizeLocationName(selectedPlaceForModal?.address || userLocationName)}
        price={selectedPlaceForModal?.price_approx}
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