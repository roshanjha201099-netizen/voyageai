import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, Calendar, MapPin, Sparkles, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavTab } from '../../types';

interface TabItem {
  id: NavTab | 'more' | 'map' | 'guide';
  path: string;
  label: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { id: 'home', path: '/', label: 'Home', icon: Home },
  { id: 'trips', path: '/trips', label: 'Trips', icon: Calendar },
  { id: 'guide' as any, path: '/guide', label: 'Guide', icon: Sparkles },
  { id: 'map', path: '/map', label: 'Map', icon: MapPin },
  { id: 'more' as any, path: '/more', label: 'More', icon: Menu },
];

export const MobileBottomNav: React.FC = () => {
  const { setActiveTab, setTripView } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tab: TabItem) => {
    if (tab.id === 'home' || tab.id === 'trips' || tab.id === 'explore') {
      setActiveTab(tab.id as NavTab);
    } else if (tab.id === 'map') {
      setActiveTab('trips');
      setTripView('map');
    }
    navigate(tab.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D1117]/95 backdrop-blur-md border-t border-slate-800 shadow-2xl"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = tab.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(tab.path) || (tab.path === '/guide' && location.pathname === '/tour-guide');
          const Icon = tab.icon;

          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
                isActive
                  ? 'text-teal-400 bg-teal-500/10 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-teal-400 stroke-[2.5]' : 'text-slate-400 stroke-[1.8]'}`} />
              <span className={`text-[12px] leading-tight mt-0.5 ${isActive ? 'font-black text-white' : 'font-semibold text-slate-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
