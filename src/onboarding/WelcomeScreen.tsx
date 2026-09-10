import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  onNext: () => void;
  onSkip: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext, onSkip }) => {
  const { userProfile } = useAuth();
  const name = userProfile?.firstName || 'Traveler';

  return (
    <div className="space-y-6 text-center animate-fadeIn">
      {/* Personal Avatar / Icon */}
      <div className="relative w-24 h-24 mx-auto">
        <img
          src={userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'}
          alt={name}
          className="w-full h-full rounded-full object-cover border-4 border-teal-500/30 shadow-2xl"
        />
        <div className="absolute bottom-0 right-0 p-2 rounded-full bg-teal-500 text-slate-950 shadow-lg">
          <Sparkles className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-white">
          Welcome, {name}
        </h2>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          Let's make VoyageAI work better for you in 30 seconds.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-4">
        <button
          onClick={onNext}
          className="cta-primary w-full py-4 text-base shadow-xl shadow-teal-500/25 press-scale"
        >
          <span>Let's personalize</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <button
          onClick={onSkip}
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};
