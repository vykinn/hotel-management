import React, { ReactNode } from 'react';

// ─── BUTTON COMPONENT ────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyle = "h-11 px-5 rounded-[10px] font-semibold text-sm transition-all duration-150 inline-flex items-center justify-center cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-brand hover:bg-brand-hover text-white shadow-sm border border-transparent focus:ring-brand",
    secondary: "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200",
    tertiary: "text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 focus:ring-slate-200",
    danger: "bg-danger hover:bg-red-700 text-white shadow-sm border border-transparent focus:ring-danger"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ─── CARD COMPONENT ──────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-[12px] card-shadow ${onClick ? 'card-shadow-hover cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 ${className}`}>{children}</div>;
};

Card.Content = function CardContent({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

Card.Actions = function CardActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-t border-slate-50 flex items-center justify-end gap-3 ${className}`}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-3 bg-slate-50/50 border-t border-slate-150 rounded-b-[12px] text-xs text-slate-500 ${className}`}>{children}</div>;
};

// ─── BADGE COMPONENT ─────────────────────────────────────────────────
export function Badge({ status, className = '' }: { status: string; className?: string }) {
  const norm = status.trim().toUpperCase();

  let styles = "bg-slate-100 text-slate-700 border-slate-200"; // Default (Draft, etc.)

  if (norm.includes('APPROV') || norm === 'ACTIVE') {
    styles = "bg-green-50 text-green-700 border-green-200";
  } else if (norm.includes('PEND') || norm.includes('WARN')) {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (norm.includes('REJECT') || norm.includes('FAIL') || norm.includes('LOW')) {
    styles = "bg-red-50 text-red-700 border-red-200";
  } else if (norm.includes('COMPLET') || norm.includes('RECONCIL')) {
    styles = "bg-teal-50 text-teal-700 border-teal-200";
  } else if (norm.includes('DRAFT') || norm.includes('OPEN') || norm.includes('RECEIP')) {
    styles = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles} ${className}`}>
      {status}
    </span>
  );
}

// ─── TABLE COMPONENT ─────────────────────────────────────────────────
interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export function Table({ headers, children, className = '' }: TableProps) {
  return (
    <div className={`w-full overflow-x-auto border border-slate-200 rounded-[12px] bg-white ${className}`}>
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200">
            {headers.map((h, i) => (
              <th key={i} className="sticky top-0 py-3.5 px-6 text-xs font-bold text-slate-700 uppercase tracking-wider select-none">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-800 text-sm">
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ─── INPUT COMPONENT ─────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 select-none">
          {label}
        </label>
      )}
      <input
        className={`w-full h-11 px-4 bg-white border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-[10px] text-slate-900 text-sm placeholder-slate-400 focus:outline-none transition-all ${error ? 'border-red-400 focus:ring-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
    </div>
  );
}

// ─── SELECT COMPONENT ────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 select-none">
          {label}
        </label>
      )}
      <select
        className={`w-full h-11 px-4 bg-white border border-slate-200 focus:border-brand rounded-[10px] text-slate-900 text-sm focus:outline-none transition-all cursor-pointer ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── TABS COMPONENT ──────────────────────────────────────────────────
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  return (
    <div className={`flex border-b border-slate-200 overflow-x-auto ${className}`}>
      {tabs.map(tab => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`py-3 px-5 border-b-2 font-semibold text-sm transition-all duration-150 cursor-pointer flex items-center space-x-2 whitespace-nowrap ${
              active
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                active ? 'bg-brand/10 text-brand' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── EMPTY STATE COMPONENT ───────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-slate-200 rounded-[12px] card-shadow max-w-lg mx-auto">
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}
      <h3 className="text-lg font-bold text-slate-950 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
}
