import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  UtensilsCrossed, ArrowLeft, Star, MapPin, Sparkles, Car, Navigation,
  Flame, Compass, RefreshCw
} from 'lucide-react';
import { wsClient } from '../../services/wsClient';

interface FoodItem {
  id: string;
  name: string;
  category: string;
  price: string;
  rating: number;
  isVeg: boolean;
  image: string;
  description: string;
}

const DESTINATION_FOOD_ITEMS: Record<string, FoodItem[]> = {
  'Kerala': [
    { id: 'k1', name: 'Kerala Sadya Feast', category: 'Traditional', price: '₹350', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=800&q=80', description: 'Elaborate 24-course traditional banana leaf banquet with Avial, Sambhar, Thoran & Payasam.' },
    { id: 'k2', name: 'Appam with Coconut Stew', category: 'Breakfast', price: '₹180', rating: 4.8, isVeg: true, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', description: 'Soft fluffy fermented rice pancakes with fragrant creamy coconut vegetable stew.' },
    { id: 'k3', name: 'Malabar Fish Curry', category: 'Seafood', price: '₹420', rating: 4.9, isVeg: false, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', description: 'Fresh king fish cooked in spicy red chili tamarind coconut gravy.' },
    { id: 'k4', name: 'Karimeen Pollichathu', category: 'Seafood Special', price: '₹550', rating: 4.9, isVeg: false, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', description: 'Pearl spot fish marinated in aromatic Kerala spices and slow-roasted inside a banana leaf.' },
    { id: 'k5', name: 'Kerala Parotta & Roast', category: 'Street Special', price: '₹260', rating: 4.8, isVeg: false, image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', description: 'Flaky layered Malabar parottas served with spicy caramelised onion roast curry.' }
  ],
  'Bihar': [
    { id: 'b1', name: 'Special Litti Chokha', category: 'Heritage', price: '₹120', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', description: 'Traditional wheat balls stuffed with spiced sattu, dipped in desi ghee & served with brinjal-potato chokha.' },
    { id: 'b2', name: 'Champaran Ahuna Curry', category: 'Local Special', price: '₹480', rating: 4.9, isVeg: false, image: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80', description: 'Slow cooked in sealed clay handi with whole garlic cloves and mustard oil over wood coals.' },
    { id: 'b3', name: 'Patna Sweet Khaja', category: 'Sweets', price: '₹150', rating: 4.8, isVeg: true, image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80', description: 'Crispy multi-layered golden deep-fried pastry soaked in sugar syrup.' },
    { id: 'b4', name: 'Sattu Paratha & Chutney', category: 'Breakfast', price: '₹90', rating: 4.7, isVeg: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', description: 'Protein-packed roasted gram flour stuffed flatbread with spicy garlic coriander chutney.' }
  ],
  'Patna': [
    { id: 'b1', name: 'Special Litti Chokha', category: 'Heritage', price: '₹120', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', description: 'Traditional wheat balls stuffed with spiced sattu, dipped in desi ghee & served with brinjal-potato chokha.' },
    { id: 'b2', name: 'Champaran Ahuna Curry', category: 'Local Special', price: '₹480', rating: 4.9, isVeg: false, image: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80', description: 'Slow cooked in sealed clay handi with whole garlic cloves and mustard oil over wood coals.' },
    { id: 'b3', name: 'Patna Sweet Khaja', category: 'Sweets', price: '₹150', rating: 4.8, isVeg: true, image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80', description: 'Crispy multi-layered golden deep-fried pastry soaked in sugar syrup.' }
  ],
  'Goa': [
    { id: 'g1', name: 'Goan Fish Curry Rice', category: 'Classic', price: '₹320', rating: 4.9, isVeg: false, image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', description: 'Tangy coconut kokum curry served with steamed red rice and fried pomfret.' },
    { id: 'g2', name: 'Pork Vindaloo', category: 'Portuguese Fusion', price: '₹420', rating: 4.8, isVeg: false, image: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=800&q=80', description: 'Spicy marinated meat slow cooked in palm vinegar and red Kashmiri chilies.' },
    { id: 'g3', name: 'Bebinca Dessert', category: 'Sweets', price: '₹220', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80', description: 'Traditional 7-layered Goan coconut milk pudding baked layer by layer.' }
  ]
};

export const FoodPage: React.FC = () => {
  const navigate = useNavigate();
  const { openCabModal, openAiAssistant, openInAppNavigation, setTripView, setActiveTab, userLocationName } = useApp();
  const { currentTrip } = useTrip();

  const activeDestName = currentTrip?.destination?.name || 'Kerala';
  const destFoodItems = DESTINATION_FOOD_ITEMS[activeDestName] || DESTINATION_FOOD_ITEMS['Kerala'];

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState<boolean>(true);
  const [filterVegOnly, setFilterVegOnly] = useState<boolean>(false);

  // Fetch real nearby dining spots via WebSocket
  useEffect(() => {
    let isMounted = true;
    const fetchDining = async () => {
      setIsLoadingRestaurants(true);
      try {
        const data = await wsClient.sendRequest('places:nearby', { query: activeDestName, category: 'restaurant' });
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setNearbyRestaurants(data);
        }
      } catch (err) {
        console.warn('Failed to fetch nearby restaurants over WebSocket:', err);
      } finally {
        if (isMounted) setIsLoadingRestaurants(false);
      }
    };

    fetchDining();
    return () => { isMounted = false; };
  }, [activeDestName]);

  const categories = ['All', 'Popular Regional', 'Street Food', 'Sweets', 'Fine Dining'];

  const filteredDishes = destFoodItems.filter(dish => {
    if (filterVegOnly && !dish.isVeg) return false;
    if (activeCategory === 'All') return true;
    return dish.category.toLowerCase().includes(activeCategory.toLowerCase()) || activeCategory === 'Popular Regional';
  });

  return (
    <div className="space-y-6 pb-28 max-w-xl mx-auto animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            setTripView('home');
            setActiveTab('trips');
            navigate('/');
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-black flex items-center gap-1.5 border border-white/10 transition-all press-scale"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trip</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold">
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>{activeDestName} Food Guide</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-amber-950/40 via-[#0D1117] to-[#080B11] border border-amber-500/30 shadow-2xl space-y-3 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30 flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-400" />
            Popular Dining & Local Dishes
          </span>
          <span className="text-xs text-slate-400 font-bold">• {userLocationName || activeDestName}</span>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          What to Eat in {activeDestName}
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed">
          Discover authentic culinary specialties, famous street food, and top-rated restaurants curated specifically for your {activeDestName} journey.
        </p>

        {/* Veg Only Toggle */}
        <div className="pt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterVegOnly(!filterVegOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all border ${
                filterVegOnly
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                  : 'bg-slate-900 text-slate-300 border-white/10 hover:border-emerald-500/50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-600" />
              <span>Pure Veg Only</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openAiAssistant(`Recommend top 3 must-try food dishes and best places to eat in ${activeDestName}`)}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 press-scale"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Food Recommender</span>
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`press-scale shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-md transition-all border ${
              activeCategory === cat
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-900/90 text-slate-300 border-white/10 hover:border-amber-500/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section 1: Must-Try Authentic Regional Dishes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4" />
            Famous Dishes of {activeDestName}
          </h2>
          <span className="text-xs text-slate-400 font-mono">{filteredDishes.length} Items</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className="p-3.5 rounded-2xl bg-[#0D1117] border border-white/10 hover:border-amber-500/40 transition-all flex gap-3.5 shadow-lg group"
            >
              <img
                src={dish.image}
                alt={dish.name}
                className="w-24 h-24 rounded-xl object-cover shrink-0 border border-white/10 group-hover:scale-105 transition-all"
              />

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dish.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <h3 className="font-extrabold text-sm text-white truncate">{dish.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{dish.category}</span>
                  </div>

                  <span className="text-sm font-black font-mono text-teal-300 shrink-0">{dish.price}</span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{dish.description}</p>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-amber-400 font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{dish.rating}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openAiAssistant(`Tell me where to get authentic ${dish.name} in ${activeDestName}`)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-bold border border-white/10 transition-all flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-teal-400" />
                      <span>Ask AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCabModal(`Best ${dish.name} Spot in ${activeDestName}`)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black shadow transition-all flex items-center gap-1"
                    >
                      <Car className="w-3 h-3" />
                      <span>Ride Here</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Popular Nearby Restaurants */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
            <Compass className="w-4 h-4" />
            Top Restaurants Near You
          </h2>
          <span className="text-xs text-slate-400 font-mono">Live Places</span>
        </div>

        {isLoadingRestaurants ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-white/10 space-y-2">
            <RefreshCw className="w-6 h-6 text-teal-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-bold">Finding top restaurants in {activeDestName}...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearbyRestaurants.slice(0, 6).map((rst, idx) => (
              <div
                key={rst.id || idx}
                className="p-4 rounded-2xl bg-[#0D1117] border border-teal-500/30 hover:border-teal-400 transition-all space-y-2.5 shadow-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{rst.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="truncate">{rst.location || activeDestName}</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-black flex items-center gap-1 border border-amber-500/30">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {rst.rating || 4.8}
                    </span>
                    <span className="text-[10px] text-teal-300 font-mono font-bold block mt-1">{rst.priceRange || '₹₹'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-300 font-semibold">
                  {(rst.cuisine || ['Regional Special', 'North Indian']).map((c: string) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/10">
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => openInAppNavigation({
                      title: rst.name,
                      locationName: rst.location || activeDestName,
                      coordinates: rst.coordinates || [25.5941, 85.1376]
                    })}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold flex items-center gap-1 border border-white/10 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5 text-teal-400" />
                    <span>Navigate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCabModal(rst.name)}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow transition-all flex items-center gap-1.5 press-scale"
                  >
                    <Car className="w-3.5 h-3.5" />
                    <span>Book Ride Here</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
