import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ReadyScreen: React.FC = () => {
  const { userProfile, updateOnboarding } = useAuth();

  const handleStartExploring = async () => {
    await updateOnboarding({
      onboardingStep: 'ready',
      onboardingStatus: 'COMPLETED',
    });
    window.location.href = '/';
  };

  return (
    <div className="space-y-8 animate-fadeIn text-center py-6">
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-3xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-2xl shadow-teal-500/30">
          <Sparkles className="w-10 h-10" />
        </div>
      </div>

      <div className="space-y-3 max-w-xs mx-auto">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          You're all set ✨
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          We'll use your preferences to make your trips, food, and ride recommendations feel tailored just for you, {userProfile?.firstName || 'Traveler'}.
        </p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-left max-w-xs mx-auto space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-teal-400 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Travel Personality Active</span>
        </div>
        <p className="text-slate-400 leading-normal">
          You can update your travel styles, food choices, or budget anytime from your Profile.
        </p>
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={handleStartExploring}
          className="w-full h-14 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold text-base rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-teal-500/20 transition-all select-none touch-manipulation"
        >
          <span>Start Exploring</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
