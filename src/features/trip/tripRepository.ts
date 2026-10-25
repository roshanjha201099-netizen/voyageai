import type { Trip, TripDraft, TripStatus } from './types';

const inMemoryTrips: Record<string, Trip[]> = {};
const inMemoryCurrentTripId: Record<string, string | null> = {};
const inMemoryDrafts: Record<string, TripDraft | null> = {};

export const tripRepository = {
  getStoredTrips(userId?: string): Trip[] {
    const key = userId || 'default';
    return inMemoryTrips[key] || [];
  },

  saveStoredTrips(trips: Trip[], userId?: string) {
    const key = userId || 'default';
    inMemoryTrips[key] = trips;
  },

  getCurrentTripId(userId?: string): string | null {
    const key = userId || 'default';
    return inMemoryCurrentTripId[key] || null;
  },

  setCurrentTripId(id: string | null, userId?: string) {
    const key = userId || 'default';
    inMemoryCurrentTripId[key] = id;
  },

  getDraft(userId?: string): TripDraft | null {
    const key = userId || 'default';
    return inMemoryDrafts[key] || null;
  },

  saveDraft(draft: TripDraft, userId?: string) {
    const key = userId || 'default';
    inMemoryDrafts[key] = { ...draft, updatedAt: new Date().toISOString() };
  },

  clearDraft(userId?: string) {
    const key = userId || 'default';
    delete inMemoryDrafts[key];
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
    const upcomingTrip = trips.find(t => t.status === 'UPCOMING' || (t.status as any) === 'CONFIRMED');
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
