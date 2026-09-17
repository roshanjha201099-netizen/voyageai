import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  Car, Compass, Search, X, RefreshCw, ArrowLeft, ExternalLink, Volume2, VolumeX, Loader2, Crosshair, Plus, Check, AlertTriangle
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl, DEFAULT_HEADERS } from '../../config/apiConfig';
import { useAudioGuide } from '../../hooks/useAudioGuide';
import { createUserLocationIcon, createCrazyPoiIcon, createClusterIcon } from './mapIcons';
import { MAP_CATEGORY_CONFIG, getCategoryConfig, getPlaceImage } from './mapCategoryConfig';

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
}

export const MapView: React.FC = () => {
  const navigate = useNavigate();
  const {
    openCabModal, userLocation, isFollowMode, setIsFollowMode, toggleFollowMode, setNavigationTarget, setTripView
  } = useApp();
  const { currentTrip } = useTrip();

  const defaultCoords: [number, number] = useMemo(() => [
    userLocation?.[0] || currentTrip?.destination?.latitude || 26.2376,
    userLocation?.[1] || currentTrip?.destination?.longitude || 86.2021
  ], [userLocation, currentTrip]);

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<'hotels' | 'food' | 'sights' | 'experiences' | 'all'>('food');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCoords);

  const { playBase64Audio, stopAudio } = useAudioGuide();
  const [playingPlaceId, setPlayingPlaceId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [activeGeofenceBanner, setActiveGeofenceBanner] = useState<{ placeName: string; distMeters: number } | null>(null);
  const narratedPlaceIdsRef = useRef<Set<string>>(new Set());

  // Itinerary addition state
  const [addedPlaceIds, setAddedPlaceIds] = useState<Set<string>>(new Set());
  const [addingPlaceId, setAddingPlaceId] = useState<string | null>(null);

  // ── REFS TO PREVENT STALE CLOSURES IN LEAFLET HANDLERS (Fix #1) ──
  const activeCategoryRef = useRef(activeCategory);
  const searchQueryRef = useRef(searchQuery);
  const isFollowModeRef = useRef(isFollowMode);
  const hasUserPannedRef = useRef(false);
  const hasPannedToUserRef = useRef(false);
  const isProgrammaticMoveRef = useRef(false);

  useEffect(() => { activeCategoryRef.current = activeCategory; }, [activeCategory]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);
  useEffect(() => { isFollowModeRef.current = isFollowMode; }, [isFollowMode]);

  // Leaflet map & layer refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const prevSelectedPlaceIdRef = useRef<string | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Audio guide narration handler
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
          speaker: 'ritu'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          playBase64Audio(data.audio_base64);
          setPlayingPlaceId(place.id);
        }
      }
    } catch (err) {
      console.error('Audio play error:', err);
    } finally {
      setAudioLoadingId(null);
    }
  }, [playingPlaceId, playBase64Audio, stopAudio]);

  // Add place to itinerary handler (Improvement #6)
  const handleAddToItinerary = useCallback(async (place: PlaceItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddingPlaceId(place.id);
    try {
      const baseUrl = getApiBaseUrl();
      const payload = {
        destination: currentTrip?.destination?.name || 'Trip',
        item_id: place.id,
        item_type: 'activity',
        title: place.name,
        location: place.address || 'Local Spot',
        tag: place.category,
        price: place.price_approx || 'Free',
      };

      const res = await fetch(`${baseUrl}/api/trips/itinerary/add`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAddedPlaceIds(prev => new Set(prev).add(place.id));
      }
    } catch (err) {
      console.error('Failed to add place to itinerary:', err);
    } finally {
      setAddingPlaceId(null);
    }
  }, [currentTrip]);

  // Geofence proximity auto-trigger (<= 150m)
  useEffect(() => {
    if (!userLocation || places.length === 0) return;
    const [uLat, uLng] = userLocation;

    for (const place of places) {
      if (narratedPlaceIdsRef.current.has(place.id)) continue;

      let distMeters = place.distanceMeters;
      if (distMeters === undefined) {
        const R = 6371000;
        const dLat = (place.latitude - uLat) * Math.PI / 180;
        const dLon = (place.longitude - uLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(uLat * Math.PI / 180) * Math.cos(place.latitude * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        distMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      }

      if (distMeters <= 150) {
        narratedPlaceIdsRef.current.add(place.id);
        setActiveGeofenceBanner({ placeName: place.name, distMeters });
        handlePlayNarration(place);

        const bannerTimer = setTimeout(() => {
          setActiveGeofenceBanner(null);
        }, 6000);
        return () => clearTimeout(bannerTimer);
      }
    }
  }, [userLocation, places, handlePlayNarration]);

  // ── Unified Fetch Nearby Places (Improvement #7 fitBounds & #8 Error State) ──
  const fetchPlaces = useCallback(async (lat: number, lng: number, cat: string, query?: string) => {
    setIsLoading(true);
    setFetchError(null);
    setShowSearchAreaBtn(false);

    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        category: cat,
        radius: '10000'
      });
      if (query && query.trim().length >= 2) {
        params.append('q', query.trim());
      }

      const res = await fetch(`${baseUrl}/api/places/nearby?${params.toString()}`, {
        headers: DEFAULT_HEADERS
      });

      if (!res.ok) {
        throw new Error(`Failed to load places (${res.status})`);
      }

      const data = await res.json();
      const cleanList: PlaceItem[] = (Array.isArray(data) ? data : []).map((p: any, idx: number) => ({
        id: p.id || `place_${idx}`,
        name: p.name || 'Local Landmark',
        category: p.category || cat,
        latitude: p.latitude || p.lat,
        longitude: p.longitude || p.lng || p.lon,
        distanceMeters: p.distanceMeters || Math.round((p.distanceKm || p.distance_km || 1) * 1000),
        address: p.address || p.location || 'Local Vicinity',
        rating: p.rating || Number((4.2 + (idx % 6) * 0.1).toFixed(1)),
        price_approx: p.price_approx || (cat === 'hotels' ? '₹2,200/night' : cat === 'food' ? '₹400 for two' : 'Free Entry')
      }));

      setPlaces(cleanList);
      if (cleanList.length > 0) {
        setSelectedPlace(cleanList[0]);

        // Fit Bounds around new markers + user position (Improvement #7)
        if (mapInstanceRef.current) {
          const points: [number, number][] = cleanList.map(p => [p.latitude, p.longitude]);
          if (userLocation) points.push(userLocation);
          const bounds = L.latLngBounds(points);
          if (bounds.isValid()) {
            isProgrammaticMoveRef.current = true;
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
          }
        }
      }
    } catch (err: any) {
      console.error('Fetch places error:', err);
      setFetchError(err?.message || 'Unable to fetch nearby places. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  const fetchPlacesRef = useRef(fetchPlaces);
  useEffect(() => { fetchPlacesRef.current = fetchPlaces; }, [fetchPlaces]);

  // Scroll active card into view
  useEffect(() => {
    if (selectedPlace?.id && cardRefs.current[selectedPlace.id]) {
      cardRefs.current[selectedPlace.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedPlace]);

  // ── Leaflet Map Initialization & Event Listeners (Fix #1 Stale Closure & #2 Cleanup) ──
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true
    }).setView(defaultCoords, 14);

    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    const invalidate = () => map.invalidateSize();
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 400);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapContainerRef.current);

    // Event listener handlers reading from REFS to fix stale closure
    const handleMoveEnd = () => {
      if (!isProgrammaticMoveRef.current) {
        hasUserPannedRef.current = true;
      }
      isProgrammaticMoveRef.current = false;

      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      setShowSearchAreaBtn(true);
      if (isFollowModeRef.current) {
        setIsFollowMode(false);
      }
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;
      setMapCenter([clickedLat, clickedLng]);
      setShowSearchAreaBtn(true);
      if (fetchPlacesRef.current) {
        fetchPlacesRef.current(clickedLat, clickedLng, activeCategoryRef.current, searchQueryRef.current);
      }
    };

    map.on('moveend', handleMoveEnd);
    map.on('click', handleMapClick);

    // Initial fetch on load
    fetchPlacesRef.current(defaultCoords[0], defaultCoords[1], activeCategoryRef.current);

    // Complete cleanup function (Fix #2)
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('moveend', handleMoveEnd);
        mapInstanceRef.current.off('click', handleMapClick);
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersLayerRef.current = null;
      userMarkerRef.current = null;
      markersMapRef.current.clear();
    };
  }, [defaultCoords, setIsFollowMode]);

  // ── Initial User Location Async FlyTo (Fix #5) ──
  useEffect(() => {
    if (userLocation && !hasUserPannedRef.current && !hasPannedToUserRef.current && mapInstanceRef.current) {
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.flyTo(userLocation, 15, { animate: true, duration: 1.2 });
      hasPannedToUserRef.current = true;
    }
  }, [userLocation]);

  // ── Marker Diffing & Rendering (Fix #4 Marker Diffing & #9 Clustering) ──
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    const markersMap = markersMapRef.current;
    const currentSelectedId = selectedPlace?.id || null;
    const prevSelectedId = prevSelectedPlaceIdRef.current;

    // User Location Radar Marker
    const userPos = userLocation || defaultCoords;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userPos);
    } else {
      userMarkerRef.current = L.marker(userPos, {
        icon: createUserLocationIcon()
      }).addTo(mapInstanceRef.current);
    }

    // Determine if clustering should be active (>20 places)
    const shouldCluster = places.length > 20;

    if (shouldCluster) {
      // Cluster rendering pass
      markersGroup.clearLayers();
      markersMap.clear();

      const map = mapInstanceRef.current;
      const zoom = map.getZoom();
      const clusters: { center: [number, number]; points: PlaceItem[] }[] = [];
      const clusterDistancePx = 60;

      places.forEach(p => {
        if (!p.latitude || !p.longitude) return;
        const pt = map.latLngToLayerPoint([p.latitude, p.longitude]);
        let foundCluster = false;

        for (const c of clusters) {
          const cPt = map.latLngToLayerPoint(c.center);
          const dist = Math.hypot(pt.x - cPt.x, pt.y - cPt.y);
          if (dist < clusterDistancePx) {
            c.points.push(p);
            foundCluster = true;
            break;
          }
        }

        if (!foundCluster) {
          clusters.push({ center: [p.latitude, p.longitude], points: [p] });
        }
      });

      clusters.forEach((c) => {
        if (c.points.length === 1) {
          const p = c.points[0];
          const isSelected = p.id === currentSelectedId;
          const marker = L.marker([p.latitude, p.longitude], {
            icon: createCrazyPoiIcon(p.category, isSelected)
          }).addTo(markersGroup);

          marker.on('click', (e: L.LeafletMouseEvent) => {
            if (e.originalEvent) e.originalEvent.stopPropagation();
            setSelectedPlace(p);
          });
          markersMap.set(p.id, marker);
        } else {
          const clusterMarker = L.marker(c.center, {
            icon: createClusterIcon(c.points.length)
          }).addTo(markersGroup);

          clusterMarker.on('click', (e: L.LeafletMouseEvent) => {
            if (e.originalEvent) e.originalEvent.stopPropagation();
            map.setView(c.center, zoom + 2, { animate: true });
          });
        }
      });
    } else {
      // High-performance Marker Diffing pass (Fix #4)
      const currentPlaceIds = new Set(places.map(p => p.id));

      // 1. Remove obsolete markers
      markersMap.forEach((marker, id) => {
        if (!currentPlaceIds.has(id)) {
          markersGroup.removeLayer(marker);
          markersMap.delete(id);
        }
      });

      // 2. Add or update markers
      places.forEach((p) => {
        if (!p.latitude || !p.longitude) return;
        const isSelected = p.id === currentSelectedId;
        const existingMarker = markersMap.get(p.id);

        if (!existingMarker) {
          // Add new marker
          const marker = L.marker([p.latitude, p.longitude], {
            icon: createCrazyPoiIcon(p.category, isSelected)
          }).addTo(markersGroup);

          marker.on('click', (e: L.LeafletMouseEvent) => {
            if (e.originalEvent) e.originalEvent.stopPropagation();
            setSelectedPlace(p);
            mapInstanceRef.current?.panTo([p.latitude, p.longitude], { animate: true, duration: 0.5 });
          });

          markersMap.set(p.id, marker);
        } else {
          // Update icon ONLY if selected state changed
          const wasSelected = p.id === prevSelectedId;
          if (isSelected !== wasSelected) {
            existingMarker.setIcon(createCrazyPoiIcon(p.category, isSelected));
          }
        }
      });
    }

    prevSelectedPlaceIdRef.current = currentSelectedId;
  }, [places, selectedPlace, userLocation, defaultCoords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlaces(mapCenter[0], mapCenter[1], activeCategory, searchQuery);
  };

  return (
    <div className="relative w-full h-[calc(100dvh-125px)] min-h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl">
      {/* MAP CANVAS WITH DARK-MATTER TILES */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full z-0 crazy-dark-tiles cursor-grab active:cursor-grabbing"
      />

      {/* TOP FLOATING TELEMETRY BAR */}
      <div className="absolute top-3 left-3 right-3 z-[1001] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-xl border border-white/10 flex items-center gap-2 text-xs font-semibold text-slate-200 shadow-2xl">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-400">Live Geofence</span>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-white/10">150m Rad</span>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {userLocation && (
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current && userLocation) {
                  isProgrammaticMoveRef.current = true;
                  mapInstanceRef.current.setView(userLocation, 15, { animate: true });
                  setMapCenter(userLocation);
                  toggleFollowMode();
                  fetchPlaces(userLocation[0], userLocation[1], activeCategory);
                }
              }}
              className="p-2.5 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/10 text-emerald-400 hover:text-white hover:border-emerald-500/40 transition-all shadow-2xl active:scale-95 flex items-center justify-center"
              title="Recenter Location"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </button>
          )}
        </div>
      </div>

      {/* GEOFENCE PROXIMITY TOAST BANNER */}
      {activeGeofenceBanner && (
        <div className="absolute top-2 left-4 right-4 z-[1001] max-w-md mx-auto px-4 py-2 bg-amber-500/90 border border-amber-400/50 text-slate-950 font-black text-xs rounded-2xl backdrop-blur-xl shadow-2xl flex items-center justify-between gap-2 animate-bounce">
          <div className="flex items-center gap-2 truncate">
            <Volume2 className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="truncate">🎧 Geofence ({activeGeofenceBanner.distMeters}m): Auto-playing guide for {activeGeofenceBanner.placeName}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveGeofenceBanner(null)}
            className="p-1 hover:bg-slate-950/20 rounded-lg transition-colors text-slate-950 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP FLOATING SEARCH & CATEGORY STRIP */}
      <div className="absolute top-14 left-3 right-3 z-[1000] flex flex-col gap-2.5 max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNavigationTarget(null);
              setTripView('home');
              navigate('/');
            }}
            className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl text-slate-200 hover:text-white hover:bg-slate-800/80 transition-all shrink-0 press-scale"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Floating Search Island */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places, food, hotels..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-2xl text-xs font-semibold text-white shadow-2xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-slate-400 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchPlaces(mapCenter[0], mapCenter[1], activeCategory);
                }}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white p-0.5 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Category Navigation Pills (Unified Taxonomy Fix #3) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {[
            { id: 'hotels', label: `${MAP_CATEGORY_CONFIG.hotels.emoji} ${MAP_CATEGORY_CONFIG.hotels.label}` },
            { id: 'food', label: `${MAP_CATEGORY_CONFIG.food.emoji} ${MAP_CATEGORY_CONFIG.food.label}` },
            { id: 'sights', label: `${MAP_CATEGORY_CONFIG.sights.emoji} ${MAP_CATEGORY_CONFIG.sights.label}` },
            { id: 'experiences', label: `${MAP_CATEGORY_CONFIG.experiences.emoji} ${MAP_CATEGORY_CONFIG.experiences.label}` },
            { id: 'all', label: `${MAP_CATEGORY_CONFIG.all.emoji} ${MAP_CATEGORY_CONFIG.all.label}` }
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id as any);
                  fetchPlaces(mapCenter[0], mapCenter[1], cat.id, searchQuery);
                }}
                className={`press-scale shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold shadow-lg shadow-emerald-500/25 ring-1 ring-white/20 border border-emerald-400/30'
                  : 'bg-slate-900/80 backdrop-blur-xl text-slate-300 border border-white/10 hover:bg-slate-800/80 hover:text-white'
                  }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FLOATING "SEARCH THIS AREA" PILL */}
      {showSearchAreaBtn && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1000] animate-fadeIn">
          <button
            type="button"
            onClick={() => fetchPlaces(mapCenter[0], mapCenter[1], activeCategory, searchQuery)}
            className="px-4 py-2 bg-slate-900/85 border border-emerald-500/40 backdrop-blur-xl rounded-full text-xs font-bold text-emerald-400 shadow-2xl hover:bg-slate-800/90 flex items-center gap-2 transition-all press-scale"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Search this area</span>
          </button>
        </div>
      )}

      {/* MAP LOADING OVERLAY */}
      {isLoading && !showSearchAreaBtn && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1000]">
          <div className="px-4 py-2 bg-slate-900/80 border border-white/10 backdrop-blur-xl rounded-full text-xs font-semibold text-slate-300 shadow-xl flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>Finding places nearby...</span>
          </div>
        </div>
      )}

      {/* FETCH ERROR STATE & RETRY AFFORDANCE (Improvement #8) */}
      {fetchError && !isLoading && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[1000] w-11/12 max-w-sm">
          <div className="px-4 py-3 bg-slate-900/90 border border-rose-500/50 backdrop-blur-xl rounded-2xl text-xs text-rose-200 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchPlaces(mapCenter[0], mapCenter[1], activeCategory, searchQuery)}
              className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-[11px] shrink-0 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* COMPASS / GPS RECENTER BUTTON */}
      {userLocation && (
        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current && userLocation) {
              isProgrammaticMoveRef.current = true;
              mapInstanceRef.current.setView(userLocation, 15, { animate: true });
              setMapCenter(userLocation);
              toggleFollowMode();
              fetchPlaces(userLocation[0], userLocation[1], activeCategory);
            }
          }}
          className={`absolute bottom-44 right-4 z-[1000] p-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all press-scale ${isFollowMode
            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-emerald-500/30'
            : 'bg-slate-900/85 text-emerald-400 border-white/10 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          title="Recenter Map"
          aria-label="Recenter Map"
        >
          <Compass className="w-5 h-5" />
        </button>
      )}

      {/* BOTTOM HORIZONTAL PLACE CARD CAROUSEL */}
      <div className="absolute bottom-4 left-3 right-3 z-[1000]">
        {places.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar p-1">
            {places.map((place) => {
              const isSelected = selectedPlace?.id === place.id;
              const distKm = place.distanceMeters ? (place.distanceMeters / 1000).toFixed(1) : '0.8';
              const coverImg = getPlaceImage(place.category, place.name);
              const isAdded = addedPlaceIds.has(place.id);
              const isAdding = addingPlaceId === place.id;

              return (
                <div
                  key={place.id}
                  ref={(el) => { cardRefs.current[place.id] = el; }}
                  onClick={() => {
                    setSelectedPlace(place);
                    if (mapInstanceRef.current) {
                      isProgrammaticMoveRef.current = true;
                      mapInstanceRef.current.panTo([place.latitude, place.longitude], { animate: true, duration: 0.5 });
                    }
                  }}
                  className={`snap-center shrink-0 w-80 h-36 rounded-2xl backdrop-blur-xl transition-all cursor-pointer border p-3 flex gap-3 ${isSelected
                    ? 'bg-slate-900/95 text-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-900/80 text-slate-200 border-white/10 shadow-2xl hover:bg-slate-900 hover:border-white/20'
                    }`}
                >
                  {/* Left Cover Photo */}
                  <div className="relative w-24 h-full rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <img
                      src={coverImg}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-950/80 text-emerald-400 backdrop-blur-md border border-white/10">
                      {getCategoryConfig(place.category).label}
                    </span>
                  </div>

                  {/* Right Card Content */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-400">
                        <span className="uppercase text-emerald-400 font-extrabold tracking-wider truncate text-[9px]">
                          {getCategoryConfig(place.category).label}
                        </span>
                        {place.rating ? (
                          <span className="text-amber-400 font-extrabold flex items-center gap-0.5 shrink-0">
                            ★ {place.rating}
                          </span>
                        ) : null}
                      </div>

                      <h4 className="font-extrabold text-sm truncate mt-0.5 text-white">{place.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{place.address} • {distKm} km away</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10">
                      <span className="text-xs font-bold text-emerald-300 truncate">
                        {place.price_approx || 'Verified Spot'}
                      </span>
                      <div className="flex gap-1.5 shrink-0 items-center">
                        {/* Audio Guide Narration Button */}
                        <button
                          type="button"
                          onClick={(e) => handlePlayNarration(place, e)}
                          className={`p-2 rounded-xl transition-all flex items-center justify-center text-xs font-semibold press-scale ${
                            playingPlaceId === place.id 
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30 animate-pulse' 
                              : 'bg-white/10 hover:bg-white/20 text-slate-200'
                          }`}
                          title="Listen AI Guide"
                          aria-label="Listen AI Guide"
                        >
                          {audioLoadingId === place.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : playingPlaceId === place.id ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </button>

                        {/* Directions Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const q = encodeURIComponent(`${place.name}, ${place.address}`);
                            window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
                          }}
                          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all press-scale"
                          title="Open Directions in Google Maps"
                          aria-label="Open Directions in Google Maps"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Ride Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCabModal(place.name);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-emerald-500/25 press-scale transition-all"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Ride</span>
                        </button>

                        {/* Add to Itinerary Button (Improvement #6) */}
                        <button
                          type="button"
                          onClick={(e) => handleAddToItinerary(place, e)}
                          disabled={isAdded || isAdding}
                          className={`px-2.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 transition-all press-scale ${
                            isAdded
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                          }`}
                          title="Add to Itinerary"
                          aria-label="Add to Itinerary"
                        >
                          {isAdding ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          ) : isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-teal-400" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Itinerary</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isLoading && !fetchError && (
          <div className="p-4 bg-slate-900/85 border border-white/10 backdrop-blur-xl rounded-2xl text-center text-xs font-medium text-slate-300 shadow-2xl">
            No places found nearby. Try dragging the map or tapping "Search this area".
          </div>
        )}
      </div>
    </div>
  );
};