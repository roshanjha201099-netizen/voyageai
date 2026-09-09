import React from 'react';
import { Hotel as HotelIcon, Car, Compass, Utensils } from 'lucide-react';

interface InclusionsProps {
  hotelName: string;
  hotelNights?: number;
  transfers: string;
  activitiesCount: number;
  diningCount: number;
  onItemClick?: (type: string) => void;
}

export const PackageInclusions: React.FC<InclusionsProps> = ({
  hotelName,
  hotelNights = 3,
  transfers,
  activitiesCount,
  diningCount,
  onItemClick,
}) => {
  const items = [
    {
      type: 'hotel',
      icon: HotelIcon,
      title: 'Resort Stay',
      subtitle: `${hotelName} (${hotelNights} Nights)`,
      color: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      borderColor: 'border-teal-500/20',
    },
    {
      type: 'transport',
      icon: Car,
      title: 'Transfers',
      subtitle: transfers,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
    },
    {
      type: 'activities',
      icon: Compass,
      title: 'Curated Experiences',
      subtitle: `${activitiesCount} Activities & Fort Visits`,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    {
      type: 'dining',
      icon: Utensils,
      title: 'Dining Highlights',
      subtitle: `${diningCount} Curated Restaurants`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-section font-bold text-white">Your Trip Includes</h3>
        <span className="text-micro text-teal-400 font-semibold uppercase tracking-wider">All-in-one package</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div
            key={item.title}
            onClick={() => onItemClick && onItemClick(item.type)}
            className={`p-3.5 rounded-2xl bg-[#11161F] border ${item.borderColor} hover:bg-[#171D27] transition-all cursor-pointer flex items-center gap-3`}
          >
            <div className={`p-2.5 rounded-xl ${item.bgColor} ${item.color} shrink-0`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-white">{item.title}</h4>
              <p className="text-xs text-slate-400 truncate mt-0.5">{item.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
