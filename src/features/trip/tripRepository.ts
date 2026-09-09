import type { Trip, TripDraft, TripStatus } from './types';

const TRIPS_BASE_KEY = 'voyageai_user_trips';
const CURRENT_TRIP_ID_KEY = 'voyageai_current_trip_id';
const TRIP_DRAFT_KEY = 'voyageai_trip_draft';

export const tripRepository = {
  getStoredTrips(userId?: string): Trip[] {
    try {
      const storageKey = userId ? `${TRIPS_BASE_KEY}_${userId}` : TRIPS_BASE_KEY;
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveStoredTrips(trips: Trip[], userId?: string) {
    const storageKey = userId ? `${TRIPS_BASE_KEY}_${userId}` : TRIPS_BASE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(trips));
  },

  getCurrentTripId(userId?: string): string | null {
    const storageKey = userId ? `${CURRENT_TRIP_ID_KEY}_${userId}` : CURRENT_TRIP_ID_KEY;
    return localStorage.getItem(storageKey);
  },

  setCurrentTripId(id: string | null, userId?: string) {
    const storageKey = userId ? `${CURRENT_TRIP_ID_KEY}_${userId}` : CURRENT_TRIP_ID_KEY;
    if (id) {
      localStorage.setItem(storageKey, id);
    } else {
      localStorage.removeItem(storageKey);
    }
  },

  getDraft(userId?: string): TripDraft | null {
    try {
      const storageKey = userId ? `${TRIP_DRAFT_KEY}_${userId}` : TRIP_DRAFT_KEY;
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveDraft(draft: TripDraft, userId?: string) {
    const storageKey = userId ? `${TRIP_DRAFT_KEY}_${userId}` : TRIP_DRAFT_KEY;
    localStorage.setItem(storageKey, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
  },

  clearDraft(userId?: string) {
    const storageKey = userId ? `${TRIP_DRAFT_KEY}_${userId}` : TRIP_DRAFT_KEY;
    localStorage.removeItem(storageKey);
  },

  selectCurrentTripId(trips: Trip[], preferredId?: string | null): string | null {
    if (trips.length === 0) return null;

    // Rule 1: Restores preferredId if valid in trips array
    if (preferredId && trips.some(t => t.id === preferredId)) {
      return preferredId;
    }

    // Rule 2: Select first ACTIVE trip
    const activeTrip = trips.find(t => t.status === 'ACTIVE' || t.status === 'PLANNING');
    if (activeTrip) return activeTrip.id;

    // Rule 3: Select nearest UPCOMING trip
    const upcomingTrip = trips.find(t => t.status === 'UPCOMING');
    if (upcomingTrip) return upcomingTrip.id;

    // Rule 4: Select first non-archived trip or null
    const validTrip = trips.find(t => t.status !== 'ARCHIVED' && t.status !== 'CANCELLED');
    return validTrip ? validTrip.id : null;
  },

  validateStatusTransition(currentStatus: TripStatus, nextStatus: TripStatus): boolean {
    if (currentStatus === nextStatus) return true;

    if (currentStatus === 'COMPLETED' && nextStatus === 'ACTIVE') return false;
    if (currentStatus === 'ARCHIVED' && nextStatus === 'ACTIVE') return false;
    if (currentStatus === 'CANCELLED' && nextStatus === 'ACTIVE') return false;

    return true;
  }
};
