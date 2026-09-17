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

export const MapView: React.FC = () => {
  const { userLocation, isFollowMode, setIsFollowMode } = useApp();
  const { currentTrip } = useTrip();
  const { mapFocusTarget, setMapFocusTarget, navigateToExplore } = useNavigation();

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

  // Itinerary addition tracking
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);

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

  // Handle Add to Itinerary from Map Mini-Sheet
  const handleAddToItinerary = useCallback(async (place: PlaceItem) => {
    setAddingPlaceId(place.id);
    setAddedPlaceIds((prev) => new Set(prev).add(place.id));

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          trip_id: currentTrip?.id || 'active_trip',
          destination: currentTrip?.destination?.name || 'Goa',
          item_id: place.id,
          title: place.name,
          location: place.address || `${place.latitude}, ${place.longitude}`,
          tag: place.category,
          price: place.price_approx || '₹0',
        }),
      });
    } catch (err) {
      console.warn('[MAP] Add to itinerary error:', err);
    } finally {
      setAddingPlaceId(null);
    }
  }, [currentTrip]);

  // Fetch POIs from /api/places/nearby or fallback
  const fetchMapPlaces = useCallback(async (centerLat: number, centerLng: number) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/places/nearby?lat=${centerLat}&lng=${centerLng}&radius=5000&limit=40`, {
        headers: DEFAULT_HEADERS,
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      let fetchedPlaces: PlaceItem[] = [];
      if (data.places && Array.isArray(data.places)) {
        fetchedPlaces = data.places.map((p: any) => ({
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
      }

      setPlaces(fetchedPlaces);
    } catch (err: any) {
      console.warn('[MAP] Failed to fetch nearby POIs, using fallback dataset:', err);
      const fallback = getFallbackMapPlaces(centerLat, centerLng);
      setPlaces(fallback);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchMapPlaces(defaultCoords[0], defaultCoords[1]);
  }, [defaultCoords, fetchMapPlaces]);

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

    // Open-access basemap with custom dark-matter CSS inversion (0 API keys required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      className: 'crazy-dark-tiles',
    }).addTo(map);

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
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      markersMapRef.current.clear();
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
      const marker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMarkerRef.current = marker;
    } else {
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
    <div className="relative w-full h-[calc(100dvh-64px)] overflow-hidden bg-[#090f1d] select-none">
      
      {/* ── 1. Full-Bleed Dark Map Container ── */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* ── 2. Top Minimalist Glassmorphism Telemetry HUD ── */}
      <div className="absolute top-4 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none">
        
        {/* Back / Open Explore Mode CTA */}
        <button
          onClick={() => navigateToExplore()}
          className="pointer-events-auto px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-900 text-slate-100 border border-white/10 shadow-2xl backdrop-blur-xl font-bold text-xs flex items-center gap-2 press-scale"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" />
          <span>Explore Mode</span>
        </button>

        {/* Live GPS Telemetry Pill */}
        <div className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 backdrop-blur-xl shadow-2xl flex items-center gap-2 text-[11px] font-extrabold tracking-tight">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Geofence Active (150m Rad)</span>
        </div>

        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className={`pointer-events-auto p-2.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all press-scale ${
            isFollowMode
              ? 'bg-emerald-500 text-slate-950 border-emerald-400'
              : 'bg-slate-900/90 text-slate-200 border-white/10 hover:border-emerald-500/40'
          }`}
          title="Recenter to GPS Location"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* ── 3. Category Quick Filter Pill Bar ── */}
      <div className="absolute top-16 left-4 right-4 z-[500] flex items-center gap-2 overflow-x-auto no-scrollbar pointer-events-auto py-1">
        {(['all', 'sights', 'food', 'hotels', 'experiences'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md transition-all border ${
              activeCategory === cat
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900/80 text-slate-300 border-white/10 hover:text-white'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── 4. Bottom Swipe-Up Glass Mini-Sheet (Only Closest / Selected Spot) ── */}
      {closestPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-[500] pointer-events-auto animate-slideUp">
          <div className="rounded-3xl bg-slate-900/95 border border-white/15 p-4 shadow-2xl backdrop-blur-2xl space-y-3">
            
            {/* Spot Header Info */}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5 max-w-[70%]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                    {closestPlace.category}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {closestPlace.distanceMeters ? `${closestPlace.distanceMeters}m away` : 'Near Live GPS'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white truncate">
                  {closestPlace.name}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {closestPlace.address}
                </p>
              </div>

              {/* Audio Narration TTS Control */}
              <button
                onClick={(e) => handlePlayNarration(closestPlace, e)}
                disabled={audioLoadingId === closestPlace.id}
                className={`p-2.5 rounded-2xl border transition-all press-scale ${
                  playingPlaceId === closestPlace.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30 animate-pulse'
                    : 'bg-slate-800 text-slate-200 border-white/10 hover:border-emerald-500/40'
                }`}
                title="Audio Guide Narration"
              >
                {audioLoadingId === closestPlace.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                ) : playingPlaceId === closestPlace.id ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                )}
              </button>
            </div>

            {/* Action CTAs */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
              
              {/* Add to Itinerary Button */}
              <button
                onClick={() => handleAddToItinerary(closestPlace)}
                disabled={addedPlaceIds.has(closestPlace.id) || addingPlaceId === closestPlace.id}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  addedPlaceIds.has(closestPlace.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20'
                }`}
              >
                {addedPlaceIds.has(closestPlace.id) ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" /> Added to Itinerary
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
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/15 font-bold text-xs flex items-center gap-1.5 press-scale"
              >
                <span>Open in Explore</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>

          </div>
        </div>
      )}

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

// Fallback dataset when offline or error
function getFallbackMapPlaces(lat: number, lng: number): PlaceItem[] {
  return [
    {
      id: 'poi-baga-sunset',
      name: 'Baga Beach Sunset Point',
      category: 'sights',
      latitude: lat + 0.003,
      longitude: lng + 0.002,
      distanceMeters: 140,
      address: 'Baga Beach Rd, North Goa',
      rating: 4.8,
      price_approx: 'Free Entry',
      description: 'Famous beach sunset point with watersports and beachfront shacks.',
    },
    {
      id: 'poi-brittos',
      name: 'Britto\'s Seafood Restaurant',
      category: 'food',
      latitude: lat - 0.002,
      longitude: lng + 0.004,
      distanceMeters: 280,
      address: 'Saunta Vaddo, Baga',
      rating: 4.9,
      price_approx: '₹800 - ₹2,000',
      description: 'Iconic beachfront dining offering authentic Goan seafood curry.',
    },
    {
      id: 'poi-taj-resort',
      name: 'Taj Fort Aguada Resort',
      category: 'hotels',
      latitude: lat - 0.005,
      longitude: lng - 0.003,
      distanceMeters: 450,
      address: 'Sinquerim Beach, Candolim',
      rating: 4.9,
      price_approx: '₹18,000 / night',
      description: 'Luxury 5-star oceanfront resort facing the Arabian Sea.',
    },
    {
      id: 'poi-scuba-center',
      name: 'Grand Island Scuba Diving',
      category: 'experiences',
      latitude: lat + 0.004,
      longitude: lng - 0.004,
      distanceMeters: 520,
      address: 'Malim Jetty, Panaji',
      rating: 4.7,
      price_approx: '₹2,500 / person',
      description: 'Underwater coral reef exploration and diving with certified guides.',
    },
  ];
}