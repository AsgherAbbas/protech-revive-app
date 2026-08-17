'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDefaultDashboardPath } from '../../components/dashboard/config';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      router.replace(getDefaultDashboardPath(parsedUser));
    } catch (error) {
      localStorage.removeItem('user');
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-slate-700">Preparing your dashboard workspace...</p>
    </div>
  );
}
