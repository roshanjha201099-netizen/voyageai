import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  ArrowLeft, Send, Navigation, Sparkles, Loader2,
  MapPin, Plane, ChevronDown, Check, Bookmark, Compass, X
} from 'lucide-react';
import {
  fetchNearbyPlaces, sendTourGuideMessage, setCurrentVisit,
  getCategoryDisplay, formatDistance,
  type TourPlace, type TourGuideMessage, type GuideMode
} from '../../services/tourGuideApi';
import { FormattedText } from '../common/FormattedText';

const getPlaceImage = (category: string, name: string) => {
  const cat = (category || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (cat.includes('fort') || n.includes('fort') || cat.includes('palace') || cat.includes('historic') || cat.includes('monument')) {
    return 'https://images.unsplash.com/photo-1599661046289-e31897793e14?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('market') || n.includes('thali') || n.includes('food')) {
    return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('religious') || cat.includes('temple') || cat.includes('church') || cat.includes('mosque') || n.includes('mandir')) {
    return 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80';
  }
  if (cat.includes('park') || cat.includes('viewpoint') || cat.includes('nature') || cat.includes('garden')) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=600&q=80';
};

export const TourGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userLocation,
    openInAppNavigation,
    toggleSavePlace,
    userProfile
  } = useApp();
  const { trips, currentTrip } = useTrip();

  // ── State ──
  const [guideMode, setGuideMode] = useState<GuideMode>('local');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isContextDropdownOpen, setIsContextDropdownOpen] = useState(false);

  const [nearbyPlaces, setNearbyPlaces] = useState<TourPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<TourPlace | null>(null);
  const [messages, setMessages] = useState<TourGuideMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [proactiveAlert, setProactiveAlert] = useState<TourPlace | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastFetchCoords = useRef<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Active Trip resolution
  const activeTrip = useMemo(() => {
    if (selectedTripId) {
      return trips.find(t => t.id === selectedTripId) || currentTrip;
    }
    return currentTrip || (trips.length > 0 ? trips[0] : null);
  }, [selectedTripId, trips, currentTrip]);

  // Handle router navigation state
  useEffect(() => {
    const navState = location.state as { mode?: GuideMode; tripId?: string } | undefined;
    if (navState?.mode === 'trip' && navState?.tripId) {
      setGuideMode('trip');
      setSelectedTripId(navState.tripId);
    } else if (currentTrip && !selectedTripId) {
      setSelectedTripId(currentTrip.id);
    }
  }, [location.state, currentTrip, selectedTripId]);

  // ── Fetch Nearby Places ──
  const loadNearby = useCallback(async (lat: number, lng: number, force = false) => {
    if (!force && lastFetchCoords.current) {
      const R = 6371000;
      const dLat = ((lat - lastFetchCoords.current.lat) * Math.PI) / 180;
      const dLng = ((lng - lastFetchCoords.current.lng) * Math.PI) / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lastFetchCoords.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < 150) return;
    }

    setIsLoadingNearby(true);
    try {
      const res = await fetchNearbyPlaces(lat, lng, 5000);
      setNearbyPlaces(res.places);
      lastFetchCoords.current = { lat, lng };
      if (res.proactive_alert) {
        setProactiveAlert(res.proactive_alert);
      }
    } catch (err) {
      console.warn('[TOUR GUIDE] Nearby fetch error:', err);
    } finally {
      setIsLoadingNearby(false);
    }
  }, []);

  // Load nearby on mount and location updates
  useEffect(() => {
    if (userLocation) {
      loadNearby(userLocation[0], userLocation[1], !lastFetchCoords.current);
    }
  }, [userLocation, loadNearby]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Welcome message
  useEffect(() => {
    const welcome: TourGuideMessage = {
      id: 'welcome',
      role: 'guide',
      text: "Namaste! I'm your VoyageAI travel guide. Ask me about famous places, local food, or things to do around you.",
      timestamp: Date.now()
    };
    setMessages([welcome]);
  }, []);

  // Switch Context Mode
  const handleSwitchMode = (newMode: GuideMode, tripId?: string) => {
    setGuideMode(newMode);
    if (tripId !== undefined) {
      setSelectedTripId(tripId);
    }
    setIsContextDropdownOpen(false);

    const targetTrip = tripId ? trips.find(t => t.id === tripId) : activeTrip;
    const contextLabel = newMode === 'local'
      ? 'Near You (Current Location)'
      : `${targetTrip?.destination?.name || targetTrip?.title || 'Trip Context'}`;

    const systemNotice: TourGuideMessage = {
      id: `sys_${Date.now()}`,
      role: 'guide',
      text: `Context switched to **${contextLabel}**. What would you like to explore?`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, systemNotice]);
  };

  // Send Chat Message
  const handleSend = useCallback(async (text?: string, overridePlaceId?: string) => {
    const msg = (text || inputText).trim();
    if (!msg || isSending) return;

    const activePlaceId = overridePlaceId || selectedPlace?.id;

    const userMsg: TourGuideMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: msg,
      timestamp: Date.now(),
      placeId: activePlaceId
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await sendTourGuideMessage(
        msg,
        activePlaceId,
        userLocation?.[0],
        userLocation?.[1],
        guideMode,
        selectedTripId || activeTrip?.id
      );

      // Determine if we should attach place cards to the guide response
      const lowerMsg = msg.toLowerCase();
      let attachedPlaces: TourPlace[] | undefined;

      if (res.place) {
        attachedPlaces = [res.place];
        setSelectedPlace(res.place);
      } else if (
        lowerMsg.includes('famous') ||
        lowerMsg.includes('near') ||
        lowerMsg.includes('place') ||
        lowerMsg.includes('food') ||
        lowerMsg.includes('attraction') ||
        lowerMsg.includes('do')
      ) {
        if (nearbyPlaces.length > 0) {
          attachedPlaces = nearbyPlaces.slice(0, 4);
        }
      }

      const guideMsg: TourGuideMessage = {
        id: `g_${Date.now()}`,
        role: 'guide',
        text: res.reply,
        timestamp: Date.now(),
        placeId: res.place?.id || activePlaceId,
        places: attachedPlaces
      };
      setMessages(prev => [...prev, guideMsg]);
    } catch (err) {
      const errMsg: TourGuideMessage = {
        id: `err_${Date.now()}`,
        role: 'guide',
        text: "Sorry, I'm having trouble connecting right now. Please check your backend connection and try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, selectedPlace, userLocation, guideMode, selectedTripId, activeTrip, nearbyPlaces]);

  // Select Place
  const handleSelectPlace = useCallback(async (place: TourPlace) => {
    setSelectedPlace(place);
    try { await setCurrentVisit(place.id); } catch { /* best effort */ }
    handleSend(`Tell me more about ${place.name}`, place.id);
  }, [handleSend]);

  // Toggle Save Place
  const handleToggleSave = (placeName: string) => {
    toggleSavePlace(placeName);
    setSavedPlaces(prev => {
      const next = new Set(prev);
      if (next.has(placeName)) next.delete(placeName);
      else next.add(placeName);
      return next;
    });
  };

  // Quick Action Chips
  const quickActions = useMemo(() => {
    if (selectedPlace) {
      return ['Tell me the history', 'Why is it famous?', "What's nearby?", 'Is it worth visiting?'];
    }
    if (guideMode === 'local') {
      return [
        "Famous places",
        "Local food & eats",
        "What's nearby?",
        "Top attractions"
      ];
    } else {
      const dest = activeTrip?.destination?.name || 'trip destination';
      return [
        `Famous places in ${dest}`,
        `Best food in ${dest}`,
        "What's on my itinerary?",
        `Must-visit spots in ${dest}`
      ];
    }
  }, [selectedPlace, guideMode, activeTrip]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto bg-[#F6F7F5] border-x border-[#D9DEDA] relative overflow-hidden animate-fadeIn">
      
      {/* ── 1. Sticky Header Bar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#D9DEDA] px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-full bg-[#F0F2EF] hover:bg-[#E4E8E4] border border-[#D9DEDA] flex items-center justify-center text-[#1F2522] transition-colors press-scale shrink-0"
            aria-label="Go back home"
          >
            <ArrowLeft className="w-5 h-5 text-[#1F2522]" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#355F58]" />
              <h1 className="text-base font-extrabold text-[#1F2522]">AI Tour Guide</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[11px] text-[#5F6863] font-medium truncate">Ask about places, food & recommendations</p>
          </div>
        </div>

        {/* Context Switcher Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsContextDropdownOpen(!isContextDropdownOpen)}
            className="px-3 py-1.5 rounded-full bg-[#E8F0EE] hover:bg-[#D4E4E0] border border-[#355F58]/30 text-[#355F58] text-xs font-bold flex items-center gap-1.5 press-scale shadow-xs transition-all"
          >
            {guideMode === 'local' ? (
              <>
                <MapPin className="w-3.5 h-3.5 text-[#355F58] shrink-0" />
                <span className="truncate max-w-[110px]">Near You</span>
              </>
            ) : (
              <>
                <Plane className="w-3.5 h-3.5 text-[#355F58] shrink-0" />
                <span className="truncate max-w-[110px]">{activeTrip?.destination?.name || activeTrip?.title || 'Trip'}</span>
              </>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[#355F58] transition-transform ${isContextDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Context Dropdown Menu */}
          {isContextDropdownOpen && (
            <div className="absolute top-10 right-0 z-50 w-64 p-2 rounded-2xl bg-white border border-[#D9DEDA] shadow-xl space-y-1 animate-slideUp">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7C8580] px-2 py-1">
                Select Context
              </div>

              <button
                type="button"
                onClick={() => handleSwitchMode('local')}
                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                  guideMode === 'local' ? 'bg-[#E8F0EE] text-[#355F58] font-bold border border-[#355F58]/30' : 'hover:bg-[#F0F2EF] text-[#1F2522]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-[#355F58] shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-bold">Near You</div>
                    <div className="text-[10px] text-[#5F6863]">Current physical location</div>
                  </div>
                </div>
                {guideMode === 'local' && <Check className="w-4 h-4 text-[#355F58] shrink-0" />}
              </button>

              {trips.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-[#D9DEDA]">
                  <div className="text-[10px] font-bold text-[#355F58] uppercase tracking-wider px-2 py-0.5">
                    Your Trips
                  </div>
                  {trips.map(t => {
                    const isSelected = guideMode === 'trip' && (selectedTripId === t.id || (!selectedTripId && activeTrip?.id === t.id));
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSwitchMode('trip', t.id)}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                          isSelected ? 'bg-[#E8F0EE] text-[#355F58] font-bold border border-[#355F58]/30' : 'hover:bg-[#F0F2EF] text-[#1F2522]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Plane className="w-4 h-4 text-[#355F58] shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{t.destination?.name || t.title}</div>
                            <div className="text-[10px] text-[#5F6863] capitalize">{t.status.toLowerCase()} trip</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#355F58] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2. Middle Scrollable Chat Message Feed ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain">
        
        {/* Welcome Intro Header Inside Chat Feed */}
        <div className="bg-white border border-[#D9DEDA] rounded-2xl p-4 space-y-2 shadow-xs text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-[#355F58] font-extrabold text-xs">
            <Sparkles className="w-4 h-4 text-[#355F58]" />
            <span>VoyageAI Guide</span>
          </div>
          <h2 className="text-lg font-black text-[#1F2522]">
            What famous places or food are you looking for today?
          </h2>
          <p className="text-xs text-[#5F6863] font-medium leading-relaxed">
            I'm your real-time travel assistant. Tap a suggestion below or type any question to start exploring!
          </p>
        </div>

        {/* Render Chat Messages */}
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
              
              {/* Message Bubble */}
              <div className={`max-w-[90%] sm:max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-xs ${
                isUser
                  ? 'bg-[#355F58] text-white rounded-tr-none font-medium'
                  : 'bg-white text-[#1F2522] border border-[#D9DEDA] rounded-tl-none'
              }`}>
                {!isUser && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-extrabold text-[#355F58] border-b border-[#D9DEDA]/60 pb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#355F58]" />
                    <span>VoyageAI Guide</span>
                  </div>
                )}
                <FormattedText content={msg.text} isUserMessage={isUser} />
              </div>

              {/* Embedded Famous Place Cards inside Chat Message */}
              {!isUser && msg.places && msg.places.length > 0 && (
                <div className="w-full max-w-[95%] space-y-3 pt-1">
                  <div className="text-[11px] font-extrabold text-[#5F6863] uppercase tracking-wider flex items-center gap-1 px-1">
                    <Compass className="w-3.5 h-3.5 text-[#355F58]" />
                    <span>Recommended Famous Places ({msg.places.length})</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {msg.places.map(place => {
                      const catDisplay = getCategoryDisplay(place.category);
                      const coverImg = getPlaceImage(place.category, place.name);
                      const isSaved = savedPlaces.has(place.name) || (userProfile?.savedPlaces || []).includes(place.name);

                      return (
                        <div
                          key={place.id}
                          className="bg-white border border-[#D9DEDA] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
                        >
                          {/* Card Cover Image Header */}
                          <div className="relative h-32 w-full bg-slate-100 overflow-hidden">
                            <img
                              src={coverImg}
                              alt={place.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                            
                            {/* Category Badge */}
                            <span
                              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white shadow-xs backdrop-blur-md"
                              style={{ backgroundColor: catDisplay.color }}
                            >
                              {catDisplay.label}
                            </span>

                            {/* Distance Badge */}
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-black/60 text-white backdrop-blur-md flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-400" />
                              {formatDistance(place.distanceMeters)} away
                            </span>

                            {/* Title overlay */}
                            <div className="absolute bottom-2 left-3 right-3 text-white">
                              <h3 className="text-base font-extrabold truncate drop-shadow-sm">{place.name}</h3>
                            </div>
                          </div>

                          {/* Card Content Body */}
                          <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                            <p className="text-xs text-[#5F6863] line-clamp-2 font-medium">
                              {place.description || place.address || `Famous ${catDisplay.label.toLowerCase()} landmark to explore in the area.`}
                            </p>

                            {/* Card Action Buttons */}
                            <div className="flex items-center gap-2 pt-1 border-t border-[#D9DEDA]">
                              {/* Directions Action */}
                              <button
                                type="button"
                                onClick={() => {
                                  openInAppNavigation({
                                    activityId: place.id,
                                    title: place.name,
                                    locationName: place.address || place.name,
                                    coordinates: [place.latitude, place.longitude]
                                  });
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-[#355F58] hover:bg-[#2C4E48] text-white text-xs font-bold flex items-center justify-center gap-1.5 press-scale transition-all min-h-[40px]"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Directions</span>
                              </button>

                              {/* Details Action */}
                              <button
                                type="button"
                                onClick={() => handleSelectPlace(place)}
                                className="flex-1 py-2 px-3 rounded-xl bg-[#F0F2EF] hover:bg-[#E4E8E4] border border-[#D9DEDA] text-[#1F2522] text-xs font-bold flex items-center justify-center gap-1.5 press-scale transition-all min-h-[40px]"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#355F58]" />
                                <span>Details</span>
                              </button>

                              {/* Save Bookmark Action */}
                              <button
                                type="button"
                                onClick={() => handleToggleSave(place.name)}
                                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 press-scale transition-all ${
                                  isSaved
                                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                                    : 'bg-[#F0F2EF] border-[#D9DEDA] text-[#5F6863] hover:text-[#1F2522]'
                                }`}
                                aria-label="Save place"
                                title={isSaved ? "Saved" : "Save place"}
                              >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-rose-600' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          );
        })}

        {/* Loading Indicator inside Chat */}
        {isSending && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5F6863] bg-white border border-[#D9DEDA] p-3 rounded-2xl w-fit animate-pulse">
            <Loader2 className="w-4 h-4 text-[#355F58] animate-spin" />
            <span>VoyageAI guide is typing response...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── 3. Proactive Location Toast (if nearby alert exists) ── */}
      {proactiveAlert && guideMode === 'local' && (
        <div className="mx-4 mb-2 p-3 rounded-2xl bg-[#E8F0EE] border border-[#355F58]/30 flex items-center gap-3 animate-slideUp shadow-sm shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#355F58]/15 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-[#355F58]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#355F58]">Near Famous Spot!</div>
            <div className="text-xs text-[#1F2522] truncate font-medium">{proactiveAlert.name} · {formatDistance(proactiveAlert.distanceMeters)} away</div>
          </div>
          <button
            type="button"
            onClick={() => { handleSelectPlace(proactiveAlert); setProactiveAlert(null); }}
            className="px-3 py-1.5 rounded-xl bg-[#355F58] text-white text-xs font-bold shrink-0 press-scale"
          >
            Explore
          </button>
          <button type="button" onClick={() => setProactiveAlert(null)} className="text-[#5F6863] p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── 4. Bottom Sticky Input Bar & Quick Action Chips ── */}
      <div className="sticky bottom-0 z-30 bg-white border-t border-[#D9DEDA] p-3 space-y-2.5 shadow-lg rounded-t-3xl shrink-0">
        
        {/* Quick Suggestion Chips Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleSend(action)}
              disabled={isSending}
              className="py-1.5 px-3.5 rounded-full bg-[#F0F2EF] hover:bg-[#E8F0EE] border border-[#D9DEDA] hover:border-[#355F58]/40 text-[#1F2522] text-xs font-bold shrink-0 press-scale shadow-xs transition-all disabled:opacity-50"
            >
              <span>{action}</span>
            </button>
          ))}
        </div>

        {/* Main Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[#F0F2EF] border border-[#D9DEDA] focus-within:border-[#355F58] rounded-2xl px-3 py-1.5 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder={guideMode === 'local' ? "Ask anything... e.g. What famous places are near me?" : `Ask about ${activeTrip?.destination?.name || 'trip'}...`}
              className="w-full bg-transparent text-sm text-[#1F2522] placeholder-[#7C8580] outline-none font-medium py-1.5"
              disabled={isSending}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-11 h-11 rounded-2xl bg-[#355F58] hover:bg-[#2C4E48] active:bg-[#233F3A] text-white flex items-center justify-center shrink-0 press-scale disabled:opacity-30 transition-all shadow-xs"
            aria-label="Send query"
            title="Send message"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
          </button>
        </form>
      </div>

    </div>
  );
};

