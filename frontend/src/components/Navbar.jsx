import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate('/login');
  }

  const navLink = (to, label, onClick) => (
    <Link
      to={to}
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        pathname === to
          ? 'bg-jubilee-700 text-white'
          : 'text-jubilee-100 hover:bg-jubilee-700 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="bg-jubilee-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <svg className="h-7 w-7 text-jubilee-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="whitespace-nowrap">Jubilee Claims Portal</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLink('/', 'Dashboard')}
            {navLink('/claims/new', '+ New Claim')}

            <div className="ml-4 pl-4 border-l border-jubilee-700 flex items-center gap-3">
              <span className="text-sm text-jubilee-100 hidden lg:block">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-jubilee-100 hover:bg-jubilee-700 hover:text-white transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-jubilee-100 hover:bg-jubilee-700 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <div className="md:hidden border-t border-jubilee-700 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLink('/', 'Dashboard', () => setOpen(false))}
            {navLink('/claims/new', '+ New Claim', () => setOpen(false))}
            <div className="pt-2 mt-2 border-t border-jubilee-700 flex items-center justify-between">
              <span className="text-sm text-jubilee-100 px-3 py-2">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-jubilee-100 hover:bg-jubilee-700 hover:text-white transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
