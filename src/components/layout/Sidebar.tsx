import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import type { NavTab } from '../../types';
import { Home, MapPin, Compass, Sparkles, UtensilsCrossed, Car, Wallet } from 'lucide-react';

export const DesktopSidebar: React.FC = () => {
  const { activeTab, setActiveTab, openAiAssistant } = useApp();
  const { currentTrip } = useTrip();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: { id: NavTab; label: string; path: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Home', path: '/', icon: Home },
    { id: 'trips', label: 'Trips', path: '/trips', icon: MapPin },
    { id: 'explore', label: 'Explore', path: '/explore', icon: Compass },
    { id: 'guide', label: 'AI Guide', path: '/tour-guide', icon: Sparkles },
  ];

  const currentPath = location.pathname;
  const isHomeActive = currentPath === '/';
  const isTripsActive = currentPath.startsWith('/trip');
  const isExploreActive = currentPath.startsWith('/explore');
  const isGuideActive = currentPath.startsWith('/tour-guide');

  const getIsActive = (id: NavTab) => {
    if (id === 'home') return isHomeActive;
    if (id === 'trips') return isTripsActive;
    if (id === 'explore') return isExploreActive;
    if (id === 'guide') return isGuideActive;
    return activeTab === id;
  };

  const handleNavClick = (id: NavTab, path: string) => {
    setActiveTab(id);
    navigate(path);
  };

  const destinationName = currentTrip?.destination?.name || 'Kerala';
  const tripDates = currentTrip ? `${currentTrip.startDate} to ${currentTrip.endDate}` : 'Active Journey';

  return (
    <aside className="hidden lg:flex flex-col w-60 sticky top-14 h-[calc(100dvh-56px)] border-r border-[#D9DEDA] bg-white p-4 justify-between">
      <div className="space-y-5">
        <nav className="space-y-1">
          {navItems.map(({ id, label, path, icon: Icon }) => {
            const isActive = getIsActive(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavClick(id, path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#E8F0EE] text-[#355F58] font-bold border border-[#D9DEDA]'
                    : 'text-[#5F6863] hover:text-[#1F2522] hover:bg-[#F0F2EF]'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-[#355F58]' : ''}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Trip Widget with Sub-View Shortcut Buttons */}
        <div className="p-3.5 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#355F58]">Active Journey</span>
            <span className="text-[10px] font-mono text-[#5F6863] font-bold">Day 2</span>
          </div>

          <div>
            <div className="text-sm font-extrabold text-[#1F2522] truncate">{destinationName} Trip</div>
            <div className="text-[11px] text-[#5F6863] truncate">{tripDates}</div>
          </div>

          {/* Sub Navigation Tools */}
          <div className="pt-1 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('trips');
                navigate('/trip/map');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E8F0EE] text-xs font-bold text-[#1F2522] border border-[#D9DEDA] transition-all"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#355F58]" />
                <span>Route Map</span>
              </span>
              <span className="text-[10px] text-[#355F58] font-mono font-bold">Live</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/trip/food');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E8F0EE] text-xs font-bold text-[#1F2522] border border-[#D9DEDA] transition-all"
            >
              <span className="flex items-center gap-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#355F58]" />
                <span>Food Guide</span>
              </span>
              <span className="text-[10px] text-amber-700 font-mono font-bold">Local</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/trip/rides');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E8F0EE] text-xs font-bold text-[#1F2522] border border-[#D9DEDA] transition-all"
            >
              <span className="flex items-center gap-2">
                <Car className="w-3.5 h-3.5 text-[#355F58]" />
                <span>Rides & Cabs</span>
              </span>
              <span className="text-[10px] text-[#355F58] font-mono font-bold">Instant</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('trips');
                navigate('/trip/expenses');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E8F0EE] text-xs font-bold text-[#1F2522] border border-[#D9DEDA] transition-all"
            >
              <span className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-[#355F58]" />
                <span>Expense Ledger</span>
              </span>
              <span className="text-[10px] text-[#355F58] font-mono font-bold">Budget</span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openAiAssistant()}
        className="p-3.5 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] hover:bg-[#E8F0EE] transition-colors group text-left"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-[#355F58]" />
          <span className="text-xs font-bold text-[#1F2522]">AI Concierge</span>
        </div>
        <p className="text-[11px] text-[#5F6863] leading-snug">Ask for recommendations, plan updates or trip help</p>
      </button>
    </aside>
  );
};
