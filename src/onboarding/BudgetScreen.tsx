import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { BudgetLevel } from '../auth/types';
import { PreferenceProgress } from '../components/preferences/PreferenceProgress';
import { PreferenceFooter } from '../components/preferences/PreferenceFooter';

export const BudgetScreen: React.FC = () => {
  const { userPreferences, updateOnboarding, isLoading } = useAuth();
  const initialBudget = userPreferences?.budgetLevel === 'BUDGET' ? 15000
    : userPreferences?.budgetLevel === 'PREMIUM' ? 60000
    : userPreferences?.budgetLevel === 'LUXURY' ? 120000
    : 30000;

  const [customBudget, setCustomBudget] = useState<number>(initialBudget);

  const presetBudgetChips = [15000, 30000, 50000, 100000, 150000];

  const handleContinue = async () => {
    const mappedBudgetLevel: BudgetLevel = customBudget < 20000 ? 'BUDGET'
      : customBudget < 45000 ? 'MODERATE'
      : customBudget < 90000 ? 'PREMIUM'
      : 'LUXURY';

    await updateOnboarding({
      budgetLevel: mappedBudgetLevel,
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
    <div className="space-y-6 animate-fadeIn pb-6 text-[#1F2522]">
      <PreferenceProgress currentStep={5} totalSteps={5} />

      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          What is your travel budget?
        </h2>
        <p className="text-sm text-slate-300 font-medium">
          Set your custom budget amount or adjust using the range slider.
        </p>
      </div>

      <div className="space-y-5 bg-[#0F172A] border border-slate-800 p-5 rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Target Budget Amount (₹)</label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 font-extrabold text-teal-400 text-lg font-mono">₹</span>
            <input
              type="number"
              min={5000}
              max={500000}
              step={1000}
              value={customBudget}
              onChange={(e) => setCustomBudget(Math.max(0, Number(e.target.value)))}
              className="w-full bg-slate-900 border border-slate-700 focus:border-teal-500 rounded-2xl pl-8 pr-4 py-3 text-lg font-extrabold font-mono text-white outline-none"
              placeholder="Enter amount (e.g. 30000)"
            />
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>₹5,000</span>
            <span className="text-teal-400 font-extrabold font-mono text-sm">₹{customBudget.toLocaleString()}</span>
            <span>₹2,00,000</span>
          </div>
          <input
            type="range"
            min={5000}
            max={200000}
            step={1000}
            value={Math.min(200000, Math.max(5000, customBudget))}
            onChange={(e) => setCustomBudget(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
          />
        </div>

        {/* Presets */}
        <div className="space-y-2 pt-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Presets</span>
          <div className="flex flex-wrap gap-2">
            {presetBudgetChips.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setCustomBudget(amt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  customBudget === amt
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-extrabold'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                ₹{amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
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
