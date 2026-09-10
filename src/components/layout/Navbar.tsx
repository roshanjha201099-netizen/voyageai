import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useTrip } from '../../features/trip/TripContext';
import { Sparkles, ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const MobileHeader: React.FC = () => {
  const {
    setIsProfileOpen,
    userLocationName,
    setIsLocationModalOpen,
  } = useApp();
  const { userProfile } = useAuth();
  const { currentTrip } = useTrip();

  const navigate = useNavigate();
  const location = useLocation();

  const isSubRoute = location.pathname.startsWith('/trip/') && location.pathname !== '/trip';
  const avatarUrl = userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80';
  const destinationName = currentTrip?.destination?.name || 'Trip';

  const routeTitles: Record<string, string> = {
    '/trip/itinerary': 'Itinerary',
    '/trip/map': 'Live Map',
    '/trip/bookings': 'Reservations',
    '/trip/expenses': 'Expenses',
    '/trip/guide': 'Guide',
  };

  return (
    <header
      className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#D9DEDA]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-xl mx-auto gap-2">

        {/* Left Side: Brand Logo or Sub-Route Back Action */}
        {isSubRoute ? (
          <button
            type="button"
            onClick={() => navigate('/trip')}
            className="flex items-center gap-2 text-[#1F2522] font-bold text-sm min-w-0 press-scale"
            aria-label="Back to trip"
          >
            <ArrowLeft className="w-5 h-5 text-[#355F58] shrink-0" />
            <span className="truncate">
              {destinationName}
              <span className="text-[#5F6863] font-normal"> · {routeTitles[location.pathname] || 'Back'}</span>
            </span>
          </button>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer shrink-0 press-scale"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 rounded-xl bg-[#E8F0EE] border border-[#D9DEDA] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#355F58]" />
            </div>
            <span className="text-lg font-extrabold text-[#1F2522] tracking-tight">
              Voyage<span className="text-[#355F58]">AI</span>
            </span>
          </div>
        )}

        {/* Center: Human-Readable Location Button */}
        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className="px-3 py-1.5 rounded-full bg-[#F0F2EF] border border-[#D9DEDA] hover:border-[#355F58]/40 text-[#1F2522] text-xs font-bold flex items-center gap-1.5 max-w-[160px] truncate shadow-xs transition-all"
          title="Tap to view or change location"
        >
          <MapPin className="w-3.5 h-3.5 text-[#355F58] shrink-0" />
          <span className="truncate">{userLocationName || 'Patna, Bihar'}</span>
        </button>

        {/* Right Side: Profile Action */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="p-0.5 rounded-full border border-[#D9DEDA] hover:border-[#355F58] transition-colors press-scale shrink-0"
          aria-label="Profile and account settings"
        >
          <div className="w-8 h-8 rounded-full bg-[#F0F2EF] overflow-hidden">
            <img
              src={avatarUrl}
              alt={userProfile?.firstName || 'Profile'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </button>

      </div>
    </header>
  );
};

