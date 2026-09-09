import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { TravelStyle } from '../auth/types';
import { PreferenceOption } from '../components/preferences/PreferenceOption';
import { PreferenceProgress } from '../components/preferences/PreferenceProgress';
import { PreferenceFooter } from '../components/preferences/PreferenceFooter';

interface OptionItem {
  id: TravelStyle;
  label: string;
  subtitle: string;
  icon: string;
}

const TRAVEL_STYLES: OptionItem[] = [
  { id: 'RELAXED', label: 'Relaxed', subtitle: 'Unwind, beaches, slow pace', icon: '🌴' },
  { id: 'ADVENTURE', label: 'Adventure', subtitle: 'Hiking, sports, thrill-seeking', icon: '🏄' },
  { id: 'FOODIE', label: 'Foodie', subtitle: 'Street food, fine dining, cafes', icon: '🍜' },
  { id: 'CULTURE', label: 'Culture', subtitle: 'History, museums, traditions', icon: '🏛' },
  { id: 'NATURE', label: 'Nature', subtitle: 'Wildlife, mountains, scenic views', icon: '🌿' },
  { id: 'LUXURY', label: 'Luxury', subtitle: 'Resorts, spas, premium comfort', icon: '✨' },
  { id: 'BUDGET', label: 'Budget', subtitle: 'Smart spends, hostels, local routes', icon: '🎒' },
  { id: 'NIGHTLIFE', label: 'Nightlife', subtitle: 'Clubs, lounge bars, evening vibe', icon: '🌃' },
];

export const TravelStyleScreen: React.FC = () => {
  const { userPreferences, updateOnboarding, isLoading } = useAuth();
  const [selected, setSelected] = useState<TravelStyle[]>(
    userPreferences?.travelStyles || []
  );

  const toggleSelect = (id: string) => {
    const styleId = id as TravelStyle;
    setSelected(prev => {
      if (prev.includes(styleId)) {
        return prev.filter(item => item !== styleId);
      }
      if (prev.length >= 3) {
        // Max 3 recommendation preferred
        return [...prev.slice(1), styleId];
      }
      return [...prev, styleId];
    });
  };

  const handleContinue = async () => {
    await updateOnboarding({
      travelStyles: selected,
      onboardingStep: 'transport',
      onboardingStatus: 'IN_PROGRESS',
    });
  };

  const handleSkip = async () => {
    await updateOnboarding({
      travelStyles: [],
      onboardingStep: 'transport',
      onboardingStatus: 'IN_PROGRESS',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-6">
      <PreferenceProgress currentStep={1} totalSteps={5} />

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          What's your travel vibe?
        </h2>
        <p className="text-sm text-slate-400">
          Pick up to 3 that sound most like you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TRAVEL_STYLES.map(style => (
          <PreferenceOption
            key={style.id}
            id={style.id}
            label={style.label}
            subtitle={style.subtitle}
            icon={style.icon}
            selected={selected.includes(style.id)}
            onSelect={toggleSelect}
            mode="multiple"
          />
        ))}
      </div>

      <PreferenceFooter
        onContinue={handleContinue}
        onSkip={handleSkip}
        isLoading={isLoading}
      />
    </div>
  );
};
