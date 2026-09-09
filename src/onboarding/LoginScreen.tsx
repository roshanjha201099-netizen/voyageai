import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Sparkles, ShieldCheck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginScreen: React.FC = () => {
  const { signIn, isLoading } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      await signIn({
        provider: 'EMAIL',
        email: email.trim().toLowerCase(),
        password,
        name: isRegister && name ? name.trim() : (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)),
        isRegister,
      });
      navigate('/onboarding');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-dvh bg-[#080B10] text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto animate-fadeIn">
      
      {/* Brand Header */}
      <div className="pt-8 space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto shadow-lg shadow-teal-500/10">
          <Sparkles className="w-7 h-7 text-teal-400" />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Welcome to Voyage<span className="text-teal-400">AI</span>
          </h1>
          <p className="text-sm text-slate-400">
            {isRegister ? 'Passwordless email auto-registration & server session' : 'Passwordless email login & server session'}
          </p>
        </div>
      </div>

      {/* Email & Password Authentication Form */}
      <div className="surface-card p-6 space-y-4 my-auto border-slate-800 shadow-2xl">
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              !isRegister ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 rounded-lg transition-all ${
              isRegister ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Roshan Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 press-scale disabled:opacity-50 transition-all"
          >
            <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Security & Privacy Footer */}
      <div className="pb-4 text-center space-y-1">
        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          End-to-end encrypted session
        </p>
      </div>

    </div>
  );
};
