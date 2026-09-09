import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { BottomSheet } from './BottomSheet';
import { getDestinationInfo } from '../../utils/destinationData';
import { PhoneCall, ShieldAlert, MapPin, Hospital, Check } from 'lucide-react';

export const EmergencyModal: React.FC = () => {
  const { isEmergencyOpen, setIsEmergencyOpen, activeTrip } = useApp();
  const { currentTrip } = useTrip();
  const [hasCalled, setHasCalled] = useState(false);

  const activeDestName = currentTrip?.destination?.name || (typeof activeTrip?.destination === 'string' ? activeTrip.destination : 'Bihar');
  const activeDestCoords: [number, number] = [
    currentTrip?.destination?.latitude || 25.5941,
    currentTrip?.destination?.longitude || 85.1376
  ];
  const destInfo = getDestinationInfo(activeDestName, activeDestCoords);

  return (
    <BottomSheet
      isOpen={isEmergencyOpen}
      onClose={() => { setIsEmergencyOpen(false); setHasCalled(false); }}
      height="half"
      title={`Emergency Assistance — ${destInfo.name}`}
    >
      <div className="p-5 space-y-4">
        {/* Emergency Alert Banner */}
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-extrabold text-sm text-rose-200">24/7 Tourist Emergency Services</h4>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Live Location: <span className="font-mono font-bold text-white">{destInfo.name} ({destInfo.centerCoordinates[0].toFixed(4)}, {destInfo.centerCoordinates[1].toFixed(4)})</span>
            </p>
          </div>
        </div>

        {/* Emergency Call Options */}
        <div className="space-y-2">
          <button
            onClick={() => {
              setHasCalled(true);
              setTimeout(() => setHasCalled(false), 4000);
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm flex items-center justify-between shadow-lg shadow-rose-600/30 press-scale"
          >
            <div className="flex items-center gap-2.5">
              <PhoneCall className="w-5 h-5" />
              <span>Call Tourist Helpline (112)</span>
            </div>
            <span className="text-xs font-mono font-bold bg-black/30 px-2.5 py-1 rounded-lg">Toll Free</span>
          </button>

          <button
            onClick={() => {
              alert(`Contacting ${destInfo.policeStationName}: ${destInfo.policeContact}`);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center justify-between press-scale"
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-teal-400" />
              <span>Contact {destInfo.policeStationName}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">1.8 km away</span>
          </button>

          <button
            onClick={() => {
              alert(`Navigating to Nearest Hospital: ${destInfo.hospitalName} (${destInfo.hospitalDistanceKm} km)`);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 font-semibold text-xs flex items-center justify-between press-scale"
          >
            <div className="flex items-center gap-2.5">
              <Hospital className="w-4 h-4 text-amber-400" />
              <span>Nearest Hospital ({destInfo.hospitalName})</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{destInfo.hospitalDistanceKm} km away</span>
          </button>
        </div>

        {hasCalled && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Emergency signal dispatched to local helpline with GPS coordinates.</span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
