import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { BottomSheet } from '../common/BottomSheet';
import { getDestinationInfo } from '../../utils/destinationData';
import { Star, Sparkles, Car, MapPin, Navigation, ArrowLeft, ExternalLink, Compass, Map as MapIcon, Route } from 'lucide-react';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import type { NavigationTarget } from '../../types';

export interface MapSpot {
  type: 'Hotel' | 'Restaurant' | 'Activity';
  title: string;
  location: string;
  rating: number;
  price: string;
  image: string;
  distanceKm: string;
  coordinates: [number, number];
}

// Haversine distance calculator in km
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const MapView: React.FC = () => {
  const navigate = useNavigate();
  const {
    openCabModal, openAiAssistant, navigationTarget, setNavigationTarget, setTripView, setActiveTab,
    userLocation, userLocationAccuracy, isLiveTracking, isFollowMode, setIsFollowMode, toggleFollowMode
  } = useApp();
  const { currentTrip, currentItinerary } = useTrip();

  const activeDestName = currentTrip?.destination?.name || 'Bihar';
  const activeDestCoords: [number, number] = useMemo(() => [
    currentTrip?.destination?.latitude || 25.5941,
    currentTrip?.destination?.longitude || 85.1376
  ], [currentTrip]);

  const destInfo = useMemo(() => getDestinationInfo(activeDestName, activeDestCoords), [activeDestName, activeDestCoords]);

  // Extract all itinerary activities as potential navigation targets
  const tripNavigationTargets = useMemo<NavigationTarget[]>(() => {
    const targets: NavigationTarget[] = [];
    if (currentItinerary?.days) {
      let idx = 0;
      currentItinerary.days.forEach(day => {
        (day.activities || []).forEach(act => {
          idx++;
          const lat = act.latitude || (activeDestCoords[0] + (idx * 0.004) - 0.008);
          const lng = act.longitude || (activeDestCoords[1] + (idx * 0.004) - 0.008);
          targets.push({
            activityId: act.id,
            title: act.title,
            locationName: act.locationName || activeDestName,
            coordinates: [lat, lng],
            dayNumber: day.dayNumber,
            tripTitle: currentTrip?.title || activeDestName
          });
        });
      });
    }

    if (targets.length === 0) {
      targets.push({
        activityId: 'default-patna',
        title: 'Takht Sri Patna Sahib Sacred Heritage Visit',
        locationName: 'Harmandir Gali, Patna Sahib, Patna',
        coordinates: activeDestCoords,
        dayNumber: 1,
        tripTitle: activeDestName
      });
    }

    return targets;
  }, [currentItinerary, activeDestCoords, activeDestName, currentTrip?.title]);

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'route' | 'explore'>('route');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedSpot, setSelectedSpot] = useState<MapSpot | null>(null);
  const [currentGPSLocation, setCurrentGPSLocation] = useState<[number, number] | null>(userLocation);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [originMode, setOriginMode] = useState<'stay' | 'live'>('stay');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const defaultUserLocation: [number, number] = userLocation || activeDestCoords;
  const categories = ['All', 'Hotels', 'Food', 'Activities'];

  // Sync live location from AppContext
  useEffect(() => {
    if (userLocation) {
      setCurrentGPSLocation(userLocation);
      setLocationError(null);
    }
  }, [userLocation]);

  // Turn OFF camera follow mode if user manually drags/pans the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const handleDrag = () => {
      if (isFollowMode) {
        setIsFollowMode(false);
      }
    };
    map.on('dragstart', handleDrag);
    return () => {
      map.off('dragstart', handleDrag);
    };
  }, [isFollowMode, setIsFollowMode]);

  // Dynamic user marker & camera update without wiping map layers
  useEffect(() => {
    if (!currentGPSLocation || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(currentGPSLocation);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(currentGPSLocation);
      if (userLocationAccuracy && userLocationAccuracy < 5000) {
        accuracyCircleRef.current.setRadius(userLocationAccuracy);
      }
    }

    if (isFollowMode) {
      map.panTo(currentGPSLocation, { animate: true, duration: 0.8 });
    }
  }, [currentGPSLocation, userLocationAccuracy, isFollowMode]);

  // Determine currently active target (explicit navigationTarget > user selected target > 1st trip target)
  const activeTarget: NavigationTarget = useMemo(() => {
    if (navigationTarget) return navigationTarget;
    if (selectedActivityId) {
      const found = tripNavigationTargets.find(t => t.activityId === selectedActivityId);
      if (found) return found;
    }
    return tripNavigationTargets[0];
  }, [navigationTarget, selectedActivityId, tripNavigationTargets]);

  // Leaflet map initialization for 'explore' mode
  useEffect(() => {
    if (mapMode !== 'explore' || !mapContainerRef.current) return;

    const liveUserPos = currentGPSLocation || defaultUserLocation;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(liveUserPos, 14);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 16
      }).addTo(map);

      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 16
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & polylines
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Pulsing Live User Location Marker + Accuracy Circle
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }
    if (accuracyCircleRef.current) {
      map.removeLayer(accuracyCircleRef.current);
    }

    const pulseHtml = isLiveTracking
      ? `<div style="position:relative; width:22px; height:22px;">
           <div style="position:absolute; top:0; left:0; width:22px; height:22px; background:rgba(16,185,129,0.25); border-radius:50%; animation:livePulse 2s ease-out infinite;"></div>
           <div style="position:absolute; top:4px; left:4px; width:14px; height:14px; background:#10B981; border-radius:50%; border:3px solid #fff; box-shadow:0 0 12px #10B981;"></div>
         </div>`
      : `<div style="background:#0D9488; width:18px; height:18px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 14px #0D9488;"></div>`;

    userMarkerRef.current = L.marker(liveUserPos, {
      icon: L.divIcon({
        className: '',
        html: pulseHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
    }).addTo(map);

    // Accuracy circle (semi-transparent ring)
    const accuracyM = userLocationAccuracy || 50;
    if (accuracyM < 5000) {
      accuracyCircleRef.current = L.circle(liveUserPos, {
        radius: accuracyM,
        color: isLiveTracking ? '#10B981' : '#0D9488',
        fillColor: isLiveTracking ? '#10B981' : '#0D9488',
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3
      }).addTo(map);
    }

    const addMarker = (spot: MapSpot, color: string) => {
      const marker = L.marker(spot.coordinates, {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:${color}; color:#fff; padding:4px 10px; border-radius:20px; font-weight:700; font-size:11px; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.3);">${spot.title.split(' ')[0]}</div>`,
          iconSize: [80, 24],
          iconAnchor: [40, 12]
        })
      }).addTo(map);

      marker.on('click', () => {
        setSelectedSpot(spot);
      });
    };

    if (filterCategory === 'All' || filterCategory === 'Hotels') {
      destInfo.hotels.forEach(h => addMarker({
        type: 'Hotel', title: h.name, location: h.location, rating: h.rating,
        price: `₹${h.pricePerNight.toLocaleString()}/night`, image: h.photos[0],
        distanceKm: '1.2 km', coordinates: h.coordinates
      }, '#0D9488'));
    }

    if (filterCategory === 'All' || filterCategory === 'Food') {
      destInfo.restaurants.forEach(r => addMarker({
        type: 'Restaurant', title: r.name, location: r.location, rating: r.rating,
        price: r.priceRange, image: r.photos[0], distanceKm: `${r.distanceKm} km`,
        coordinates: r.coordinates
      }, '#F59E0B'));
    }

    if (filterCategory === 'All' || filterCategory === 'Activities') {
      tripNavigationTargets.forEach((t, i) => {
        addMarker({
          type: 'Activity',
          title: `Day ${t.dayNumber}: ${t.title}`,
          location: t.locationName,
          rating: 4.8,
          price: 'Included in Trip',
          image: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80',
          distanceKm: `${(1 + i * 0.8).toFixed(1)} km`,
          coordinates: t.coordinates
        }, '#818CF8');
      });
    }
  }, [mapMode, filterCategory, destInfo, currentGPSLocation, defaultUserLocation, tripNavigationTargets, isLiveTracking, userLocationAccuracy]);

  // Smoothly pan map to user location when live tracking updates position
  useEffect(() => {
    if (mapMode === 'explore' && mapInstanceRef.current && currentGPSLocation && isLiveTracking) {
      // Update marker position smoothly
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(currentGPSLocation);
      }
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.setLatLng(currentGPSLocation);
        if (userLocationAccuracy) {
          accuracyCircleRef.current.setRadius(userLocationAccuracy);
        }
      }
    }
  }, [currentGPSLocation, mapMode, isLiveTracking, userLocationAccuracy]);

  // Calculate Google Maps embed direction parameters for activeTarget
  const liveUserPos = currentGPSLocation || defaultUserLocation;
  const targetCoords = activeTarget.coordinates;

  const isFar = calculateHaversineDistance(
    liveUserPos[0],
    liveUserPos[1],
    targetCoords[0],
    targetCoords[1]
  ) > 50;

  const hotelOrigin = destInfo.hotels.length > 0
    ? encodeURIComponent(destInfo.hotels[0].name || destInfo.hotels[0].location)
    : `${targetCoords[0] - 0.015},${targetCoords[1] - 0.015}`;

  const gmapsOrigin = (originMode === 'live' && currentGPSLocation)
    ? `${currentGPSLocation[0]},${currentGPSLocation[1]}`
    : hotelOrigin;

  const gmapsDest = `${targetCoords[0]},${targetCoords[1]}`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?saddr=${gmapsOrigin}&daddr=${gmapsDest}&output=embed&hl=en`;

  // Calculated distance & ETA stats
  const activeOriginPos: [number, number] = (isFar && originMode === 'stay')
    ? (destInfo.hotels[0]?.coordinates || [targetCoords[0] - 0.015, targetCoords[1] - 0.015])
    : liveUserPos;

  const distKm = calculateHaversineDistance(activeOriginPos[0], activeOriginPos[1], targetCoords[0], targetCoords[1]);
  const etaMinutes = Math.max(3, Math.round((distKm / 30) * 60));

  return (
    <div
      className="relative -mx-4 lg:mx-0 rounded-3xl overflow-hidden border border-white/10"
      style={{ height: 'calc(100dvh - 170px)' }}
    >
      {/* Map Canvas: Render Embedded Google Maps Route Frame in 'route' mode, or Leaflet in 'explore' mode */}
      {mapMode === 'route' ? (
        <div className="w-full h-full relative bg-[#0D1117] rounded-3xl overflow-hidden">
          <iframe
            title="Google Maps Interactive Route"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={googleMapsEmbedUrl}
            className="w-full h-full"
          />
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full" />
      )}

      {/* TOP FLOATING HEADER WITH TRIP BACK BUTTON & ACTIVITY QUICK SELECTOR */}
      <div className="absolute top-3 left-3 right-3 z-[1000] space-y-2">
        {/* Main Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0D1117]/95 border border-teal-500/40 backdrop-blur-md shadow-2xl gap-2">
          <button
            type="button"
            onClick={() => {
              setNavigationTarget(null);
              setTripView('home');
              setActiveTab('trips');
              navigate('/');
            }}
            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all press-scale shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Active Trip</span>
          </button>

          {/* Map Mode Switcher */}
          <div className="flex bg-slate-800/90 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setMapMode('route')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                mapMode === 'route'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Route</span>
            </button>
            <button
              type="button"
              onClick={() => setMapMode('explore')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                mapMode === 'explore'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>
          </div>
        </div>

        {/* Activity Quick Selector Pills for Route Mode */}
        {mapMode === 'route' && tripNavigationTargets.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {tripNavigationTargets.map((target) => {
              const isSelected = activeTarget.activityId === target.activityId || activeTarget.title === target.title;
              return (
                <button
                  key={target.activityId || target.title}
                  onClick={() => {
                    setSelectedActivityId(target.activityId || null);
                    setNavigationTarget(target);
                  }}
                  className={`press-scale shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-md transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 font-black border-teal-300'
                      : 'bg-[#0D1117]/90 text-slate-200 border-white/10 hover:border-teal-500/50'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-teal-400'}`} />
                  <span>Day {target.dayNumber}: {target.title}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Category Filters for Explore Mode */}
        {mapMode === 'explore' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`press-scale shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-md transition-all ${
                  filterCategory === cat
                    ? 'bg-teal-500 text-slate-950 font-extrabold'
                    : 'bg-[#0D1117]/90 text-slate-200 border border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Smart Origin Switcher when user GPS is far away */}
        {mapMode === 'route' && isFar && (
          <div className="p-2 rounded-xl bg-[#0D1117]/95 border border-teal-500/30 backdrop-blur-md flex items-center justify-between gap-2 shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Start point:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setOriginMode('stay')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  originMode === 'stay'
                    ? 'bg-teal-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                🏨 Trip Base / Stay
              </button>
              <button
                type="button"
                onClick={() => setOriginMode('live')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  originMode === 'live'
                    ? 'bg-teal-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                📍 Live GPS ({distKm.toFixed(0)} km)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Non-blocking Location Error Notice */}
      {locationError && (
        <div className="absolute top-28 left-3 right-3 z-[1000] p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-amber-300 text-[11px] font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">{locationError}</span>
        </div>
      )}

      {/* Recenter GPS & Follow Camera Button (Explore mode) */}
      {mapMode === 'explore' && currentGPSLocation && (
        <button
          type="button"
          onClick={() => {
            if (mapInstanceRef.current && currentGPSLocation) {
              mapInstanceRef.current.setView(currentGPSLocation, 15, { animate: true });
              toggleFollowMode();
            }
          }}
          className={`absolute bottom-24 right-4 z-[1000] px-3.5 py-2 rounded-full border backdrop-blur-md shadow-xl flex items-center gap-1.5 text-xs font-extrabold transition-all press-scale ${
            isFollowMode
              ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-teal-500/30'
              : 'bg-[#0D1117]/95 text-teal-400 border-teal-500/40 hover:bg-teal-500/20'
          }`}
          title={isFollowMode ? "Camera following active location (click to unlock)" : "Center map & follow location"}
        >
          <Compass className={`w-4 h-4 ${isFollowMode ? 'animate-spin' : ''}`} />
          <span>{isFollowMode ? 'Following' : 'Locate Me'}</span>
        </button>
      )}

      {/* ROUTE GUIDANCE BOTTOM PANEL SHEET */}
      {mapMode === 'route' && activeTarget && (
        <div className="absolute bottom-4 left-3 right-3 z-[1000] p-4 rounded-3xl bg-[#080B11]/95 border border-teal-500/40 backdrop-blur-md shadow-2xl space-y-3 animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white min-w-0">
              <Navigation className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="truncate">
                <div className="font-extrabold truncate text-teal-300">{activeTarget.title}</div>
                <div className="text-[11px] text-slate-400 truncate font-normal">{activeTarget.locationName}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300 font-mono shrink-0 ml-2">
              <span>{distKm.toFixed(1)} km</span>
              <span>•</span>
              <span>~{etaMinutes} min</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const query = encodeURIComponent(activeTarget.locationName || activeTarget.title);
                window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
              }}
              className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Google Maps App</span>
            </button>

            <button
              type="button"
              onClick={() => openCabModal(activeTarget.title)}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Car className="w-4 h-4" />
              <span>Book Ride</span>
            </button>
          </div>
        </div>
      )}

      {/* Selected Spot Detail Bottom Sheet for Explore Mode */}
      {mapMode === 'explore' && (
        <BottomSheet isOpen={!!selectedSpot} onClose={() => setSelectedSpot(null)} height="peek">
          {selectedSpot && (
            <div className="p-4 space-y-3">
              <div className="flex gap-3">
                <img
                  src={selectedSpot.image}
                  alt={selectedSpot.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                    {selectedSpot.type}
                  </span>
                  <h3 className="font-bold text-sm text-white truncate mt-0.5">{selectedSpot.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {selectedSpot.location} · <span className="font-mono text-teal-300 font-bold">{selectedSpot.distanceKm}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="font-bold text-amber-400 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" /> {selectedSpot.rating}
                    </span>
                    <span className="font-mono text-teal-400 font-bold">{selectedSpot.price}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    openCabModal(selectedSpot.title);
                    setSelectedSpot(null);
                  }}
                  className="cta-primary flex-1 text-xs py-2.5"
                >
                  <Car className="w-4 h-4" /> Book Ride
                </button>
                <button
                  onClick={() => {
                    openAiAssistant(`Tell me more about ${selectedSpot.title}`);
                    setSelectedSpot(null);
                  }}
                  className="cta-secondary flex-1 text-xs py-2.5"
                >
                  <Sparkles className="w-4 h-4 text-teal-400" /> Ask AI
                </button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
};

