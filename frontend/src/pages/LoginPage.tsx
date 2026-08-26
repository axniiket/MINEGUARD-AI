import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getMe } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);

  const handleLogin = async (userEmail: string, userPass: string) => {
    setLoading(true);
    setError('');
    try {
      const { access_token } = await login(userEmail, userPass);
      setToken(access_token);
      const user = await getMe();
      setUser(user);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(demoEmail, demoPass);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-50 text-green-600 mb-2">
            <span className="text-3xl">⛏️</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            MineGuard AI
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Smart Governance & Compliance Monitoring System
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@mineguard.com"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all flex items-center justify-center disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                Signing in...
              </>
            ) : (
              <>
                Sign In to Portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-center font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Quick Demo Login
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@mineguard.com', 'admin123')}
              className="px-2 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-[11px] font-bold text-purple-800 text-center transition-colors disabled:opacity-50"
            >
              👑 Admin
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('officer@mineguard.com', 'officer123')}
              className="px-2 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 text-center transition-colors disabled:opacity-50"
            >
              👷 Officer
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('regulator@mineguard.com', 'regulator123')}
              className="px-2 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[11px] font-bold text-red-800 text-center transition-colors disabled:opacity-50"
            >
              🏛️ Regulator
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-400 flex items-center gap-1.5">
        <ShieldCheck size={14} className="text-green-500" />
        <span>Enterprise Mining Governance Standard Compliant</span>
      </div>
    </div>
  );
}
