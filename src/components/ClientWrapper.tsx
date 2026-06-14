"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from './Navbar';

const openRoutes = ['/login', '/register'];

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    const hasToken = !!token;
    setIsAuthenticated(hasToken);

    if (!hasToken && !openRoutes.includes(pathname)) {
      router.push('/login');
    } else if (hasToken && (pathname === '/' || openRoutes.includes(pathname))) {
      router.push('/catalog');
    }
  }, [pathname, router]);

  if (!mounted) {
    return (
      <div className="flex bg-slate-50 text-slate-900 min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  const showNavbar = isAuthenticated && !openRoutes.includes(pathname);

  // Simple section headers based on path
  const getHeaderTitle = (path: string) => {
    switch (path) {
      case '/catalog': return 'Master Catalog';
      case '/stores': return 'Store & Stock Management';
      case '/procurement': return 'Procurement & Purchase Orders';
      case '/outflow': return 'Outflow & Consumption';
      case '/audits': return 'Stock Audit & Reconciliation';
      default: return 'Hestia Inventory';
    }
  };

  return (
    <div className="flex bg-slate-50 text-slate-900 min-h-screen">
      {showNavbar && <Navbar />}
      
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {showNavbar && (
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">
              {getHeaderTitle(pathname)}
            </h2>
            
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
              <span className="text-slate-700">Live Connection</span>
            </div>
          </header>
        )}
        
        <main className={`flex-1 overflow-auto ${showNavbar ? 'p-8' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
