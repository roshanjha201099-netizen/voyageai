import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { BudgetLevel } from '../auth/types';
import { PreferenceOption } from '../components/preferences/PreferenceOption';
import { PreferenceProgress } from '../components/preferences/PreferenceProgress';
import { PreferenceFooter } from '../components/preferences/PreferenceFooter';

interface OptionItem {
  id: BudgetLevel;
  label: string;
  subtitle: string;
  icon: string;
}

const BUDGET_TIERS: OptionItem[] = [
  { id: 'BUDGET', label: '₹ Budget', subtitle: 'Keep it practical & economical', icon: '🎒' },
  { id: 'MODERATE', label: '₹₹ Moderate', subtitle: 'Comfort without overspending', icon: '⚖️' },
  { id: 'PREMIUM', label: '₹₹₹ Premium', subtitle: 'Spend for convenience & quality', icon: '🌟' },
  { id: 'LUXURY', label: '₹₹₹₹ Luxury', subtitle: 'Best available stay & services', icon: '💎' },
];

export const BudgetScreen: React.FC = () => {
  const { userPreferences, updateOnboarding, isLoading } = useAuth();
  const [selected, setSelected] = useState<BudgetLevel>(
    userPreferences?.budgetLevel || 'MODERATE'
  );

  const handleSelect = (id: string) => {
    setSelected(id as BudgetLevel);
  };

  const handleContinue = async () => {
    await updateOnboarding({
      budgetLevel: selected,
      onboardingStep: 'ready',
      onboardingStatus: 'COMPLETED',
    });
  };

  const handleSkip = async () => {
    await updateOnboarding({
      onboardingStep: 'ready',
      onboardingStatus: 'COMPLETED',
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-6">
      <PreferenceProgress currentStep={5} totalSteps={5} />

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          What's your travel style?
        </h2>
        <p className="text-sm text-slate-400">
          This helps us align stay, ride & food suggestions.
        </p>
      </div>

      <div className="space-y-3">
        {BUDGET_TIERS.map(tier => (
          <PreferenceOption
            key={tier.id}
            id={tier.id}
            label={tier.label}
            subtitle={tier.subtitle}
            icon={tier.icon}
            selected={selected === tier.id}
            onSelect={handleSelect}
            mode="single"
          />
        ))}
      </div>

      <PreferenceFooter
        onContinue={handleContinue}
        onSkip={handleSkip}
        continueText="Finish Setup"
        isLoading={isLoading}
      />
    </div>
  );
};
