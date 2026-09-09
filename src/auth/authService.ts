import type { SessionData, LoginPayload, OnboardingUpdatePayload } from './types';
import { wsClient } from '../services/wsClient';

const SESSION_CACHE_KEY = 'voyageai_session_data';

const getApiBaseUrl = (): string => {
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const host = window.location.hostname || '127.0.0.1';
  return `${protocol}//${host}:8000`;
};

export const authService = {
  clearSessionCache() {
    localStorage.removeItem(SESSION_CACHE_KEY);
  },

  saveCachedSession(session: SessionData) {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
  },

  getCachedSession(): SessionData | null {
    try {
      const cached = localStorage.getItem(SESSION_CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  },

  async login(payload: LoginPayload): Promise<SessionData> {
    const url = `${getApiBaseUrl()}/api/auth/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Authentication failed. Please check your credentials.');
      }

      const data: SessionData = await response.json();
      this.saveCachedSession(data);
      return data;
    } catch (err: any) {
      console.warn('REST Auth login failed, attempting WS fallback...', err);
      try {
        const wsData: SessionData = await wsClient.sendRequest('auth:login', payload);
        if (wsData && wsData.authUser) {
          this.saveCachedSession(wsData);
          return wsData;
        }
      } catch (wsErr) {
        console.warn('WebSocket auth login fallback error:', wsErr);
      }
      throw err;
    }
  },

  async restoreSession(): Promise<SessionData | null> {
    const url = `${getApiBaseUrl()}/api/auth/session`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data: SessionData = await response.json();
        if (data && data.authUser) {
          this.saveCachedSession(data);
          return data;
        }
      } else {
        this.clearSessionCache();
        return null;
      }
    } catch (err) {
      console.warn('REST session restore error, trying WS fallback', err);
      try {
        const wsData: SessionData = await wsClient.sendRequest('auth:session', {});
        if (wsData && wsData.authUser) {
          this.saveCachedSession(wsData);
          return wsData;
        }
      } catch (wsErr) {
        console.warn('WebSocket session restore failed', wsErr);
      }
    }

    this.clearSessionCache();
    return null;
  },

  async logout(): Promise<void> {
    const url = `${getApiBaseUrl()}/api/auth/logout`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (e) {
      console.warn('REST Logout error, trying WS logout', e);
      try {
        await wsClient.sendRequest('auth:logout', {});
      } catch {
        /* best effort */
      }
    } finally {
      this.clearSessionCache();
    }
  },

  async updateOnboarding(payload: OnboardingUpdatePayload): Promise<{ userProfile: SessionData['userProfile']; userPreferences: SessionData['userPreferences'] }> {
    const cached = this.getCachedSession();
    const url = `${getApiBaseUrl()}/api/user/onboarding`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (response.ok) {
        const res = await response.json();
        if (res && res.userProfile) {
          if (cached) {
            cached.userProfile = res.userProfile;
            cached.userPreferences = res.userPreferences;
            this.saveCachedSession(cached);
          }
          return res;
        }
      }
    } catch (e) {
      console.warn('REST Onboarding update error, trying WS fallback', e);
      try {
        const res = await wsClient.sendRequest('auth:onboarding', payload);
        if (res && res.userProfile) {
          if (cached) {
            cached.userProfile = res.userProfile;
            cached.userPreferences = res.userPreferences;
            this.saveCachedSession(cached);
          }
          return res;
        }
      } catch (wsErr) {
        console.warn('WS Onboarding fallback error', wsErr);
      }
    }

    if (!cached) throw new Error('No active session');

    if (payload.firstName) cached.userProfile.firstName = payload.firstName;
    if (payload.lastName) cached.userProfile.lastName = payload.lastName;
    if (payload.onboardingStep) cached.userProfile.onboardingStep = payload.onboardingStep;
    if (payload.onboardingStatus) cached.userProfile.onboardingStatus = payload.onboardingStatus;

    if (payload.travelStyles) cached.userPreferences.travelStyles = payload.travelStyles;
    if (payload.transportPreferences) cached.userPreferences.transportPreferences = payload.transportPreferences;
    if (payload.dietaryPreferences) cached.userPreferences.dietaryPreferences = payload.dietaryPreferences;
    if (payload.foodInterests) cached.userPreferences.foodInterests = payload.foodInterests;
    if (payload.activityInterests) cached.userPreferences.activityInterests = payload.activityInterests;
    if (payload.budgetLevel) cached.userPreferences.budgetLevel = payload.budgetLevel;

    this.saveCachedSession(cached);
    return {
      userProfile: cached.userProfile,
      userPreferences: cached.userPreferences,
    };
  },
};
