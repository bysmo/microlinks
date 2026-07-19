import React, { useState, useEffect } from 'react';
import { Bell, Search, Menu, ShieldAlert, ShieldCheck, ChevronDown } from 'lucide-react';
import { operationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useLocation, useNavigate } from 'react-router-dom';
import UserProfileModal from '../common/UserProfileModal';

const PAGE_TITLES = {
  '/dashboard': 'Tableau de bord',
  '/institutions': 'Gestion des Institutions',
  '/mon-etablissement': 'Mon Établissement',
  '/operations/du-jour': 'Opérations du Jour',
  '/operations': 'Historique des opérations',
  '/rapports': 'Rapports & Exports',
  '/facturation': 'Facturation',
  '/mes-factures': 'Mes Factures',
  '/administration': 'Administration',
  '/security': 'Sécurité & Immuabilité',
};

// Resolve in order of specificity (longest match wins)
function resolvePageTitle(pathname) {
  const sortedKeys = Object.keys(PAGE_TITLES).sort((a, b) => b.length - a.length);
  const match = sortedKeys.find(k => pathname === k || pathname.startsWith(k + '/'));
  return match ? PAGE_TITLES[match] : 'MicroLinks';
}

export default function Header() {
  const { user, roles } = useAuth();
  const isPlatformAdmin = roles?.includes('ADMIN_PLATEFORME');
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [securityData, setSecurityData] = useState(() => {
    try {
      const saved = localStorage.getItem('microlinks_security_status');
      return saved ? JSON.parse(saved) : { status: 'SECURE', totalCorruptions: 0 };
    } catch {
      return { status: 'SECURE', totalCorruptions: 0 };
    }
  });

  const [secondsLeft, setSecondsLeft] = useState(() => {
    const intervalMins = parseInt(localStorage.getItem('microlinks_scan_interval') || '5', 10);
    return intervalMins * 60;
  });

  const runScan = async () => {
    try {
      const res = await operationApi.securityScan();
      setSecurityData(res.data);
      localStorage.setItem('microlinks_security_status', JSON.stringify(res.data));
      window.dispatchEvent(new CustomEvent('security-scan-updated', { detail: res.data }));
      
      const intervalMins = parseInt(localStorage.getItem('microlinks_scan_interval') || '5', 10);
      setSecondsLeft(intervalMins * 60);
    } catch (e) {
      console.error("Erreur lors du scan automatique", e);
    }
  };

  useEffect(() => {
    if (!isPlatformAdmin) return;
    const handleUpdate = (e) => {
      setSecurityData(e.detail);
      const intervalMins = parseInt(localStorage.getItem('microlinks_scan_interval') || '5', 10);
      setSecondsLeft(intervalMins * 60);
    };
    window.addEventListener('security-scan-updated', handleUpdate);

    // Initial load
    runScan();

    return () => {
      window.removeEventListener('security-scan-updated', handleUpdate);
    };
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          runScan();
          const intervalMins = parseInt(localStorage.getItem('microlinks_scan_interval') || '5', 10);
          return intervalMins * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlatformAdmin]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusColor = () => {
    if (!securityData) return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400';
    if (securityData.status === 'CRITICAL' || securityData.totalCorruptions >= 10) {
      return 'bg-red-500/25 border-red-500/40 text-red-300 shadow-md shadow-red-500/5 hover:bg-red-500/35';
    }
    if (securityData.status === 'WARNING' || (securityData.totalCorruptions > 0 && securityData.totalCorruptions < 10)) {
      return 'bg-yellow-500/25 border-yellow-500/40 text-yellow-300 shadow-md shadow-yellow-500/5 hover:bg-yellow-500/35';
    }
    return 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/5 hover:bg-emerald-500/35';
  };

  const pageTitle = resolvePageTitle(location.pathname);

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

        {/* Security Indicator */}
        {isPlatformAdmin && (
          <button
            onClick={() => navigate('/security')}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${getStatusColor()}`}
            title={`Sécurité: ${securityData?.totalCorruptions || 0} corruption(s). Prochain scan dans ${formatTime(secondsLeft)}.`}
            id="btn-header-security-indicator"
          >
            <div className="relative flex items-center justify-center">
              {securityData?.totalCorruptions > 0 ? (
                <ShieldAlert className="w-4 h-4 animate-pulse text-yellow-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  securityData?.totalCorruptions >= 10 ? 'bg-red-400' : securityData?.totalCorruptions > 0 ? 'bg-yellow-400' : 'bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  securityData?.totalCorruptions >= 10 ? 'bg-red-500' : securityData?.totalCorruptions > 0 ? 'bg-yellow-500' : 'bg-emerald-500'
                }`}></span>
              </span>
            </div>
            <span className="font-mono text-xs font-bold leading-none tracking-tight">
              {formatTime(secondsLeft)}
            </span>
          </button>
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

        {/* User avatar — cliquer pour ouvrir la modale profil */}
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 hover:bg-slate-100 rounded-lg px-2 py-1.5 transition-colors group"
          id="btn-open-user-profile"
          title="Mon profil"
        >
          <div className="w-8 h-8 rounded-full bg-[#F3C623]
                          flex items-center justify-center text-[#0B192C] text-sm font-bold shadow">
            {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-slate-700 text-sm font-semibold leading-none">{user?.name || 'Utilisateur'}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:block group-hover:text-slate-600 transition-colors" />
        </button>
      </div>

      {/* Modale profil utilisateur */}
      <UserProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        institutionId={user?.institutionId}
      />
    </header>
  );
}
