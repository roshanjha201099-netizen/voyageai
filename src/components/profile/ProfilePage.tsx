import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { BottomSheet } from '../common/BottomSheet';
import { Check, LogOut, ChevronRight, User, Sliders, Bell, Palette, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfileSheet: React.FC = () => {
  const { isProfileOpen, setIsProfileOpen } = useApp();
  const { userProfile, userPreferences, authUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await signOut();
    navigate('/login');
  };

  const name = userProfile?.firstName ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Traveler';
  const emailOrPhone = authUser?.email || authUser?.phone || 'user@voyageai.local';
  const avatarUrl = userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';
  const travelStyles = userPreferences?.travelStyles?.length ? userPreferences.travelStyles : ['RELAXED', 'FOODIE'];

  const sections = [
    { label: 'Account', icon: User, detail: emailOrPhone },
    { label: 'Preferences', icon: Sliders, detail: `${travelStyles.length} styles set` },
    { label: 'Notifications', icon: Bell, detail: 'On' },
    { label: 'Appearance', icon: Palette, detail: 'Dark' },
    { label: 'Privacy', icon: Shield, detail: 'Encrypted' },
  ];

  return (
    <BottomSheet isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} height="expanded">
      <div className="px-5 py-4 space-y-6">

        {/* Dynamic Profile Header */}
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt={name}
            className="w-14 h-14 rounded-full object-cover border-2 border-teal-500/40"
            loading="lazy"
          />
          <div>
            <h2 className="text-lg font-bold text-white">{name}</h2>
            <p className="text-meta text-[13px] text-slate-400">{emailOrPhone}</p>
          </div>
        </div>

        {/* Travel Preferences Chips */}
        <div className="space-y-2">
          <h3 className="text-micro uppercase font-bold tracking-wider text-slate-500">Travel Style</h3>
          <div className="flex flex-wrap gap-2">
            {travelStyles.map((s, i) => (
              <span key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-300 text-[12px] font-medium border border-teal-500/15">
                <Check className="w-3 h-3" /> {s}
              </span>
            ))}
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-0.5">
          {sections.map(s => (
            <button
              key={s.label}
              className="w-full press-scale flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0"
            >
              <div className="flex items-center gap-3">
                <s.icon className="w-5 h-5 text-slate-400" />
                <span className="text-body text-slate-200">{s.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {s.detail && <span className="text-meta text-[12px] text-slate-400">{s.detail}</span>}
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </button>
          ))}
        </div>

        {/* Working Sign Out Action */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full touch-target press-scale flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-sm font-bold transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </BottomSheet>
  );
};
