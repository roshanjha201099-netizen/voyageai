import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import type { NavTab } from '../../types';
import { Home, MapPin, Compass, Sparkles } from 'lucide-react';

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
    <aside className="hidden lg:flex flex-col w-60 sticky top-14 h-[calc(100dvh-56px)] border-r border-white/[0.06] bg-[#0D1117] p-4 justify-between">
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
                    ? 'bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-teal-400' : ''}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Trip Widget with Sub-View Shortcut Buttons */}
        <div className="p-3.5 rounded-2xl bg-[#111622] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Active Journey</span>
            <span className="text-[10px] font-mono text-slate-400 font-bold">Day 2</span>
          </div>

          <div>
            <div className="text-sm font-extrabold text-white truncate">{destinationName} Trip</div>
            <div className="text-[11px] text-slate-400 truncate">{tripDates}</div>
          </div>

          {/* Sub Navigation Tools */}
          <div className="pt-1 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('trips');
                navigate('/trip/map');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-teal-300 border border-white/5 transition-all"
            >
              <span className="flex items-center gap-2">
                <span>📍</span>
                <span>Route Map</span>
              </span>
              <span className="text-[10px] text-teal-400 font-mono font-bold">Live</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/trip/food');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-teal-300 border border-white/5 transition-all"
            >
              <span className="flex items-center gap-2">
                <span>🍽️</span>
                <span>Food Guide</span>
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">Local</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigate('/trip/rides');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-teal-300 border border-white/5 transition-all"
            >
              <span className="flex items-center gap-2">
                <span>🚕</span>
                <span>Rides & Cabs</span>
              </span>
              <span className="text-[10px] text-teal-400 font-mono font-bold">Instant</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('trips');
                navigate('/trip/expenses');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-teal-300 border border-white/5 transition-all"
            >
              <span className="flex items-center gap-2">
                <span>💰</span>
                <span>Expense Ledger</span>
              </span>
              <span className="text-[10px] text-teal-400 font-mono font-bold">Budget</span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openAiAssistant()}
        className="p-3.5 rounded-2xl bg-[#111622] border border-white/[0.08] hover:bg-[#171E2B] transition-colors group text-left"
      >
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-bold text-white">AI Concierge</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">Ask for recommendations, plan updates or trip help</p>
      </button>
    </aside>
  );
};
