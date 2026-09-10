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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2522]">More Options & Profile</h1>
        <p className="text-sm text-[#5F6863]">Account settings, saved places, and support</p>
      </div>

      {/* User Profile Banner Card */}
      <div className="bg-white p-5 flex items-center justify-between gap-4 rounded-3xl border border-[#D9DEDA] shadow-xs">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src={avatarUrl}
            alt={name}
            className="w-16 h-16 rounded-full object-cover border-2 border-[#355F58]/40 shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1F2522] truncate">{name}</h2>
            <p className="text-xs text-[#5F6863] truncate font-medium">{email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#E8F0EE] text-[#355F58] font-bold text-[10px] uppercase border border-[#D9DEDA]">
              Verified User
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditPrefsOpen(true)}
          className="px-3.5 py-2.5 rounded-2xl bg-[#F0F2EF] hover:border-[#355F58]/40 text-[#355F58] font-bold text-xs border border-[#D9DEDA] flex items-center gap-1 shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#355F58]" />
          <span>Edit</span>
        </button>
      </div>

      {/* Grouped Elderly Menu Actions (Large touch height min 56px) */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-[#5F6863] uppercase tracking-wider block">
          Menu & Settings
        </span>

        <div className="space-y-2.5">
          {/* Action 1: Travel Preferences */}
          <button
            type="button"
            onClick={() => setIsEditPrefsOpen(true)}
            className="w-full p-4 rounded-2xl bg-white border border-[#D9DEDA] hover:border-[#355F58]/40 text-left flex items-center justify-between transition-all press-scale shadow-xs min-h-[60px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#E8F0EE] text-[#355F58] border border-[#D9DEDA] flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2522]">Travel Preferences</h3>
                <p className="text-xs text-[#5F6863] font-medium">
                  {userPreferences?.travelStyles?.slice(0, 2).join(', ') || 'Relaxed, Foodie'} · {userPreferences?.budgetLevel || 'Moderate'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#7C8580]" />
          </button>

          {/* Action 2: Saved Places */}
          <button
            type="button"
            onClick={() => openAiAssistant('Show me all my saved places and recommendations')}
            className="w-full p-4 rounded-2xl bg-white border border-[#D9DEDA] hover:border-[#355F58]/40 text-left flex items-center justify-between transition-all press-scale shadow-xs min-h-[60px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2522]">Saved Places & Favorites</h3>
                <p className="text-xs text-[#5F6863] font-medium">View bookmarked hotels, restaurants, & POIs</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#7C8580]" />
          </button>

          {/* Action 3: Emergency Assistance */}
          <button
            type="button"
            onClick={() => setIsEmergencyOpen(true)}
            className="w-full p-4 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 text-left flex items-center justify-between transition-all press-scale shadow-xs min-h-[60px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-700">Emergency & Help Desk</h3>
                <p className="text-xs text-[#5F6863] font-medium">Medical emergency numbers & live SOS guide</p>
              </div>
            </div>
            <PhoneCall className="w-5 h-5 text-rose-600" />
          </button>

          {/* Action 4: Ask AI Support */}
          <button
            type="button"
            onClick={() => openAiAssistant('How do I use VoyageAI to plan trips or get directions?')}
            className="w-full p-4 rounded-2xl bg-white border border-[#D9DEDA] hover:border-[#355F58]/40 text-left flex items-center justify-between transition-all press-scale shadow-xs min-h-[60px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#E8F0EE] text-[#355F58] border border-[#D9DEDA] flex items-center justify-center shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1F2522]">Help & User Guide</h3>
                <p className="text-xs text-[#5F6863] font-medium">Common questions & travel tips</p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-[#355F58]" />
          </button>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-3">
        {!showSignOutConfirm ? (
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-base flex items-center justify-center gap-2 press-scale transition-all"
          >
            <LogOut className="w-5 h-5 text-rose-600" />
            <span>Sign Out of VoyageAI</span>
          </button>
        ) : (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 text-center animate-fadeIn">
            <h4 className="text-base font-extrabold text-[#1F2522]">Are you sure you want to sign out?</h4>
            <p className="text-xs text-[#5F6863]">Your session cookie will be deleted securely from this browser.</p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="py-3 rounded-xl bg-[#F0F2EF] text-[#1F2522] border border-[#D9DEDA] font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs"
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
