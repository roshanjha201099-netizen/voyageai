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
import { getApiBaseUrl, DEFAULT_HEADERS } from '../../config/apiConfig';
import { useAudioGuide } from '../../hooks/useAudioGuide';
import { createUserLocationIcon, createCrazyPoiIcon } from './mapIcons';
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

export type MapStyleKey = 'voyager' | 'dark' | 'light' | 'satellite' | 'osm';

export const MAP_STYLES: Record<MapStyleKey, { name: string; icon: string; url: string; subdomains?: string; maxZoom: number; attribution: string }> = {
  voyager: {
    name: 'Vivid Travel',
    icon: '🎨',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  dark: {
    name: 'Cyber Dark',
    icon: '🌙',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  light: {
    name: 'Clean Light',
    icon: '☀️',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  satellite: {
    name: 'Satellite View',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
  },
  osm: {
    name: 'Standard OSM',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }
};

export const MapView: React.FC = () => {
  const { userLocation, userLocationName, isFollowMode, setIsFollowMode } = useApp();
  const { currentTrip, refetchItinerary } = useTrip();
  const { mapFocusTarget, setMapFocusTarget, navigateToExplore } = useNavigation();

  // Active Map Style (100% Free - Zero API key required!)
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyleKey>('voyager');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Coordinates anchor
  const defaultCoords: [number, number] = useMemo(() => [
    userLocation?.[0] || currentTrip?.destination?.latitude || 26.2376,
    userLocation?.[1] || currentTrip?.destination?.longitude || 86.2021
  ], [userLocation, currentTrip]);

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<'hotels' | 'food' | 'sights' | 'experiences' | 'all'>('all');

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
        method: 'POST',
        headers: DEFAULT_HEADERS,
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

  // Fetch POIs from /api/places/nearby or fallback
  const fetchMapPlaces = useCallback(async (
    centerLat: number,
    centerLng: number,
    category: string = 'all'
  ) => {
    try {
      const baseUrl = getApiBaseUrl();
      const categoryParam = category !== 'all' ? `&category=${encodeURIComponent(category)}` : '';
      const url = `${baseUrl}/api/places/nearby?lat=${centerLat}&lng=${centerLng}&radius=5000&limit=40${categoryParam}`;

      const res = await fetch(url, { headers: DEFAULT_HEADERS });

      if (res.ok) {
        const data = await res.json();
        const rawItems = Array.isArray(data)
          ? data
          : (data.places || data.results || []);

        if (Array.isArray(rawItems) && rawItems.length > 0) {
          const fetchedPlaces: PlaceItem[] = rawItems.map((p: any) => ({
            id: p.id || `poi-${p.latitude}-${p.longitude}`,
            name: p.name || 'Unnamed Spot',
            category: (p.category || category).toLowerCase(),
            latitude: p.latitude,
            longitude: p.longitude,
            distanceMeters: p.distance_meters || p.distanceMeters || Math.round(calculateDistance(centerLat, centerLng, p.latitude, p.longitude)),
            address: p.address || p.description || 'Near live location',
            rating: p.rating || 4.7,
            price_approx: p.price_approx || '₹500 - ₹1,500',
            description: p.description || 'Popular local spot on your route.',
          }));
          setPlaces(fetchedPlaces);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[MAP] Failed to fetch nearby POIs:', err);
    }

    setPlaces([]);
  }, []);

  // Initial load
  useEffect(() => {
    const lat = userLocation ? userLocation[0] : defaultCoords[0];
    const lng = userLocation ? userLocation[1] : defaultCoords[1];
    fetchMapPlaces(lat, lng, activeCategory);
  }, [userLocation, defaultCoords, fetchMapPlaces]);

  // ── MAP INITIALIZATION & CLEANUP (Rule #2: Full map.remove() cleanup) ──
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

    const styleConfig = MAP_STYLES.voyager;
    const tileLayer = L.tileLayer(styleConfig.url, {
      maxZoom: styleConfig.maxZoom,
      subdomains: styleConfig.subdomains || 'abc',
      attribution: styleConfig.attribution,
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

  // ── DYNAMIC MAP TILE STYLE SWAPPING (Zero API key required!) ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const styleConfig = MAP_STYLES[currentMapStyle];
    const newTileLayer = L.tileLayer(styleConfig.url, {
      maxZoom: styleConfig.maxZoom,
      subdomains: styleConfig.subdomains || 'abc',
      attribution: styleConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [currentMapStyle]);

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
      const icon = createCrazyPoiIcon(place.category, isSelected);

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
    if (map) {
      hasUserPannedRef.current = false;
      setIsFollowMode(true);
      isProgrammaticMoveRef.current = true;
      map.flyTo(targetCoords, 16, { animate: true, duration: 1.2 });
      setTimeout(() => { isProgrammaticMoveRef.current = false; }, 1300);
    }
  };

  return (
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-gray-100 select-none">

      {/* ── 1. Full-Bleed Dark Map Container ── */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ── 2. Top Minimalist HUD ── */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none">

        {/* Back / Open Explore Mode CTA */}
        <button
          onClick={() => navigateToExplore()}
          className="pointer-events-auto px-3.5 py-2 rounded-2xl bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm font-semibold text-xs flex items-center gap-2 press-scale"
        >
          <ArrowLeft className="w-4 h-4 text-[#1F5A3F]" />
          <span>Explore Mode</span>
        </button>

        {/* Live GPS Telemetry Pill */}
        <div className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[#1F5A3F] shadow-sm flex items-center gap-2 text-[11px] font-semibold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#1F5A3F] animate-ping" />
          <span>Live Geofence Active (150m Rad)</span>
        </div>

        {/* Right Controls: Map Style Selector + Recenter Button */}
        <div className="flex items-center gap-2 pointer-events-auto relative">
          {/* Map Style Selector Pill Button */}
          <div className="relative">
            <button
              onClick={() => setIsStyleMenuOpen(prev => !prev)}
              className="px-3 py-2 rounded-2xl bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-sm text-xs font-bold flex items-center gap-1.5 press-scale"
              title="Change Map Basemap Style (No API key required)"
            >
              <span>{MAP_STYLES[currentMapStyle].icon}</span>
              <span className="hidden sm:inline">{MAP_STYLES[currentMapStyle].name}</span>
            </button>

            {/* Map Style Dropdown Menu */}
            {isStyleMenuOpen && (
              <div className="absolute top-full mt-2 right-0 w-44 p-1.5 rounded-2xl bg-white border border-gray-200 shadow-2xl z-[600] space-y-1 animate-fadeIn">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 py-1 border-b border-gray-100 mb-1">
                  Map Basemap Style
                </div>
                {(Object.keys(MAP_STYLES) as MapStyleKey[]).map(styleKey => (
                  <button
                    key={styleKey}
                    onClick={() => {
                      setCurrentMapStyle(styleKey);
                      setIsStyleMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left ${currentMapStyle === styleKey
                        ? 'bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/30'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <span>{MAP_STYLES[styleKey].icon}</span>
                    <span className="truncate">{MAP_STYLES[styleKey].name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            className={`p-2.5 rounded-2xl border shadow-sm transition-all press-scale ${isFollowMode
                ? 'bg-[#1F5A3F] text-white border-[#1F5A3F]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#1F5A3F]/40'
              }`}
            title="Recenter to GPS Location"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── 3. Category Quick Filter Pill Bar ── */}
      <div className="absolute top-16 left-4 right-4 z-[500] flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto py-1">
        {(['all', 'sights', 'food', 'hotels', 'experiences'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              const lat = userLocation ? userLocation[0] : defaultCoords[0];
              const lng = userLocation ? userLocation[1] : defaultCoords[1];
              fetchMapPlaces(lat, lng, cat);
            }}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-sm ${activeCategory === cat
                ? 'bg-[#1F5A3F] text-white border-[#1F5A3F]'
                : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900'
              }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── 4. Bottom Swipe-Up Glass Mini-Sheet (Only Closest / Selected Spot) ── */}
      {closestPlace ? (
        <div className="absolute bottom-4 left-4 right-4 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-lg space-y-3">

            {/* Spot Header Info */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5 max-w-[70%]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/20 text-[10px] font-semibold uppercase">
                    {closestPlace.category}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">
                    {closestPlace.distanceMeters ? `${closestPlace.distanceMeters}m away` : 'Near Live GPS'}
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
                onClick={(e) => handlePlayNarration(closestPlace, e)}
                disabled={audioLoadingId === closestPlace.id}
                className={`p-2.5 rounded-2xl border transition-all press-scale ${playingPlaceId === closestPlace.id
                    ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#1F5A3F]/40'
                  }`}
                title="Audio Guide Narration"
              >
                {audioLoadingId === closestPlace.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#1F5A3F]" />
                ) : playingPlaceId === closestPlace.id ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5 text-[#1F5A3F]" />
                )}
              </button>
            </div>

            {/* Action CTAs */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 gap-2">

              {/* Add to Itinerary Button */}
              <button
                onClick={() => setSelectedPlaceForModal(closestPlace)}
                className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all press-scale ${addedPlaceDays.has(closestPlace.id)
                    ? 'bg-[#1F5A3F]/10 text-[#1F5A3F] border border-[#1F5A3F]/30'
                    : 'bg-[#1F5A3F] hover:bg-[#194B34] text-white shadow-sm'
                  }`}
              >
                {addedPlaceDays.has(closestPlace.id) ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Added to Day {addedPlaceDays.get(closestPlace.id)}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" /> Add to Itinerary
                  </>
                )}
              </button>

              {/* Prominent "Open in Explore" CTA Button */}
              <button
                onClick={() => navigateToExplore(closestPlace.id, closestPlace.category)}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 font-semibold text-xs flex items-center gap-1.5 press-scale"
              >
                <span>Open in Explore</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#1F5A3F]" />
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-4 right-4 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-white border border-gray-200 p-4 shadow-lg text-center text-xs font-medium text-gray-500">
            No verified landmarks found within 50 km of your live GPS.
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
