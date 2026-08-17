 'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import protechLogo from '../assets/protechlogo.webp';
import reviveLogo from '../assets/revivetechlogo.webp';

function SvgIcon({ className = 'h-4 w-4', children, viewBox = '0 0 24 24' }) {
  return (
    <svg viewBox={viewBox} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function GlobeIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.8 2.6 4.2 5.4 4.2 9S14.8 18.4 12 21c-2.8-2.6-4.2-5.4-4.2-9S9.2 5.6 12 3Z" />
    </SvgIcon>
  );
}

function ExternalLinkIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
    </SvgIcon>
  );
}

function ChartIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <path d="M5 19h14" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-7" />
    </SvgIcon>
  );
}

function WorkflowIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <rect x="4" y="5" width="6" height="6" rx="1.2" />
      <rect x="14" y="13" width="6" height="6" rx="1.2" />
      <path d="M10 8h4" />
      <path d="M12 8v8" />
      <path d="m14 16-2-2-2 2" />
    </SvgIcon>
  );
}

function CalendarIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 9h16" />
      <path d="m8.5 14 2 2 4-4" />
    </SvgIcon>
  );
}

function ShieldIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <path d="M12 3 19 6v5c0 5-3.3 8.5-7 10-3.7-1.5-7-5-7-10V6l7-3Z" />
    </SvgIcon>
  );
}

function UsersIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <path d="M16 18v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" />
      <circle cx="10" cy="8" r="3" />
      <path d="M22 18v-1a3.2 3.2 0 0 0-2.2-3.05" />
      <path d="M15 5.5a3 3 0 0 1 0 5.9" />
    </SvgIcon>
  );
}

function ExportIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <path d="M8 3h7l4 4v14H8z" />
      <path d="M15 3v5h5" />
      <path d="M12 11v7" />
      <path d="m9.5 15.5 2.5 2.5 2.5-2.5" />
    </SvgIcon>
  );
}

function ArrowUpRightIcon({ className }) {
  return (
    <SvgIcon className={className}>
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </SvgIcon>
  );
}

export default function HomePage() {
  const router = useRouter();

  const handlePortalAccess = (company) => {
    router.push(`/login?company=${company}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(248,250,252,0.96)_38%,_rgba(241,245,249,1)_100%)] text-slate-900">
      <header className="border-b border-gray-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a
              href="https://protechfzco.ae"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-white/80 p-1 shadow-sm ring-1 ring-slate-200 transition-opacity hover:opacity-80"
            >
              <Image src={protechLogo} alt="PROtech FZCO Logo" width={48} height={48} className="h-12 w-12 object-contain" />
            </a>
            <span className="h-7 w-px bg-slate-300" aria-hidden="true" />
            <a
              href="https://revivetech.ae"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-white/80 p-1 shadow-sm ring-1 ring-slate-200 transition-opacity hover:opacity-80"
            >
              <Image src={reviveLogo} alt="Revive Tech Logo" width={48} height={48} className="h-12 w-12 object-contain" />
            </a>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl lg:text-2xl">Enterprise Management Portal</h1>
            <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">Secure multi-company gateway for operations, analytics, and workforce workflows.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            onClick={() => handlePortalAccess('PROtech')}
            className="group mx-auto w-full max-w-md cursor-pointer overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-30px_rgba(15,23,42,0.38)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400" />
            <div className="p-6 sm:p-7 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">PROtech FZCO</h2>
                  <p className="mt-1.5 text-[0.8rem] font-medium uppercase tracking-[0.22em] text-slate-500">Technology Solutions</p>
                  <a
                    href="https://protechfzco.ae"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-2.5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800 hover:underline"
                  >
                    protechfzco.ae
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
                <a
                  href="https://protechfzco.ae"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="group/logo flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50/90 p-1.5 shadow-sm ring-1 ring-slate-200 transition-all duration-200 hover:bg-white hover:opacity-80"
                >
                  <Image
                    src={protechLogo}
                    alt="PROtech FZCO Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </a>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/80">
                <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Core Capabilities</h3>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex items-start gap-3 text-[0.92rem] leading-5 text-slate-700">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <ChartIcon className="h-4 w-4" />
                    </span>
                    <span>Attendance &amp; Invoice Tracking</span>
                  </li>
                  <li className="flex items-start gap-3 text-[0.92rem] leading-5 text-slate-700">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <WorkflowIcon className="h-4 w-4" />
                    </span>
                    <span>Price &amp; Stock Management</span>
                  </li>
                  <li className="flex items-start gap-3 text-[0.92rem] leading-5 text-slate-700">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                    <span>Sales &amp; Inventory Operations</span>
                  </li>
                </ul>
              </div>

              <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.85)] transition-all duration-200 hover:scale-[1.01] hover:from-blue-500 hover:to-blue-600">
                Enter PROtech Portal
                <ArrowUpRightIcon className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            onClick={() => handlePortalAccess('Revive')}
            className="group mx-auto w-full max-w-md cursor-pointer overflow-hidden rounded-3xl bg-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.32)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-30px_rgba(15,23,42,0.38)]"
          >
            <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-green-500 to-lime-400" />
            <div className="p-6 sm:p-7 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[1.65rem] font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">Revive Tech</h2>
                  <p className="mt-1.5 text-[0.8rem] font-medium uppercase tracking-[0.22em] text-slate-500">Recovery &amp; Services</p>
                  <a
                    href="https://revivetech.ae"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-2.5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
                  >
                    revivetech.ae
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
                <a
                  href="https://revivetech.ae"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="group/logo flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50/90 p-1.5 shadow-sm ring-1 ring-slate-200 transition-all duration-200 hover:bg-white hover:opacity-80"
                >
                  <Image
                    src={reviveLogo}
                    alt="Revive Tech Logo"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </a>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/80">
                <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-slate-500">Core Capabilities</h3>
                <ul className="mt-3 space-y-2.5">
                  <li className="flex items-start gap-3 text-[0.92rem] leading-5 text-slate-700">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ShieldIcon className="h-4 w-4" />
                    </span>
                    <span>Attendance &amp; Invoice Processing</span>
                  </li>
                  <li className="flex items-start gap-3 text-[0.92rem] leading-5 text-slate-700">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <UsersIcon className="h-4 w-4" />
                    </span>
                    <span>Sales &amp; Inventory Tracking</span>
                  </li>
                  <li className="flex items-start gap-3 text-[0.92rem] leading-5 text-slate-700">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <ExportIcon className="h-4 w-4" />
                    </span>
                    <span>Staff Output Management</span>
                  </li>
                </ul>
              </div>

              <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(16,185,129,0.85)] transition-all duration-200 hover:scale-[1.01] hover:from-emerald-500 hover:to-green-600">
                Enter Revive Portal
                <ArrowUpRightIcon className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/85 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          Secure enterprise management system • Advanced analytics &amp; reporting
        </div>
      </footer>
    </div>
  );
}
