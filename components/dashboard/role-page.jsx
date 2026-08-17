'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDashboardUser } from './context';
import {
  canAccessRoute,
  getCompanyMeta,
  getDefaultDashboardPath,
  getResolvedRole,
  getRoleLabelForUser
} from './config';
import {
  ChangePasswordView,
  CompanyOverviewView,
  ProtechAdminView,
  ProtechPriceManagerView,
  ProtechSalesManagerView,
  RegisteredUsersView,
  ReviveAdminView,
  ReviveSalesInventoryManagerView,
  ReviveStaffOutputManagerView,
  SuperAdminMasterView
} from './views';
import { ExternalInvoicesTab } from './invoices-enhanced';

function getRouteTitle(routeKey, company) {
  if (routeKey === 'overview') {
    return 'Overview';
  }

  if (routeKey === 'invoices') {
    return 'Invoices';
  }

  if (routeKey === 'external-invoices') {
    return 'External Invoices';
  }

  if (routeKey === 'attendance') {
    return 'Attendance';
  }

  if (routeKey === 'activity') {
    return 'Activity';
  }

  if (routeKey === 'account-approvals') {
    return 'Account Approvals';
  }

  if (routeKey === 'active-users') {
    return 'Active Users';
  }

  if (routeKey === 'registered-users') {
    return 'Registered Users';
  }

  if (routeKey === 'admin') {
    return 'Admin Workspace';
  }

  if (routeKey === 'price-manager') {
    return 'Price Manager';
  }

  if (routeKey === 'sales-manager') {
    return company === 'Revive' ? 'Sales & Inventory Manager' : 'Sales Manager';
  }

  if (routeKey === 'sales-transactions') {
    return 'Sales & Transactions';
  }

  if (routeKey === 'inventory-management') {
    return 'Inventory Management';
  }

  if (routeKey === 'staff-output-manager') {
    return 'Staff Output Manager';
  }

  if (routeKey === 'change-password') {
    return 'Change Password';
  }

  return 'Dashboard';
}

function renderRoleView(routeKey, company, user) {
  const resolvedRole = getResolvedRole(user);

  if (routeKey === 'external-invoices') {
    return <ExternalInvoicesTab company={company} />;
  }

  if (resolvedRole === 'super_admin' && ['overview', 'activity', 'account-approvals', 'active-users', 'registered-users'].includes(routeKey)) {
    if (routeKey === 'registered-users') {
      return <RegisteredUsersView user={user} />;
    }

    return <SuperAdminMasterView user={user} section={routeKey} />;
  }

  if (resolvedRole === 'super_admin' && ['invoices', 'attendance', 'price-manager', 'sales-manager', 'sales-transactions', 'inventory-management', 'staff-output-manager'].includes(routeKey)) {
    if (routeKey === 'invoices' || routeKey === 'attendance' || routeKey === 'activity') {
      return company === 'PROtech' ? <ProtechAdminView section={routeKey} /> : <ReviveAdminView section={routeKey} />;
    }
    if (routeKey === 'price-manager' && company === 'PROtech') {
      return <ProtechPriceManagerView />;
    }
    if (['sales-manager', 'sales-transactions', 'inventory-management'].includes(routeKey)) {
      const section = routeKey === 'inventory-management' ? 'inventory' : 'sales';
      return company === 'PROtech' ? <ProtechSalesManagerView section={section} /> : <ReviveSalesInventoryManagerView section={section} />;
    }
    if (routeKey === 'staff-output-manager' && company === 'Revive') {
      return <ReviveStaffOutputManagerView />;
    }
  }

  if (routeKey === 'overview') {
    return <CompanyOverviewView user={user} />;
  }

  if (routeKey === 'invoices' || routeKey === 'attendance' || routeKey === 'activity') {
    return company === 'PROtech' ? <ProtechAdminView section={routeKey} /> : <ReviveAdminView section={routeKey} />;
  }

  if (routeKey === 'admin') {
    return company === 'PROtech' ? <ProtechAdminView section="invoices" /> : <ReviveAdminView section="invoices" />;
  }

  if (routeKey === 'price-manager' && company === 'PROtech') {
    return <ProtechPriceManagerView />;
  }

  if (['sales-manager', 'sales-transactions', 'inventory-management'].includes(routeKey)) {
    const section = routeKey === 'inventory-management' ? 'inventory' : 'sales';
    return company === 'PROtech' ? <ProtechSalesManagerView section={section} /> : <ReviveSalesInventoryManagerView section={section} />;
  }

  if (routeKey === 'staff-output-manager' && company === 'Revive') {
    return <ReviveStaffOutputManagerView />;
  }

  if (routeKey === 'change-password') {
    return <ChangePasswordView user={user} />;
  }

  return <CompanyOverviewView user={user} />;
}

export default function DashboardRolePage({ routeKey }) {
  const user = useDashboardUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!canAccessRoute(user, routeKey)) {
      router.replace(getDefaultDashboardPath(user));
    }
  }, [routeKey, router, user]);

  if (!user) {
    return null;
  }

  if (!canAccessRoute(user, routeKey)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-slate-700">Redirecting to your authorized dashboard workspace...</p>
      </div>
    );
  }

  const company = user.company_name;
  const companyMeta = getCompanyMeta(company);
  const title = getRouteTitle(routeKey, company);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <Image src={companyMeta.logo} alt={companyMeta.logoAlt} width={34} height={34} className="h-8 w-8 object-contain" priority />
          </div>
          <span className={`inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-semibold text-white ${companyMeta.accentClass}`}>
            {companyMeta.name}
          </span>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{getRoleLabelForUser(user)}</span>
        </div>
        <h2 className="mt-3 text-2xl font-bold text-slate-900">{title}</h2>
      </div>

      {renderRoleView(routeKey, company, user)}
    </div>
  );
}