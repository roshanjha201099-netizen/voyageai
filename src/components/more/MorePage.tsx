import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useApp } from '../../context/AppContext';
import { PreferenceEditModal } from '../preferences/PreferenceEditModal';
import { Heart, ShieldAlert, SlidersHorizontal, LogOut, ChevronRight, HelpCircle, PhoneCall, Sparkles } from 'lucide-react';

export const MorePage: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile, userPreferences, authUser, signOut } = useAuth();
  const { setIsEmergencyOpen, openAiAssistant } = useApp();

  const [isEditPrefsOpen, setIsEditPrefsOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const name = userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}`.trim() : 'Traveler';
  const email = authUser?.email || 'Registered User';
  const avatarUrl = userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn">
      {/* Edit Preferences Modal */}
      <PreferenceEditModal
        isOpen={isEditPrefsOpen}
        onClose={() => setIsEditPrefsOpen(false)}
      />

      {/* Page Heading */}
      <div className="space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">More Options & Profile</h1>
        <p className="text-sm text-slate-400">Account settings, saved places, and support</p>
      </div>

      {/* User Profile Banner Card */}
      <div className="surface-card p-5 flex items-center justify-between gap-4 rounded-3xl border-slate-800 bg-slate-900/90 shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={avatarUrl}
            alt={name}
            className="w-16 h-16 rounded-full object-cover border-2 border-teal-500/40 shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-white truncate">{name}</h2>
            <p className="text-xs text-slate-400 truncate">{email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-extrabold text-[10px] uppercase border border-teal-500/30">
              Verified Account
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditPrefsOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs border border-slate-700 flex items-center gap-1 shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 text-teal-400" />
          <span>Edit</span>
        </button>
      </div>

      {/* Grouped Elderly Menu Actions (Large touch height min 56px) */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          Menu & Settings
        </span>

        <div className="space-y-2">
          {/* Action 1: Travel Preferences */}
          <button
            type="button"
            onClick={() => setIsEditPrefsOpen(true)}
            className="w-full p-4 rounded-2xl bg-[#0D1117] border border-slate-800 hover:border-teal-500/40 text-left flex items-center justify-between transition-all press-scale shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Travel Preferences</h3>
                <p className="text-xs text-slate-400">
                  {userPreferences?.travelStyles?.slice(0, 2).join(', ') || 'Relaxed, Foodie'} · {userPreferences?.budgetLevel || 'Moderate'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>

          {/* Action 2: Saved Places */}
          <button
            type="button"
            onClick={() => openAiAssistant('Show me all my saved places and recommendations')}
            className="w-full p-4 rounded-2xl bg-[#0D1117] border border-slate-800 hover:border-teal-500/40 text-left flex items-center justify-between transition-all press-scale shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Saved Places & Favorites</h3>
                <p className="text-xs text-slate-400">View bookmarked hotels, restaurants, & POIs</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </button>

          {/* Action 3: Emergency Assistance */}
          <button
            type="button"
            onClick={() => setIsEmergencyOpen(true)}
            className="w-full p-4 rounded-2xl bg-[#0D1117] border border-rose-500/30 hover:border-rose-400 text-left flex items-center justify-between transition-all press-scale shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-300">Emergency & Help Desk</h3>
                <p className="text-xs text-slate-400">Medical emergency numbers & live SOS guide</p>
              </div>
            </div>
            <PhoneCall className="w-5 h-5 text-rose-400" />
          </button>

          {/* Action 4: Ask AI Support */}
          <button
            type="button"
            onClick={() => openAiAssistant('How do I use VoyageAI to plan trips or get directions?')}
            className="w-full p-4 rounded-2xl bg-[#0D1117] border border-slate-800 hover:border-teal-500/40 text-left flex items-center justify-between transition-all press-scale shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Help & User Guide</h3>
                <p className="text-xs text-slate-400">Common questions & travel tips</p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-3">
        {!showSignOutConfirm ? (
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full py-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-extrabold text-base flex items-center justify-center gap-2 press-scale transition-all"
          >
            <LogOut className="w-5 h-5 text-rose-400" />
            <span>Sign Out of VoyageAI</span>
          </button>
        ) : (
          <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3 text-center animate-fadeIn">
            <h4 className="text-base font-extrabold text-white">Are you sure you want to sign out?</h4>
            <p className="text-xs text-slate-300">Your session cookie will be deleted securely from this browser.</p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="py-3 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs shadow-lg"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
