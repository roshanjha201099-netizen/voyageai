import React from 'react';
import type { TourPackage } from '../../types';
import { X, Star, Check, Sparkles, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PackageDetailProps {
  pkg: TourPackage | null;
  onClose: () => void;
}

export const PackageDetailView: React.FC<PackageDetailProps> = ({ pkg, onClose }) => {
  const { openAiAssistant } = useApp();

  if (!pkg) return null;

  const handleBuildTrip = () => {
    onClose();
    openAiAssistant(`Build a complete trip package for ${pkg.title} (${pkg.duration})`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-2xl h-[92dvh] sm:h-[88dvh] bg-[#080B10] border-t sm:border border-white/10 sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slideUp">
        
        {/* Top Floating Close Button */}
        <div className="relative shrink-0">
          <div className="h-56 sm:h-64 relative overflow-hidden">
            <img src={pkg.coverImage} alt={pkg.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-[#080B10]/40 to-transparent" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/10 hover:bg-black/80 transition-colors z-10"
              aria-label="Close detail view"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-teal-500/90 text-slate-950 font-bold text-xs shadow-lg">
              {pkg.category} Package
            </span>
          </div>

          <div className="px-6 -mt-10 relative z-10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{pkg.rating} ({pkg.reviewsCount} reviews)</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300 font-mono">{pkg.duration}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {pkg.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
              {pkg.destination}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          
          {/* Tagline */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#11161F] p-4 rounded-2xl border border-white/5">
            "{pkg.tagline}"
          </p>

          {/* Why You'll Love It */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider text-slate-400">Why You'll Love It</h3>
            <div className="space-y-2">
              {pkg.highlights.map((h, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200">
                  <div className="p-1 rounded-full bg-teal-500/20 text-teal-400 shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Included Resort */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider text-slate-400">Your Accommodations</h3>
            <div className="p-4 rounded-2xl bg-[#11161F] border border-white/10 flex items-center gap-4">
              <img src={pkg.inclusions.hotelImage} alt={pkg.inclusions.hotelName} className="w-20 h-20 rounded-xl object-cover shrink-0" />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">★ {pkg.inclusions.hotelRating} Luxury Resort</span>
                <h4 className="font-bold text-sm text-white">{pkg.inclusions.hotelName}</h4>
                <p className="text-xs text-slate-400">{pkg.nights} Nights Stay Included</p>
              </div>
            </div>
          </div>

          {/* Daily Itinerary Overview */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider text-slate-400">Day-by-Day Journey</h3>
            <div className="space-y-2">
              {pkg.itinerarySummary.map((item) => (
                <div key={item.dayNumber} className="p-3.5 rounded-xl bg-[#11161F] border border-white/5 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 font-bold text-xs flex items-center justify-center shrink-0">
                    D{item.dayNumber}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-200">{item.title}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 sm:p-5 bg-[#11161F] border-t border-white/10 flex items-center justify-between gap-4 shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-extrabold text-teal-400 font-mono">
                ₹{pkg.pricePerPerson.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">/ person</span>
            </div>
            {pkg.originalPrice && (
              <span className="text-xs text-slate-500 line-through font-mono">
                ₹{pkg.originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <button
            onClick={handleBuildTrip}
            className="flex-1 touch-target press-scale py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 transition-colors max-w-xs"
          >
            <Sparkles className="w-4 h-4" />
            Build this trip
          </button>
        </div>

      </div>
    </div>
  );
};
