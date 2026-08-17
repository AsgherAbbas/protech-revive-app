'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '../../components/dashboard/sidebar';
import { DashboardProviders } from '../../components/dashboard/context';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const recoveredSessionToken = parsedUser.session_token || localStorage.getItem('sessionToken');
      if (recoveredSessionToken) {
        parsedUser.session_token = recoveredSessionToken;
        localStorage.setItem('user', JSON.stringify(parsedUser));
      }
      setUser(parsedUser);
    } catch (error) {
      localStorage.removeItem('user');
      localStorage.removeItem('sessionToken');
      router.replace('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (!user || !user.session_token) {
      return;
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat', sessionToken: user.session_token })
        });
      } catch (error) {
        console.error('Heartbeat failed:', error);
      }
    };

    const handleBeforeUnload = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/auth/session',
          new Blob([JSON.stringify({ action: 'logout', sessionToken: user.session_token })], { type: 'application/json' })
        );
      }
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const handleLogout = async () => {
    const sessionToken = user?.session_token || localStorage.getItem('sessionToken');

    if (sessionToken) {
      try {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', sessionToken })
        });
      } catch (error) {
        console.error('Logout sync failed:', error);
      }
    }

    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-slate-700 shadow-sm">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardProviders user={user}>
      <div className="min-h-screen bg-slate-100">
        <div className="mx-auto grid min-h-screen w-full max-w-[1700px] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-0 lg:h-screen">
            <DashboardSidebar user={user} onLogout={handleLogout} />
          </div>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </DashboardProviders>
  );
}