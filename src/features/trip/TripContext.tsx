import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Trip, TripDraft, CreateTripPayload, TripStatus, Itinerary, ItineraryStatus, TripStay, TripTransport, TripExpense } from './types';
import { tripRepository } from './tripRepository';
import { useAuth } from '../../auth/AuthContext';
import { wsClient } from '../../services/wsClient';

interface TripContextType {
  trips: Trip[];
  currentTrip: Trip | null;
  currentTripId: string | null;
  currentItinerary: Itinerary | null;
  itineraryStatus: ItineraryStatus;
  stays: TripStay[];
  transports: TripTransport[];
  expenses: TripExpense[];
  draft: TripDraft | null;
  isLoading: boolean;
  createTrip: (payload: CreateTripPayload) => Promise<Trip>;
  regenerateItinerary: (tripId: string) => Promise<void>;
  updateTripStatus: (tripId: string, status: TripStatus) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  cancelTrip: (tripId: string) => Promise<void>;
  archiveTrip: (tripId: string) => Promise<void>;
  setCurrentTripId: (tripId: string | null) => void;
  saveDraft: (draft: TripDraft) => void;
  discardDraft: () => void;
  addStay: (payload: Partial<TripStay>) => Promise<TripStay>;
  addTransport: (payload: Partial<TripTransport>) => Promise<TripTransport>;
  addExpense: (payload: Partial<TripExpense>) => Promise<TripExpense>;
  fetchPackageData: (tripId: string) => Promise<void>;
  swapActivity: (tripId: string, activityId: string, payload: { itineraryId?: string; dayId?: string; replacement: any }) => Promise<void>;
  refetchItinerary: (tripId?: string) => Promise<void>;
  optimizeDayItinerary: (tripId: string, dayId: string, goal?: string) => Promise<any>;
  optimizeBudget: (tripId: string) => Promise<any>;
  weatherReplan: (tripId: string) => Promise<any>;
  executeRefinement: (tripId: string, actions: any[]) => Promise<any>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, userPreferences, authUser, isAuthenticated } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripIdState] = useState<string | null>(null);
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [itineraryStatus, setItineraryStatus] = useState<ItineraryStatus>('READY');

  const [stays, setStays] = useState<TripStay[]>([]);
  const [transports, setTransports] = useState<TripTransport[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);

  const [draft, setDraftState] = useState<TripDraft | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userId = authUser?.id;

  // Load user-specific trips when user session changes
  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setTrips([]);
      setCurrentTripIdState(null);
      setCurrentItinerary(null);
      setStays([]);
      setTransports([]);
      setExpenses([]);
      setDraftState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Fetch user trips over WebSocket
    wsClient.sendRequest('trips:list', {})
      .then((fetchedTrips: Trip[]) => {
        if (fetchedTrips && Array.isArray(fetchedTrips) && fetchedTrips.length > 0) {
          setTrips(fetchedTrips);
          const preferredId = tripRepository.getCurrentTripId(userId);
          const selectedId = tripRepository.selectCurrentTripId(fetchedTrips, preferredId);
          setCurrentTripIdState(selectedId);
        } else {
          const stored = tripRepository.getStoredTrips(userId);
          const preferredId = tripRepository.getCurrentTripId(userId);
          if (stored.length > 0) {
            setTrips(stored);
            const selectedId = tripRepository.selectCurrentTripId(stored, preferredId);
            setCurrentTripIdState(selectedId);
          } else {
            setTrips([]);
            setCurrentTripIdState(null);
            tripRepository.setCurrentTripId(null, userId);
          }
        }
      })
      .catch((err) => {
        console.warn('WebSocket trips fetch fallback:', err);
        const stored = tripRepository.getStoredTrips(userId);
        const preferredId = tripRepository.getCurrentTripId(userId);
        setTrips(stored);
        if (stored.length > 0) {
          const selectedId = tripRepository.selectCurrentTripId(stored, preferredId);
          setCurrentTripIdState(selectedId);
        }
      })
      .finally(() => {
        setDraftState(tripRepository.getDraft(userId));
        setIsLoading(false);
      });
  }, [isAuthenticated, userId]);

  // Derived currentTrip state
  const currentTrip = useMemo(() => {
    if (!currentTripId) return null;
    return trips.find(t => t.id === currentTripId) ?? null;
  }, [trips, currentTripId]);

  // Fetch package dimensions (stays, transports, expenses) via WebSocket
  const fetchPackageData = useCallback(async (tripId: string) => {
    if (!tripId) return;

    try {
      const [fetchedStays, fetchedTransports, fetchedExpenses] = await Promise.all([
        wsClient.sendRequest('trips:get_stays', { trip_id: tripId }),
        wsClient.sendRequest('trips:get_transports', { trip_id: tripId }),
        wsClient.sendRequest('trips:get_expenses', { trip_id: tripId }),
      ]);

      if (fetchedStays) {
        setStays(fetchedStays);
        localStorage.setItem(`voyageai_stays_${tripId}`, JSON.stringify(fetchedStays));
      }
      if (fetchedTransports) {
        setTransports(fetchedTransports);
        localStorage.setItem(`voyageai_transports_${tripId}`, JSON.stringify(fetchedTransports));
      }
      if (fetchedExpenses) {
        setExpenses(fetchedExpenses);
        localStorage.setItem(`voyageai_expenses_${tripId}`, JSON.stringify(fetchedExpenses));
      }
    } catch (err) {
      console.warn('WebSocket package data fetch error, loading from local storage.', err);
      const localStays = localStorage.getItem(`voyageai_stays_${tripId}`);
      const localTransports = localStorage.getItem(`voyageai_transports_${tripId}`);
      const localExpenses = localStorage.getItem(`voyageai_expenses_${tripId}`);
      if (localStays) setStays(JSON.parse(localStays));
      if (localTransports) setTransports(JSON.parse(localTransports));
      if (localExpenses) setExpenses(JSON.parse(localExpenses));
    }
  }, []);

  useEffect(() => {
    if (currentTripId) {
      fetchPackageData(currentTripId);
    } else {
      setStays([]);
      setTransports([]);
      setExpenses([]);
    }
  }, [currentTripId, fetchPackageData]);

  // Poll itinerary via WebSocket while itineraryStatus === 'GENERATING'
  useEffect(() => {
    if (!currentTripId) return;

    let isMounted = true;
    let pollInterval: any = null;

    const fetchItinerary = async () => {
      try {
        const data: Itinerary = await wsClient.sendRequest('trips:get_itinerary', { trip_id: currentTripId });

        if (data && isMounted) {
          setCurrentItinerary(data);
          if (data.status) {
            setItineraryStatus(data.status);
            setTrips(prev => prev.map(t => t.id === currentTripId ? { ...t, itineraryStatus: data.status } : t));
          }
          if (data.status === 'READY' || data.status === 'FAILED') {
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.warn('Itinerary WebSocket polling error:', err);
      }
    };

    fetchItinerary();

    if (currentTrip?.itineraryStatus === 'GENERATING') {
      setItineraryStatus('GENERATING');
      pollInterval = setInterval(fetchItinerary, 3000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentTripId, currentTrip?.itineraryStatus]);

  const addStay = useCallback(async (payload: Partial<TripStay>): Promise<TripStay> => {
    if (!currentTripId) throw new Error('No active trip selected');

    let newStay: TripStay;
    try {
      newStay = await wsClient.sendRequest('trips:add_stay', { ...payload, trip_id: currentTripId });
    } catch (err) {
      console.warn('WebSocket stay creation error, falling back to local stay.', err);
      newStay = {
        id: `stay_${Date.now()}`,
        tripId: currentTripId,
        activityId: payload.activityId,
        hotelName: payload.hotelName || 'Selected Hotel',
        locationName: payload.locationName || 'Central Location',
        checkInDate: payload.checkInDate || '2026-10-15',
        checkOutDate: payload.checkOutDate || '2026-10-19',
        nights: payload.nights || 4,
        pricePerNight: payload.pricePerNight || 0,
        totalPrice: payload.totalPrice || 0,
        status: payload.status || 'SELECTED',
        confirmationCode: payload.confirmationCode,
        createdAt: new Date().toISOString(),
      };
    }

    setStays(prev => {
      const updated = [newStay, ...prev];
      localStorage.setItem(`voyageai_stays_${currentTripId}`, JSON.stringify(updated));
      return updated;
    });
    return newStay;
  }, [currentTripId]);

  const addTransport = useCallback(async (payload: Partial<TripTransport>): Promise<TripTransport> => {
    if (!currentTripId) throw new Error('No active trip selected');

    let newTransport: TripTransport;
    try {
      newTransport = await wsClient.sendRequest('trips:add_transport', { ...payload, trip_id: currentTripId });
    } catch (err) {
      console.warn('WebSocket transport creation error, falling back to local transport.', err);
      newTransport = {
        id: `trsp_${Date.now()}`,
        tripId: currentTripId,
        activityId: payload.activityId,
        transportType: payload.transportType || 'CAB',
        providerName: payload.providerName || 'VoyageAI Ride',
        pickupLocation: payload.pickupLocation || 'Current Location',
        dropoffLocation: payload.dropoffLocation || 'Destination',
        pickupTime: payload.pickupTime || 'Immediate',
        estimatedFare: payload.estimatedFare || 0,
        status: payload.status || 'SELECTED',
        bookingReference: payload.bookingReference,
        createdAt: new Date().toISOString(),
      };
    }

    setTransports(prev => {
      const updated = [newTransport, ...prev];
      localStorage.setItem(`voyageai_transports_${currentTripId}`, JSON.stringify(updated));
      return updated;
    });
    return newTransport;
  }, [currentTripId]);

  const addExpense = useCallback(async (payload: Partial<TripExpense>): Promise<TripExpense> => {
    if (!currentTripId) throw new Error('No active trip selected');

    let newExpense: TripExpense;
    try {
      newExpense = await wsClient.sendRequest('trips:add_expense', { ...payload, trip_id: currentTripId });
    } catch (err) {
      console.warn('WebSocket expense creation error, falling back to local expense.', err);
      newExpense = {
        id: `exp_${Date.now()}`,
        tripId: currentTripId,
        activityId: payload.activityId,
        title: payload.title || 'Expense',
        amount: payload.amount || 0,
        category: payload.category || 'Other',
        paidBy: payload.paidBy || 'Me',
        isSplit: payload.isSplit || false,
        createdAt: new Date().toISOString(),
      };
    }

    setExpenses(prev => {
      const updated = [newExpense, ...prev];
      localStorage.setItem(`voyageai_expenses_${currentTripId}`, JSON.stringify(updated));
      return updated;
    });
    return newExpense;
  }, [currentTripId]);

  const setCurrentTripId = useCallback((id: string | null) => {
    setCurrentTripIdState(id);
    tripRepository.setCurrentTripId(id, userId);
  }, [userId]);

  const saveDraft = useCallback((draftData: TripDraft) => {
    setDraftState(draftData);
    tripRepository.saveDraft(draftData, userId);
  }, [userId]);

  const discardDraft = useCallback(() => {
    setDraftState(null);
    tripRepository.clearDraft(userId);
  }, [userId]);

  const createTrip = useCallback(async (payload: CreateTripPayload): Promise<Trip> => {
    setIsLoading(true);
    const clientRequestId = payload.clientRequestId || `req_${Date.now()}`;

    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    let createdTrip: Trip;

    try {
      createdTrip = await wsClient.sendRequest('trips:create', { ...payload, clientRequestId });
    } catch (e) {
      console.warn('WebSocket trip creation error, constructing local fallback trip.', e);
      createdTrip = {
        id: `trip_${Date.now()}`,
        userId: userId || 'usr_guest',
        title: `${payload.destination.name} Tour Package`,
        destination: payload.destination,
        coverMedia: {
          url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
          alt: `${payload.destination.name} Banner`,
          provider: 'fallback',
        },
        startDate: payload.startDate,
        endDate: payload.endDate,
        totalDays,
        travelers: Array.from({ length: payload.travelersCount }).map((_, idx) => ({
          id: `tr_${idx + 1}`,
          name: idx === 0 ? (userProfile?.firstName || 'Traveler') : `Companion ${idx + 1}`,
          type: 'ADULT',
          avatarUrl: idx === 0 ? userProfile?.avatarUrl : undefined,
        })),
        status: 'PLANNING',
        itineraryStatus: 'GENERATING',
        tripStyle: payload.tripStyle || userPreferences?.travelStyles || ['RELAXED'],
        transportPreferences: userPreferences?.transportPreferences || ['CAB'],
        budgetLevel: payload.budgetLevel || userPreferences?.budgetLevel || 'MODERATE',
        currency: 'INR',
        preferencesSnapshot: {
          travelStyles: userPreferences?.travelStyles || [],
          transportPreferences: userPreferences?.transportPreferences || [],
          dietaryPreferences: userPreferences?.dietaryPreferences || [],
          activityInterests: userPreferences?.activityInterests || [],
          budgetLevel: userPreferences?.budgetLevel,
          snapshotVersion: 1,
        },
        progress: {
          totalDays,
          currentDay: 1,
          completedActivitiesCount: 0,
          totalActivitiesCount: totalDays * 2,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const updatedTrips = [createdTrip, ...trips];
    setTrips(updatedTrips);
    setCurrentTripIdState(createdTrip.id);
    tripRepository.saveStoredTrips(updatedTrips, userId);
    tripRepository.setCurrentTripId(createdTrip.id, userId);
    discardDraft();
    setIsLoading(false);

    return createdTrip;
  }, [userId, userProfile, userPreferences, trips, discardDraft]);

  const regenerateItinerary = useCallback(async (tripId: string) => {
    setItineraryStatus('GENERATING');
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, itineraryStatus: 'GENERATING' } : t));

    try {
      await wsClient.sendRequest('trips:regenerate_itinerary', { trip_id: tripId, instruction: 'Re-generate package itinerary' });
    } catch (err) {
      console.warn('WebSocket regeneration request failed:', err);
    }
  }, []);

  const updateTripStatus = useCallback(async (tripId: string, status: TripStatus) => {
    const existing = trips.find(t => t.id === tripId);
    if (!existing) return;

    if (!tripRepository.validateStatusTransition(existing.status, status)) {
      console.warn(`Invalid status transition from ${existing.status} to ${status}`);
      return;
    }

    const updatedTrips = trips.map(t =>
      t.id === tripId ? { ...t, status, updatedAt: new Date().toISOString() } : t
    );

    setTrips(updatedTrips);
    tripRepository.saveStoredTrips(updatedTrips, userId);
  }, [trips, userId]);

  const deleteTrip = useCallback(async (tripId: string) => {
    try {
      await wsClient.sendRequest('trips:delete', { trip_id: tripId });
    } catch (err) {
      console.warn('WebSocket trips:delete failed, trying HTTP fallback...', err);
      try {
        await fetch(`/api/trips/${tripId}`, { method: 'DELETE', credentials: 'include' });
      } catch (httpErr) {
        console.error('Failed to delete trip from backend database:', httpErr);
      }
    }

    const updatedTrips = trips.filter(t => t.id !== tripId);
    setTrips(updatedTrips);
    tripRepository.saveStoredTrips(updatedTrips, userId);

    if (currentTripId === tripId) {
      const nextId = tripRepository.selectCurrentTripId(updatedTrips, null);
      setCurrentTripIdState(nextId);
      tripRepository.setCurrentTripId(nextId, userId);
    }
  }, [trips, currentTripId, userId]);

  const cancelTrip = useCallback(async (tripId: string) => {
    await updateTripStatus(tripId, 'CANCELLED');
  }, [updateTripStatus]);

  const archiveTrip = useCallback(async (tripId: string) => {
    await updateTripStatus(tripId, 'ARCHIVED');
  }, [updateTripStatus]);

  const refetchItinerary = useCallback(async (targetTripId?: string) => {
    const tid = targetTripId || currentTripId;
    if (!tid) return;
    try {
      const data: Itinerary = await wsClient.sendRequest('trips:get_itinerary', { trip_id: tid });
      if (data) {
        setCurrentItinerary(data);
        if (data.status) setItineraryStatus(data.status);
      }
    } catch (err) {
      console.warn('WebSocket failed to refetch itinerary, trying HTTP fallback...', err);
      try {
        const res = await fetch(`/api/trips/${tid}/itinerary`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setCurrentItinerary(data);
            if (data.status) setItineraryStatus(data.status);
          }
        }
      } catch (httpErr) {
        console.error('HTTP refetch itinerary fallback failed:', httpErr);
      }
    }
  }, [currentTripId]);

  const swapActivity = useCallback(async (
    tripId: string,
    activityId: string,
    payload: { itineraryId?: string; dayId?: string; replacement: any }
  ): Promise<void> => {
    try {
      await wsClient.sendRequest('trips:swap_activity', { trip_id: tripId, activity_id: activityId, ...payload });
    } catch (wsErr) {
      console.warn('WebSocket swap_activity failed, trying HTTP PATCH fallback...', wsErr);
      try {
        await fetch(`/api/trips/${tripId}/itinerary/activities/${activityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
      } catch (httpErr) {
        console.error('HTTP swap_activity fallback failed:', httpErr);
      }
    }
    await refetchItinerary(tripId);
  }, [refetchItinerary]);

  const optimizeDayItinerary = useCallback(async (tripId: string, dayId: string, goal: string = 'MINIMIZE_TRAVEL_TIME'): Promise<any> => {
    const data = await wsClient.sendRequest('trips:optimize_day', { trip_id: tripId, day_id: dayId, goal });
    await refetchItinerary(tripId);
    return data;
  }, [refetchItinerary]);

  const optimizeBudget = useCallback(async (tripId: string): Promise<any> => {
    return wsClient.sendRequest('trips:optimize_budget', { trip_id: tripId });
  }, []);

  const weatherReplan = useCallback(async (tripId: string): Promise<any> => {
    return wsClient.sendRequest('trips:weather_replan', { trip_id: tripId });
  }, []);

  const executeRefinement = useCallback(async (tripId: string, actions: any[]): Promise<any> => {
    const data = await wsClient.sendRequest('trips:refine', { trip_id: tripId, actions });
    await refetchItinerary(tripId);
    return data;
  }, [refetchItinerary]);

  return (
    <TripContext.Provider value={{
      trips,
      currentTrip,
      currentTripId,
      currentItinerary,
      itineraryStatus,
      stays,
      transports,
      expenses,
      draft,
      isLoading,
      createTrip,
      regenerateItinerary,
      updateTripStatus,
      deleteTrip,
      cancelTrip,
      archiveTrip,
      setCurrentTripId,
      saveDraft,
      discardDraft,
      addStay,
      addTransport,
      addExpense,
      fetchPackageData,
      swapActivity,
      refetchItinerary,
      optimizeDayItinerary,
      optimizeBudget,
      weatherReplan,
      executeRefinement,
    }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within a TripProvider');
  return ctx;
};
