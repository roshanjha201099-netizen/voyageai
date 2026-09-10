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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#1F2522]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white border border-[#D9DEDA] rounded-t-3xl sm:rounded-3xl p-6 space-y-5 shadow-xl animate-slideUp text-[#1F2522]">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#D9DEDA] pb-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#E8F0EE] text-[#355F58] font-bold text-[11px] uppercase tracking-wider border border-[#D9DEDA]">
                {item.category || 'Attraction'}
              </span>
              {item.rating && (
                <div className="flex items-center gap-1 text-xs font-bold text-amber-700">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{item.rating}</span>
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#1F2522] truncate leading-tight">{item.name}</h2>
            {item.address && (
              <p className="text-xs text-[#5F6863] flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#355F58] shrink-0" />
                <span className="truncate">{item.address}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F0F2EF] flex items-center justify-center text-[#5F6863] hover:text-[#1F2522] shrink-0"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Blocks */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] text-center">
            <span className="text-[10px] font-bold text-[#5F6863] uppercase block">Distance</span>
            <span className="text-sm font-extrabold text-[#1F2522]">{item.distanceText || 'Near you'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] text-center">
            <span className="text-[10px] font-bold text-[#5F6863] uppercase block">Duration</span>
            <span className="text-sm font-extrabold text-[#1F2522]">{item.durationText || '1 - 2 hrs'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] text-center">
            <span className="text-[10px] font-bold text-[#5F6863] uppercase block">Est. Cost</span>
            <span className="text-sm font-extrabold text-[#355F58]">
              {item.estimatedCost ? `₹${item.estimatedCost}` : 'Free'}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#5F6863] uppercase tracking-wider">About This Place</h4>
          <p className="text-sm text-[#1F2522] leading-relaxed font-medium">
            {item.description || 'Popular destination recommended for travelers. Beautiful views and cultural significance.'}
          </p>
        </div>

        {/* Action Buttons (Large, Thumb-Friendly) */}
        <div className="space-y-2.5 pt-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleNavigate}
            className="w-full py-4 rounded-2xl bg-[#355F58] hover:bg-[#2C504A] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-xs press-scale min-h-[54px]"
          >
            <Navigation className="w-5 h-5 text-white" />
            <span>Navigate / Get Directions</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleBookCab}
              className="py-3.5 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] text-[#1F2522] font-bold text-xs flex items-center justify-center gap-1.5 hover:border-[#355F58]/40 min-h-[48px]"
            >
              <Car className="w-4 h-4 text-[#355F58]" />
              <span>Book Ride</span>
            </button>

            <button
              type="button"
              onClick={handleAskAI}
              className="py-3.5 rounded-2xl bg-[#F0F2EF] border border-[#D9DEDA] text-[#355F58] font-bold text-xs flex items-center justify-center gap-1.5 hover:border-[#355F58]/40 min-h-[48px]"
            >
              <Sparkles className="w-4 h-4 text-[#355F58]" />
              <span>Ask AI Guide</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
