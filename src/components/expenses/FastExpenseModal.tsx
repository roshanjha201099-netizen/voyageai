import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { BottomSheet } from '../common/BottomSheet';
import { Check, Wallet } from 'lucide-react';
import type { Expense } from '../../types';

interface FastExpenseProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FastExpenseModal: React.FC<FastExpenseProps> = ({ isOpen, onClose }) => {
  const { expenses } = useApp();
  const { addExpense: addTripExpense } = useTrip();

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Food');
  const [isSplit, setIsSplit] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const categories: Expense['category'][] = ['Food', 'Transport', 'Hotel', 'Activities', 'Shopping', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    const finalTitle = title.trim() || `${category} Expense`;

    try {
      await addTripExpense({
        title: finalTitle,
        amount: numAmount,
        category,
        paidBy: 'Me',
        isSplit,
      });
    } catch (err) {
      console.warn('Expense persistence error:', err);
    }

    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      setAmount('');
      setTitle('');
      onClose();
    }, 1200);
  };

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      height="half"
      title="Fast Expense Logger"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Big Numerical Input */}
        <div className="space-y-1 text-center">
          <label className="text-xs text-slate-400 font-medium">Enter Amount (₹)</label>
          <div className="relative max-w-xs mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl font-extrabold text-teal-400">₹</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full bg-[#080B11] border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-center font-mono text-3xl font-extrabold text-white focus:outline-none focus:border-teal-400"
              required
            />
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Select Category</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                  category === cat
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Collapsible Details */}
        <div>
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className="text-xs text-teal-400 font-semibold hover:underline"
          >
            {showMore ? '− Hide options' : '+ More details (Note, split)'}
          </button>

          {showMore && (
            <div className="mt-3 space-y-3 p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs animate-fadeIn">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="What was it for? (e.g. Seafood Lunch)"
                className="input-field py-2 text-xs"
              />
              <label className="flex items-center gap-2 text-slate-300 font-medium">
                <input
                  type="checkbox"
                  checked={isSplit}
                  onChange={e => setIsSplit(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-white/20"
                />
                Split evenly among 4 travellers
              </label>
            </div>
          )}
        </div>

        {/* Success Feedback or Save CTA */}
        {justAdded ? (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
            <Check className="w-5 h-5 text-emerald-400" />
            <span>₹{amount} logged! Total spent: ₹{(totalSpent + Number(amount)).toLocaleString()}</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={!amount || Number(amount) <= 0}
            className="cta-primary w-full py-3.5 text-sm disabled:opacity-40"
          >
            <Wallet className="w-4 h-4" />
            <span>Log Expense Now</span>
          </button>
        )}
      </form>
    </BottomSheet>
  );
};
