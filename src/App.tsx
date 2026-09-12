import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider } from './auth/AuthContext';
import { AuthGuard } from './auth/AuthGuard';
import { TripProvider } from './features/trip/TripContext';

import { LoginScreen } from './onboarding/LoginScreen';
import { OnboardingContainer } from './onboarding/OnboardingContainer';
import { TripCreationWizard } from './features/trip/screens/TripCreationWizard';

import { MobileHeader } from './components/layout/Navbar';
import { DesktopSidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/BottomNav';
import { FloatingAIButton } from './components/ai/FloatingAIButton';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { AIAssistantSheet } from './components/ai/AIAssistantDrawer';
import { ProfileSheet } from './components/profile/ProfilePage';
import { HotelDetailModal } from './components/hotels/HotelDetailModal';
import { CabBookingModal } from './components/cabs/CabBookingModal';
import { FoodSheet } from './components/food/FoodSheet';
import { EmergencyModal } from './components/common/EmergencyModal';

import { HomePage } from './components/home/HomePage';
import { MyTripsPage } from './components/trips/MyTripsPage';
import { ExplorePage } from './components/explore/ExplorePage';
import { MorePage } from './components/more/MorePage';
import { FoodPage } from './components/food/FoodPage';
import { RidesPage } from './components/rides/RidesPage';
import { ExpensesPage } from './components/expenses/ExpensesPage';
import { MapView } from './components/map/MapView';
import { TourGuidePage } from './components/tour-guide/TourGuidePage';
import { ItineraryView } from './components/itinerary/ItineraryView';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const MainContent: React.FC = () => {
  const { appUIState, setAppUIState, navigationTarget, tripView } = useApp();

  if (appUIState === 'loading') {
    return (
      <div className="py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#487C74] animate-spin mx-auto" />
        <h2 className="text-base font-bold text-[#1F2522]">Loading your trip context...</h2>
      </div>
    );
  }

  if (appUIState === 'error') {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-[#1F2522]">Connection error</h2>
        <p className="text-meta text-[13px] max-w-xs mx-auto text-[#5F6863]">We couldn't connect. Your trip data is safe in LocalStorage.</p>
        <button
          onClick={() => setAppUIState('ready')}
          className="px-5 py-2 rounded-xl bg-[#355F58] text-white font-bold text-xs"
        >
          Try again
        </button>
      </div>
    );
  }

  if (navigationTarget || tripView === 'map') {
    return <MapView />;
  }

  if (tripView === 'food') {
    return <FoodPage />;
  }

  if (tripView === 'rides') {
    return <RidesPage />;
  }

  if (tripView === 'expenses') {
    return <ExpensesPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/trip/map" element={<MapView />} />
      <Route path="/food" element={<FoodPage />} />
      <Route path="/trip/food" element={<FoodPage />} />
      <Route path="/rides" element={<RidesPage />} />
      <Route path="/trip/rides" element={<RidesPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/trip/expenses" element={<ExpensesPage />} />
      <Route path="/trip/itinerary" element={<ItineraryView />} />
      <Route path="/trip/details" element={<ItineraryView />} />
      <Route path="/itinerary" element={<ItineraryView />} />
      <Route path="/trip" element={<ItineraryView />} />
      <Route path="/trips" element={<MyTripsPage />} />
      <Route path="/trips/*" element={<MyTripsPage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/tour-guide" element={<TourGuidePage />} />
      <Route path="/guide" element={<TourGuidePage />} />
      <Route path="/more" element={<MorePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
};

const AppShell: React.FC = () => {
  return (
    <div className="min-h-dvh bg-[#F6F7F5] text-[#1F2522] flex flex-col antialiased">
      {/* Mobile Lightweight Header */}
      <MobileHeader />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <DesktopSidebar />

        <main className="flex-1 min-w-0 px-4 lg:px-8 py-4 lg:py-6">
          <MainContent />
        </main>
      </div>

      {/* Fixed 4-Tab Bottom Navigation */}
      <MobileBottomNav />

      {/* Floating Contextual AI Button */}
      <FloatingAIButton />

      {/* Bottom Sheets & Modals */}
      <NotificationDrawer />
      <AIAssistantSheet />
      <ProfileSheet />
      <HotelDetailModal />
      <CabBookingModal />
      <FoodSheet />
      <EmergencyModal />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TripProvider>
          <AppProvider>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<LoginScreen />} />

              {/* Protected Onboarding Flow */}
              <Route
                path="/onboarding"
                element={
                  <AuthGuard>
                    <OnboardingContainer />
                  </AuthGuard>
                }
              />

              {/* Protected Trip Creation Wizard Route */}
              <Route
                path="/trips/new"
                element={
                  <AuthGuard>
                    <TripCreationWizard />
                  </AuthGuard>
                }
              />

              {/* Protected Main App Shell */}
              <Route
                path="/*"
                element={
                  <AuthGuard>
                    <AppShell />
                  </AuthGuard>
                }
              />
            </Routes>
          </AppProvider>
        </TripProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
