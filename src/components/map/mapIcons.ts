import L from 'leaflet';

/**
 * Creates ultra-premium futuristic DivIcon for User Live Location with pulsating radar ring.
 */
export const createUserLocationIcon = () => {
  return L.divIcon({
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
};

/**
 * Creates glowing DivIcon for POI Landmarks with category-specific color schemes & dynamic badges.
 */
export const createCrazyPoiIcon = (category: string, isSelected: boolean) => {
  const cat = (category || 'default').toLowerCase();

  const colorMap: Record<string, { bg: string; text: string; ring: string; dot: string; shadow: string }> = {
    food: {
      bg: 'rgba(245, 158, 11, 0.25)',
      text: '#fbbf24',
      ring: 'rgba(245, 158, 11, 0.6)',
      dot: '#fbbf24',
      shadow: '0 0 12px rgba(245, 158, 11, 0.5)'
    },
    sights: {
      bg: 'rgba(16, 185, 129, 0.25)',
      text: '#34d399',
      ring: 'rgba(16, 185, 129, 0.6)',
      dot: '#34d399',
      shadow: '0 0 12px rgba(16, 185, 129, 0.5)'
    },
    culture: {
      bg: 'rgba(99, 102, 241, 0.25)',
      text: '#818cf8',
      ring: 'rgba(99, 102, 241, 0.6)',
      dot: '#818cf8',
      shadow: '0 0 12px rgba(99, 102, 241, 0.5)'
    },
    hotels: {
      bg: 'rgba(236, 72, 153, 0.25)',
      text: '#f472b6',
      ring: 'rgba(236, 72, 153, 0.6)',
      dot: '#f472b6',
      shadow: '0 0 12px rgba(236, 72, 153, 0.5)'
    },
    experiences: {
      bg: 'rgba(168, 85, 247, 0.25)',
      text: '#c084fc',
      ring: 'rgba(168, 85, 247, 0.6)',
      dot: '#c084fc',
      shadow: '0 0 12px rgba(168, 85, 247, 0.5)'
    },
    default: {
      bg: 'rgba(20, 184, 166, 0.25)',
      text: '#2dd4bf',
      ring: 'rgba(20, 184, 166, 0.6)',
      dot: '#2dd4bf',
      shadow: '0 0 12px rgba(20, 184, 166, 0.5)'
    },
  };

  const scheme = colorMap[cat] || colorMap.default;
  const transform = isSelected ? 'transform: scale(1.3); z-index: 999;' : '';
  const dotBg = isSelected ? '#FFFFFF' : scheme.dot;

  return L.divIcon({
    className: 'custom-poi-marker',
    html: `
      <div class="poi-marker-glow" style="${transform} display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 14px; background: ${scheme.bg}; border: 1.5px solid ${scheme.ring}; backdrop-filter: blur(12px); box-shadow: ${scheme.shadow}; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dotBg}; box-shadow: 0 0 6px ${dotBg};"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};
