import React, { useState, useEffect } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard': 'Tableau de bord',
  '/institutions': 'Gestion des Institutions',
  '/clients': 'Comptes Clients',
  '/operations': 'Suivi des Opérations',
  '/operations/nouvelle': 'Nouvelle Opération',
  '/rapports': 'Rapports & Exports',
  '/administration': 'Administration',
};

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] ||
    Object.entries(PAGE_TITLES).find(([k]) => location.pathname.startsWith(k))?.[1] ||
    'MicroLinks';

  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 flex items-center justify-between h-16 px-6
                 bg-white border-b border-slate-200 shadow-sm"
    >
      {/* Page Title */}
      <div>
        <h2 className="text-slate-800 font-bold text-lg">{pageTitle}</h2>
        <p className="text-slate-500 text-xs">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">

        {/* Institution badge */}
        {user?.institutionNom && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100
                          border border-slate-200 rounded-lg">
            <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse" />
            <span className="text-slate-700 text-xs font-semibold truncate max-w-40">
              {user.institutionNom}
            </span>
          </div>
        )}

        {/* Notification bell */}
        <div className="relative" id="notification-panel">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="notification-bell p-2 rounded-lg hover:bg-slate-100 transition-colors"
            id="btn-notifications"
            aria-label={`${unreadCount} notifications non lues`}
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-fade-in">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="text-slate-800 font-bold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-primary-600 text-xs hover:text-primary-700 font-semibold"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    Aucune notification
                  </div>
                ) : (
                  notifications.map((notif, i) => (
                    <div
                      key={i}
                      className={`p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        !notif.read ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      <p className="text-slate-800 text-xs font-semibold">{notif.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{notif.message}</p>
                      <p className="text-slate-400 text-[10px] mt-1">{notif.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F3C623]
                          flex items-center justify-center text-[#0B192C] text-sm font-bold cursor-pointer shadow">
            {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <p className="text-slate-700 text-sm font-semibold leading-none">{user?.name || 'Utilisateur'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
