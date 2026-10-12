import type { SessionData, LoginPayload, RegisterPayload, OnboardingUpdatePayload } from './types';
import { wsClient } from '../services/wsClient';
import { getApiBaseUrl, getAuthHeaders } from '../config/apiConfig';

const SESSION_CACHE_KEY = 'voyageai_session_data';
const TOKEN_KEY = 'voyageai_token';

export const authService = {
  clearSessionCache() {
    try {
      localStorage.removeItem(SESSION_CACHE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },

  saveCachedSession(session: SessionData) {
    try {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
      if (session.token) {
        localStorage.setItem(TOKEN_KEY, session.token);
        sessionStorage.setItem(TOKEN_KEY, session.token);
      }
    } catch {
      /* ignore */
    }
  },

  getCachedSession(): SessionData | null {
    try {
      const cached = localStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.token) {
          const directToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
          if (directToken) parsed.token = directToken;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  getAuthHeaders(): Record<string, string> {
    return getAuthHeaders();
  },

  async register(data: RegisterPayload): Promise<SessionData> {
    const url = `${getApiBaseUrl()}/api/auth/register`;
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Registration failed');
    }

    const resJson = await response.json();
    if (resJson && resJson.token && resJson.authUser) {
      const sessionData: SessionData = {
        token: resJson.token,
        authUser: resJson.authUser,
        userProfile: resJson.userProfile,
        userPreferences: resJson.userPreferences,
      };
      this.saveCachedSession(sessionData);
      return sessionData;
    }

    const session = await this.getCurrentUser();
    if (session) return session;

    const fallbackSession: SessionData = {
      token: resJson.token || undefined,
      authUser: {
        id: resJson.user?.id || 'usr_registered',
        provider: 'EMAIL',
        providerUserId: resJson.user?.email || data.email,
        email: resJson.user?.email || data.email,
        emailVerified: true,
        phoneVerified: false,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      userProfile: {
        userId: resJson.user?.id || 'usr_registered',
        firstName: resJson.user?.name ? resJson.user.name.split(' ')[0] : (data.name ? data.name.split(' ')[0] : 'Traveler'),
        lastName: resJson.user?.name ? resJson.user.name.split(' ').slice(1).join(' ') || undefined : undefined,
        preferredLanguage: 'en',
        preferredCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        onboardingStatus: 'NOT_STARTED',
        onboardingStep: 'welcome',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userPreferences: {
        userId: resJson.user?.id || 'usr_registered',
        travelStyles: [],
        transportPreferences: [],
        dietaryPreferences: [],
        foodInterests: [],
        activityInterests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    this.saveCachedSession(fallbackSession);
    return fallbackSession;
  },

  async login(payload: LoginPayload): Promise<SessionData> {
    const url = `${getApiBaseUrl()}/api/auth/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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

  async getCurrentUser(): Promise<SessionData | null> {
    const url = `${getApiBaseUrl()}/api/auth/me`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.authenticated && data.authUser) {
          const directToken = (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null) || undefined;
          const sessionData: SessionData = {
            token: data.token || directToken,
            authUser: data.authUser,
            userProfile: data.userProfile,
            userPreferences: data.userPreferences,
          };
          this.saveCachedSession(sessionData);
          return sessionData;
        }
      }
    } catch (e) {
      console.warn('getCurrentUser /api/auth/me error:', e);
    }
    return null;
  },

  async restoreSession(): Promise<SessionData | null> {
    const url = `${getApiBaseUrl()}/api/auth/me`;
    const cached = this.getCachedSession();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.authenticated && data.authUser) {
          const sessionData: SessionData = {
            token: data.token || cached?.token || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) || undefined : undefined),
            authUser: data.authUser,
            userProfile: data.userProfile,
            userPreferences: data.userPreferences,
          };
          this.saveCachedSession(sessionData);
          return sessionData;
        }
      }
    } catch (err) {
      console.warn('REST session restore error, trying WS fallback', err);
    }

    // Try WS fallback if cached token exists
    const token = cached?.token || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
    if (token) {
      try {
        const wsData: SessionData = await wsClient.sendRequest('auth:session', { token });
        if (wsData && wsData.authUser) {
          if (!wsData.token) wsData.token = token;
          this.saveCachedSession(wsData);
          return wsData;
        }
      } catch (wsErr) {
        console.warn('WebSocket session restore failed', wsErr);
      }
    }

    // Preserve cached session for offline/graceful degraded operation if valid user profile exists
    if (cached && cached.authUser) {
      return cached;
    }

    this.clearSessionCache();
    return null;
  },

  async logout(): Promise<void> {
    const url = `${getApiBaseUrl()}/api/auth/logout`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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
    const token = cached?.token || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null) || undefined;
    const url = `${getApiBaseUrl()}/api/user/onboarding`;
    const requestPayload = { ...payload, token };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestPayload),
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
      } else {
        console.warn(`REST Onboarding update returned ${response.status}, attempting WS fallback`);
      }
    } catch (e) {
      console.warn('REST Onboarding update network error, trying WS fallback', e);
    }

    // WebSocket fallback
    try {
      const res = await wsClient.sendRequest('auth:onboarding', requestPayload);
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

    // Offline / Graceful Local Fallback: update profile state so the user is NEVER blocked
    const activeSession: SessionData = cached || {
      token,
      authUser: {
        id: 'usr_local',
        provider: 'EMAIL',
        providerUserId: 'local_traveler',
        emailVerified: true,
        phoneVerified: false,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      userProfile: {
        userId: 'usr_local',
        firstName: payload.firstName || 'Traveler',
        lastName: payload.lastName,
        preferredLanguage: 'en',
        preferredCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        onboardingStatus: payload.onboardingStatus || 'IN_PROGRESS',
        onboardingStep: payload.onboardingStep || 'welcome',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      userPreferences: {
        userId: 'usr_local',
        travelStyles: payload.travelStyles || [],
        transportPreferences: payload.transportPreferences || [],
        dietaryPreferences: payload.dietaryPreferences || [],
        foodInterests: payload.foodInterests || [],
        activityInterests: payload.activityInterests || [],
        budgetLevel: payload.budgetLevel || 'MODERATE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    if (payload.firstName) activeSession.userProfile.firstName = payload.firstName;
    if (payload.lastName) activeSession.userProfile.lastName = payload.lastName;
    if (payload.onboardingStep) activeSession.userProfile.onboardingStep = payload.onboardingStep;
    if (payload.onboardingStatus) activeSession.userProfile.onboardingStatus = payload.onboardingStatus;

    if (payload.travelStyles) activeSession.userPreferences.travelStyles = payload.travelStyles;
    if (payload.transportPreferences) activeSession.userPreferences.transportPreferences = payload.transportPreferences;
    if (payload.dietaryPreferences) activeSession.userPreferences.dietaryPreferences = payload.dietaryPreferences;
    if (payload.foodInterests) activeSession.userPreferences.foodInterests = payload.foodInterests;
    if (payload.activityInterests) activeSession.userPreferences.activityInterests = payload.activityInterests;
    if (payload.budgetLevel) activeSession.userPreferences.budgetLevel = payload.budgetLevel;

    this.saveCachedSession(activeSession);
    return {
      userProfile: activeSession.userProfile,
      userPreferences: activeSession.userPreferences,
    };
  },
};

export const registerUser = async (data: RegisterPayload) => {
  return authService.register(data);
};
