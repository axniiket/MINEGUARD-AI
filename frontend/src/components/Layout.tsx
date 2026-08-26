import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Mountain,
  ClipboardCheck,
  Bell,
  LogOut,
  Menu,
  X,
  Calendar,
  ShieldAlert,
  Activity,
  History,
  FileSpreadsheet,
  Compass,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getMe, getComplianceEvents, getCorrectiveActions } from '../api/client';

export const Layout = () => {
  const { user, setUser, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reminderBadgeCount, setReminderBadgeCount] = useState(0);

  useEffect(() => {
    if (!user && localStorage.getItem('mineguard_token')) {
      getMe().then(setUser).catch(() => {});
    }
  }, [user, setUser]);

  // Fetch reminder badge counts
  useEffect(() => {
    Promise.all([getComplianceEvents(), getCorrectiveActions()])
      .then(([events, actions]) => {
        const today = new Date().toISOString().split('T')[0];
        const overdueEvents = events.filter((e) => e.status === 'overdue' || (e.status === 'pending' && e.due_date < today)).length;
        const escalatedOrOverdueActions = actions.filter((a) => a.is_escalated || (a.status !== 'completed' && a.deadline < today)).length;
        setReminderBadgeCount(overdueEvents + escalatedOrOverdueActions);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const userRole = user?.role || 'admin';

  // Navigation Items with Role-specific filtering
  const allNavItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'officer', 'regulator'] },
    { to: '/map', icon: Compass, label: 'Mine GIS Map', roles: ['admin', 'officer', 'regulator'] },
    { to: '/inspections', icon: ClipboardCheck, label: 'Inspections & OCR', roles: ['admin', 'officer', 'regulator'] },
    { to: '/actions', icon: ShieldAlert, label: 'Corrective Actions', roles: ['admin', 'officer', 'regulator'] },
    { to: '/compliance', icon: Calendar, label: 'Compliance Calendar', roles: ['admin', 'officer', 'regulator'], badge: reminderBadgeCount },
    { to: '/alerts', icon: Bell, label: 'Risk Alerts', roles: ['admin', 'officer', 'regulator'] },
    { to: '/analytics', icon: Activity, label: 'Risk Analytics', roles: ['admin', 'regulator'] },
    { to: '/audit', icon: History, label: 'Audit Trail', roles: ['admin', 'regulator'] },
    { to: '/reports', icon: FileSpreadsheet, label: 'Reports & Export', roles: ['admin', 'officer', 'regulator'] },
  ];

  const visibleNavItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/' || path === '/mines') return 'Governance & Compliance Overview';
    if (path === '/map') return 'Mine GIS Geospatial Operations';
    if (path === '/inspections') return 'Safety & Environmental Inspections';
    if (path.startsWith('/inspections/')) return 'Inspection Analysis & OCR Digitization';
    if (path === '/actions') return 'Corrective Action & Remediation Workflow';
    if (path === '/compliance') return 'Statutory Compliance Calendar';
    if (path === '/alerts') return 'Active Risk & Hazard Alerts';
    if (path === '/analytics') return 'Rule-Based Risk Analytics & Ranking';
    if (path === '/audit') return 'Immutable Governance Audit Trail';
    if (path === '/reports') return 'Statutory Reports & CSV Export Center';
    if (path.startsWith('/mines/')) return 'Mine Operations Dashboard';
    return 'MineGuard AI';
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⛏️</span>
            <span className="text-xl font-bold tracking-tight text-white">MineGuard AI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Role Badge in Sidebar */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/90 rounded-xl border border-gray-700/60 text-xs">
            <span className="text-gray-400 font-medium">Role View:</span>
            <span
              className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                userRole === 'admin'
                  ? 'bg-purple-900/60 text-purple-300'
                  : userRole === 'regulator'
                  ? 'bg-red-900/60 text-red-300'
                  : 'bg-emerald-900/60 text-emerald-300'
              }`}
            >
              {userRole}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 mt-3 px-3 overflow-y-auto space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30 shadow-xs'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center">
                <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-extrabold animate-pulse">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-800 flex flex-col space-y-3 bg-gray-950/40">
          {user && (
            <div className="flex flex-col px-1">
              <span className="font-semibold text-xs text-gray-200 truncate">{user.full_name}</span>
              <span className="text-[11px] text-gray-400 truncate">{user.email}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center px-3 py-2 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-gray-800/80 rounded-xl transition-colors w-full"
          >
            <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            {reminderBadgeCount > 0 && (
              <button
                onClick={() => navigate('/compliance')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold hover:bg-red-100 transition-colors"
              >
                <Bell size={13} className="text-red-600" />
                <span>{reminderBadgeCount} Overdue Deadlines</span>
              </button>
            )}

            {user && (
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200 hidden sm:inline-block">
                {user.role === 'regulator' ? '🏛️ DGMS Regulator' : user.role === 'admin' ? '👑 Admin' : '👷 Field Officer'}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
