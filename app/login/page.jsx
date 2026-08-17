'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '../../components/auth/password-input';
import protechLogo from '../../assets/protechlogo.webp';
import reviveLogo from '../../assets/revivetechlogo.webp';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [company, setCompany] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const companyParam = searchParams.get('company');
    if (companyParam) {
      setCompany(companyParam);
    } else {
      router.push('/');
    }
  }, [searchParams, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, company })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user?.session_token) {
        localStorage.setItem('sessionToken', data.user.session_token);
      }
      router.push('/dashboard');
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
      </div>
    );
  }

  const isProtech = company === 'PROtech';
  const companyBrand = isProtech
    ? { logo: protechLogo, alt: 'PROtech FZCO Logo', displayName: 'PROtech FZCO' }
    : { logo: reviveLogo, alt: 'Revive Tech Logo', displayName: 'Revive Tech' };
  const bgGradient = isProtech
    ? 'from-blue-50 to-slate-50'
    : 'from-green-50 to-slate-50';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient}`}>
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <Image src={companyBrand.logo} alt={companyBrand.alt} width={40} height={40} className="h-10 w-10 object-contain" priority />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{companyBrand.displayName}</h1>
              </div>
              <p className="text-gray-600 text-sm mt-2">Sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-lg bg-white text-gray-900 border border-gray-300 px-4 py-2.5 placeholder-gray-400 [color-scheme:light] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full ${isProtech ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <Link href={`/forgot-password?company=${company}`} className={`${isProtech ? 'text-blue-600 hover:text-blue-700' : 'text-green-600 hover:text-green-700'} font-medium transition`}>
                  Forgot Password?
                </Link>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-600">New to portal?</span>
                </div>
              </div>

              <Link href={`/register?company=${company}`} className="block w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200">
                Register Employee Account
              </Link>
            </div>

            {/* Back Link */}
            <div className="mt-6 text-center">
              <Link href="/" className={`text-sm ${isProtech ? 'text-blue-600 hover:text-blue-700' : 'text-green-600 hover:text-green-700'} font-medium transition`}>
                ← Back to portals
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-gray-900">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
