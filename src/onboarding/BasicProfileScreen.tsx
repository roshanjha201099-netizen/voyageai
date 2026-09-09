import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { User, ArrowRight } from 'lucide-react';

interface BasicProfileProps {
  onNext: () => void;
}

export const BasicProfileScreen: React.FC<BasicProfileProps> = ({ onNext }) => {
  const { userProfile, updateOnboarding } = useAuth();
  const [firstName, setFirstName] = useState(userProfile?.firstName || 'Roshan');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    await updateOnboarding({ firstName: firstName.trim() });
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-center animate-fadeIn">
      <div className="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
        <User className="w-7 h-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white">How should we call you?</h2>
        <p className="text-xs text-slate-400">We auto-filled this from your login account.</p>
      </div>

      <div className="pt-2 max-w-xs mx-auto">
        <input
          type="text"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          placeholder="First Name"
          className="input-field text-center font-bold text-lg py-3.5"
          required
        />
      </div>

      <button
        type="submit"
        disabled={!firstName.trim()}
        className="cta-primary w-full py-4 text-base shadow-xl press-scale disabled:opacity-40"
      >
        <span>Continue</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </form>
  );
};
