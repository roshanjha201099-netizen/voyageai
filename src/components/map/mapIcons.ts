import L from 'leaflet';
import { getCategoryConfig } from './mapCategoryConfig';

// Module-level icon memoization cache
const iconCache = new Map<string, L.DivIcon>();

/**
 * Creates ultra-premium futuristic DivIcon for User Live Location with pulsating radar ring.
 * Uses module-level memoization to avoid re-constructing DivIcons.
 */
export const createUserLocationIcon = (): L.DivIcon => {
  const cacheKey = 'user-location-radar';
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const icon = L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
        <div class="user-radar-ring"></div>
        <div style="width: 18px; height: 18px; border-radius: 50%; background: #10b981; border: 3px solid #022c22; box-shadow: 0 0 16px #10b981, 0 0 4px #ffffff;"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  iconCache.set(cacheKey, icon);
  return icon;
};

/**
 * Creates glowing DivIcon for POI Landmarks with category-specific color schemes & dynamic badges.
 * Reads color schemes directly from mapCategoryConfig.ts and memoizes instances by key `${config.id}-${isSelected}`.
 */
export const createCrazyPoiIcon = (category: string, isSelected: boolean): L.DivIcon => {
  const config = getCategoryConfig(category);
  const cacheKey = `${config.id}-${isSelected ? 'selected' : 'normal'}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const transform = isSelected ? 'transform: scale(1.3); z-index: 999;' : '';
  const dotBg = isSelected ? '#FFFFFF' : config.dot;

  const icon = L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div class="poi-marker-glow" style="${transform} display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 14px; background: ${config.bg}; border: 1.5px solid ${config.ring}; backdrop-filter: blur(12px); box-shadow: ${config.shadow}; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dotBg}; box-shadow: 0 0 6px ${dotBg};"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  iconCache.set(cacheKey, icon);
  return icon;
};

/**
 * Creates glowing DivIcon for POI Clusters when >20 markers are in view.
 * Memoizes icon instances by count key.
 */
export const createClusterIcon = (count: number): L.DivIcon => {
  const cacheKey = `cluster-${count}`;
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }

  const icon = L.divIcon({
    className: 'custom-cluster-marker',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; background: rgba(15, 23, 42, 0.9); border: 2px solid #10b981; backdrop-filter: blur(12px); color: #34d399; font-weight: 800; font-size: 13px; box-shadow: 0 0 16px rgba(16, 185, 129, 0.6), 0 4px 12px rgba(0,0,0,0.5);">
        ${count}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });

  iconCache.set(cacheKey, icon);
  return icon;
};
