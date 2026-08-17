import protechLogo from '../../assets/protechlogo.webp';
import reviveLogo from '../../assets/revivetechlogo.webp';

export const COMPANY_META = {
  PROtech: {
    name: 'PROtech FZCO',
    logo: protechLogo,
    logoAlt: 'PROtech FZCO Logo',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    accentClass: 'from-blue-600 to-cyan-500',
    ringClass: 'ring-blue-100'
  },
  Revive: {
    name: 'Revive Tech',
    logo: reviveLogo,
    logoAlt: 'Revive Tech Logo',
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    accentClass: 'from-emerald-600 to-teal-500',
    ringClass: 'ring-emerald-100'
  }
};

const ROLE_META = {
  super_admin: {
    path: 'overview',
    navLabel: 'Master Dashboard',
    labelsByCompany: {
      PROtech: 'Super Admin (Boss)',
      Revive: 'Super Admin (Boss)'
    }
  },
  admin: {
    path: 'admin',
    navLabel: 'Admin',
    labelsByCompany: {
      PROtech: 'Administrator / Attendance & Invoices',
      Revive: 'Administrator / Attendance & Invoices'
    }
  },
  'price-manager': {
    path: 'price-manager',
    navLabel: 'Price Manager',
    labelsByCompany: {
      PROtech: 'Price Manager'
    }
  },
  'sales-manager': {
    path: 'sales-manager',
    navLabel: 'Sales Manager',
    labelsByCompany: {
      PROtech: 'Sales Manager',
      Revive: 'Sales & Inventory Manager'
    }
  },
  'sales-transactions': {
    path: 'sales-transactions',
    navLabel: 'Sales & Transactions',
    labelsByCompany: { PROtech: 'Sales & Transactions', Revive: 'Sales & Transactions' }
  },
  'inventory-management': {
    path: 'inventory-management',
    navLabel: 'Inventory Management',
    labelsByCompany: { PROtech: 'Inventory Management', Revive: 'Inventory Management' }
  },
  'staff-output-manager': {
    path: 'staff-output-manager',
    navLabel: 'Staff Output Manager',
    labelsByCompany: {
      Revive: 'Staff Output Manager'
    }
  }
};

const COMPANY_ALLOWED_ROLES = {
  PROtech: ['super_admin', 'admin', 'price-manager', 'sales-manager'],
  Revive: ['super_admin', 'admin', 'sales-manager', 'staff-output-manager']
};

const ADMIN_SECTION_ITEMS = [
  { key: 'invoices', href: '/dashboard/invoices', label: 'Invoices' },
  { key: 'external-invoices', href: '/dashboard/external-invoices', label: 'External Invoices' },
  { key: 'attendance', href: '/dashboard/attendance', label: 'Attendance' },
  { key: 'activity', href: '/dashboard/activity', label: 'Activity' }
];

const LEGACY_ROLE_ALIASES = {
  super_admin: 'super_admin',
  boss: 'super_admin',
  attendance_invoices: 'admin',
  attendance_inventory: 'admin',
  attendance_data_export_invoices_inventory: 'admin',
  price_manager: 'price-manager',
  operations: 'sales-manager',
  sales_manager: 'sales-manager',
  sales_inventory_manager: 'sales-manager',
  staff_output: 'staff-output-manager',
  staff_output_manager: 'staff-output-manager'
};

export function normalizeRole(role) {
  return LEGACY_ROLE_ALIASES[role] || null;
}

export function getCompanyName(user) {
  return user?.company_name || null;
}

export function getAllowedRolesForCompany(company) {
  return COMPANY_ALLOWED_ROLES[company] || [];
}

export function isRoleAllowedForCompany(company, role) {
  return getAllowedRolesForCompany(company).includes(role);
}

export function getResolvedRole(user) {
  const company = getCompanyName(user);
  const normalizedRole = normalizeRole(user?.role);

  if (!normalizedRole) {
    return null;
  }

  if (normalizedRole === 'super_admin') {
    return 'super_admin';
  }

  if (!company) {
    return null;
  }

  if (!isRoleAllowedForCompany(company, normalizedRole)) {
    return null;
  }

  return normalizedRole;
}

export function getRoleLabelForUser(user) {
  const company = getCompanyName(user);
  const role = getResolvedRole(user);

  if (!role) {
    return 'Unknown Role';
  }

  if (role === 'super_admin') {
    return 'Super Admin (Boss)';
  }

  if (!company) {
    return 'Unknown Role';
  }

  return ROLE_META[role]?.labelsByCompany?.[company] || ROLE_META[role]?.navLabel || 'Unknown Role';
}

export function getDefaultDashboardPath(user) {
  const role = getResolvedRole(user);

  if (!role) {
    return '/dashboard/overview';
  }

  if (role === 'super_admin') {
    return '/dashboard/overview';
  }

  if (role === 'admin') {
    return '/dashboard/invoices';
  }

  return `/dashboard/${ROLE_META[role].path}`;
}

const SUPER_ADMIN_TEAM_MEMBERS = {
  PROtech: ['Aqeel', 'Omar', 'Ahmad'],
  Revive: ['Aqeel', 'Javaid', 'Munir']
};

export function getTeamMembersForCompany(company) {
  return SUPER_ADMIN_TEAM_MEMBERS[company] || [];
}

export function getSidebarItems(user) {
  const company = getCompanyName(user);
  const role = getResolvedRole(user);

  if (role === 'super_admin') {
    const operationalModules = [
      { key: 'invoices', href: '/dashboard/invoices', label: 'Invoices' },
      { key: 'external-invoices', href: '/dashboard/external-invoices', label: 'External Invoices' },
      { key: 'attendance', href: '/dashboard/attendance', label: 'Attendance' },
      ...(company === 'PROtech' ? [{ key: 'price-manager', href: '/dashboard/price-manager', label: 'Price Manager' }] : []),
      { key: 'sales-transactions', href: '/dashboard/sales-transactions', label: 'Sales & Transactions' },
      { key: 'inventory-management', href: '/dashboard/inventory-management', label: 'Inventory Management' },
      ...(company === 'Revive' ? [{ key: 'staff-output-manager', href: '/dashboard/staff-output-manager', label: 'Staff Output Manager' }] : [])
    ];
    
    return [
      { key: 'overview', href: '/dashboard/overview', label: 'Master Overview' },
      { key: 'activity', href: '/dashboard/activity', label: 'Activity Feed' },
      { key: 'account-approvals', href: '/dashboard/account-approvals', label: 'Account Approvals' },
      { key: 'active-users', href: '/dashboard/active-users', label: 'Active Users' },
      { key: 'registered-users', href: '/dashboard/registered-users', label: 'Registered Users' },
      ...operationalModules,
      { key: 'change-password', href: '/dashboard/change-password', label: 'Change Password' }
    ];
  }

  const allowedRoles = getAllowedRolesForCompany(company);

  const roleNavKeys = role === 'admin' ? allowedRoles.filter((item) => item !== 'admin') : allowedRoles.filter((item) => item === role);

  const roleItems = roleNavKeys.flatMap((roleKey) => roleKey === 'sales-manager'
    ? [
        { key: 'sales-transactions', href: '/dashboard/sales-transactions', label: 'Sales & Transactions' },
        { key: 'inventory-management', href: '/dashboard/inventory-management', label: 'Inventory Management' }
      ]
    : [{ key: roleKey, href: `/dashboard/${ROLE_META[roleKey].path}`, label: ROLE_META[roleKey].navLabel }]);

  return [
    { key: 'overview', href: '/dashboard/overview', label: 'Overview' },
    ...(role === 'admin' ? ADMIN_SECTION_ITEMS : []),
    ...roleItems,
    { key: 'change-password', href: '/dashboard/change-password', label: 'Change Password' }
  ];
}

export function canAccessRoute(user, routeKey) {
  if (getResolvedRole(user) === 'super_admin') {
    const allowedRoutes = ['overview', 'activity', 'account-approvals', 'active-users', 'registered-users', 'change-password', 'invoices', 'external-invoices', 'attendance', 'price-manager', 'sales-manager', 'sales-transactions', 'inventory-management', 'staff-output-manager'];
    return allowedRoutes.includes(routeKey);
  }

  if (routeKey === 'change-password') {
    return true;
  }

  if (routeKey === 'invoices' || routeKey === 'external-invoices' || routeKey === 'attendance' || routeKey === 'activity') {
    return getResolvedRole(user) === 'admin';
  }

  if (routeKey === 'overview') {
    return true;
  }

  const company = getCompanyName(user);
  const role = getResolvedRole(user);

  if (!company || !role) {
    return false;
  }

  if (role === 'admin') {
    return getAllowedRolesForCompany(company).includes(routeKey)
      || routeKey === 'sales-transactions'
      || routeKey === 'inventory-management';
  }

  return role === routeKey || (role === 'sales-manager' && ['sales-transactions', 'inventory-management'].includes(routeKey));
}

export function getCompanyMeta(company) {
  return COMPANY_META[company] || {
    name: company || 'Company',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    accentClass: 'from-slate-600 to-slate-500',
    ringClass: 'ring-slate-100'
  };
}