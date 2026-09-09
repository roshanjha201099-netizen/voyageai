import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { ActivityInterest } from '../auth/types';
import { PreferenceOption } from '../components/preferences/PreferenceOption';
import { PreferenceProgress } from '../components/preferences/PreferenceProgress';
import { PreferenceFooter } from '../components/preferences/PreferenceFooter';

interface OptionItem {
  id: ActivityInterest;
  label: string;
  subtitle: string;
  icon: string;
}

const ACTIVITIES: OptionItem[] = [
  { id: 'BEACHES', label: 'Beaches', subtitle: 'Sand, sea, ocean sunsets', icon: '🏖️' },
  { id: 'NATURE', label: 'Nature & Parks', subtitle: 'Hikes, waterfalls, greenery', icon: '🌿' },
  { id: 'HISTORY', label: 'History & Forts', subtitle: 'Heritage monuments & ruins', icon: '🏛️' },
  { id: 'CULTURE', label: 'Culture & Arts', subtitle: 'Temples, museums, local crafts', icon: '🎭' },
  { id: 'ADVENTURE', label: 'Adventure Sports', subtitle: 'Trekking, rafting, water sports', icon: '🏄‍♂️' },
  { id: 'SHOPPING', label: 'Local Shopping', subtitle: 'Bazaars, flea markets, souvenirs', icon: '🛍️' },
  { id: 'NIGHTLIFE', label: 'Nightlife & Parties', subtitle: 'Beach shacks, clubs, live music', icon: '🌃' },
  { id: 'PHOTOGRAPHY', label: 'Photography', subtitle: 'Scenic spots & viewpoints', icon: '📸' },
  { id: 'WELLNESS', label: 'Wellness & Spa', subtitle: 'Yoga, relaxation, massageries', icon: '🧘‍♀️' },
  { id: 'FOOD', label: 'Culinary Experiences', subtitle: 'Food walks & tasting tours', icon: '🍜' },
];

export const ActivitiesScreen: React.FC = () => {
  const { userPreferences, updateOnboarding, isLoading } = useAuth();
  const [selected, setSelected] = useState<ActivityInterest[]>(
    userPreferences?.activityInterests || []
  );

  const toggleSelect = (id: string) => {
    const actId = id as ActivityInterest;
    setSelected(prev => {
      if (prev.includes(actId)) {
        return prev.filter(item => item !== actId);
      }
      if (prev.length >= 5) {
        // Soft recommendation max of 5 favorites
        return [...prev.slice(1), actId];
      }
      return [...prev, actId];
    });
  };

  const handleContinue = async () => {
    await updateOnboarding({
      activityInterests: selected,
      onboardingStep: 'budget',
      onboardingStatus: 'IN_PROGRESS',
    });
  };

  const handleSkip = async () => {
    await updateOnboarding({
      activityInterests: [],
      onboardingStep: 'budget',
      onboardingStatus: 'IN_PROGRESS',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-6">
      <PreferenceProgress currentStep={4} totalSteps={5} />

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          What do you love doing on a trip?
        </h2>
        <p className="text-sm text-slate-400">
          Pick a few favorites you'd enjoy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACTIVITIES.map(act => (
          <PreferenceOption
            key={act.id}
            id={act.id}
            label={act.label}
            subtitle={act.subtitle}
            icon={act.icon}
            selected={selected.includes(act.id)}
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
