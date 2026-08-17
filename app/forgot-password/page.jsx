'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '../../components/auth/password-input';
import protechLogo from '../../assets/protechlogo.webp';
import reviveLogo from '../../assets/revivetechlogo.webp';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [company, setCompany] = useState('PROtech');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const companyParam = params.get('company');

    if (companyParam === 'PROtech' || companyParam === 'Revive') {
      setCompany(companyParam);
    }
  }, []);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code');
        setLoading(false);
        return;
      }

      setSuccess('Verification code sent. Check your inbox.');
      setStep(2);
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Verification failed');
        setLoading(false);
        return;
      }

      setResetToken(data.resetToken || '');
      setSuccess('Code verified. You can now set a new password.');
      setStep(3);
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetToken) {
      setError('Reset verification is missing. Please verify OTP again.');
      setStep(2);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, company, resetToken })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Password reset failed');
        setLoading(false);
        return;
      }

      setSuccess('Password reset successfully. Redirecting to login...');
      setTimeout(() => {
        router.push(`/login?company=${company}`);
      }, 1500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const isProtech = company === 'PROtech';
  const companyBrand = isProtech
    ? { logo: protechLogo, alt: 'PROtech FZCO Logo', displayName: 'PROtech FZCO' }
    : { logo: reviveLogo, alt: 'Revive Tech Logo', displayName: 'Revive Tech' };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${isProtech ? 'from-blue-50 to-slate-50' : 'from-green-50 to-slate-50'}`}>
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <Image src={companyBrand.logo} alt={companyBrand.alt} width={40} height={40} className="h-10 w-10 object-contain" priority />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">{companyBrand.displayName}</h1>
              </div>
              <p className="text-lg font-semibold text-slate-900">Reset Password</p>
              <p className="text-slate-600 text-sm mt-2">
                {step === 1 && 'Step 1: Request verification code'}
                {step === 2 && 'Step 2: Verify your OTP'}
                {step === 3 && 'Step 3: Set a new password'}
              </p>
              <div className="mt-4 flex gap-2">
                <div className={`h-1 flex-1 rounded ${step >= 1 ? (isProtech ? 'bg-blue-600' : 'bg-green-600') : 'bg-slate-300'}`}></div>
                <div className={`h-1 flex-1 rounded ${step >= 2 ? (isProtech ? 'bg-blue-600' : 'bg-green-600') : 'bg-slate-300'}`}></div>
                <div className={`h-1 flex-1 rounded ${step >= 3 ? (isProtech ? 'bg-blue-600' : 'bg-green-600') : 'bg-slate-300'}`}></div>
              </div>
            </div>

            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-slate-900 mb-2">
                    Company
                  </label>
                  <select
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  >
                    <option value="PROtech">PROtech</option>
                    <option value="Revive">Revive</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${isProtech ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Sending...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className={`rounded-lg border p-4 text-sm ${isProtech ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                  <p className="font-medium">Code sent to:</p>
                  <p className="mt-1 font-semibold text-slate-900">{email}</p>
                </div>

                <div>
                  <label htmlFor="otp" className="block text-sm font-semibold text-slate-900 mb-2">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(value);
                      setError('');
                    }}
                    placeholder="000000"
                    maxLength="6"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className={`w-full ${isProtech ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp('');
                    setError('');
                    setSuccess('');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2.5 px-4 rounded-lg transition duration-200"
                >
                  Back
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-900 mb-2">
                    New Password
                  </label>
                  <PasswordInput
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-900 mb-2">
                    Confirm Password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${isProtech ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            {/* Back Link */}
            <div className="mt-6 text-center">
              <Link href={`/login?company=${company}`} className={`text-sm ${isProtech ? 'text-blue-600 hover:text-blue-700' : 'text-green-600 hover:text-green-700'} font-medium transition`}>
                ← Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
