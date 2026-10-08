import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Sparkles, Check, Loader2, MapPin } from 'lucide-react';
import { sanitizeLocationName } from '../../utils/locationSanitizer';

export interface AddToItineraryPayload {
  trip_id: string;
  destination: string;
  item_id: string;
  title: string;
  location: string;
  tag: string;
  price: string;
  day_number: number;
  time_slot: string;
}

interface AddToItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: {
    id: string;
    title: string;
    category?: string;
    location?: string;
    tag?: string;
    cost?: number;
    price_approx?: string;
    duration?: string;
  } | null;
  currentTrip: any;
  onConfirm: (payload: AddToItineraryPayload) => Promise<void>;
}

function getDestinationName(dest: any): string {
  if (!dest) return '';
  if (typeof dest === 'string') return dest;
  return dest.displayName || dest.name || dest.city || '';
}

export const AddToItineraryModal: React.FC<AddToItineraryModalProps> = ({
  isOpen,
  onClose,
  place,
  currentTrip,
  onConfirm,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<string>('Morning (09:00 AM)');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDay(1);
      setSelectedSlot('Morning (09:00 AM)');
      setIsSubmitting(false);
      setShowToast(false);
    }
  }, [isOpen]);

  if (!isOpen || !place) return null;

  const totalDays = currentTrip?.totalDays || currentTrip?.itinerary?.length || 5;
  const dayOptions = Array.from({ length: Math.max(totalDays, 3) }, (_, i) => i + 1);

  const timeSlots = [
    { label: 'Morning', time: '09:00 AM' },
    { label: 'Afternoon', time: '02:00 PM' },
    { label: 'Evening', time: '06:00 PM' },
    { label: 'Night', time: '09:00 PM' },
  ];

  const tripDestName = getDestinationName(currentTrip?.destination);

  const sanitizedLocation = sanitizeLocationName(
    place.location || tripDestName || 'Local Area'
  );

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const destinationName = tripDestName || sanitizedLocation;

    const payload: AddToItineraryPayload = {
      trip_id: currentTrip?.id || 'active_trip',
      destination: destinationName,
      item_id: place.id,
      title: place.title,
      location: sanitizedLocation,
      tag: place.tag || place.category || 'Activity',
      price: place.cost ? `₹${place.cost}` : place.price_approx || 'Free Entry',
      day_number: selectedDay,
      time_slot: selectedSlot,
    };

    try {
      await onConfirm(payload);
      setShowToast(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.warn('[ADD TO ITINERARY MODAL] Confirmation failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      
      {/* Toast Banner on Success */}
      {showToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[10000] px-4 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-2xl animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" /> Added to Day {selectedDay} Itinerary!
        </div>
      )}

      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900/95 border border-white/10 backdrop-blur-2xl p-6 shadow-2xl space-y-5 animate-slideUp text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="space-y-1 max-w-[85%]">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                {place.tag || place.category || 'Activity'}
              </span>
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> {place.duration || '1.5 hours'}
              </span>
            </div>

            <h3 className="text-lg font-black text-white leading-tight">
              {place.title}
            </h3>

            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{sanitizedLocation}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all press-scale"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Trip Indicator */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Target Trip:</span>
          <span className="font-extrabold text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            {tripDestName || 'Active Discovery Trip'}
          </span>
        </div>

        {/* 1. Day Selector */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Select Day:
          </label>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {dayOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`press-scale shrink-0 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all border ${
                  selectedDay === d
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-800/80 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                Day {d}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Time Slot Selector */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Preferred Time Slot:
          </label>

          <div className="grid grid-cols-2 gap-2">
            {timeSlots.map((slot) => {
              const fullLabel = `${slot.label} (${slot.time})`;
              const isSelected = selectedSlot === fullLabel;

              return (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => setSelectedSlot(fullLabel)}
                  className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-extrabold">{slot.label}</div>
                    <div className="text-[10px] opacity-75">{slot.time}</div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm Action CTA Button */}
        <div className="pt-2">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all press-scale disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Adding to Day {selectedDay}...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" /> Confirm & Add to Day {selectedDay}
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
