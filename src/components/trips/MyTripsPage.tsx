import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../../features/trip/TripContext';
import {
  Calendar, MapPin, Plus, AlertTriangle, Archive, Trash2, ArrowRight
} from 'lucide-react';

export const MyTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const { trips, currentTrip, setCurrentTripId, deleteTrip, cancelTrip, archiveTrip } = useTrip();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'ARCHIVED'>('ACTIVE');

  // Deletion / Cancellation Bottom Sheet Confirmation
  const [confirmActionModal, setConfirmActionModal] = useState<{
    isOpen: boolean;
    tripId: string;
    tripTitle: string;
    actionType: 'DELETE' | 'CANCEL' | 'ARCHIVE';
  }>({
    isOpen: false,
    tripId: '',
    tripTitle: '',
    actionType: 'DELETE',
  });

  const filteredTrips = trips.filter(trip => {
    if (activeTab === 'ACTIVE') return trip.status === 'ACTIVE' || trip.status === 'PLANNING';
    if (activeTab === 'UPCOMING') return trip.status === 'UPCOMING';
    if (activeTab === 'COMPLETED') return trip.status === 'COMPLETED';
    if (activeTab === 'ARCHIVED') return trip.status === 'ARCHIVED' || trip.status === 'CANCELLED';
    return true;
  });

  const handleConfirmAction = async () => {
    const { tripId, actionType } = confirmActionModal;
    if (actionType === 'DELETE') await deleteTrip(tripId);
    else if (actionType === 'CANCEL') await cancelTrip(tripId);
    else if (actionType === 'ARCHIVE') await archiveTrip(tripId);

    setConfirmActionModal({ isOpen: false, tripId: '', tripTitle: '', actionType: 'DELETE' });
  };

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">

      {/* Confirmation Bottom Sheet */}
      {confirmActionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-center shadow-2xl">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              confirmActionModal.actionType === 'DELETE'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {confirmActionModal.actionType === 'DELETE' ? 'Delete Trip?' : confirmActionModal.actionType === 'CANCEL' ? 'Cancel Trip?' : 'Archive Trip?'}
              </h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to {confirmActionModal.actionType.toLowerCase()} <span className="text-slate-200 font-semibold">{confirmActionModal.tripTitle}</span>?
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`w-full py-3.5 font-bold text-sm rounded-xl shadow-lg transition-all ${
                  confirmActionModal.actionType === 'DELETE'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                Confirm {confirmActionModal.actionType}
              </button>
              <button
                type="button"
                onClick={() => setConfirmActionModal({ isOpen: false, tripId: '', tripTitle: '', actionType: 'DELETE' })}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Keep Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Trips</h1>
          <p className="text-xs text-slate-400">Manage, switch & plan your adventures</p>
        </div>

        <button
          onClick={() => navigate('/trips/new')}
          className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-teal-500/20 press-scale"
        >
          <Plus className="w-4 h-4" />
          <span>New Trip</span>
        </button>
      </div>

      {/* Tab Controls */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs font-semibold overflow-x-auto no-scrollbar">
        {[
          { id: 'ACTIVE', label: 'Active / Planning' },
          { id: 'UPCOMING', label: 'Upcoming' },
          { id: 'COMPLETED', label: 'Completed' },
          { id: 'ARCHIVED', label: 'Archived' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap text-center ${
              activeTab === tab.id
                ? 'bg-teal-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trip List */}
      <div className="space-y-4">
        {filteredTrips.length === 0 ? (
          <div className="surface-card p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No {activeTab.toLowerCase()} trips found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              You don't have any trips in this tab right now. Ready to start planning?
            </p>
            <button
              onClick={() => navigate('/trips/new')}
              className="cta-primary text-xs py-2.5 px-4 mx-auto inline-flex"
            >
              <Plus className="w-4 h-4" />
              <span>Plan a Trip</span>
            </button>
          </div>
        ) : (
          filteredTrips.map(trip => {
            const isCurrent = currentTrip?.id === trip.id;
            return (
              <div
                key={trip.id}
                className={`
                  surface-card overflow-hidden transition-all border
                  ${isCurrent ? 'border-teal-500 shadow-xl shadow-teal-500/10' : 'border-slate-800 hover:border-slate-700'}
                `}
              >
                {/* Cover Image */}
                <div className="relative h-32 w-full overflow-hidden">
                  <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/40 to-transparent" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md ${
                      trip.status === 'ACTIVE'
                        ? 'bg-teal-500/90 text-slate-950'
                        : trip.status === 'UPCOMING'
                        ? 'bg-blue-500/90 text-white'
                        : trip.status === 'COMPLETED'
                        ? 'bg-emerald-500/90 text-slate-950'
                        : 'bg-slate-800/90 text-slate-300'
                    }`}>
                      {trip.status}
                    </span>
                    {isCurrent && (
                      <span className="px-2.5 py-1 rounded-full bg-teal-400 text-slate-950 font-extrabold text-[10px] uppercase">
                        Current Context
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-lg text-white">{trip.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>{trip.destination.name}</span>
                        <span>·</span>
                        <span>{trip.startDate} to {trip.endDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    {!isCurrent ? (
                      <button
                        onClick={() => {
                          setCurrentTripId(trip.id);
                          navigate('/');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center gap-1.5 border border-teal-500/20"
                      >
                        <span>Switch Context</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/')}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                      >
                        <span>Open Trip Home</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex items-center gap-1">
                      {trip.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => setConfirmActionModal({
                            isOpen: true,
                            tripId: trip.id,
                            tripTitle: trip.title,
                            actionType: 'ARCHIVE'
                          })}
                          title="Archive Trip"
                          className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setConfirmActionModal({
                          isOpen: true,
                          tripId: trip.id,
                          tripTitle: trip.title,
                          actionType: 'DELETE'
                        })}
                        title="Delete Trip"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
