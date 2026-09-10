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
    <div className="min-h-dvh bg-[#F6F7F5] text-[#1F2522] flex flex-col justify-between p-6 max-w-md mx-auto animate-fadeIn">
      
      {/* Brand Header */}
      <div className="pt-8 space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#355F58]/10 border border-[#355F58]/20 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-7 h-7 text-[#355F58]" />
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-[#1F2522] tracking-tight">
            Welcome to Voyage<span className="text-[#355F58]">AI</span>
          </h1>
          <p className="text-sm text-[#5F6863]">
            {isRegister ? 'Passwordless email auto-registration & server session' : 'Passwordless email login & server session'}
          </p>
        </div>
      </div>

      {/* Email & Password Authentication Form */}
      <div className="bg-white border border-[#D9DEDA] rounded-3xl p-6 space-y-4 my-auto shadow-xl">
        <div className="flex rounded-xl bg-[#F0F2EF] p-1 border border-[#D9DEDA] text-xs font-bold">
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              !isRegister ? 'bg-[#355F58] text-white shadow-sm font-extrabold' : 'text-[#5F6863] hover:text-[#1F2522]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2.5 rounded-lg transition-all ${
              isRegister ? 'bg-[#355F58] text-white shadow-sm font-extrabold' : 'text-[#5F6863] hover:text-[#1F2522]'
            }`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-fadeIn">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#1F2522]">Your Full Name</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-[#7C8580] absolute left-3.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Sharma"
                  className="w-full bg-[#F6F7F5] border border-[#D9DEDA] focus:border-[#355F58] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#1F2522] placeholder-[#7C8580] outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#1F2522]">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#7C8580] absolute left-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#F6F7F5] border border-[#D9DEDA] focus:border-[#355F58] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#1F2522] placeholder-[#7C8580] outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[#1F2522]">Password</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#7C8580] absolute left-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F6F7F5] border border-[#D9DEDA] focus:border-[#355F58] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#1F2522] placeholder-[#7C8580] outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-2xl bg-[#355F58] hover:bg-[#2A4D47] active:scale-[0.99] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 mt-4"
          >
            <span>{isLoading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Security & Privacy Footer */}
      <div className="pb-4 text-center space-y-1">
        <p className="text-[11px] text-[#5F6863] flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#355F58]" />
          End-to-end encrypted session
        </p>
      </div>

    </div>
  );
};
