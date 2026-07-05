import React, { useState } from 'react';
import {
  LogIn, Building2, Mail, Lock, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();

  // State
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when user types
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* 1. Dynamic Gradient Background (Advanced Design) */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        {/* Large, blurred gradient orbs for motion effect */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-rose-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* 2. Login Card (Glassmorphism Effect) */}
      <div className="relative z-10 w-full max-w-md backdrop-blur-xl bg-white/10 p-8 md:p-10 rounded-3xl border border-white/20 shadow-2xl shadow-slate-900/50">

        {/* Card Header & Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="bg-white p-3 rounded-xl shadow-md">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md">HomeTax Login</span>
          </div>
          <p className="mt-1 text-sm text-gray-300">Secure access to the Revenue Management Console.</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-indigo-300" />
              </div>
              <input
                required
                name="email"
                type="email"
                placeholder="user@taxation.gov"
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-gray-200 uppercase tracking-wider">Password</label>
              <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline">Forgot?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-indigo-300" />
              </div>
              <input
                required
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-10 py-3 border border-white/20 rounded-xl text-white placeholder-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 focus:bg-white/20 transition-all sm:text-sm shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-indigo-300 hover:text-indigo-100 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-lg shadow-indigo-500/50 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-8"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Access Console</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p className='text-gray-400'>256-bit Encrypted Connection | Need Support? <a href="#" className="text-indigo-400 hover:text-indigo-300">Contact IT</a></p>
        </div>
      </div>
    </div>
  );
}
