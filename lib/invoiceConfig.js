// Company branding and invoice configuration
export const COMPANY_BRANDING = {
  PROtech: {
    name: 'PROTech FZCO',
    legalName: 'PROTech Trading & Technology Solutions FZCO',
    industry: 'Mobile Phone Wholesale',
    location: 'Dubai, United Arab Emirates',
    tagline: 'Quality, Transparency & Global B2B Procurement',
    description: 'Premium mobile phone wholesale industry focused on quality products and transparent global B2B procurement solutions',
    colors: {
      primary: '#3B82F6', // Blue
      secondary: '#1E40AF',
      accent: '#60A5FA'
    },
    contact: {
      phone: '+971 4 XXX XXXX',
      email: 'invoices@protechfzco.ae',
      website: 'www.protechfzco.ae'
    },
    registrationDetails: {
      emirateId: 'Free Zone Establishment Number: XXXX',
      taxId: 'Tax Registration Number: XXXX',
      tradeLicense: 'Trade License Number: XXXX'
    }
  },
  Revive: {
    name: 'ReviveTech FZCO',
    legalName: 'ReviveTech Solutions FZCO',
    industry: 'Technology Solutions & Device Repair',
    location: 'Dubai, United Arab Emirates',
    tagline: 'Professional Device Repair & Refurbishing Experts',
    description: 'Technology solutions, professional device repair, and refurbishing services. Dr. FONES approved partner since 2020.',
    colors: {
      primary: '#10B981', // Green
      secondary: '#047857',
      accent: '#6EE7B7'
    },
    contact: {
      phone: '+971 4 XXX XXXX',
      email: 'invoices@revivetech.ae',
      website: 'www.revivetech.ae'
    },
    registrationDetails: {
      emirateId: 'Free Zone Establishment Number: XXXX',
      taxId: 'Tax Registration Number: XXXX',
      tradeLicense: 'Trade License Number: XXXX'
    }
  }
};

export const INVOICE_DEFAULTS = {
  taxRate: 5, // 5% VAT
  currency: 'AED',
  invoicePrefix: 'INV-'
};

export const COMPANY_LOGOS = {
  PROtech: '/protechlogo.webp',
  Revive: '/revivetechlogo.webp'
};

// Get branding for a specific company
export function getCompanyBranding(company) {
  return COMPANY_BRANDING[company] || COMPANY_BRANDING.PROtech;
}

// Get logo for a specific company
export function getCompanyLogo(company) {
  return COMPANY_LOGOS[company] || COMPANY_LOGOS.PROtech;
}

// Generate invoice number
export function generateInvoiceNumber(companyName) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `${INVOICE_DEFAULTS.invoicePrefix}${year}${month}${random}`;
}

// Calculate invoice totals
export function calculateInvoiceTotals(items, taxRate = INVOICE_DEFAULTS.taxRate) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    taxRate,
    total: parseFloat(total.toFixed(2))
  };
}
