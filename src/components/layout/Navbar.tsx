import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { useTrip } from '../../features/trip/TripContext';
import { Bell, Sparkles, ArrowLeft, ShieldAlert, MapPin, Radio } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const MobileHeader: React.FC = () => {
  const {
    notifications,
    setIsNotificationsOpen,
    setIsProfileOpen,
    setIsEmergencyOpen,
    userLocationName,
    userLocationAccuracy,
    locationSource,
    setIsLocationModalOpen,
    isLiveTracking,
    toggleLiveTracking
  } = useApp();
  const { userProfile } = useAuth();
  const { currentTrip } = useTrip();

  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications.filter(n => !n.read).length;
  const isSubRoute = location.pathname.startsWith('/trip/') && location.pathname !== '/trip';

  const routeTitles: Record<string, string> = {
    '/trip/itinerary': 'Itinerary',
    '/trip/map': 'Live Map',
    '/trip/bookings': 'Reservations',
    '/trip/expenses': 'Expenses Ledger',
    '/trip/guide': 'Destination Guide',
  };

  const avatarUrl = userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80';
  const destinationName = currentTrip?.destination?.name || 'Trip';

  const isLowAccuracy = locationSource === 'gps' && userLocationAccuracy !== null && userLocationAccuracy > 1000;

  return (
    <header
      className="sticky top-0 z-40 bg-[#080B11]/95 backdrop-blur-md border-b border-white/[0.08]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-xl mx-auto gap-2">

        {/* Left Side: Logo or Back Navigation */}
        {isSubRoute ? (
          <button
            onClick={() => navigate('/trip')}
            className="touch-target press-scale flex items-center gap-2 text-slate-200 min-w-0"
            aria-label="Back to trip"
          >
            <ArrowLeft className="w-5 h-5 text-teal-400 shrink-0" />
            <span className="text-sm font-bold truncate">
              {destinationName}
              <span className="text-slate-400 font-normal"> · {routeTitles[location.pathname] || 'Back'}</span>
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <span className="text-base font-extrabold text-white tracking-tight">
              Voyage<span className="text-teal-400">AI</span>
            </span>
          </div>
        )}

        {/* Center: Live User Location Chip */}
        <button
          type="button"
          onClick={() => setIsLocationModalOpen(true)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-all max-w-[150px] truncate border shadow-sm ${
            isLowAccuracy
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              : 'bg-slate-900 text-teal-300 border-white/10 hover:border-teal-500/50'
          }`}
          title="Click to change or confirm your exact location"
        >
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLowAccuracy ? 'text-amber-400' : 'text-teal-400'}`} />
          <span className="truncate">{userLocationName || 'Set Location'}</span>
        </button>

        {/* Live GPS Tracking Toggle Badge */}
        <button
          type="button"
          onClick={toggleLiveTracking}
          className={`px-2 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition-all border shadow-sm shrink-0 ${
            isLiveTracking
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800 text-slate-400 border-white/10 hover:border-amber-500/40 hover:text-amber-300'
          }`}
          title={isLiveTracking ? 'Live GPS tracking is ON — click to pause' : 'Live GPS tracking is PAUSED — click to resume'}
        >
          <Radio className={`w-3 h-3 shrink-0 ${isLiveTracking ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
          <span>
            {isLiveTracking
              ? `Live${userLocationAccuracy !== null ? ` · ${Math.round(userLocationAccuracy)}m` : ''}`
              : 'Paused'
            }
          </span>
        </button>

        {/* Right Side: Global Emergency + Notifications + Dynamic User Profile */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEmergencyOpen(true)}
            className="touch-target press-scale p-2 text-rose-400 hover:text-rose-300 transition-colors"
            aria-label="Emergency Assistance"
            title="Global Emergency"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="touch-target press-scale relative p-2 text-slate-400 hover:text-white transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-teal-400 rounded-full ring-2 ring-[#080B11]" />
            )}
          </button>

          <button
            onClick={() => setIsProfileOpen(true)}
            className="touch-target press-scale p-1 rounded-full"
            aria-label="Profile"
          >
            <div className="w-7 h-7 rounded-full bg-slate-700 border border-teal-500/40 overflow-hidden">
              <img
                src={avatarUrl}
                alt={userProfile?.firstName || 'User'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};
