import './globals.css';

export const metadata = {
  title: 'Enterprise Management',
  description: 'Multi-tenant enterprise management platform built with Next.js'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
