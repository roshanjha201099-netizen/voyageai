import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import type {
  TravelStyle,
  TransportPreference,
  DietaryPreference,
  FoodInterest,
  ActivityInterest,
  BudgetLevel
} from '../../auth/types';
import { PreferenceOption } from './PreferenceOption';
import { X, Check } from 'lucide-react';

interface PreferenceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PreferenceEditModal: React.FC<PreferenceEditModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userPreferences, updateOnboarding, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'vibe' | 'transport' | 'food' | 'activities' | 'budget'>('vibe');

  const [styles, setStyles] = useState<TravelStyle[]>(userPreferences?.travelStyles || []);
  const [transports, setTransports] = useState<TransportPreference[]>(userPreferences?.transportPreferences || []);
  const [dietary, setDietary] = useState<DietaryPreference[]>(userPreferences?.dietaryPreferences || ['EVERYTHING']);
  const [foodTypes, setFoodTypes] = useState<FoodInterest[]>(userPreferences?.foodInterests || []);
  const [activities, setActivities] = useState<ActivityInterest[]>(userPreferences?.activityInterests || []);
  const [budget, setBudget] = useState<BudgetLevel>(userPreferences?.budgetLevel || 'MODERATE');

  if (!isOpen) return null;

  const handleSave = async () => {
    await updateOnboarding({
      travelStyles: styles,
      transportPreferences: transports,
      dietaryPreferences: dietary,
      foodInterests: foodTypes,
      activityInterests: activities,
      budgetLevel: budget,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0F172A] border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Edit Travel Preferences</h3>
            <p className="text-xs text-slate-400">Tune how VoyageAI personalizes your trips</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto no-scrollbar border-b border-slate-800/60 bg-slate-900/40">
          {[
            { id: 'vibe', label: 'Vibe 🌴' },
            { id: 'transport', label: 'Transport 🚕' },
            { id: 'food', label: 'Food 🍲' },
            { id: 'activities', label: 'Activities 🏄' },
            { id: 'budget', label: 'Budget 💎' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'vibe' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Travel Vibe</span>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'RELAXED', label: 'Relaxed', icon: '🌴' },
                  { id: 'ADVENTURE', label: 'Adventure', icon: '🏄' },
                  { id: 'FOODIE', label: 'Foodie', icon: '🍜' },
                  { id: 'CULTURE', label: 'Culture', icon: '🏛' },
                  { id: 'NATURE', label: 'Nature', icon: '🌿' },
                  { id: 'LUXURY', label: 'Luxury', icon: '✨' },
                  { id: 'BUDGET', label: 'Budget', icon: '🎒' },
                  { id: 'NIGHTLIFE', label: 'Nightlife', icon: '🌃' },
                ].map(item => (
                  <PreferenceOption
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    selected={styles.includes(item.id as TravelStyle)}
                    onSelect={id => {
                      const val = id as TravelStyle;
                      setStyles(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'transport' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Getting Around</span>
              <div className="space-y-2.5">
                {[
                  { id: 'WALK', label: 'Walk', icon: '🚶' },
                  { id: 'BIKE', label: 'Bike / Scooter', icon: '🏍️' },
                  { id: 'AUTO', label: 'Auto Rickshaw', icon: '🛺' },
                  { id: 'CAB', label: 'Cab / Taxi', icon: '🚕' },
                  { id: 'PUBLIC_TRANSPORT', label: 'Public Transport', icon: '🚆' },
                ].map(item => (
                  <PreferenceOption
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    selected={transports.includes(item.id as TransportPreference)}
                    onSelect={id => {
                      const val = id as TransportPreference;
                      setTransports(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'food' && (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Primary Diet</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'EVERYTHING', label: 'Everything', icon: '🍲' },
                    { id: 'VEGETARIAN', label: 'Vegetarian', icon: '🥗' },
                    { id: 'VEGAN', label: 'Vegan', icon: '🌱' },
                    { id: 'HALAL', label: 'Halal', icon: '🥩' },
                  ].map(item => (
                    <PreferenceOption
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      icon={item.icon}
                      selected={dietary.includes(item.id as DietaryPreference)}
                      onSelect={id => {
                        const val = id as DietaryPreference;
                        setDietary(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Food Interests</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'LOCAL', label: 'Local Food', icon: '🍛' },
                    { id: 'STREET_FOOD', label: 'Street Food', icon: '🍢' },
                    { id: 'FINE_DINING', label: 'Fine Dining', icon: '🍷' },
                    { id: 'SEAFOOD', label: 'Seafood', icon: '🦐' },
                  ].map(item => (
                    <PreferenceOption
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      icon={item.icon}
                      selected={foodTypes.includes(item.id as FoodInterest)}
                      onSelect={id => {
                        const val = id as FoodInterest;
                        setFoodTypes(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Activities</span>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'BEACHES', label: 'Beaches', icon: '🏖️' },
                  { id: 'NATURE', label: 'Nature', icon: '🌿' },
                  { id: 'HISTORY', label: 'History', icon: '🏛️' },
                  { id: 'CULTURE', label: 'Culture', icon: '🎭' },
                  { id: 'ADVENTURE', label: 'Adventure', icon: '🏄‍♂️' },
                  { id: 'NIGHTLIFE', label: 'Nightlife', icon: '🌃' },
                ].map(item => (
                  <PreferenceOption
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    icon={item.icon}
                    selected={activities.includes(item.id as ActivityInterest)}
                    onSelect={id => {
                      const val = id as ActivityInterest;
                      setActivities(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase">Budget Tier</span>
              <div className="space-y-2.5">
                {[
                  { id: 'BUDGET', label: '₹ Budget', subtitle: 'Keep it practical & economical', icon: '🎒' },
                  { id: 'MODERATE', label: '₹₹ Moderate', subtitle: 'Comfort without overspending', icon: '⚖️' },
                  { id: 'PREMIUM', label: '₹₹₹ Premium', subtitle: 'Spend for convenience & quality', icon: '🌟' },
                  { id: 'LUXURY', label: '₹₹₹₹ Luxury', subtitle: 'Best available stay & services', icon: '💎' },
                ].map(item => (
                  <PreferenceOption
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    subtitle={item.subtitle}
                    icon={item.icon}
                    selected={budget === item.id}
                    onSelect={id => setBudget(id as BudgetLevel)}
                    mode="single"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="w-full h-12 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>

      </div>
    </div>
  );
};
