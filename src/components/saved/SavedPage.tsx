import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Heart, MapPin, Compass } from 'lucide-react';
import { mockDestinations } from '../../data/mockData';

export const SavedPage: React.FC = () => {
  const { userProfile, openAiAssistant } = useApp();
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Trending', 'Popular', 'Hidden Gems', 'Weekend', 'Budget', 'Luxury'];
  const filtered = mockDestinations.filter(d => activeCategory === 'All' || d.category === activeCategory);

  return (
    <div className="space-y-8 pb-24">

      <div className="pt-2">
        <h1 className="text-screen-title text-white">Saved</h1>
        <p className="text-meta mt-1">Places you love and destinations to discover</p>
      </div>

      {/* ── Saved Places ── */}
      {userProfile.savedPlaces.length > 0 && (
        <section>
          <h2 className="text-section text-white mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-400" /> My places
          </h2>
          <div className="space-y-1">
            {userProfile.savedPlaces.map((place, idx) => (
              <button
                key={idx}
                onClick={() => openAiAssistant(`Tell me about ${place}`)}
                className="w-full press-scale flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-slate-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-body text-slate-200">{place}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Discover ── */}
      <section>
        <h2 className="text-section text-white mb-3 flex items-center gap-2">
          <Compass className="w-4 h-4 text-teal-400" /> Discover
        </h2>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 -mx-1 px-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`press-scale shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-all ${
                activeCategory === c
                  ? 'bg-teal-500 text-slate-950 font-semibold'
                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(dest => (
            <button
              key={dest.id}
              onClick={() => openAiAssistant(`Plan a trip to ${dest.name}`)}
              className="w-full press-scale surface-card overflow-hidden text-left group"
            >
              <div className="flex gap-3 p-3">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0 py-0.5">
                  <h3 className="text-body font-semibold text-white group-hover:text-teal-300 transition-colors">{dest.name}</h3>
                  <p className="text-meta text-[12px] mt-0.5">{dest.stateCountry}</p>
                  <p className="text-micro mt-1">{dest.estimatedBudget} · {dest.recommendedDuration}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="py-12 text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-body text-slate-300">No destinations in this category</p>
            <button
              onClick={() => setActiveCategory('All')}
              className="text-teal-400 font-medium text-sm"
            >
              View all destinations
            </button>
          </div>
        )}
      </section>

    </div>
  );
};
