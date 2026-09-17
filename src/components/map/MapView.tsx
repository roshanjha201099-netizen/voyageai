import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  Car, Compass, Search, X, RefreshCw, ArrowLeft, ExternalLink, Volume2, VolumeX, Loader2
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useAudioGuide } from '../../hooks/useAudioGuide';

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

const getPlaceImage = (category: string, name: string) => {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (cat.includes('hotel') || cat.includes('stay') || cat.includes('lodging') || n.includes('resort') || n.includes('hotel')) {
    return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80';
  }
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe') || cat.includes('dhaba') || n.includes('food') || n.includes('cafe')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80';
  }
  if (cat.includes('fort') || cat.includes('temple') || cat.includes('historic') || cat.includes('monument') || cat.includes('activity')) {
    return 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80';
  }
  return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80';
};

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
  const [activeCategory, setActiveCategory] = useState<'hotels' | 'food' | 'activities' | 'all'>('food');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCoords);

  const { playBase64Audio, stopAudio } = useAudioGuide();
  const [playingPlaceId, setPlayingPlaceId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [activeGeofenceBanner, setActiveGeofenceBanner] = useState<{ placeName: string; distMeters: number } | null>(null);
  const narratedPlaceIdsRef = useRef<Set<string>>(new Set());

  const handlePlayNarration = useCallback(async (place: PlaceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If already playing this place, stop/pause audio
    if (playingPlaceId === place.id) {
      stopAudio();
      setPlayingPlaceId(null);
      return;
    }

    setAudioLoadingId(place.id);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl}/api/tts/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Proximity Geofence Auto-Trigger (<= 150m)
  useEffect(() => {
    if (!userLocation || places.length === 0) return;
    const [uLat, uLng] = userLocation;

    for (const place of places) {
      if (narratedPlaceIdsRef.current.has(place.id)) continue;

      // Distance calculation in meters
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
        console.log(`[GEOFENCE AUTO-TRIGGER] User within ${distMeters}m of landmark: ${place.name}`);
        narratedPlaceIdsRef.current.add(place.id);
        setActiveGeofenceBanner({ placeName: place.name, distMeters });
        
        // Auto-play speech narration for landmark
        handlePlayNarration(place);

        const bannerTimer = setTimeout(() => {
          setActiveGeofenceBanner(null);
        }, 6000);
        return () => clearTimeout(bannerTimer);
      }
    }
  }, [userLocation, places, handlePlayNarration]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // 1. Fetch places from unified backend endpoint
  const fetchPlaces = useCallback(async (lat: number, lng: number, cat: string, query?: string) => {
    setIsLoading(true);
    setShowSearchAreaBtn(false);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        category: cat,
        radius: '10000'
      });
      if (query && query.trim().length >= 2) {
        params.append('q', query.trim());
      }

      const res = await fetch(`${baseUrl}/api/places/nearby?${params.toString()}`);
      if (res.ok) {
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
        }
      }
    } catch (err) {
      console.error('Failed to fetch places:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load or category switch
  useEffect(() => {
    fetchPlaces(mapCenter[0], mapCenter[1], activeCategory, searchQuery);
  }, [activeCategory]);

  // Synchronize bottom card scrolling when selectedPlace changes
  useEffect(() => {
    if (selectedPlace?.id && cardRefs.current[selectedPlace.id]) {
      cardRefs.current[selectedPlace.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedPlace]);

  // 2. Leaflet Map Initialization (CartoDB Dark Theme)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      fadeAnimation: true,
      markerZoomAnimation: true
    }).setView(defaultCoords, 14);

    // CARTO Raster Voyager basemap surface with runtime API key configuration
    const cartoKey = import.meta.env.VITE_CARTO_BASEMAP_KEY;
    if (!cartoKey && import.meta.env.DEV) {
      console.warn('[MapView] VITE_CARTO_BASEMAP_KEY is missing. CARTO raster tiles may display a watermark.');
    }

    const tileUrl = cartoKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Forces Leaflet container layout recalculation
    const invalidate = () => map.invalidateSize();
    const t1 = setTimeout(invalidate, 100);
    const t2 = setTimeout(invalidate, 400);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Detect user dragging camera -> show "Search this area"
    map.on('moveend', () => {
      const center = map.getCenter();
      setMapCenter([center.lat, center.lng]);
      setShowSearchAreaBtn(true);
      if (isFollowMode) {
        setIsFollowMode(false);
      }
    });

    // Detect user tapping map canvas directly -> discover POIs around click
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;
      setMapCenter([clickedLat, clickedLng]);
      setShowSearchAreaBtn(true);
      fetchPlaces(clickedLat, clickedLng, activeCategory, searchQuery);
    });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
    };
  }, [defaultCoords, isFollowMode, setIsFollowMode, activeCategory, searchQuery, fetchPlaces]);

  // 3. Render Custom Leaflet Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    // User Position Pulse Dot
    const userPos = userLocation || defaultCoords;
    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }
    userMarkerRef.current = L.marker(userPos, {
      icon: L.divIcon({
        className: '',
        html: `<div style="position:relative; width:24px; height:24px;">
                <div style="position:absolute; width:24px; height:24px; background:rgba(16,185,129,0.35); border-radius:50%; animation:ping 2.5s infinite;"></div>
                <div style="position:absolute; top:4px; left:4px; width:16px; height:16px; background:#10B981; border:3px solid #0F172A; border-radius:50%; box-shadow:0 0 12px rgba(16,185,129,0.8);"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(mapInstanceRef.current);

    // Render Micro-Badges
    places.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      const isSelected = selectedPlace?.id === p.id;
      const badgeIcon = p.category === 'hotels' ? '🏨' : p.category === 'food' ? '🍽️' : '🎯';
      const label = p.name.length > 14 ? `${p.name.substring(0, 12)}..` : p.name;

      const markerHtml = isSelected ? `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0F172A;
          color: #FFFFFF;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.5), 0 8px 20px rgba(0,0,0,0.6);
          border: 2px solid #10B981;
          transform: scale(1.12);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          white-space: nowrap;
          pointer-events: auto;
        ">
          <span style="font-size: 12px;">${badgeIcon}</span>
          <span style="color: #F8FAFC;">${label}</span>
          ${p.rating ? `<span style="color: #F59E0B; font-size: 10px; font-weight: 800;">★${p.rating}</span>` : ''}
        </div>
      ` : `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          color: #E2E8F0;
          padding: 4px 8px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          border: 1px solid rgba(255, 255, 255, 0.12);
          transition: all 0.2s ease;
          cursor: pointer;
          white-space: nowrap;
          pointer-events: auto;
        ">
          <span style="font-size: 11px;">${badgeIcon}</span>
          <span style="opacity: 0.9;">${label}</span>
        </div>
      `;

      const marker = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [110, 28],
          iconAnchor: [55, 14]
        })
      }).addTo(markersGroup);

      marker.on('click', (e: L.LeafletMouseEvent) => {
        if (e.originalEvent) {
          e.originalEvent.stopPropagation();
        }
        setSelectedPlace(p);
        mapInstanceRef.current?.panTo([p.latitude, p.longitude], { animate: true, duration: 0.5 });
      });
    });
  }, [places, selectedPlace, userLocation, defaultCoords]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlaces(mapCenter[0], mapCenter[1], activeCategory, searchQuery);
  };

  return (
    <div className="relative w-full h-[calc(100dvh-125px)] min-h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl">
      {/* MAP CANVAS */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

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
      <div className="absolute top-4 left-3 right-3 z-[1000] flex flex-col gap-2.5 max-w-xl mx-auto">
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

        {/* Category Navigation Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          {[
            { id: 'hotels', label: '🏨 Stays' },
            { id: 'food', label: '🍽️ Food & Cafes' },
            { id: 'activities', label: '🎯 Experiences' },
            { id: 'all', label: '🗺️ All' }
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
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

      {/* COMPASS / GPS RECENTER BUTTON */}
      {userLocation && (
        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current && userLocation) {
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

              return (
                <div
                  key={place.id}
                  ref={(el) => { cardRefs.current[place.id] = el; }}
                  onClick={() => {
                    setSelectedPlace(place);
                    mapInstanceRef.current?.panTo([place.latitude, place.longitude], { animate: true, duration: 0.5 });
                  }}
                  className={`snap-center shrink-0 w-80 h-36 rounded-2xl backdrop-blur-xl transition-all cursor-pointer border p-3 flex gap-3 ${isSelected
                    ? 'bg-slate-900/95 text-white border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_10px_30px_rgba(16,185,129,0.25)]'
                    : 'bg-slate-900/80 text-slate-200 border-white/10 shadow-2xl hover:bg-slate-900 hover:border-white/20'
                    }`}
                >
                  {/* Left Cover Photo (1/3 width) */}
                  <div className="relative w-24 h-full rounded-xl overflow-hidden bg-slate-800 shrink-0">
                    <img
                      src={coverImg}
                      alt={place.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-950/80 text-emerald-400 backdrop-blur-md border border-white/10">
                      {place.category}
                    </span>
                  </div>

                  {/* Right Card Content (2/3 width) */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-400">
                        <span className="uppercase text-emerald-400 font-extrabold tracking-wider truncate text-[9px]">
                          {place.category}
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
                      <div className="flex gap-2 shrink-0 items-center">
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCabModal(place.name);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 press-scale transition-all"
                        >
                          <Car className="w-3.5 h-3.5" />
                          <span>Ride</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !isLoading && (
          <div className="p-4 bg-slate-900/85 border border-white/10 backdrop-blur-xl rounded-2xl text-center text-xs font-medium text-slate-300 shadow-2xl">
            No places found nearby. Try dragging the map or tapping "Search this area".
          </div>
        )}
      </div>
    </div>
  );
};