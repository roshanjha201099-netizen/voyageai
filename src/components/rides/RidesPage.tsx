import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  Car, ArrowLeft, Navigation, CheckCircle2, Phone, Zap
} from 'lucide-react';

interface CabOption {
  id: string;
  type: 'Economy' | 'Sedan' | 'SUV' | 'Auto' | 'Bike';
  name: string;
  capacity: string;
  etaMinutes: number;
  estimatedFare: number;
  image: string;
  description: string;
}

export const RidesPage: React.FC = () => {
  const navigate = useNavigate();
  const { openInAppNavigation, setTripView, setActiveTab, userLocationName, bookings } = useApp();
  const { currentTrip, currentItinerary } = useTrip();

  const activeDestName = currentTrip?.destination?.name || 'Kerala';

  // Extract all trip itinerary activities as drop-off choices
  const tripActivities = useMemo(() => {
    const list: Array<{ id: string; title: string; locationName: string; dayNumber: number; coordinates: [number, number] }> = [];
    if (currentItinerary?.days) {
      currentItinerary.days.forEach(day => {
        (day.activities || []).forEach(act => {
          list.push({
            id: act.id,
            title: act.title,
            locationName: act.locationName || activeDestName,
            dayNumber: day.dayNumber,
            coordinates: [act.latitude || 25.5941, act.longitude || 85.1376]
          });
        });
      });
    }
    if (list.length === 0) {
      list.push({
        id: 'default-1',
        title: 'Takht Sri Patna Sahib Sacred Heritage Visit',
        locationName: 'Harmandir Gali, Patna Sahib',
        dayNumber: 1,
        coordinates: [25.5941, 85.1376]
      });
    }
    return list;
  }, [currentItinerary, activeDestName]);

  const [selectedDestination, setSelectedDestination] = useState<string>(tripActivities[0]?.title || 'Takht Sri Patna Sahib');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('Sedan');
  const [isRideBooked, setIsRideBooked] = useState<boolean>(false);
  const [bookedDriverInfo, setBookedDriverInfo] = useState<any>(null);

  const vehicleOptions: CabOption[] = [
    {
      id: 'cab-auto',
      type: 'Auto',
      name: 'Auto Rickshaw',
      capacity: '3 Seats',
      etaMinutes: 2,
      estimatedFare: 120,
      image: '🛺',
      description: 'Quick & easy local auto for short distances'
    },
    {
      id: 'cab-bike',
      type: 'Bike',
      name: 'Rapido Bike Taxi',
      capacity: '1 Seat',
      etaMinutes: 2,
      estimatedFare: 85,
      image: '🛵',
      description: 'Fastest single rider transit through traffic'
    },
    {
      id: 'cab-economy',
      type: 'Economy',
      name: 'Economy Hatchback (WagonR / Indica)',
      capacity: '4 Seats · AC',
      etaMinutes: 4,
      estimatedFare: 260,
      image: '🚗',
      description: 'Affordable everyday rides for small groups'
    },
    {
      id: 'cab-sedan',
      type: 'Sedan',
      name: 'Sedan Comfort (Dzire / Etios)',
      capacity: '4 Seats · AC · Extra Boot',
      etaMinutes: 3,
      estimatedFare: 380,
      image: '🚘',
      description: 'Top-rated spacious sedans with experienced drivers'
    },
    {
      id: 'cab-suv',
      type: 'SUV',
      name: 'SUV Premium (Ertiga / Innova Crysta)',
      capacity: '6 Seats · AC · Heavy Luggage',
      etaMinutes: 6,
      estimatedFare: 650,
      image: '🚐',
      description: 'Spacious 6-seater for family & group outings'
    }
  ];

  const activeVehicle = vehicleOptions.find(v => v.type === selectedVehicleType) || vehicleOptions[3];
  const activeTargetActivity = tripActivities.find(a => a.title === selectedDestination) || tripActivities[0];

  const cabBookings = bookings.filter(b => b.type === 'cab');

  const handleConfirmBooking = () => {
    setIsRideBooked(true);
    setBookedDriverInfo({
      driverName: 'Rajesh Kumar',
      vehicleNo: 'BR-01-PA-8892',
      model: activeVehicle.name.split('(')[0],
      phone: '+91 98350 12345',
      otp: '4892'
    });
  };

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
          <Car className="w-3.5 h-3.5" />
          <span>{activeDestName} Rides & Cabs</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-teal-950/40 via-[#0D1117] to-[#080B11] border border-teal-500/30 shadow-2xl space-y-3 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase tracking-wider border border-teal-500/30 flex items-center gap-1">
            <Zap className="w-3 h-3 text-teal-400" />
            Instant Trip Transfers
          </span>
          <span className="text-xs text-slate-400 font-bold">• {activeDestName}</span>
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight">
          Book Rides in {activeDestName}
        </h1>
        <p className="text-xs text-slate-300 leading-relaxed">
          Book verified local cabs, autos, and bike taxis for your daily itinerary activities in {activeDestName}.
        </p>

        {/* Pickup / Drop Context Box */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0 ring-4 ring-teal-500/20" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pickup Point:</span>
              <span className="font-extrabold text-white truncate block">{userLocationName || `Hotel Stay / Trip Base in ${activeDestName}`}</span>
            </div>
          </div>

          <div className="w-full h-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 ring-4 ring-amber-500/20" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Drop Off Activity:</span>
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-teal-300 outline-none focus:border-teal-400 transition-all cursor-pointer"
              >
                {tripActivities.map(act => (
                  <option key={act.id} value={act.title}>
                    Day {act.dayNumber}: {act.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Ride Confirmation Drawer (if booked) */}
      {isRideBooked && bookedDriverInfo && (
        <div className="p-5 rounded-3xl bg-teal-950/30 border border-teal-500/50 space-y-3 shadow-2xl animate-slideUp">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
              <h3 className="font-black text-sm text-white">Ride Confirmed & Assigned!</h3>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold border border-teal-500/30">
              OTP: {bookedDriverInfo.otp}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-extrabold text-white">{bookedDriverInfo.driverName}</div>
              <div className="text-[11px] text-teal-300 font-mono font-bold mt-0.5">{bookedDriverInfo.vehicleNo}</div>
              <div className="text-[10px] text-slate-400">{bookedDriverInfo.model}</div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Calling Driver ${bookedDriverInfo.driverName}: ${bookedDriverInfo.phone}`)}
              className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Driver</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openInAppNavigation({
                title: activeTargetActivity.title,
                locationName: activeTargetActivity.locationName,
                coordinates: activeTargetActivity.coordinates
              })}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-4 h-4 text-teal-400" />
              <span>Track Live Route</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRideBooked(false)}
              className="px-4 py-2.5 bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Vehicle Options Selector */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
          <Car className="w-4 h-4" />
          Choose Vehicle Option
        </h2>

        <div className="space-y-2.5">
          {vehicleOptions.map((v) => {
            const isSelected = selectedVehicleType === v.type;
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicleType(v.type)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-teal-400 shadow-xl shadow-teal-500/10 ring-1 ring-teal-400'
                    : 'bg-[#0D1117] border-white/10 hover:border-teal-500/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-3xl shrink-0">{v.image}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-white truncate">{v.name}</h3>
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20 shrink-0">
                        ~{v.etaMinutes} min away
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{v.description}</p>
                    <span className="text-[10px] text-slate-500 font-mono font-bold block mt-0.5">{v.capacity}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-black font-mono text-teal-300">₹{v.estimatedFare}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Est. Fare</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ride Booking Action */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleConfirmBooking}
          className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/20 transition-all flex items-center justify-center gap-2 press-scale"
        >
          <Car className="w-5 h-5" />
          <span>Book {activeVehicle.name.split('(')[0]} Now (₹{activeVehicle.estimatedFare})</span>
        </button>
      </div>

      {/* Existing Cab Bookings */}
      {cabBookings.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
            Trip Cab Bookings History ({cabBookings.length})
          </h2>

          <div className="space-y-2">
            {cabBookings.map((b) => (
              <div key={b.id} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-white">{b.title}</div>
                  <div className="text-[11px] text-slate-400">{b.dateTime} · Ref: {b.confirmationCode}</div>
                </div>
                <span className="text-sm font-black font-mono text-teal-300">₹{b.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
