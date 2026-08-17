'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { getCompanyMeta, getRoleLabelForUser, getSidebarItems } from './config';

export default function DashboardSidebar({ user, onLogout }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sidebarItems = getSidebarItems(user);
  const companyMeta = getCompanyMeta(user.company_name);

  const itemIsActive = (item) => {
    if (item.children) {
      return item.children.some((child) => {
        const queryMatches = child.query
          ? searchParams.get('company') === child.query.company && searchParams.get('employee') === child.query.employee
          : false;
        return pathname === child.href && queryMatches;
      });
    }

    return pathname === item.href;
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <Image src={companyMeta.logo} alt={companyMeta.logoAlt} width={40} height={40} className="h-10 w-10 object-contain" priority />
          </div>
          <div className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold ${companyMeta.badgeClass}`}>
            {companyMeta.name}
          </div>
        </div>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Role-based workspace and reporting console.</p>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-4">
        {sidebarItems.map((item) => {
          if (item.children) {
            return (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="space-y-1">
                  {item.children.map((child) => {
                    const childHref = `${child.href}?company=${encodeURIComponent(child.query.company)}&employee=${encodeURIComponent(child.query.employee)}`;
                    const childIsActive = pathname === child.href
                      && searchParams.get('company') === child.query.company
                      && searchParams.get('employee') === child.query.employee;

                    return (
                      <Link
                        key={child.key}
                        href={childHref}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                          childIsActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          const isActive = itemIsActive(item);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="mt-0.5 text-xs text-slate-600">{getRoleLabelForUser(user)}</p>
        </div>
        <button
          onClick={onLogout}
          className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}