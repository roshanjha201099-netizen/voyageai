/**
 * VoyageAI — Unified Map Category Taxonomy & Visual Styles
 * 
 * Single source of truth for map category definitions, pill labels, icons, 
 * marker color schemes, and fallback images.
 */

export interface CategoryStyle {
  id: string;
  label: string;
  emoji: string;
  bg: string;
  text: string;
  ring: string;
  dot: string;
  shadow: string;
  coverImage: string;
}

export const MAP_CATEGORY_CONFIG: Record<string, CategoryStyle> = {
  food: {
    id: 'food',
    label: 'Food & Cafes',
    emoji: '🍽️',
    bg: 'rgba(245, 158, 11, 0.25)',
    text: '#fbbf24',
    ring: 'rgba(245, 158, 11, 0.6)',
    dot: '#fbbf24',
    shadow: '0 0 12px rgba(245, 158, 11, 0.5)',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
  },
  sights: {
    id: 'sights',
    label: 'Sights & Landmarks',
    emoji: '🏰',
    bg: 'rgba(16, 185, 129, 0.25)',
    text: '#34d399',
    ring: 'rgba(16, 185, 129, 0.6)',
    dot: '#34d399',
    shadow: '0 0 12px rgba(16, 185, 129, 0.5)',
    coverImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80',
  },
  culture: {
    id: 'culture',
    label: 'Culture & Heritage',
    emoji: '🏛️',
    bg: 'rgba(99, 102, 241, 0.25)',
    text: '#818cf8',
    ring: 'rgba(99, 102, 241, 0.6)',
    dot: '#818cf8',
    shadow: '0 0 12px rgba(99, 102, 241, 0.5)',
    coverImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80',
  },
  hotels: {
    id: 'hotels',
    label: 'Stays',
    emoji: '🏨',
    bg: 'rgba(236, 72, 153, 0.25)',
    text: '#f472b6',
    ring: 'rgba(236, 72, 153, 0.6)',
    dot: '#f472b6',
    shadow: '0 0 12px rgba(236, 72, 153, 0.5)',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
  },
  experiences: {
    id: 'experiences',
    label: 'Experiences',
    emoji: '🎯',
    bg: 'rgba(168, 85, 247, 0.25)',
    text: '#c084fc',
    ring: 'rgba(168, 85, 247, 0.6)',
    dot: '#c084fc',
    shadow: '0 0 12px rgba(168, 85, 247, 0.5)',
    coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
  },
  all: {
    id: 'all',
    label: 'All Places',
    emoji: '🗺️',
    bg: 'rgba(20, 184, 166, 0.25)',
    text: '#2dd4bf',
    ring: 'rgba(20, 184, 166, 0.6)',
    dot: '#2dd4bf',
    shadow: '0 0 12px rgba(20, 184, 166, 0.5)',
    coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
  }
};

/**
 * Returns canonical category config object based on category string.
 */
export const getCategoryConfig = (category: string): CategoryStyle => {
  const cat = (category || 'all').toLowerCase();
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('cafe') || cat.includes('dhaba')) return MAP_CATEGORY_CONFIG.food;
  if (cat.includes('hotel') || cat.includes('stay') || cat.includes('resort') || cat.includes('lodging')) return MAP_CATEGORY_CONFIG.hotels;
  if (cat.includes('culture') || cat.includes('temple') || cat.includes('historic') || cat.includes('monument')) return MAP_CATEGORY_CONFIG.culture;
  if (cat.includes('sight') || cat.includes('fort') || cat.includes('attraction')) return MAP_CATEGORY_CONFIG.sights;
  if (cat.includes('experience') || cat.includes('activity')) return MAP_CATEGORY_CONFIG.experiences;
  return MAP_CATEGORY_CONFIG.all;
};

/**
 * Returns high-quality cover photo URL based on category.
 */
export const getPlaceImage = (category: string, _name?: string): string => {
  const cfg = getCategoryConfig(category);
  return cfg.coverImage;
};
