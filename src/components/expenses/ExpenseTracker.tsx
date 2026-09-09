import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import { Plus } from 'lucide-react';
import type { Expense } from '../../types';

export const ExpenseTracker: React.FC = () => {
  const { activeTrip, expenses: appExpenses, addExpense: addAppExpense } = useApp();
  const { expenses: tripExpenses, addExpense: addTripExpense } = useTrip();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Food');
  const [isSplit, setIsSplit] = useState(true);

  // Combine persisted trip expenses with local app expenses
  const combinedExpenses: Expense[] = [
    ...tripExpenses.map(e => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      category: e.category,
      date: 'Today',
      paidBy: e.paidBy || 'Me',
      isSplit: e.isSplit,
    })),
    ...appExpenses.filter(ae => !tripExpenses.some(te => te.id === ae.id)),
  ];

  const totalSpent = combinedExpenses.reduce((acc, e) => acc + e.amount, 0);
  const budgetTotal = activeTrip?.budgetTotal || 30000;
  const budgetRemaining = Math.max(0, budgetTotal - totalSpent);
  const progressPct = Math.min(100, Math.round((totalSpent / budgetTotal) * 100));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;
    const numAmount = Number(amount);

    try {
      await addTripExpense({
        title,
        amount: numAmount,
        category,
        paidBy: 'Me',
        isSplit,
      });
    } catch (err) {
      console.warn('Expense persistence error:', err);
    }

    addAppExpense({
      title, amount: numAmount, category, date: 'Today',
      paidBy: 'Roshan', isSplit,
      splitWith: isSplit ? ['Aman', 'Priya', 'Rohan'] : undefined
    });
    setTitle(''); setAmount(''); setShowAddModal(false);
  };

  const getCatEmoji = (cat: string) => {
    switch (cat) {
      case 'Transport': return '🚕';
      case 'Hotel': return '🏨';
      case 'Food': return '🍽️';
      case 'Shopping': return '🛍️';
      case 'Activities': return '🎯';
      default: return '💰';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-screen-title text-white">Expenses</h1>
          <p className="text-meta mt-1">{activeTrip.travellersCount} travellers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="touch-target press-scale flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-[13px]"
        >
          <Plus className="w-4 h-4" /> Log
        </button>
      </div>

      {/* Budget overview */}
      <div className="surface-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-meta text-[12px]">Total spent</p>
            <p className="text-2xl font-bold text-white font-mono">₹{totalSpent.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-meta text-[12px]">Remaining</p>
            <p className={`text-lg font-bold font-mono ${budgetRemaining < 5000 ? 'text-amber-400' : 'text-teal-400'}`}>
              ₹{budgetRemaining.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressPct > 80 ? 'bg-amber-400' : 'bg-teal-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-micro text-[11px]">{progressPct}% of ₹{activeTrip.budgetTotal.toLocaleString()} budget</p>
      </div>

      {/* Expense list */}
      <div className="space-y-1">
        {combinedExpenses.map(exp => (
          <div key={exp.id} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-sm shrink-0">
                {getCatEmoji(exp.category)}
              </div>
              <div>
                <p className="text-body text-sm font-medium text-slate-200">{exp.title}</p>
                <p className="text-meta text-[12px] mt-0.5">
                  {exp.paidBy} · {exp.date}
                  {exp.isSplit && <span className="text-teal-400 ml-1">Split 4 ways</span>}
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-white font-mono shrink-0 ml-2">₹{exp.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-[#0D1117] border-t border-white/[0.06] sm:border sm:rounded-2xl p-5 space-y-4 animate-slideUp"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <h3 className="text-lg font-bold text-white">Log expense</h3>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What was it for?" className="input-field" required
            />
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Amount (₹)" className="input-field font-mono" required
            />
            <select
              value={category} onChange={e => setCategory(e.target.value as Expense['category'])}
              className="input-field bg-[#0D1117]"
            >
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Hotel">Hotel</option>
              <option value="Activities">Activities</option>
              <option value="Shopping">Shopping</option>
              <option value="Other">Other</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-white/20"
              />
              Split evenly ({activeTrip.travellersCount} travellers)
            </label>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddModal(false)}
                className="flex-1 touch-target py-3 rounded-xl bg-white/[0.06] text-slate-300 font-medium text-sm">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 touch-target py-3 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
