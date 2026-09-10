import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../TripContext';
import { useAuth } from '../../../auth/AuthContext';
import type { DestinationReference } from '../types';
import type { TravelStyle, BudgetLevel } from '../../../auth/types';
import { PreferenceOption } from '../../../components/preferences/PreferenceOption';
import { PreferenceProgress } from '../../../components/preferences/PreferenceProgress';
import { PreferenceFooter } from '../../../components/preferences/PreferenceFooter';
import { Search, MapPin, Calendar, Users, Sparkles, ArrowLeft, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { wsClient } from '../../../services/wsClient';

const POPULAR_DESTINATIONS: DestinationReference[] = [
  { id: 'dest_goa', name: 'Goa', city: 'North & South Goa', region: 'Goa', country: 'India', latitude: 15.5494, longitude: 73.7535, displayName: 'Goa, India' },
  { id: 'dest_kerala', name: 'Kerala', city: 'Munnar & Alleppey', region: 'Kerala', country: 'India', latitude: 9.9312, longitude: 76.2673, displayName: 'Kerala, India' },
  { id: 'dest_manali', name: 'Manali', city: 'Himachal Pradesh', region: 'Himachal Pradesh', country: 'India', latitude: 32.2432, longitude: 77.1892, displayName: 'Manali, Himachal Pradesh, India' },
  { id: 'dest_jaipur', name: 'Jaipur', city: 'Rajasthan', region: 'Rajasthan', country: 'India', latitude: 26.9124, longitude: 75.7873, displayName: 'Jaipur, Rajasthan, India' },
  { id: 'dest_udaipur', name: 'Udaipur', city: 'Rajasthan', region: 'Rajasthan', country: 'India', latitude: 24.5854, longitude: 73.7125, displayName: 'Udaipur, Rajasthan, India' },
  { id: 'dest_varanasi', name: 'Varanasi', city: 'Uttar Pradesh', region: 'Uttar Pradesh', country: 'India', latitude: 25.3176, longitude: 82.9739, displayName: 'Varanasi, Uttar Pradesh, India' },
];

export const TripCreationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { createTrip, draft, saveDraft, discardDraft, isLoading: isTripLoading } = useTrip();
  const { userPreferences } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const hasPromptedRef = useRef<boolean>(false);

  // Form State
  const [destinationSearch, setDestinationSearch] = useState<string>('');
  const [searchResults, setSearchResults] = useState<DestinationReference[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedDestination, setSelectedDestination] = useState<DestinationReference | null>(null);
  const [startDate, setStartDate] = useState<string>('2026-10-15');
  const [endDate, setEndDate] = useState<string>('2026-10-19');
  const [travelersCount, setTravelersCount] = useState<number>(2);
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetLevel>('MODERATE');
  const [customBudgetAmount, setCustomBudgetAmount] = useState<number>(30000);

  const handleCustomBudgetChange = (amount: number) => {
    const val = Math.max(0, amount);
    setCustomBudgetAmount(val);
    if (val < 20000) setSelectedBudget('BUDGET');
    else if (val < 45000) setSelectedBudget('MODERATE');
    else if (val < 90000) setSelectedBudget('PREMIUM');
    else setSelectedBudget('LUXURY');
  };

  const handleBudgetTierSelect = (tier: BudgetLevel) => {
    setSelectedBudget(tier);
    if (tier === 'BUDGET') setCustomBudgetAmount(15000);
    else if (tier === 'MODERATE') setCustomBudgetAmount(30000);
    else if (tier === 'PREMIUM') setCustomBudgetAmount(60000);
    else if (tier === 'LUXURY') setCustomBudgetAmount(120000);
  };

  // Check draft on mount ONLY ONCE
  useEffect(() => {
    if (!hasPromptedRef.current) {
      hasPromptedRef.current = true;
      if (draft && draft.destination) {
        setShowResumePrompt(true);
      } else if (userPreferences) {
        if (userPreferences.travelStyles?.length) setSelectedStyles(userPreferences.travelStyles);
        if (userPreferences.budgetLevel) {
          handleBudgetTierSelect(userPreferences.budgetLevel);
        }
      }
    }
  }, [draft, userPreferences]);

  // Debounced Place Search (350ms)
  useEffect(() => {
    if (!destinationSearch || destinationSearch.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const data: DestinationReference[] = await wsClient.sendRequest('places:search', { query: destinationSearch.trim() });
        if (data && Array.isArray(data)) {
          // Filter strictly to ensure India-only destinations
          const indiaResults = data.filter(item => {
            const countryLower = (item.country || '').toLowerCase();
            const isIndia = countryLower === 'india' || countryLower === 'in' || !item.country;
            const lat = item.latitude ?? 20.5937;
            const lon = item.longitude ?? 78.9629;
            const validLat = lat >= 6.0 && lat <= 37.5;
            const validLon = lon >= 68.0 && lon <= 97.5;
            return isIndia && validLat && validLon;
          });

          if (data.length > 0 && indiaResults.length === 0) {
            setSearchError('VoyageAI currently supports destinations within India only. Please select a city or region in India.');
            setSearchResults([]);
          } else if (indiaResults.length === 0) {
            setSearchError('No places found in India. Try a nearby city or a more specific Indian location.');
            setSearchResults([]);
          } else {
            setSearchResults(indiaResults);
          }
        } else {
          setSearchError('Couldn\'t search destinations. Check your connection and try again.');
        }
      } catch (err) {
        console.warn('Geocoding search error:', err);
        setSearchError('Couldn\'t search destinations. Check your connection and try again.');
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destinationSearch]);

  const handleResumeDraft = () => {
    if (draft) {
      if (draft.destination) setSelectedDestination(draft.destination);
      if (draft.startDate) setStartDate(draft.startDate);
      if (draft.endDate) setEndDate(draft.endDate);
      if (draft.travelersCount) setTravelersCount(draft.travelersCount);
      if (draft.tripStyle) setSelectedStyles(draft.tripStyle);
      if (draft.budgetLevel) setSelectedBudget(draft.budgetLevel);
      if (draft.customBudgetAmount) setCustomBudgetAmount(draft.customBudgetAmount);
      if (draft.currentStep) setStep(draft.currentStep);
    }
    setShowResumePrompt(false);
  };

  const handleStartFresh = () => {
    discardDraft();
    setSelectedDestination(null);
    setDestinationSearch('');
    setStartDate('2026-10-15');
    setEndDate('2026-10-19');
    setTravelersCount(2);
    setSelectedStyles(userPreferences?.travelStyles || []);
    const defaultLevel = userPreferences?.budgetLevel || 'MODERATE';
    handleBudgetTierSelect(defaultLevel);
    setStep(1);
    setShowResumePrompt(false);
  };

  const updateStep = (nextStep: number) => {
    setStep(nextStep);
    saveDraft({
      destination: selectedDestination || undefined,
      startDate,
      endDate,
      travelersCount,
      tripStyle: selectedStyles,
      budgetLevel: selectedBudget,
      customBudgetAmount,
      currentStep: nextStep,
    });
  };

  const calculateDaysNights = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const nights = Math.max(0, days - 1);
    return `${days} days · ${nights} nights`;
  };

  const handleFinalSubmit = async () => {
    if (!selectedDestination) return;
    await createTrip({
      destination: selectedDestination,
      startDate,
      endDate,
      travelersCount,
      tripStyle: selectedStyles,
      budgetLevel: selectedBudget,
      customBudgetAmount,
    });
    discardDraft();
    navigate(`/trip`);
  };

  return (
    <div className="min-h-dvh w-full bg-[#05070E] text-slate-100 flex items-center justify-center p-0 sm:p-6 lg:p-8 relative overflow-x-hidden">
      {/* Ambient Atmospheric Glow Effects */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Glassmorphic Mobile/Desktop Container */}
      <div className="w-full max-w-md sm:max-w-xl bg-[#090D16]/90 sm:backdrop-blur-2xl sm:border sm:border-slate-800/80 sm:shadow-[0_20px_80px_rgba(0,0,0,0.8)] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between min-h-dvh sm:min-h-[820px] relative z-10 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-2">
        <button
          type="button"
          onClick={() => {
            if (step > 1) updateStep(step - 1);
            else navigate(-1);
          }}
          className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Trip Planner
          </span>
        </div>

        <div className="w-9" />
      </div>

      {/* Streamlined Resume Draft Banner (2 Equal Prominent Buttons) */}
      {showResumePrompt && (
        <div className="bg-slate-900 border border-teal-500/40 rounded-3xl p-5 mb-4 space-y-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Continue your trip plan?</h3>
              <p className="text-xs text-slate-400">
                You have an unfinished trip plan to <span className="text-teal-300 font-semibold">{draft?.destination?.name || 'your destination'}</span>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="py-3 px-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-teal-500/20 text-center transition-all"
            >
              Continue Draft
            </button>
            <button
              type="button"
              onClick={handleStartFresh}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl border border-slate-700 text-center transition-all"
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Step Wizard Container */}
      <div className="my-auto py-4 space-y-6">

        {/* STEP 1: DESTINATION */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <PreferenceProgress currentStep={1} totalSteps={5} />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Where are you going?
                </h2>
                <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-extrabold border border-teal-500/30">
                  India Region Only
                </span>
              </div>
              <p className="text-sm text-slate-400">
                VoyageAI currently supports destinations within India only.
              </p>
            </div>

            {/* Dynamic Search Input */}
            <div className="relative space-y-2">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                <input
                  type="text"
                  value={destinationSearch}
                  onChange={e => setDestinationSearch(e.target.value)}
                  placeholder="Search Indian city, town, state (e.g. Goa, Manali, Jaipur, Kerala...)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-10 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
                />
                {isSearching && (
                  <Loader2 className="w-5 h-5 absolute right-4 top-4 text-teal-400 animate-spin" />
                )}
              </div>

              {/* Dynamic Results Dropdown */}
              {destinationSearch.trim().length >= 2 && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs text-slate-400 space-y-2 bg-slate-900/60 border border-slate-800 rounded-2xl">
                      <span>Searching place database...</span>
                    </div>
                  ) : searchError ? (
                    <div className="p-4 text-center text-xs text-rose-300 space-y-1 bg-slate-900/60 border border-rose-900/50 rounded-2xl flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{searchError}</span>
                    </div>
                  ) : (
                    searchResults.map(result => {
                      const isSelected = selectedDestination?.name === result.name && selectedDestination?.country === result.country;
                      return (
                        <button
                          key={result.id || result.displayName}
                          type="button"
                          onClick={() => {
                            setSelectedDestination(result);
                            setDestinationSearch('');
                          }}
                          className={`
                            w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all touch-manipulation active:scale-[0.98]
                            ${isSelected
                              ? 'bg-teal-500/15 border-teal-500 text-white shadow-lg shadow-teal-500/10'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-teal-500/40'
                            }
                          `}
                        >
                          <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm leading-tight text-white">{result.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {[result.city, result.region, result.country].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Destination Card */}
            {selectedDestination && (
              <div className="p-4 rounded-2xl bg-teal-500/15 border border-teal-500/50 space-y-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                    <MapPin className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 block">Selected Place</span>
                    <h4 className="font-extrabold text-sm text-white">{selectedDestination.name}</h4>
                    <p className="text-[11px] text-slate-300">
                      {[selectedDestination.city, selectedDestination.region, selectedDestination.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Popular Quick Suggestion Cards */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Popular Quick Suggestions
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {POPULAR_DESTINATIONS.map(dest => {
                  const isSelected = selectedDestination?.name === dest.name;
                  return (
                    <button
                      key={dest.id}
                      type="button"
                      onClick={() => setSelectedDestination(dest)}
                      className={`
                        p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all touch-manipulation active:scale-[0.98]
                        ${isSelected
                          ? 'bg-teal-500/15 border-teal-500 text-white shadow-lg shadow-teal-500/10'
                          : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                        }
                      `}
                    >
                      <MapPin className={`w-5 h-5 shrink-0 mt-0.5 ${isSelected ? 'text-teal-400' : 'text-slate-500'}`} />
                      <div>
                        <div className="font-bold text-sm leading-tight text-slate-100">{dest.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{dest.city}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Disabled Continue CTA if no place selected */}
            <PreferenceFooter
              onContinue={() => updateStep(2)}
              disabled={!selectedDestination}
            />
          </div>
        )}

        {/* STEP 2: DATES */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <PreferenceProgress currentStep={2} totalSteps={5} />

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                When are you going?
              </h2>
              <p className="text-sm text-slate-400">
                Select trip dates for <span className="text-teal-300 font-semibold">{selectedDestination?.name}</span>.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-3 text-teal-400 font-bold text-sm pb-2 border-b border-slate-800">
                <Calendar className="w-5 h-5" />
                <span>{calculateDaysNights()}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-slate-100 font-bold text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 px-4 text-slate-100 font-bold text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <PreferenceFooter
              onContinue={() => updateStep(3)}
            />
          </div>
        )}

        {/* STEP 3: TRAVELERS */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <PreferenceProgress currentStep={3} totalSteps={5} />

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Who's coming?
              </h2>
              <p className="text-sm text-slate-400">
                Select how many people are traveling with you.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Just me', count: 1 },
                { label: '2 travelers', count: 2 },
                { label: '3–5 travelers', count: 4 },
                { label: '6+ travelers', count: 6 },
              ].map(preset => (
                <button
                  key={preset.count}
                  type="button"
                  onClick={() => setTravelersCount(preset.count)}
                  className={`
                    p-4 rounded-2xl border text-center font-bold text-sm transition-all active:scale-95
                    ${travelersCount === preset.count
                      ? 'bg-teal-500/15 border-teal-500 text-teal-300 ring-1 ring-teal-500/30'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }
                  `}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-teal-400" />
                <span className="font-bold text-sm text-white">Total Travelers</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                  className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 flex items-center justify-center text-lg"
                >
                  -
                </button>
                <span className="font-extrabold text-lg text-teal-400 w-6 text-center">{travelersCount}</span>
                <button
                  type="button"
                  onClick={() => setTravelersCount(travelersCount + 1)}
                  className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 flex items-center justify-center text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <PreferenceFooter
              onContinue={() => updateStep(4)}
            />
          </div>
        )}

        {/* STEP 4: TRIP STYLE */}
        {step === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <PreferenceProgress currentStep={4} totalSteps={5} />

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                What kind of trip is this?
              </h2>
              <p className="text-sm text-slate-400">
                Preselected from your profile. Modify for this trip if needed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'RELAXED', label: 'Relaxed' },
                { id: 'ADVENTURE', label: 'Adventure' },
                { id: 'FOODIE', label: 'Foodie' },
                { id: 'CULTURE', label: 'Culture' },
                { id: 'NATURE', label: 'Nature' },
                { id: 'LUXURY', label: 'Luxury' },
              ].map(item => (
                <PreferenceOption
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  selected={selectedStyles.includes(item.id as TravelStyle)}
                  onSelect={id => {
                    const styleId = id as TravelStyle;
                    setSelectedStyles(prev =>
                      prev.includes(styleId) ? prev.filter(s => s !== styleId) : [...prev, styleId]
                    );
                  }}
                  mode="multiple"
                />
              ))}
            </div>

            <PreferenceFooter
              onContinue={() => updateStep(5)}
            />
          </div>
        )}

        {/* STEP 5: BUDGET & SUMMARY */}
        {step === 5 && (
          <div className="space-y-5 animate-fadeIn">
            <PreferenceProgress currentStep={5} totalSteps={5} />

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Trip Budget & Summary
              </h2>
              <p className="text-sm text-slate-400">
                Set target budget via slider or direct amount input.
              </p>
            </div>

            {/* Custom Target Budget Input & Range Slider ("Scroll Budget") */}
            <div className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">Target Budget Amount (₹)</label>
                  <span className="text-[11px] font-semibold text-teal-400 font-mono">
                    ~₹{Math.round(customBudgetAmount / (Math.max(1, parseInt(calculateDaysNights())) || 1)).toLocaleString()} / day
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 font-extrabold text-teal-400 text-lg font-mono">₹</span>
                  <input
                    type="number"
                    min={5000}
                    max={500000}
                    step={1000}
                    value={customBudgetAmount}
                    onChange={(e) => handleCustomBudgetChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-teal-500 rounded-2xl pl-8 pr-4 py-3 text-lg font-extrabold font-mono text-white outline-none"
                    placeholder="Enter amount (e.g. 30000)"
                  />
                </div>
              </div>

              {/* Scroll Budget Range Slider */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                  <span>₹5,000</span>
                  <span className="text-teal-400 font-extrabold font-mono text-sm">₹{customBudgetAmount.toLocaleString()}</span>
                  <span>₹2,00,000</span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={200000}
                  step={1000}
                  value={Math.min(200000, Math.max(5000, customBudgetAmount))}
                  onChange={(e) => handleCustomBudgetChange(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
              </div>

              {/* Quick Preset Tiers */}
              <div className="pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Budget Tier Presets</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'BUDGET', label: '₹ Budget', amount: 15000 },
                    { id: 'MODERATE', label: '₹₹ Moderate', amount: 30000 },
                    { id: 'PREMIUM', label: '₹₹₹ Premium', amount: 60000 },
                    { id: 'LUXURY', label: '₹₹₹₹ Luxury', amount: 120000 },
                  ].map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handleBudgetTierSelect(tier.id as BudgetLevel)}
                      className={`
                        p-2.5 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5
                        ${selectedBudget === tier.id
                          ? 'bg-teal-500/15 border-teal-500 text-teal-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                        }
                      `}
                    >
                      <span>{tier.label}</span>
                      <span className="text-[10px] opacity-75 font-mono">₹{tier.amount.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Trip Summary Card */}
            <div className="bg-slate-900/90 border border-teal-500/30 rounded-3xl p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-extrabold text-lg text-white">{selectedDestination?.name}</h4>
                  <p className="text-xs text-slate-400">{startDate} → {endDate}</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-extrabold text-xs">
                  {calculateDaysNights()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Travelers</span>
                  <span className="font-semibold">{travelersCount} Person{travelersCount > 1 ? 's' : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Budget</span>
                  <span className="font-semibold text-teal-400 font-mono">₹{customBudgetAmount.toLocaleString()} ({selectedBudget})</span>
                </div>
              </div>

              {selectedStyles.length > 0 && (
                <div className="pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400 block text-[10px] mb-1">Vibe & Style</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedStyles.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <PreferenceFooter
              onContinue={handleFinalSubmit}
              continueText="Create Trip"
              isLoading={isTripLoading}
            />
          </div>
        )}

      </div>

      <div className="text-center pt-2 pb-4">
        <p className="text-[11px] text-slate-500">
          You can edit your trip details anytime from your Trip Command Center.
        </p>
      </div>
    </div>
  </div>
  );
};
