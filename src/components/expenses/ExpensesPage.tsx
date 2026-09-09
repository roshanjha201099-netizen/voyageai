import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTrip } from '../../features/trip/TripContext';
import {
  Wallet, ArrowLeft, Plus, PieChart, Sparkles
} from 'lucide-react';
import type { Expense } from '../../types';

export const ExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeTrip, expenses: appExpenses, addExpense: addAppExpense, setTripView, setActiveTab, openAiAssistant } = useApp();
  const { currentTrip, expenses: tripExpenses, addExpense: addTripExpense } = useTrip();

  const activeDestName = (currentTrip?.destination?.name) || (typeof activeTrip?.destination === 'string' ? activeTrip.destination : '') || 'Kerala';

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
  const targetBudget = 30000;
  const budgetRemaining = Math.max(0, targetBudget - totalSpent);
  const progressPct = Math.min(100, Math.round((totalSpent / targetBudget) * 100));

  // Category totals breakdown
  const categoryTotals: Record<string, number> = {
    Food: 0,
    Transport: 0,
    Hotel: 0,
    Activities: 0,
    Shopping: 0,
    Other: 0
  };

  combinedExpenses.forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });

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
      title,
      amount: numAmount,
      category,
      date: 'Today',
      paidBy: 'Me',
      isSplit,
      splitWith: isSplit ? ['Aman', 'Priya'] : undefined
    });

    setTitle('');
    setAmount('');
    setShowAddModal(false);
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
          <Wallet className="w-3.5 h-3.5" />
          <span>{activeDestName} Expenses</span>
        </div>
      </div>

      {/* Hero Financial Overview */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-teal-950/40 via-[#0D1117] to-[#080B11] border border-teal-500/30 shadow-2xl space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">Total Spent</span>
            <div className="text-3xl font-black font-mono text-white mt-0.5">₹{totalSpent.toLocaleString()}</div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Remaining Budget</span>
            <div className={`text-xl font-black font-mono mt-0.5 ${budgetRemaining < 5000 ? 'text-amber-400' : 'text-teal-400'}`}>
              ₹{budgetRemaining.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Budget Progress Meter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Budget Progress ({progressPct}%)</span>
            <span className="text-teal-300 font-mono">Target: ₹{targetBudget.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct > 90 ? 'bg-rose-500' : progressPct > 75 ? 'bg-amber-400' : 'bg-teal-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Action Button: Log New Expense */}
        <div className="pt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 py-3 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 press-scale"
          >
            <Plus className="w-4 h-4" />
            <span>Log New Expense</span>
          </button>

          <button
            type="button"
            onClick={() => openAiAssistant(`Analyze my current ${activeDestName} trip expenses of ₹${totalSpent} and suggest money-saving tips.`)}
            className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-extrabold text-xs border border-white/10 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>AI Budget Advice</span>
          </button>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
          <PieChart className="w-4 h-4" />
          Category Expense Breakdown
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {Object.entries(categoryTotals).map(([cat, val]) => (
            <div key={cat} className="p-3.5 rounded-2xl bg-[#0D1117] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <span>{getCatEmoji(cat)}</span>
                  <span>{cat}</span>
                </span>
                <span className="font-extrabold font-mono text-teal-300">₹{val.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-teal-400 h-full rounded-full"
                  style={{ width: `${totalSpent > 0 ? Math.min(100, Math.round((val / totalSpent) * 100)) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Expense History List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">
            Trip Expense History ({combinedExpenses.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Sorted by Latest</span>
        </div>

        <div className="space-y-2">
          {combinedExpenses.map((exp) => (
            <div
              key={exp.id}
              className="p-3.5 rounded-2xl bg-[#0D1117] border border-white/10 hover:border-teal-500/30 transition-all flex items-center justify-between gap-3 shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-white/10">
                  {getCatEmoji(exp.category)}
                </div>

                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm text-white truncate">{exp.title}</h4>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{exp.paidBy}</span>
                    <span>·</span>
                    <span>{exp.date}</span>
                    {exp.isSplit && (
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                        Split
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-base font-black font-mono text-teal-300 shrink-0">
                ₹{exp.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Log Expense Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md bg-[#0D1117] border border-teal-500/40 rounded-3xl p-6 space-y-4 shadow-2xl animate-slideUp text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Log Trip Expense</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Title / Purpose</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Dinner at Beach Shacks"
                className="w-full bg-slate-900 border border-white/15 focus:border-teal-400 rounded-2xl px-3.5 py-3 text-xs text-white outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 1450"
                className="w-full bg-slate-900 border border-white/15 focus:border-teal-400 rounded-2xl px-3.5 py-3 text-xs text-white font-mono outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as Expense['category'])}
                className="w-full bg-slate-900 border border-white/15 focus:border-teal-400 rounded-2xl px-3.5 py-3 text-xs text-white outline-none cursor-pointer"
              >
                <option value="Food">Food & Dining</option>
                <option value="Transport">Transport & Rides</option>
                <option value="Hotel">Hotels & Stays</option>
                <option value="Activities">Sightseeing & Activities</option>
                <option value="Shopping">Shopping</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isSplit}
                onChange={e => setIsSplit(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 bg-slate-900 border-white/20"
              />
              <span>Split cost evenly among trip members</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-2xl bg-teal-500 text-slate-950 font-black text-xs shadow-lg"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
