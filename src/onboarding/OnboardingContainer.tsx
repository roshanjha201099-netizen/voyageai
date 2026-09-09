import React from 'react';
import { useAuth } from '../auth/AuthContext';
import type { OnboardingStep } from '../auth/types';

import { WelcomeScreen } from './WelcomeScreen';
import { BasicProfileScreen } from './BasicProfileScreen';
import { TravelStyleScreen } from './TravelStyleScreen';
import { TransportScreen } from './TransportScreen';
import { FoodScreen } from './FoodScreen';
import { ActivitiesScreen } from './ActivitiesScreen';
import { BudgetScreen } from './BudgetScreen';
import { ReadyScreen } from './ReadyScreen';

export const OnboardingContainer: React.FC = () => {
  const { userProfile, updateOnboarding } = useAuth();
  const currentStep: OnboardingStep = userProfile?.onboardingStep || 'welcome';

  const handleSkipAll = async () => {
    await updateOnboarding({
      onboardingStep: 'ready',
      onboardingStatus: 'SKIPPED',
    });
  };

  const renderStepComponent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeScreen
            onNext={async () => {
              await updateOnboarding({
                onboardingStep: 'profile',
                onboardingStatus: 'IN_PROGRESS',
              });
            }}
            onSkip={async () => {
              await updateOnboarding({
                onboardingStep: 'ready',
                onboardingStatus: 'SKIPPED',
              });
            }}
          />
        );
      case 'profile':
        return (
          <BasicProfileScreen
            onNext={async () => {
              await updateOnboarding({
                onboardingStep: 'travel_style',
                onboardingStatus: 'IN_PROGRESS',
              });
            }}
          />
        );
      case 'travel_style':
        return <TravelStyleScreen />;
      case 'transport':
        return <TransportScreen />;
      case 'food':
        return <FoodScreen />;
      case 'activities':
        return <ActivitiesScreen />;
      case 'budget':
        return <BudgetScreen />;
      case 'ready':
        return <ReadyScreen />;
      default:
        return (
          <WelcomeScreen
            onNext={async () => {
              await updateOnboarding({
                onboardingStep: 'profile',
                onboardingStatus: 'IN_PROGRESS',
              });
            }}
            onSkip={async () => {
              await updateOnboarding({
                onboardingStep: 'ready',
                onboardingStatus: 'SKIPPED',
              });
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-dvh bg-[#080B10] text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto relative animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            Travel Personality
          </span>
        </div>

        {currentStep !== 'ready' && currentStep !== 'welcome' && (
          <button
            type="button"
            onClick={handleSkipAll}
            className="text-xs font-medium text-slate-400 hover:text-teal-400 transition-colors"
          >
            Skip all
          </button>
        )}
      </div>

      {/* Main step content */}
      <div className="my-auto py-4">
        {renderStepComponent()}
      </div>

      {/* Footer disclaimer */}
      <div className="text-center pt-2 pb-4">
        <p className="text-[11px] text-slate-500">
          Preferences help VoyageAI suggest better stays, food & activities.
        </p>
      </div>
    </div>
  );
};
