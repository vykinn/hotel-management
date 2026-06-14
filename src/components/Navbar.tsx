"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Box, Layers, Building2, ShoppingCart, TrendingDown, ClipboardCheck, Settings, Users } from 'lucide-react';

interface User {
  name: string;
  role: string;
  property?: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error(e);
      }
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  if (!user) return null;

  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-[260px] bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 min-h-screen flex-shrink-0">
      <div className="flex flex-col">
        {/* Brand Logo & Hotel Context */}
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="bg-brand p-2.5 rounded-xl text-white flex items-center justify-center shadow-lg shadow-brand/25">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-extrabold text-[10px] text-brand uppercase tracking-widest leading-none">HESTIA</span>
            <h1 className="font-bold text-sm text-slate-200 mt-1 leading-none truncate max-w-[140px]">
              {user.property || 'Hotel Name'}
            </h1>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          {/* Operations Group */}
          <div>
            <span className="block px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operations</span>
            <nav className="space-y-1">
              <Link
                href="/stores"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 relative ${
                  isActive('/stores')
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isActive('/stores') && <span className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></span>}
                <Box className="w-5 h-5 flex-shrink-0" />
                <span>Store & Stock</span>
              </Link>
              <Link
                href="/procurement"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 relative ${
                  isActive('/procurement')
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isActive('/procurement') && <span className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></span>}
                <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                <span>Procurement</span>
              </Link>
              <Link
                href="/outflow"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 relative ${
                  isActive('/outflow')
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isActive('/outflow') && <span className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></span>}
                <TrendingDown className="w-5 h-5 flex-shrink-0" />
                <span>Outflow</span>
              </Link>
            </nav>
          </div>

          {/* Administration Group */}
          <div>
            <span className="block px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Administration</span>
            <nav className="space-y-1">
              <Link
                href="/catalog"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 relative ${
                  isActive('/catalog')
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isActive('/catalog') && <span className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></span>}
                <Layers className="w-5 h-5 flex-shrink-0" />
                <span>Master Catalog</span>
              </Link>
              <Link
                href="/audits"
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-150 relative ${
                  isActive('/audits')
                    ? 'bg-brand text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isActive('/audits') && <span className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-md"></span>}
                <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
                <span>Audits</span>
              </Link>
            </nav>
          </div>

          {/* Settings Group */}
          <div>
            <span className="block px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Settings</span>
            <nav className="space-y-1">
              <div
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-400 cursor-not-allowed select-none"
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span>Configuration</span>
              </div>
              <div
                className="flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-400 cursor-not-allowed select-none"
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                <span>User Management</span>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white shadow-md shadow-brand/10">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-slate-200 truncate">{user.name}</span>
            <span className="text-[10px] text-slate-500 truncate uppercase tracking-wider font-semibold">
              {user.role.replace('_', ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-900/30 hover:border-red-900/50 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
