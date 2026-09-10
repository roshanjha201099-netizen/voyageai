import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Compass, Star, Sparkles, MapPin, ArrowRight, Building2, Car } from 'lucide-react';
import { mockTourPackages } from '../../data/mockData';
import { PackageDetailView } from '../travel/PackageDetailView';
import type { TourPackage } from '../../types';

export const ExplorePage: React.FC = () => {
  const { openAiAssistant } = useApp();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedPackage, setSelectedPackage] = useState<TourPackage | null>(null);

  const categories = ['All', 'Trending', 'Popular', 'Luxury', 'Weekend'];

  const filteredPackages = mockTourPackages.filter(p => activeCategory === 'All' || p.category === activeCategory);

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-teal-400" />
            Explore Packages
          </h1>
          <p className="text-xs text-slate-400">Curated complete tours: Stays + Transport + Activities</p>
        </div>

        <button
          onClick={() => openAiAssistant("Build a custom tour package for me")}
          className="px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-extrabold text-xs flex items-center gap-1 shrink-0 press-scale"
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Package
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`press-scale shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeCategory === cat
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tour Packages Cards List */}
      <div className="space-y-4">
        {filteredPackages.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => setSelectedPackage(pkg)}
            className="surface-card overflow-hidden cursor-pointer border border-white/10 hover:border-teal-500/40 transition-all press-scale"
          >
            {/* Image */}
            <div className="h-48 relative overflow-hidden">
              <img
                src={pkg.coverImage}
                alt={pkg.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080B10] via-black/20 to-transparent" />

              <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-xs font-bold text-teal-300 border border-white/10">
                {pkg.duration}
              </span>

              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md text-xs font-bold text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {pkg.rating} ({pkg.reviewsCount})
              </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-lg font-extrabold text-white">{pkg.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal-400" /> {pkg.destination}
                </p>
              </div>

              <p className="text-xs text-slate-300 line-clamp-2">{pkg.tagline}</p>

              {/* Package Inclusions Preview */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300 flex items-center flex-wrap gap-2">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-teal-400" /> {pkg.inclusions.hotelName.split(' ')[0]}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5 text-teal-400" /> {pkg.inclusions.transfersCount} Transfers</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5 text-teal-400" /> {pkg.inclusions.activitiesCount} Activities</span>
              </div>

              {/* Pricing & CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div>
                  <span className="font-mono text-base font-extrabold text-teal-400">
                    ₹{pkg.pricePerPerson.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400"> / person</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPackage(pkg);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 flex items-center gap-1"
                >
                  <span>View Package</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Package Detail Modal */}
      {selectedPackage && (
        <PackageDetailView
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)}
        />
      )}

    </div>
  );
};
