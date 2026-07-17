import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Shield, ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, 
  Clock, Database, Key, CheckCircle2, XCircle
} from 'lucide-react';
import { operationApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function SecurityDashboardPage() {
  const { roles } = useAuth();
  const isPlatformAdmin = roles?.includes('ADMIN_PLATEFORME');

  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(() => {
    try {
      const saved = localStorage.getItem('microlinks_security_status');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [intervalMins, setIntervalMins] = useState(() => {
    return parseInt(localStorage.getItem('microlinks_scan_interval') || '5', 10);
  });

  const fetchScanResult = async (isManual = false) => {
    setLoading(true);
    try {
      const res = await operationApi.securityScan();
      setScanResult(res.data);
      localStorage.setItem('microlinks_security_status', JSON.stringify(res.data));
      
      // Notify header and sync countdown timer
      window.dispatchEvent(new CustomEvent('security-scan-updated', { detail: res.data }));
      
      if (isManual) {
        toast.success("Scan d'immuabilité terminé avec succès !");
      }
    } catch (e) {
      toast.error("Échec du scan d'immuabilité.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPlatformAdmin) return;
    if (!scanResult) {
      fetchScanResult();
    }

    const handleUpdate = (e) => {
      setScanResult(e.detail);
    };
    window.addEventListener('security-scan-updated', handleUpdate);
    return () => window.removeEventListener('security-scan-updated', handleUpdate);
  }, [isPlatformAdmin]);

  const handleIntervalChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setIntervalMins(value);
    localStorage.setItem('microlinks_scan_interval', value.toString());
    
    // Dispatch update to reset header seconds countdown
    if (scanResult) {
      window.dispatchEvent(new CustomEvent('security-scan-updated', { detail: scanResult }));
    }
    toast.success(`Intervalle de scan mis à jour : ${value} minute(s)`);
  };

  const getStatusDetails = () => {
    const total = scanResult?.totalCorruptions || 0;
    if (scanResult?.status === 'CRITICAL' || total >= 10) {
      return {
        label: 'Altération critique détectée',
        color: 'text-red-400 border-red-500/30 bg-red-500/5',
        icon: ShieldAlert,
        description: 'La base de données ou la chaîne de validation contient des corruptions critiques. Contactez immédiatement l\'administrateur sécurité.',
        glow: 'shadow-red-500/20'
      };
    }
    if (scanResult?.status === 'WARNING' || total > 0) {
      return {
        label: 'Altération suspecte détectée',
        color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
        icon: AlertTriangle,
        description: 'Des incohérences mineures ont été détectées. Veuillez analyser les éléments ci-dessous.',
        glow: 'shadow-yellow-500/20'
      };
    }
    return {
      label: 'Système intègre et sécurisé',
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
      icon: ShieldCheck,
      description: 'Toutes les opérations et leurs historiques de statut sont parfaitement cohérents et immuables.',
      glow: 'shadow-emerald-500/20'
    };
  };

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const status = getStatusDetails();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 animate-slide-up" id="security-dashboard-page">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            Sécurité & Immuabilité
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Audit cryptographique, détection des corruptions et vérification de la chaîne de blocs de validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-dark-900 border border-dark-700 px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-dark-400" />
            <span className="text-xs text-dark-300">Scan Auto:</span>
            <select 
              value={intervalMins} 
              onChange={handleIntervalChange}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="1" className="bg-dark-950 text-white">Chaque minute</option>
              <option value="5" className="bg-dark-950 text-white">Toutes les 5 min</option>
              <option value="10" className="bg-dark-950 text-white">Toutes les 10 min</option>
              <option value="30" className="bg-dark-950 text-white">Toutes les 30 min</option>
            </select>
          </div>
          <button 
            onClick={() => fetchScanResult(true)} 
            disabled={loading}
            className="btn-primary btn-sm flex items-center gap-2"
            id="btn-trigger-manual-scan"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Lancer un audit
          </button>
        </div>
      </div>

      {/* Main Status Panel */}
      {scanResult && (
        <div className={`glass-card p-6 border flex flex-col md:flex-row items-center gap-6 shadow-2xl transition-all duration-500 ${status.color} ${status.glow}`}>
          <div className="p-4 bg-white/5 rounded-full">
            <StatusIcon className="w-16 h-16 animate-pulse" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-xl font-bold text-white">{status.label}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white rounded">
                Audit Local
              </span>
            </div>
            <p className="text-dark-300 text-sm max-w-2xl">{status.description}</p>
            {scanResult.scanTimestamp && (
              <p className="text-dark-400 text-xs font-medium">
                Dernier audit exécuté le : {new Date(scanResult.scanTimestamp).toLocaleString('fr-FR')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Checked Operations */}
        <div className="glass-card p-4 flex items-center justify-between border-l-4 border-l-primary-500">
          <div>
            <span className="text-dark-400 text-xs font-medium block">Opérations Vérifiées</span>
            <span className="text-white text-2xl font-black mt-1 block">
              {scanResult?.totalOperationsChecked?.toLocaleString('fr-FR') || 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Total History Logs */}
        <div className="glass-card p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <span className="text-dark-400 text-xs font-medium block">Maillons d'Audit Validés</span>
            <span className="text-white text-2xl font-black mt-1 block">
              {scanResult?.totalHistoryLogsChecked?.toLocaleString('fr-FR') || 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
        </div>

        {/* Total Corruptions */}
        <div className="glass-card p-4 flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <span className="text-dark-400 text-xs font-medium block">Anomalies de Cohérence</span>
            <span className={`text-2xl font-black mt-1 block ${
              (scanResult?.totalCorruptions || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {scanResult?.totalCorruptions || 0}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            (scanResult?.totalCorruptions || 0) > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
          }`}>
            {(scanResult?.totalCorruptions || 0) > 0 ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Corruption Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operations Integrity */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2 border-b border-dark-700 pb-3">
            <Database className="w-4 h-4 text-primary-400" />
            Intégrité des Opérations (Checksums)
          </h3>
          
          {scanResult?.corruptedOperationIds && scanResult.corruptedOperationIds.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {scanResult.corruptedOperationIds.map((item, idx) => (
                <div key={idx} className="p-3 bg-red-950/20 border border-red-900/30 text-red-300 text-xs rounded-lg flex items-start gap-2 animate-fade-in">
                  <XCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block text-red-400">Checksum Invalide</span>
                    L'opération <strong className="font-mono text-white">{item}</strong> a été altérée.
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-dark-500 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              Toutes les signatures d'opérations sont valides.
            </div>
          )}
        </div>

        {/* Audit Chain Integrity */}
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2 border-b border-dark-700 pb-3">
            <Key className="w-4 h-4 text-blue-400" />
            Intégrité du Workflow (Registre Blockchain)
          </h3>

          {scanResult?.corruptedHistoryLogIds && scanResult.corruptedHistoryLogIds.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {scanResult.corruptedHistoryLogIds.map((item, idx) => (
                <div key={idx} className="p-3 bg-red-950/20 border border-red-900/30 text-red-300 text-xs rounded-lg flex items-start gap-2 animate-fade-in">
                  <XCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block text-red-400">Chaînage rompu</span>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-dark-500 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              La chaîne d'audit de validation est continue et intègre.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
