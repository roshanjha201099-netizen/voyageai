import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { X, Car } from 'lucide-react';
import { mockCabOptions } from '../../data/mockData';
import confetti from 'canvas-confetti';

export const CabBookingModal: React.FC = () => {
  const { isCabModalOpen, setIsCabModalOpen, cabDestination, addBooking } = useApp();
  const { addTransport, addExpense: addTripExpense } = useTrip();
  const [selectedCabId, setSelectedCabId] = useState<string>('cab-sedan');
  const [pickupLoc, setPickupLoc] = useState<string>('Current Location');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  if (!isCabModalOpen) return null;

  const cab = mockCabOptions.find(c => c.id === selectedCabId) || mockCabOptions[0];

  const handleBookCab = async () => {
    setIsProcessing(true);
    try {
      await addTransport({
        transportType: 'CAB',
        providerName: cab.name,
        pickupLocation: pickupLoc,
        dropoffLocation: cabDestination,
        pickupTime: 'Immediate',
        estimatedFare: cab.estimatedFare,
        status: 'SELECTED',
      });

      await addTripExpense({
        title: `Cab Ride to ${cabDestination}`,
        amount: cab.estimatedFare,
        category: 'Transport',
        paidBy: 'Me',
        isSplit: true,
      });
    } catch (err) {
      console.warn('Transport persistence error:', err);
    }

    setIsProcessing(false);
    setIsConfirmed(true);
    confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });

    addBooking({
      id: `bk-cab-${Date.now()}`,
      type: 'cab',
      title: `Cab Ride to ${cabDestination}`,
      status: 'in-transit',
      dateTime: 'Now (Dispatching)',
      location: `Pickup: ${pickupLoc}`,
      confirmationCode: `CAB-GOA-${Math.floor(100 + Math.random() * 900)}`,
      amount: cab.estimatedFare,
      paymentStatus: 'paid',
      details: {
        'Vehicle': cab.name,
        'ETA': `${cab.etaMinutes} mins`,
        'Driver': 'Rajesh Kumar (+91 98765 43210)'
      },
      image: cab.image
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg glass-panel bg-[#0B111E] border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative">
        
        <button 
          onClick={() => { setIsCabModalOpen(false); setIsConfirmed(false); }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {!isConfirmed ? (
          <>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white">Book Local Cab</h3>
                <p className="text-xs text-slate-400">Integrated directly with your Goa itinerary</p>
              </div>
            </div>

            {/* Route Inputs */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Pickup Location</label>
                <input 
                  type="text" 
                  value={pickupLoc}
                  onChange={(e) => setPickupLoc(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium">Drop Destination</label>
                <input 
                  type="text" 
                  value={cabDestination}
                  readOnly
                  className="w-full glass-input rounded-xl px-3 py-2 text-teal-300 font-semibold mt-1 bg-slate-900/80"
                />
              </div>
            </div>

            {/* Vehicle Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Ride Class</label>
              {mockCabOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setSelectedCabId(opt.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedCabId === opt.id
                      ? 'bg-teal-500/15 border-teal-500/50 shadow-md shadow-teal-500/5'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={opt.image} alt={opt.name} className="w-12 h-10 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-bold text-xs text-white">{opt.name}</h4>
                      <p className="text-[11px] text-slate-400">ETA: {opt.etaMinutes} mins • {opt.capacity}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-teal-400 text-sm">₹{opt.estimatedFare}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleBookCab}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Dispatching Ride Request...' : `Book Ride Now (₹${cab.estimatedFare})`}
            </button>
          </>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center mx-auto animate-bounce">
              <Car className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Ride Dispatched!</h3>
            <p className="text-xs text-slate-300">
              Driver <span className="font-bold text-teal-300">Rajesh Kumar</span> (GA-03-Z-8821) is 4 mins away.
            </p>
            <button
              onClick={() => { setIsCabModalOpen(false); setIsConfirmed(false); }}
              className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
