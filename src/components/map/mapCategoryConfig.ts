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
    bg: '#FFFFFF',
    text: '#B5762A',
    ring: '#D9A15A',
    dot: '#B5762A',
    shadow: '0 2px 10px rgba(15, 23, 42, 0.18)',
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
  },
  sights: {
    id: 'sights',
    label: 'Sights & Landmarks',
    emoji: '🏰',
    bg: '#FFFFFF',
    text: '#A9663F',
    ring: '#C68B63',
    dot: '#A9663F',
    shadow: '0 2px 10px rgba(15, 23, 42, 0.18)',
    coverImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80',
  },
  culture: {
    id: 'culture',
    label: 'Culture & Heritage',
    emoji: '🏛️',
    bg: '#FFFFFF',
    text: '#7C6A9C',
    ring: '#A797BE',
    dot: '#7C6A9C',
    shadow: '0 2px 10px rgba(15, 23, 42, 0.18)',
    coverImage: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80',
  },
  hotels: {
    id: 'hotels',
    label: 'Stays',
    emoji: '🏨',
    bg: '#FFFFFF',
    text: '#5C6B8C',
    ring: '#8C99B5',
    dot: '#5C6B8C',
    shadow: '0 2px 10px rgba(15, 23, 42, 0.18)',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
  },
  experiences: {
    id: 'experiences',
    label: 'Experiences',
    emoji: '🎯',
    bg: '#FFFFFF',
    text: '#4F8272',
    ring: '#82AC9E',
    dot: '#4F8272',
    shadow: '0 2px 10px rgba(15, 23, 42, 0.18)',
    coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
  },
  all: {
    id: 'all',
    label: 'All Places',
    emoji: '🗺️',
    bg: '#FFFFFF',
    text: '#1F5A3F',
    ring: '#1F5A3F',
    dot: '#1F5A3F',
    shadow: '0 2px 10px rgba(15, 23, 42, 0.18)',
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
