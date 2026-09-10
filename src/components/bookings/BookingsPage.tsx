import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QrCode, Ticket, Building2, Plane, Car } from 'lucide-react';

export const BookingsPage: React.FC = () => {
  const { bookings, cancelBooking } = useApp();
  const [filterTab, setFilterTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  const filteredBookings = bookings.filter(b => {
    if (filterTab === 'upcoming') return b.status === 'confirmed' || b.status === 'in-transit';
    if (filterTab === 'cancelled') return b.status === 'cancelled';
    return b.status === 'confirmed';
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hotel': return <Building2 className="w-5 h-5 text-emerald-400" />;
      case 'flight': return <Plane className="w-5 h-5 text-emerald-400" />;
      case 'cab': return <Car className="w-5 h-5 text-emerald-400" />;
      default: return <Ticket className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-screen-title text-white">Reservations</h1>
        <p className="text-meta mt-1">All your trip bookings</p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['upcoming', 'completed', 'cancelled'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`press-scale shrink-0 px-4 py-2 rounded-full text-[13px] font-medium capitalize transition-all ${
              filterTab === tab
                ? 'bg-teal-500 text-slate-950 font-semibold'
                : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredBookings.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-body text-slate-300">No {filterTab} reservations</p>
          <p className="text-meta text-[13px]">Bookings will appear here automatically</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredBookings.map(b => (
            <div key={b.id} className="surface-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-lg shrink-0">
                    {getTypeIcon(b.type)}
                  </div>
                  <div>
                    <h3 className="text-body font-semibold text-white line-clamp-1">{b.title}</h3>
                    <p className="text-meta text-[12px] mt-0.5">{b.dateTime}</p>
                  </div>
                </div>
                <span className={`text-micro text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  b.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400'
                  : b.status === 'in-transit' ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-rose-500/15 text-rose-400'
                }`}>
                  {b.status}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <div>
                  <span className="text-lg font-bold text-white font-mono">₹{b.amount.toLocaleString()}</span>
                  <span className="text-meta text-[12px] ml-1.5 capitalize">{b.paymentStatus}</span>
                </div>
                <div className="flex gap-2">
                  <button className="press-scale text-meta text-[12px] font-medium flex items-center gap-1 text-teal-400">
                    <QrCode className="w-3.5 h-3.5" /> QR
                  </button>
                  {b.status !== 'cancelled' && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="press-scale px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-[12px] font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
