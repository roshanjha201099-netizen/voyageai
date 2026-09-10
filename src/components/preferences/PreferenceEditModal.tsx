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
import {
  X, Check, Sun, Compass, UtensilsCrossed, Landmark, Trees, Sparkles, Wallet, Moon,
  Footprints, Bike, Car, Bus, Apple, Leaf, Utensils, Coffee, Wine, Fish, Scale, Crown, Theater
} from 'lucide-react';

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
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 p-3 overflow-x-auto no-scrollbar border-b border-slate-800/60 bg-slate-900/40">
          {[
            { id: 'vibe', label: 'Vibe' },
            { id: 'transport', label: 'Transport' },
            { id: 'food', label: 'Food' },
            { id: 'activities', label: 'Activities' },
            { id: 'budget', label: 'Budget' },
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
                  { id: 'RELAXED', label: 'Relaxed', icon: <Sun className="w-5 h-5 text-teal-400" /> },
                  { id: 'ADVENTURE', label: 'Adventure', icon: <Compass className="w-5 h-5 text-teal-400" /> },
                  { id: 'FOODIE', label: 'Foodie', icon: <UtensilsCrossed className="w-5 h-5 text-teal-400" /> },
                  { id: 'CULTURE', label: 'Culture', icon: <Landmark className="w-5 h-5 text-teal-400" /> },
                  { id: 'NATURE', label: 'Nature', icon: <Trees className="w-5 h-5 text-teal-400" /> },
                  { id: 'LUXURY', label: 'Luxury', icon: <Sparkles className="w-5 h-5 text-teal-400" /> },
                  { id: 'BUDGET', label: 'Budget', icon: <Wallet className="w-5 h-5 text-teal-400" /> },
                  { id: 'NIGHTLIFE', label: 'Nightlife', icon: <Moon className="w-5 h-5 text-teal-400" /> },
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
                  { id: 'WALK', label: 'Walk', icon: <Footprints className="w-5 h-5 text-teal-400" /> },
                  { id: 'BIKE', label: 'Bike / Scooter', icon: <Bike className="w-5 h-5 text-teal-400" /> },
                  { id: 'AUTO', label: 'Auto Rickshaw', icon: <Car className="w-5 h-5 text-teal-400" /> },
                  { id: 'CAB', label: 'Cab / Taxi', icon: <Car className="w-5 h-5 text-teal-400" /> },
                  { id: 'PUBLIC_TRANSPORT', label: 'Public Transport', icon: <Bus className="w-5 h-5 text-teal-400" /> },
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
                    { id: 'EVERYTHING', label: 'Everything', icon: <UtensilsCrossed className="w-5 h-5 text-teal-400" /> },
                    { id: 'VEGETARIAN', label: 'Vegetarian', icon: <Apple className="w-5 h-5 text-teal-400" /> },
                    { id: 'VEGAN', label: 'Vegan', icon: <Leaf className="w-5 h-5 text-teal-400" /> },
                    { id: 'HALAL', label: 'Halal', icon: <Utensils className="w-5 h-5 text-teal-400" /> },
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
                    { id: 'LOCAL', label: 'Local Food', icon: <Utensils className="w-5 h-5 text-teal-400" /> },
                    { id: 'STREET_FOOD', label: 'Street Food', icon: <Coffee className="w-5 h-5 text-teal-400" /> },
                    { id: 'FINE_DINING', label: 'Fine Dining', icon: <Wine className="w-5 h-5 text-teal-400" /> },
                    { id: 'SEAFOOD', label: 'Seafood', icon: <Fish className="w-5 h-5 text-teal-400" /> },
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
                  { id: 'BEACHES', label: 'Beaches', icon: <Sun className="w-5 h-5 text-teal-400" /> },
                  { id: 'NATURE', label: 'Nature', icon: <Trees className="w-5 h-5 text-teal-400" /> },
                  { id: 'HISTORY', label: 'History', icon: <Landmark className="w-5 h-5 text-teal-400" /> },
                  { id: 'CULTURE', label: 'Culture', icon: <Theater className="w-5 h-5 text-teal-400" /> },
                  { id: 'ADVENTURE', label: 'Adventure', icon: <Compass className="w-5 h-5 text-teal-400" /> },
                  { id: 'NIGHTLIFE', label: 'Nightlife', icon: <Moon className="w-5 h-5 text-teal-400" /> },
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
                  { id: 'BUDGET', label: '₹ Budget', subtitle: 'Keep it practical & economical', icon: <Wallet className="w-5 h-5 text-teal-400" /> },
                  { id: 'MODERATE', label: '₹₹ Moderate', subtitle: 'Comfort without overspending', icon: <Scale className="w-5 h-5 text-teal-400" /> },
                  { id: 'PREMIUM', label: '₹₹₹ Premium', subtitle: 'Spend for convenience & quality', icon: <Sparkles className="w-5 h-5 text-teal-400" /> },
                  { id: 'LUXURY', label: '₹₹₹₹ Luxury', subtitle: 'Best available stay & services', icon: <Crown className="w-5 h-5 text-teal-400" /> },
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
