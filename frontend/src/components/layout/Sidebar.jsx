import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, ArrowLeftRight,
  CheckSquare, FileBarChart2, Settings, ChevronLeft,
  ChevronRight, LogOut, Bell, Link as LinkIcon,
  Receipt, FileText, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const menuItems = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['ADMIN_PLATEFORME', 'ADMIN_INSTITUTION', 'AGENT_SAISIE', 'AGENT_VALIDATION', 'LECTEUR'],
  },
  {
    id: 'institutions',
    label: 'Institutions',
    icon: Building2,
    path: '/institutions',
    roles: ['ADMIN_PLATEFORME'],
  },
  {
    id: 'mon-etablissement',
    label: 'Mon établissement',
    icon: Building2,
    path: '/mon-etablissement',
    roles: ['ADMIN_INSTITUTION'],
  },
  {
    id: 'clients',
    label: 'Comptes Clients',
    icon: Users,
    path: '/clients',
    roles: ['ADMIN_INSTITUTION', 'AGENT_SAISIE', 'AGENT_VALIDATION'],
  },
  {
    id: 'operations-saisie',
    label: 'Nouvelle Opération',
    icon: ArrowLeftRight,
    path: '/operations/nouvelle',
    roles: ['ADMIN_INSTITUTION', 'AGENT_SAISIE'],
  },
  {
    id: 'operations-du-jour',
    label: 'Opérations du jour',
    icon: Clock,
    path: '/operations/du-jour',
    roles: ['ADMIN_INSTITUTION', 'AGENT_SAISIE', 'AGENT_VALIDATION', 'LECTEUR'],
  },
  {
    id: 'operations',
    label: 'Suivi Opérations',
    icon: CheckSquare,
    path: '/operations',
    roles: ['ADMIN_INSTITUTION', 'AGENT_SAISIE', 'AGENT_VALIDATION', 'LECTEUR'],
  },
  {
    id: 'rapports',
    label: 'Rapports & Exports',
    icon: FileBarChart2,
    path: '/rapports',
    roles: ['ADMIN_INSTITUTION', 'AGENT_VALIDATION', 'LECTEUR'],
  },
  {
    id: 'facturation',
    label: 'Facturation',
    icon: Receipt,
    path: '/facturation',
    roles: ['ADMIN_PLATEFORME'],
  },
  {
    id: 'mes-factures',
    label: 'Mes Factures',
    icon: FileText,
    path: '/mes-factures',
    roles: ['ADMIN_INSTITUTION'],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    path: '/administration',
    roles: ['ADMIN_PLATEFORME'],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, roles, logout } = useAuth();

  const visibleItems = menuItems.filter(item =>
    item.roles.some(r => roles.includes(r))
  );

  return (
    <>
      {/* Sidebar */}
      <aside
        id="main-sidebar"
        className={`sidebar ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
        aria-label="Navigation principale"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-700">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
            <LinkIcon className="w-4 h-4 text-dark-950" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-white font-bold text-lg leading-none">MicroLinks</h1>
              <p className="text-dark-400 text-xs mt-0.5">Plateforme Inter-Fin.</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hidden">
          <ul className="space-y-1" role="navigation">
            {visibleItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    id={`nav-${item.id}`}
                    className={`sidebar-item group ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="sidebar-icon" aria-hidden="true" />
                    {!collapsed && (
                      <span className="sidebar-label">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-dark-700 p-3">
          {!collapsed && user && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-dark-950 text-sm font-bold flex-shrink-0">
                {(user.firstName?.[0] || user.username?.[0] || 'U').toUpperCase()}
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.name}</p>
                <p className="text-dark-400 text-xs truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={`sidebar-item group w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Se déconnecter"
            id="btn-logout"
          >
            <LogOut className="sidebar-icon" aria-hidden="true" />
            {!collapsed && <span className="sidebar-label">Déconnexion</span>}
          </button>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          id="btn-toggle-sidebar"
          className="absolute -right-3 top-20 w-6 h-6 bg-dark-800 border border-dark-600 rounded-full flex items-center justify-center text-dark-300 hover:text-white hover:bg-dark-700 transition-all duration-200 shadow-lg"
          aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />
          }
        </button>
      </aside>

      {/* Main content offset */}
      <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`} />
    </>
  );
}
