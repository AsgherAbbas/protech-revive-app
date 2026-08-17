'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PasswordInput from '../../components/auth/password-input';
import protechLogo from '../../assets/protechlogo.webp';
import reviveLogo from '../../assets/revivetechlogo.webp';

const rolesByCompany = {
  PROtech: [
    { value: 'attendance_invoices', label: 'Administrator / Attendance & Invoices' },
    { value: 'price_manager', label: 'Price Manager' },
    { value: 'sales_inventory_manager', label: 'Sales & Inventory Manager' }
  ],
  Revive: [
    { value: 'attendance_invoices', label: 'Administrator / Attendance & Invoices' },
    { value: 'sales_inventory_manager', label: 'Sales & Inventory Manager' },
    { value: 'staff_output', label: 'Staff Output Manager' }
  ]
};

const companyDomains = {
  PROtech: '@protechfzco.ae',
  Revive: '@revivetech.ae'
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: 'PROtech',
    role: 'attendance_invoices'
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const companyParam = params.get('company');

    if (companyParam && rolesByCompany[companyParam]) {
      setFormData((prev) => ({
        ...prev,
        company: companyParam,
        role: rolesByCompany[companyParam][0].value
      }));
    }
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };

    if (name === 'company') {
      newData.role = rolesByCompany[value][0].value;
    }

    setFormData(newData);
    setError('');
  };

  const validateEmail = () => {
    const expectedDomain = companyDomains[formData.company];
    if (!formData.email.endsWith(expectedDomain)) {
      setError(`Only official company domain emails are allowed. Use ${expectedDomain}`);
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validateEmail()) {
      return;
    }

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          company: formData.company,
          name: formData.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code');
        setLoading(false);
        return;
      }

      setSuccess('Verification code sent successfully. Check your email.');
      setTimeout(() => {
        setSuccess('');
        setStep(2);
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          company: formData.company,
          role: formData.role,
          otp: otp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess('Account created successfully. Redirecting to login...');
      setTimeout(() => {
        router.push(`/login?company=${formData.company}`);
      }, 1500);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const expectedDomain = companyDomains[formData.company];
  const isProtech = formData.company === 'PROtech';
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
              <p className="text-lg font-semibold text-slate-900">Register Employee</p>
              <p className="text-slate-600 text-sm mt-2">
                {step === 1 ? 'Step 1: Enter your details' : 'Step 2: Verify your email'}
              </p>
              <div className="flex gap-2 mt-4">
                <div className={`h-1 flex-1 rounded ${step >= 1 ? (isProtech ? 'bg-blue-600' : 'bg-green-600') : 'bg-slate-300'}`}></div>
                <div className={`h-1 flex-1 rounded ${step >= 2 ? (isProtech ? 'bg-blue-600' : 'bg-green-600') : 'bg-slate-300'}`}></div>
              </div>
            </div>

            {/* Step 1: Registration Form */}
            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-semibold text-slate-900 mb-2">
                    Company
                  </label>
                  <select
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  >
                    <option value="PROtech">PROtech</option>
                    <option value="Revive">Revive</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                    Work Email <span className="text-xs text-slate-600">({expectedDomain})</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    placeholder={`name${expectedDomain}`}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-900 mb-2">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleFormChange}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-semibold text-slate-900 mb-2">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
                    required
                  >
                    {rolesByCompany[formData.company].map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
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
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                <div className={`rounded-lg border p-4 text-sm ${isProtech ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-green-50 border-green-200 text-green-900'}`}>
                  <p className="font-medium">Verification code sent to:</p>
                  <p className="font-semibold mt-1 text-gray-900">{formData.email}</p>
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent transition"
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
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
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
                  Back to Edit Details
                </button>
              </form>
            )}

            {/* Back Link */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 text-sm">Already have an account? <Link href={`/login?company=${formData.company}`} className={`${isProtech ? 'text-blue-600 hover:text-blue-700' : 'text-green-600 hover:text-green-700'} font-semibold`}>Go to login</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
