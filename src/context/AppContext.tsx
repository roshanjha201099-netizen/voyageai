import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type {
  NavTab, TripView, AppUIState, Trip, Hotel, Restaurant, ExperienceActivity,
  Booking, Expense, UserProfile, NotificationItem, ActivityItem,
  SwapActivityPayload, NavigationTarget
} from '../types';
import {
  mockGoaTrip, mockHotels, mockRestaurants, mockExperiences,
  mockBookings, mockExpenses, mockUserProfile, mockNotifications
} from '../data/mockData';

import { ManualLocationModal } from '../components/common/ManualLocationModal';
import { locationService, type NormalizedLocationPoint } from '../services/locationService';
import { locationSocket } from '../services/locationSocket';
import { wsClient } from '../services/wsClient';

// Helper for LocalStorage Persistence
function usePersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(`voyageai_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`voyageai_${key}`, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to persist state for key voyageai_${key}`, e);
    }
  }, [key, state]);

  return [state, setState];
}

interface AppContextType {
  // Navigation State
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  tripView: TripView;
  setTripView: (view: TripView) => void;

  // UI State
  appUIState: AppUIState;
  setAppUIState: (state: AppUIState) => void;

  // Domain State (Persisted)
  activeTrip: Trip;
  setActiveTrip: React.Dispatch<React.SetStateAction<Trip>>;
  bookings: Booking[];
  expenses: Expense[];
  notifications: NotificationItem[];
  userProfile: UserProfile;

  userLocation: [number, number] | null;
  userLocationAccuracy: number | null;
  userLocationName: string;
  locationSource: 'gps' | 'manual' | null;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
  syncUserLocation: (lat: number, lng: number, accuracyMeters?: number, addressName?: string, source?: 'gps' | 'manual') => Promise<void>;
  requestGPSLocation: () => Promise<void>;

  // Live GPS Tracking
  isLiveTracking: boolean;
  toggleLiveTracking: () => void;
  startLiveTracking: () => void;
  stopLiveTracking: () => void;
  liveTrackingLastUpdated: number | null;
  isFollowMode: boolean;
  setIsFollowMode: (follow: boolean) => void;
  toggleFollowMode: () => void;
  retryGPS: () => Promise<void>;

  // Catalogs
  hotels: Hotel[];
  restaurants: Restaurant[];
  experiences: ExperienceActivity[];

  // Overlays / Sheets State
  isAiOpen: boolean;
  setIsAiOpen: (open: boolean) => void;
  aiPromptQuery: string;
  setAiPromptQuery: (q: string) => void;
  aiContextLabel: string;

  swapContext: SwapActivityPayload | null;
  setSwapContext: (ctx: SwapActivityPayload | null) => void;
  openSwapAssistant: (payload: SwapActivityPayload) => void;

  navigationTarget: NavigationTarget | null;
  setNavigationTarget: (target: NavigationTarget | null) => void;
  openInAppNavigation: (target: NavigationTarget) => void;

  selectedHotel: Hotel | null;
  setSelectedHotel: (hotel: Hotel | null) => void;
  isCabModalOpen: boolean;
  setIsCabModalOpen: (open: boolean) => void;
  cabDestination: string;
  setCabDestination: (dest: string) => void;

  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isFoodSheetOpen: boolean;
  setIsFoodSheetOpen: (open: boolean) => void;
  isEmergencyOpen: boolean;
  setIsEmergencyOpen: (open: boolean) => void;

  // Operations
  addBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  optimizeDayItinerary: (dayNumber: number) => void;
  removeActivity: (dayNumber: number, actId: string) => void;
  addActivityToItinerary: (dayNumber: number, activity: Omit<ActivityItem, 'id'>) => void;
  openHotelDetail: (hotel: Hotel) => void;
  openCabModal: (destinationName?: string) => void;
  openAiAssistant: (query?: string) => void;
  markNotificationAsRead: (id: string) => void;
  toggleSavePlace: (placeName: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [tripView, setTripView] = useState<TripView>('home');
  const [appUIState, setAppUIState] = useState<AppUIState>('ready');

  // Persisted Domain States
  const [activeTrip, setActiveTrip] = usePersistedState<Trip>('active_trip', mockGoaTrip);
  const [bookings, setBookings] = usePersistedState<Booking[]>('bookings', mockBookings);
  const [expenses, setExpenses] = usePersistedState<Expense[]>('expenses', mockExpenses);
  const [notifications, setNotifications] = usePersistedState<NotificationItem[]>('notifications', mockNotifications);
  const [userProfile, setUserProfile] = usePersistedState<UserProfile>('user_profile', mockUserProfile);

  // Catalogs
  const [hotels] = useState<Hotel[]>(mockHotels);
  const [restaurants] = useState<Restaurant[]>(mockRestaurants);
  const [experiences] = useState<ExperienceActivity[]>(mockExperiences);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userLocationAccuracy, setUserLocationAccuracy] = useState<number | null>(null);
  const [userLocationName, setUserLocationName] = useState<string>('');
  const [locationSource, setLocationSource] = useState<'gps' | 'manual' | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // ── Live Location Tracking State ──
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(true);
  const [liveTrackingLastUpdated, setLiveTrackingLastUpdated] = useState<number | null>(null);

  const toggleFollowMode = useCallback(() => {
    setIsFollowMode(prev => !prev);
  }, []);

  const syncUserLocation = useCallback(async (
    lat: number,
    lng: number,
    accuracyMeters?: number,
    addressName?: string,
    source: 'gps' | 'manual' = 'gps'
  ) => {
    setUserLocation([lat, lng]);
    if (accuracyMeters !== undefined) setUserLocationAccuracy(accuracyMeters);
    if (addressName) setUserLocationName(addressName);
    setLocationSource(source);

    if (source === 'manual') {
      locationService.setManualOverride({
        latitude: lat,
        longitude: lng,
        accuracy: accuracyMeters || 10,
        heading: null,
        speed: null,
        timestamp: Date.now(),
        source: 'manual',
        addressName: addressName || 'Manual Location'
      });
    }

    // Real-time WebSocket transmission as primary transport
    const sentViaWs = locationSocket.sendLocation({
      type: 'location_update',
      latitude: lat,
      longitude: lng,
      accuracy_meters: accuracyMeters !== undefined ? accuracyMeters : 10,
      source,
      address_name: addressName || 'User Location',
      trip_id: activeTrip?.id || null
    });

    if (!sentViaWs) {
      wsClient.send('location:update', {
        latitude: lat,
        longitude: lng,
        accuracy_meters: accuracyMeters !== undefined ? accuracyMeters : 10,
        address_name: addressName || 'User Location',
        source
      }).catch(err => console.warn('[LOCATION SYNC WS ERROR]', err));
    }
  }, [activeTrip?.id]);

  const retryGPS = useCallback(async () => {
    locationService.clearManualOverride();
    setLocationSource('gps');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          await syncUserLocation(lat, lng, accuracy, 'Live GPS Position', 'gps');
          if (accuracy <= 1000) {
            setIsLocationModalOpen(false);
          }
        },
        (err) => {
          console.warn('[RETRY GPS ERROR]', err.message);
          setIsLocationModalOpen(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [syncUserLocation]);

  const requestGPSLocation = useCallback(() => {
    return retryGPS();
  }, [retryGPS]);

  // ── Unified Location Watcher Lifecycle ──
  const startLiveTracking = useCallback(() => {
    const success = locationService.startWatcher(
      async (point: NormalizedLocationPoint, shouldSyncBackend: boolean) => {
        setUserLocation([point.latitude, point.longitude]);
        setUserLocationAccuracy(point.accuracy);
        setLiveTrackingLastUpdated(point.timestamp);
        setLocationSource('gps');
        setIsLiveTracking(true);

        if (shouldSyncBackend) {
          console.log(`[LIVE TRACKING] Syncing position — Lat: ${point.latitude.toFixed(5)}, Lng: ${point.longitude.toFixed(5)}, Accuracy: ${point.accuracy.toFixed(0)}m`);
          await syncUserLocation(point.latitude, point.longitude, point.accuracy, 'Live GPS (Continuous)', 'gps');
        }
      },
      (err) => {
        console.warn('[LIVE TRACKING ERROR]', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setIsLiveTracking(false);
          setIsLocationModalOpen(true);
        }
      }
    );

    if (success) {
      setIsLiveTracking(true);
      locationSocket.connect(activeTrip?.id);
    }
  }, [syncUserLocation, activeTrip?.id]);

  const stopLiveTracking = useCallback(() => {
    locationService.stopWatcher();
    locationSocket.disconnect();
    setIsLiveTracking(false);
  }, []);

  const toggleLiveTracking = useCallback(() => {
    if (isLiveTracking) {
      stopLiveTracking();
    } else {
      startLiveTracking();
    }
  }, [isLiveTracking, startLiveTracking, stopLiveTracking]);

  // Unified single mount effect for geolocation watcher & WebSocket connection
  useEffect(() => {
    locationSocket.connect(activeTrip?.id);
    startLiveTracking();

    return () => {
      stopLiveTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrip?.id]);

  // Modals & Sheets
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPromptQuery, setAiPromptQuery] = useState('');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [isCabModalOpen, setIsCabModalOpen] = useState(false);
  const [cabDestination, setCabDestination] = useState('Vagator Beach Rd');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFoodSheetOpen, setIsFoodSheetOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  // Contextual AI label
  const aiContextLabel = useMemo(() => {
    if (activeTab === 'home') return 'Plan my trip';
    if (activeTab === 'explore') return 'Discover packages';
    if (activeTab === 'trips') {
      if (tripView === 'map') return "What's nearby?";
      if (tripView === 'expenses') return 'Save money';
      if (tripView === 'reservations') return 'Manage bookings';
      return 'What should I do?';
    }
    return 'Ask VoyageAI Copilot';
  }, [activeTab, tripView]);

  const [swapContext, setSwapContext] = useState<SwapActivityPayload | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget | null>(null);

  const openSwapAssistant = useCallback((payload: SwapActivityPayload) => {
    setSwapContext(payload);
    const text = `Trip: ${payload.destination || 'Package'}. Selected Day: ${payload.selectedDay || 'ALL'}. Prompt: Recommend alternatives for activity: ${payload.activityName}`;
    setAiPromptQuery(text);
    setIsAiOpen(true);
  }, []);

  const openInAppNavigation = useCallback((target: NavigationTarget, navigateFn?: (path: string) => void) => {
    setNavigationTarget(target);
    setActiveTab('trips');
    setTripView('map');
    if (navigateFn) {
      navigateFn('/trip/map');
    }
  }, []);

  // Operations
  const addBooking = useCallback((newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    setNotifications(prev => [{
      id: `notif-${Date.now()}`,
      title: 'Booking Confirmed!',
      message: `${newBooking.title} confirmed. Code: ${newBooking.confirmationCode}`,
      time: 'Just now',
      type: 'booking',
      read: false
    }, ...prev]);
  }, [setBookings, setNotifications]);

  const cancelBooking = useCallback((bookingId: string) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', paymentStatus: 'refunded' } : b));
  }, [setBookings]);

  const addExpense = useCallback((newExpense: Omit<Expense, 'id'>) => {
    const item: Expense = { ...newExpense, id: `exp-${Date.now()}` };
    setExpenses(prev => [item, ...prev]);
    setActiveTrip(prev => ({ ...prev, budgetSpent: prev.budgetSpent + item.amount }));
  }, [setExpenses, setActiveTrip]);

  const optimizeDayItinerary = useCallback((dayNumber: number) => {
    setActiveTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.dayNumber === dayNumber ? { ...day, activities: [...day.activities].reverse() } : day
      )
    }));
  }, [setActiveTrip]);

  const removeActivity = useCallback((dayNumber: number, actId: string) => {
    setActiveTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.dayNumber === dayNumber ? { ...day, activities: day.activities.filter(a => a.id !== actId) } : day
      )
    }));
  }, [setActiveTrip]);

  const addActivityToItinerary = useCallback((dayNumber: number, actData: Omit<ActivityItem, 'id'>) => {
    const newItem: ActivityItem = { ...actData, id: `act-${Date.now()}` };
    setActiveTrip(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day =>
        day.dayNumber === dayNumber ? { ...day, activities: [...day.activities, newItem] } : day
      )
    }));
  }, [setActiveTrip]);

  const toggleSavePlace = useCallback((placeName: string) => {
    setUserProfile(prev => {
      const exists = prev.savedPlaces.includes(placeName);
      return {
        ...prev,
        savedPlaces: exists ? prev.savedPlaces.filter(p => p !== placeName) : [...prev.savedPlaces, placeName]
      };
    });
  }, [setUserProfile]);

  const openHotelDetail = useCallback((hotel: Hotel) => setSelectedHotel(hotel), []);
  const openCabModal = useCallback((destName?: string) => {
    if (destName) setCabDestination(destName);
    setIsCabModalOpen(true);
  }, []);
  const openAiAssistant = useCallback((query?: string) => {
    if (query) setAiPromptQuery(query);
    setIsAiOpen(true);
  }, []);
  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, [setNotifications]);

  return (
    <AppContext.Provider value={{
      activeTab, setActiveTab, tripView, setTripView,
      appUIState, setAppUIState,
      activeTrip, setActiveTrip,
      userLocation, userLocationAccuracy, userLocationName, locationSource,
      isLocationModalOpen, setIsLocationModalOpen,
      syncUserLocation, requestGPSLocation,
      isLiveTracking, toggleLiveTracking, startLiveTracking, stopLiveTracking, liveTrackingLastUpdated,
      isFollowMode, setIsFollowMode, toggleFollowMode, retryGPS,
      hotels, restaurants, experiences, bookings, expenses, notifications, userProfile,
      isAiOpen, setIsAiOpen, aiPromptQuery, setAiPromptQuery, aiContextLabel,
      swapContext, setSwapContext, openSwapAssistant,
      navigationTarget, setNavigationTarget, openInAppNavigation,
      selectedHotel, setSelectedHotel,
      isCabModalOpen, setIsCabModalOpen, cabDestination, setCabDestination,
      isProfileOpen, setIsProfileOpen,
      isNotificationsOpen, setIsNotificationsOpen,
      isFoodSheetOpen, setIsFoodSheetOpen,
      isEmergencyOpen, setIsEmergencyOpen,
      addBooking, cancelBooking, addExpense,
      optimizeDayItinerary, removeActivity, addActivityToItinerary,
      openHotelDetail, openCabModal, openAiAssistant, markNotificationAsRead,
      toggleSavePlace
    }}>
      {children}
      <ManualLocationModal />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
