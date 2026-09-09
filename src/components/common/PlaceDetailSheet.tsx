import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, Star, Navigation, Sparkles, X, Car } from 'lucide-react';

export interface PlaceDetailItem {
  id: string;
  name: string;
  category?: string;
  rating?: number;
  distanceText?: string;
  durationText?: string;
  estimatedCost?: number;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface PlaceDetailSheetProps {
  item: PlaceDetailItem | null;
  onClose: () => void;
}

export const PlaceDetailSheet: React.FC<PlaceDetailSheetProps> = ({ item, onClose }) => {
  const { openInAppNavigation, openCabModal, openAiAssistant } = useApp();

  if (!item) return null;

  const handleNavigate = () => {
    openInAppNavigation({
      title: item.name,
      locationName: item.address || item.name,
      coordinates: [item.latitude || 15.2993, item.longitude || 74.1240],
    });
    onClose();
  };

  const handleBookCab = () => {
    openCabModal(item.name);
    onClose();
  };

  const handleAskAI = () => {
    openAiAssistant(`Tell me more about ${item.name}, including timings, best entry spots, and history.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0D1117] border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-2xl animate-slideUp">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-extrabold text-[11px] uppercase tracking-wider">
                {item.category || 'Attraction'}
              </span>
              {item.rating && (
                <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{item.rating}</span>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-white truncate leading-tight">{item.name}</h2>
            {item.address && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Pills */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Distance</span>
            <span className="text-sm font-extrabold text-white">{item.distanceText || 'Near you'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration</span>
            <span className="text-sm font-extrabold text-white">{item.durationText || '1 - 2 hrs'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Est. Cost</span>
            <span className="text-sm font-extrabold text-teal-400">
              {item.estimatedCost ? `₹${item.estimatedCost}` : 'Free'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">About This Place</h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {item.description || 'Popular destination recommended for travelers. Beautiful views and cultural significance.'}
          </p>
        </div>

        {/* Action Buttons (Large, Thumb-Friendly) */}
        <div className="space-y-2.5 pt-2">
          {/* Primary Action Button (56px min height) */}
          <button
            type="button"
            onClick={handleNavigate}
            className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 press-scale"
          >
            <Navigation className="w-5 h-5 fill-slate-950" />
            <span>Navigate / Get Directions</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBookCab}
              className="py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:border-slate-700"
            >
              <Car className="w-4 h-4 text-blue-400" />
              <span>Book Ride</span>
            </button>

            <button
              type="button"
              onClick={handleAskAI}
              className="py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-teal-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:border-teal-500/50"
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Ask AI Guide</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
