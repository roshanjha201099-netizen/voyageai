import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  ArrowLeft, Send, Navigation, Sparkles, Loader2,
  MapPin, Plane, ChevronDown, Check, MessageSquare, Compass, X
} from 'lucide-react';
import {
  fetchNearbyPlaces, sendTourGuideMessage, setCurrentVisit,
  getCategoryDisplay, formatDistance,
  type TourPlace, type TourGuideMessage, type GuideMode
} from '../../services/tourGuideApi';
import { FormattedText } from '../common/FormattedText';

export const TourGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userLocation,
    openInAppNavigation
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
  }, [messages]);

  // Welcome message
  useEffect(() => {
    const welcome: TourGuideMessage = {
      id: 'welcome',
      role: 'guide',
      text: "Hello! I'm your VoyageAI travel guide. Ask me about nearby places, local food, or things to do around you.",
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
      text: `Context switched to ${contextLabel}. What would you like to explore?`,
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

      const guideMsg: TourGuideMessage = {
        id: `g_${Date.now()}`,
        role: 'guide',
        text: res.reply,
        timestamp: Date.now(),
        placeId: res.place?.id || activePlaceId
      };
      setMessages(prev => [...prev, guideMsg]);

      if (res.place) {
        setSelectedPlace(res.place);
      }
    } catch (err) {
      const errMsg: TourGuideMessage = {
        id: `err_${Date.now()}`,
        role: 'guide',
        text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, selectedPlace, userLocation, guideMode, selectedTripId, activeTrip]);

  // Select Place
  const handleSelectPlace = useCallback(async (place: TourPlace) => {
    setSelectedPlace(place);
    try { await setCurrentVisit(place.id); } catch { /* best effort */ }
    handleSend(`Tell me more about ${place.name}`, place.id);
  }, [handleSend]);

  // Quick Action Chips (3-4 focused choices)
  const quickActions = useMemo(() => {
    if (selectedPlace) {
      return ['Tell me the history', 'Why is it famous?', "What's nearby?", 'Is it worth visiting?'];
    }
    if (guideMode === 'local') {
      return [
        "Famous places",
        "Local food",
        "What's nearby?",
        "Things to do"
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
    <div className="bg-[#F6F7F5] text-[#1F2522] rounded-3xl p-4 sm:p-6 space-y-5 pb-28 max-w-xl mx-auto shadow-sm border border-[#D9DEDA] transition-all animate-fadeIn">
      
      {/* 1. Simple Header */}
      <div className="flex items-center justify-between border-b border-[#D9DEDA] pb-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[#1F2522] hover:text-[#487C74] font-bold text-sm press-scale"
        >
          <ArrowLeft className="w-5 h-5 text-[#487C74]" />
          <span>AI Guide</span>
        </button>

        {/* Context Switcher Banner / Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsContextDropdownOpen(!isContextDropdownOpen)}
            className="px-3.5 py-1.5 rounded-full bg-[#E8F0EE] border border-[#487C74]/30 text-[#355F58] text-xs font-bold flex items-center gap-1.5 press-scale shadow-sm"
          >
            {guideMode === 'local' ? (
              <>
                <MapPin className="w-3.5 h-3.5 text-[#487C74] shrink-0" />
                <span>Near You · Patna, Bihar</span>
              </>
            ) : (
              <>
                <Plane className="w-3.5 h-3.5 text-[#487C74] shrink-0" />
                <span className="truncate max-w-[130px]">{activeTrip?.destination?.name || activeTrip?.title || 'Goa Trip'}</span>
              </>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[#487C74] transition-transform ${isContextDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Context Dropdown Menu */}
          {isContextDropdownOpen && (
            <div className="absolute top-9 right-0 z-50 w-64 p-2 rounded-2xl bg-white border border-[#D9DEDA] shadow-xl space-y-1 animate-slideUp">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7C8580] px-2 py-1">
                Select Context
              </div>

              <button
                type="button"
                onClick={() => handleSwitchMode('local')}
                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                  guideMode === 'local' ? 'bg-[#E8F0EE] text-[#355F58] font-bold border border-[#487C74]/30' : 'hover:bg-[#F0F2EF] text-[#1F2522]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-[#487C74] shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-bold">Near You</div>
                    <div className="text-[10px] text-[#5F6863]">Current physical location</div>
                  </div>
                </div>
                {guideMode === 'local' && <Check className="w-4 h-4 text-[#487C74] shrink-0" />}
              </button>

              {trips.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-[#D9DEDA]">
                  <div className="text-[10px] font-bold text-[#487C74] uppercase tracking-wider px-2 py-0.5">
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
                          isSelected ? 'bg-[#E8F0EE] text-[#355F58] font-bold border border-[#487C74]/30' : 'hover:bg-[#F0F2EF] text-[#1F2522]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Plane className="w-4 h-4 text-[#487C74] shrink-0" />
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{t.destination?.name || t.title}</div>
                            <div className="text-[10px] text-[#5F6863] capitalize">{t.status.toLowerCase()} trip</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#487C74] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Hero Intro */}
      <div className="bg-white border border-[#D9DEDA] rounded-3xl p-5 space-y-2 shadow-sm">
        <div className="flex items-center gap-2 text-[#487C74] font-bold text-xs">
          <Sparkles className="w-4 h-4" />
          <span>VoyageAI</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1F2522] tracking-tight">
          Your local travel guide
        </h1>
        <p className="text-sm text-[#5F6863] leading-relaxed font-medium">
          I can help you discover places, food and things to do around you.
        </p>
      </div>

      {/* 3. Primary AI Input */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="space-y-2">
        <div className="flex items-center gap-2 bg-white border border-[#D9DEDA] focus-within:border-[#487C74] rounded-2xl p-2 shadow-sm transition-all min-h-[64px]">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={guideMode === 'local' ? "Ask anything... e.g. What is famous here?" : `Ask about your ${activeTrip?.destination?.name || 'trip'}...`}
            className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-[#1F2522] placeholder-[#7C8580] outline-none min-w-0 font-medium"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-11 h-11 rounded-xl bg-[#487C74] hover:bg-[#3E6C65] text-white flex items-center justify-center shrink-0 press-scale disabled:opacity-30 transition-all min-h-[44px]"
            aria-label="Send query"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </form>

      {/* 4. Quick Suggestions (3-4 Chips) */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C8580] block">
          Quick Suggestions
        </span>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.slice(0, 4).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleSend(action)}
              disabled={isSending}
              className="py-3.5 px-4 rounded-2xl bg-white border border-[#D9DEDA] hover:border-[#487C74] text-[#1F2522] text-xs font-bold text-left truncate press-scale shadow-sm transition-all min-h-[50px]"
            >
              <span>{action}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Proactive Alert Toast */}
      {proactiveAlert && guideMode === 'local' && (
        <div className="p-4 rounded-2xl bg-[#E8F0EE] border border-[#487C74]/30 flex items-center gap-3 animate-slideUp shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#487C74]/20 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-[#355F58]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#355F58]">You're near something interesting!</div>
            <div className="text-xs text-[#1F2522] truncate font-medium">{proactiveAlert.name} · {formatDistance(proactiveAlert.distanceMeters)} away</div>
          </div>
          <button
            type="button"
            onClick={() => { handleSelectPlace(proactiveAlert); setProactiveAlert(null); }}
            className="px-3.5 py-2 rounded-xl bg-[#487C74] text-white text-xs font-bold shrink-0 press-scale"
          >
            Tell me
          </button>
          <button type="button" onClick={() => setProactiveAlert(null)} className="text-[#5F6863] text-sm font-bold ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. Selected Place Card */}
      {selectedPlace && (
        <div className="p-4 rounded-2xl bg-white border border-[#D9DEDA] shadow-sm flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="text-xs font-bold text-[#487C74] uppercase tracking-wider">
              {getCategoryDisplay(selectedPlace.category).label}
            </div>
            <h3 className="text-base font-bold text-[#1F2522] truncate">{selectedPlace.name}</h3>
            <p className="text-xs text-[#5F6863] font-medium">
              {formatDistance(selectedPlace.distanceMeters)} away
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                openInAppNavigation({
                  activityId: selectedPlace.id,
                  title: selectedPlace.name,
                  locationName: selectedPlace.address || selectedPlace.name,
                  coordinates: [selectedPlace.latitude, selectedPlace.longitude]
                });
              }}
              className="py-2.5 px-3.5 rounded-xl bg-[#487C74] text-white text-xs font-bold press-scale flex items-center gap-1 min-h-[44px]"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Directions</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. Chat History (when user/guide messages exist) */}
      {messages.length > 1 && (
        <div className="space-y-3 pt-2 border-t border-[#D9DEDA]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7C8580] flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#487C74]" />
            <span>Conversation</span>
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-[#E8F0EE] text-[#355F58] border border-[#487C74]/30 font-medium'
                    : 'bg-white text-[#1F2522] border border-[#D9DEDA]'
                }`}>
                  {msg.role === 'guide' && (
                    <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-[#487C74]">
                      <Sparkles className="w-3.5 h-3.5 text-[#487C74]" />
                      <span>VoyageAI Guide</span>
                    </div>
                  )}
                  <FormattedText content={msg.text} isUserMessage={msg.role === 'user'} />
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* 8. Nearby Discovery Places */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7C8580] flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#487C74]" />
            <span>{guideMode === 'local' ? 'Near You' : `${activeTrip?.destination?.name || 'Trip'} Highlights`}</span>
          </h2>
        </div>

        {isLoadingNearby ? (
          <div className="bg-white border border-[#D9DEDA] rounded-3xl p-6 text-center space-y-2 shadow-sm">
            <Loader2 className="w-5 h-5 text-[#487C74] animate-spin mx-auto" />
            <p className="text-xs text-[#5F6863] font-medium">Finding places near you...</p>
          </div>
        ) : nearbyPlaces.length === 0 ? (
          <div className="bg-white border border-[#D9DEDA] rounded-3xl p-6 text-center space-y-3 shadow-sm">
            <p className="text-sm text-[#1F2522] font-bold">Nothing interesting nearby yet.</p>
            <p className="text-xs text-[#5F6863]">You can ask me about local food, markets or places to visit.</p>
            <button
              type="button"
              onClick={() => handleSend("What is famous here?")}
              className="py-3 px-5 rounded-2xl bg-[#487C74] text-white font-bold text-xs press-scale shadow-sm min-h-[48px]"
            >
              Ask VoyageAI
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {nearbyPlaces.slice(0, 5).map(place => {
              const cat = getCategoryDisplay(place.category);
              return (
                <div
                  key={place.id}
                  className="bg-white border border-[#D9DEDA] hover:border-[#487C74]/60 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-sm transition-all"
                >
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-sm sm:text-base font-bold text-[#1F2522] truncate">{place.name}</h3>
                    <p className="text-xs text-[#5F6863] font-medium">
                      {formatDistance(place.distanceMeters)} · {cat.label}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPlace(place)}
                    className="py-2.5 px-3.5 rounded-2xl bg-[#E8F0EE] hover:bg-[#D4E4E0] border border-[#487C74]/30 text-[#355F58] font-bold text-xs shrink-0 press-scale transition-all min-h-[44px]"
                  >
                    Tell me more
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

