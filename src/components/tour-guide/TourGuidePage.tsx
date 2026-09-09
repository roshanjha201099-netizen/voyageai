import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  ArrowLeft, Send, Navigation, Compass, Sparkles, Mic, Loader2,
  Clock, AlertTriangle, Radio, MapPin, Plane, ChevronDown, Check
} from 'lucide-react';
import {
  fetchNearbyPlaces, sendTourGuideMessage, setCurrentVisit,
  getCategoryDisplay, formatDistance,
  type TourPlace, type TourGuideMessage, type GuideMode
} from '../../services/tourGuideApi';

export const TourGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userLocation, userLocationAccuracy, isLiveTracking,
    openInAppNavigation, openCabModal
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
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [proactiveAlert, setProactiveAlert] = useState<TourPlace | null>(null);
  const [autoGuide, setAutoGuide] = useState(false);
  const [sortMode, setSortMode] = useState<'nearest' | 'interesting'>('interesting');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastFetchCoords = useRef<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLowAccuracy = userLocationAccuracy !== null && userLocationAccuracy > 1000;

  // Active Trip resolution
  const activeTrip = useMemo(() => {
    if (selectedTripId) {
      return trips.find(t => t.id === selectedTripId) || currentTrip;
    }
    return currentTrip || (trips.length > 0 ? trips[0] : null);
  }, [selectedTripId, trips, currentTrip]);

  // Handle router navigation state (e.g. entering directly from a trip card)
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
    setNearbyError(null);
    try {
      const res = await fetchNearbyPlaces(lat, lng, 5000);
      setNearbyPlaces(res.places);
      lastFetchCoords.current = { lat, lng };
      if (res.proactive_alert) {
        setProactiveAlert(res.proactive_alert);
      }
    } catch (err) {
      console.warn('[TOUR GUIDE] Nearby fetch error:', err);
      setNearbyError('Could not load nearby places. Check your connection.');
    } finally {
      setIsLoadingNearby(false);
    }
  }, []);

  // Load nearby on mount and when location changes
  useEffect(() => {
    if (userLocation) {
      loadNearby(userLocation[0], userLocation[1], !lastFetchCoords.current);
    }
  }, [userLocation, loadNearby]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on mount
  useEffect(() => {
    const welcome: TourGuideMessage = {
      id: 'welcome',
      role: 'guide',
      text: "Hey! I'm your VoyageAI tour guide. Operating in LOCAL MODE — asking about nearby places, local food, and current surroundings. You can also switch to TRIP MODE anytime!",
      timestamp: Date.now()
    };
    setMessages([welcome]);
  }, []);

  // Handle Mode Switch
  const handleSwitchMode = (newMode: GuideMode, tripId?: string) => {
    setGuideMode(newMode);
    if (tripId !== undefined) {
      setSelectedTripId(tripId);
    }
    setIsContextDropdownOpen(false);

    const targetTrip = tripId ? trips.find(t => t.id === tripId) : activeTrip;
    const contextLabel = newMode === 'local'
      ? 'LOCAL MODE (Current Location & Surroundings)'
      : `TRIP MODE (${targetTrip?.destination?.name || targetTrip?.title || 'Selected Trip'})`;

    const systemNotice: TourGuideMessage = {
      id: `sys_${Date.now()}`,
      role: 'guide',
      text: `📍 Context switched to ${contextLabel}. How can I assist you with this ${newMode} context?`,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, systemNotice]);
  };

  // ── Send Chat Message ──
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
        text: "Sorry, I'm having trouble connecting right now. Your guide is temporarily offline — try again in a moment.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, selectedPlace, userLocation, guideMode, selectedTripId, activeTrip]);

  // ── Select Place ──
  const handleSelectPlace = useCallback(async (place: TourPlace) => {
    setSelectedPlace(place);
    try { await setCurrentVisit(place.id); } catch { /* best effort */ }
    handleSend(`Tell me about ${place.name}`, place.id);
  }, [handleSend]);

  // ── Sort Places ──
  const sortedPlaces = useMemo(() => {
    if (sortMode === 'nearest') {
      return [...nearbyPlaces].sort((a, b) => a.distanceMeters - b.distanceMeters);
    }
    return nearbyPlaces;
  }, [nearbyPlaces, sortMode]);

  // Dynamic Quick action chips based on mode and place focus
  const quickActions = useMemo(() => {
    if (selectedPlace) {
      return ['Tell me the history', 'Why is it famous?', "What's nearby?", 'Is it worth visiting?'];
    }
    if (guideMode === 'local') {
      return [
        "What's famous near me?",
        "What food is famous here?",
        "Find historic landmarks",
        "Recommend local food",
        "Nearby markets"
      ];
    } else {
      const dest = activeTrip?.destination?.name || 'trip destination';
      return [
        `What should I see in ${dest}?`,
        `Best food on my ${dest} trip`,
        "What's on my itinerary?",
        `Must-visit spots in ${dest}`
      ];
    }
  }, [selectedPlace, guideMode, activeTrip]);

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100dvh - 120px)' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1 pb-3 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-slate-200 press-scale shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-teal-400" />
            <span className="text-sm font-bold hidden sm:inline">AI Guide</span>
          </button>

          {/* ── Context Switcher Pill & Dropdown ── */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsContextDropdownOpen(!isContextDropdownOpen)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border backdrop-blur-md transition-all press-scale shadow-md ${
                guideMode === 'local'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30'
              }`}
            >
              {guideMode === 'local' ? (
                <>
                  <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Near You (Local)</span>
                </>
              ) : (
                <>
                  <Plane className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate max-w-[120px]">{activeTrip?.destination?.name || activeTrip?.title || 'Trip Mode'}</span>
                </>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isContextDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Context Dropdown Menu */}
            {isContextDropdownOpen && (
              <div className="absolute top-10 left-0 z-50 w-64 p-2 rounded-2xl bg-[#0D1117]/95 border border-teal-500/30 shadow-2xl backdrop-blur-xl space-y-1 animate-slideUp">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                  Select Context Mode
                </div>

                {/* Local Mode Option */}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('local')}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                    guideMode === 'local' ? 'bg-teal-500/20 text-teal-200 font-bold border border-teal-500/30' : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold">Near You</div>
                      <div className="text-[10px] text-slate-400">Current real-world location & GPS</div>
                    </div>
                  </div>
                  {guideMode === 'local' && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                </button>

                {/* Trip Mode Options */}
                {trips.length > 0 ? (
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-2 py-0.5">
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
                            isSelected ? 'bg-indigo-500/20 text-indigo-200 font-bold border border-indigo-500/30' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Plane className="w-4 h-4 text-indigo-400 shrink-0" />
                            <div className="truncate">
                              <div className="text-xs font-bold truncate">{t.destination?.name || t.title}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{t.status.toLowerCase()} trip</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2 text-[11px] text-slate-500 text-center">
                    No active trips. Create a trip to enable Trip Mode.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setAutoGuide(!autoGuide)}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 border transition-all press-scale ${
              autoGuide
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800 text-slate-400 border-white/5 hover:text-slate-200'
            }`}
            title="Auto-focus nearest attraction as you travel"
          >
            <Radio className={`w-3 h-3 ${autoGuide ? 'animate-pulse text-purple-400' : ''}`} />
            <span>{autoGuide ? 'Auto ON' : 'Auto OFF'}</span>
          </button>

          {isLiveTracking && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1 border border-emerald-500/30">
              <Radio className="w-3 h-3 animate-pulse" />
              Live
            </span>
          )}
          {isLowAccuracy && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" />
              Low GPS
            </span>
          )}
        </div>
      </div>

      {/* ── Proactive Alert Toast ── */}
      {proactiveAlert && guideMode === 'local' && (
        <div className="mx-1 mb-2 p-3 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center gap-3 animate-slideUp">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-lg shrink-0">
            {getCategoryDisplay(proactiveAlert.category).emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-teal-300">You're near something interesting!</div>
            <div className="text-[11px] text-slate-300 truncate">{proactiveAlert.name} · {formatDistance(proactiveAlert.distanceMeters)} away</div>
          </div>
          <button
            onClick={() => { handleSelectPlace(proactiveAlert); setProactiveAlert(null); }}
            className="px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-[11px] font-bold shrink-0 press-scale"
          >
            Tell me
          </button>
          <button onClick={() => setProactiveAlert(null)} className="text-slate-500 text-xs font-bold ml-1">✕</button>
        </div>
      )}

      {/* ── Nearby Discovery Horizontal Scroll ── */}
      <div className="px-1 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
            {guideMode === 'local' ? 'Near You · ' + nearbyPlaces.length + ' places' : (activeTrip?.destination?.name || 'Trip Destination') + ' Highlights'}
          </span>
          {guideMode === 'local' && (
            <div className="flex gap-1">
              <button
                onClick={() => setSortMode('interesting')}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${sortMode === 'interesting' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Best
              </button>
              <button
                onClick={() => setSortMode('nearest')}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all ${sortMode === 'nearest' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Nearest
              </button>
              {userLocation && (
                <button
                  onClick={() => loadNearby(userLocation[0], userLocation[1], true)}
                  className="text-slate-500 hover:text-teal-400 transition-colors"
                  title="Refresh nearby"
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {isLoadingNearby && nearbyPlaces.length === 0 ? (
          <div className="flex items-center gap-2 py-4 justify-center text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
            Searching nearby landmarks...
          </div>
        ) : nearbyError ? (
          <div className="py-3 text-center text-amber-400 text-xs font-medium">{nearbyError}</div>
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {sortedPlaces.map(place => {
              const cat = getCategoryDisplay(place.category);
              const isSelected = selectedPlace?.id === place.id;
              return (
                <button
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  className={`shrink-0 w-[140px] p-2.5 rounded-2xl text-left transition-all press-scale border ${
                    isSelected
                      ? 'bg-teal-500/15 border-teal-500/40 shadow-lg shadow-teal-500/10'
                      : 'bg-[#111622] border-white/[0.06] hover:border-teal-500/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{cat.emoji}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</span>
                  </div>
                  <div className="text-[11px] font-bold text-white truncate">{place.name}</div>
                  <div className="text-[10px] text-teal-400 font-mono font-bold mt-0.5">
                    {formatDistance(place.distanceMeters)}
                  </div>
                </button>
              );
            })}
            {sortedPlaces.length === 0 && !isLoadingNearby && (
              <div className="py-3 text-center text-slate-500 text-xs w-full">No landmarks found within 5km</div>
            )}
          </div>
        )}
      </div>

      {/* ── Selected Place Banner ── */}
      {selectedPlace && (
        <div className="mx-1 mb-2 p-3 rounded-2xl bg-[#111622] border border-white/[0.08] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ backgroundColor: getCategoryDisplay(selectedPlace.category).color + '20' }}>
            {getCategoryDisplay(selectedPlace.category).emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-white truncate">{selectedPlace.name}</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="font-mono text-teal-400 font-bold">{formatDistance(selectedPlace.distanceMeters)}</span>
              <span>·</span>
              <span>{getCategoryDisplay(selectedPlace.category).label}</span>
              {selectedPlace.openingHours && (
                <>
                  <span>·</span>
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="truncate">{selectedPlace.openingHours}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                openInAppNavigation({
                  activityId: selectedPlace.id,
                  title: selectedPlace.name,
                  locationName: selectedPlace.address || selectedPlace.name,
                  coordinates: [selectedPlace.latitude, selectedPlace.longitude]
                });
              }}
              className="px-2.5 py-1.5 rounded-xl bg-teal-500 text-slate-950 text-[10px] font-extrabold press-scale flex items-center gap-1"
            >
              <Navigation className="w-3 h-3" />
              Navigate
            </button>
            <button
              onClick={() => {
                openCabModal(selectedPlace.name);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold press-scale flex items-center gap-1"
            >
              <span>🚕</span>
              Cab
            </button>
          </div>
        </div>
      )}

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto px-1 space-y-3 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-teal-500/20 text-teal-100 border border-teal-500/30 rounded-br-md'
                : 'bg-[#111622] text-slate-200 border border-white/[0.06] rounded-bl-md'
            }`}>
              {msg.role === 'guide' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-teal-400" />
                  <span className="text-[10px] font-bold text-teal-400">VoyageAI Guide</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-[#111622] border border-white/[0.06] rounded-bl-md flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
              <span className="text-xs text-slate-400">Your guide is thinking...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Quick Action Chips ── */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-1 py-2">
        {quickActions.map(action => (
          <button
            key={action}
            onClick={() => handleSend(action)}
            disabled={isSending}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-[#111622] border border-white/[0.06] text-[11px] font-medium text-slate-300 hover:text-teal-300 hover:border-teal-500/30 transition-all press-scale disabled:opacity-50"
          >
            {action}
          </button>
        ))}
      </div>

      {/* ── Input Bar ── */}
      <div className="px-1 pb-2 pt-1">
        <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#111622] border border-white/[0.08]">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={guideMode === 'local' ? "Ask about nearby places, local food..." : `Ask about your ${activeTrip?.destination?.name || 'trip'}...`}
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none px-2"
            disabled={isSending}
          />
          <button
            type="button"
            disabled
            className="p-2 rounded-xl text-slate-600 cursor-not-allowed"
            title="Voice input coming soon"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className="p-2 rounded-xl bg-teal-500 text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed press-scale transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {isLowAccuracy && guideMode === 'local' && (
          <div className="mt-1.5 flex items-center gap-1.5 px-2 text-[10px] text-amber-400 font-medium">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>GPS accuracy is low — distances may be inaccurate</span>
          </div>
        )}
      </div>
    </div>
  );
};
