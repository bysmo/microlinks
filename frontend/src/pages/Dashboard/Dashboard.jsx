import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight, Building2, CheckCircle2, AlertTriangle,
  TrendingUp, Clock, XCircle, RefreshCw, Plus
} from 'lucide-react';
import { operationApi, institutionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS_PIE = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#a855f7'];

const WORKFLOW_STEPS = [
  { id: 'BROUILLON', label: 'Brouillon', color: 'text-gray-400 bg-gray-900/40' },
  { id: 'SOUMIS', label: 'Soumis', color: 'text-blue-400 bg-blue-900/40' },
  { id: 'ACCEPTE_EMETTEUR', label: 'Acc. Émetteur', color: 'text-cyan-400 bg-cyan-900/40' },
  { id: 'ACCEPTE_BANQUE_EMETTRICE', label: 'Acc. Banque ÉM.', color: 'text-indigo-400 bg-indigo-900/40' },
  { id: 'ACCEPTE_BANQUE_RECEPTRICE', label: 'Acc. Banque RÉC.', color: 'text-violet-400 bg-violet-900/40' },
  { id: 'COMPTABILISE', label: 'Comptabilisé', color: 'text-green-400 bg-green-900/40' },
];

export default function Dashboard() {
  const { user, hasAnyRole } = useAuth();
  const [opStats, setOpStats] = useState(null);
  const [instStats, setInstStats] = useState(null);
  const [recentOps, setRecentOps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [opStatsRes, recentOpsRes] = await Promise.allSettled([
        operationApi.getStats(),
        operationApi.findAll({ page: 0, size: 5 }),
      ]);

      if (opStatsRes.status === 'fulfilled') setOpStats(opStatsRes.value.data);
      if (recentOpsRes.status === 'fulfilled') setRecentOps(recentOpsRes.value.data.content || []);

      if (hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION')) {
        const instRes = await institutionApi.getStats();
        setInstStats(instRes.data);
      }
    } catch (e) {
      console.error('Erreur chargement dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statCards = [
    {
      label: 'Total Opérations',
      value: opStats?.total ?? '—',
      icon: ArrowLeftRight,
      color: 'from-primary-600 to-primary-800',
      iconBg: 'bg-primary-500/20',
      iconColor: 'text-primary-400',
    },
    {
      label: 'En Attente',
      value: opStats?.enAttente ?? '—',
      icon: Clock,
      color: 'from-yellow-600 to-orange-700',
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
    },
    {
      label: 'Comptabilisées',
      value: opStats?.comptabilises ?? '—',
      icon: CheckCircle2,
      color: 'from-green-600 to-emerald-700',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
    },
    {
      label: 'Rejetées',
      value: opStats?.rejetes ?? '—',
      icon: XCircle,
      color: 'from-red-600 to-red-800',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
    },
    ...(instStats ? [{
      label: 'Institutions',
      value: instStats.total ?? '—',
      icon: Building2,
      color: 'from-purple-600 to-purple-800',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    }] : []),
  ];

  // Données simulées pour les graphiques
  const areaData = [
    { jour: 'Lun', operations: 12, montant: 4800000 },
    { jour: 'Mar', operations: 19, montant: 7200000 },
    { jour: 'Mer', operations: 15, montant: 5900000 },
    { jour: 'Jeu', operations: 25, montant: 11000000 },
    { jour: 'Ven', operations: 22, montant: 8700000 },
    { jour: 'Sam', operations: 8, montant: 3200000 },
    { jour: 'Dim', operations: 5, montant: 1900000 },
  ];

  const pieData = [
    { name: 'Virement', value: 60 },
    { name: 'Chèque', value: 25 },
    { name: 'Prélèvement', value: 15 },
  ];

  return (
    <div className="space-y-6 animate-slide-up" id="dashboard-page">

      {/* Welcome banner */}
      <div className="glass-card p-6 bg-dark-800/60 border-dark-700/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Bonjour, {user?.firstName || user?.name || 'Bienvenue'} 👋
            </h1>
            <p className="text-dark-300 mt-1">
              Voici un aperçu des opérations MicroLinks aujourd'hui
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="btn-ghost btn-sm" id="btn-refresh-dashboard">
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            {hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION', 'AGENT_SAISIE') && (
              <Link to="/operations/nouvelle" className="btn-primary btn-sm" id="btn-new-operation">
                <Plus className="w-4 h-4" />
                Nouvelle Opération
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="glass-card-hover p-5 flex items-center gap-4" id={`stat-card-${i}`}>
              <div className={`stat-icon ${card.iconBg}`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-dark-400 text-xs font-medium">{card.label}</p>
                <p className="text-white text-2xl font-bold mt-0.5">
                  {loading ? (
                    <span className="block w-12 h-7 bg-dark-700 rounded animate-pulse" />
                  ) : (
                    typeof card.value === 'number'
                      ? card.value.toLocaleString('fr-FR')
                      : card.value
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area Chart */}
        <div className="glass-card p-6 lg:col-span-2" id="chart-area-operations">
          <h3 className="text-white font-semibold mb-4">
            Activité de la semaine
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="colorOps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="jour" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', color: '#f1f5f9'
                }}
              />
              <Area
                type="monotone" dataKey="operations"
                stroke="#3b82f6" fill="url(#colorOps)"
                strokeWidth={2} name="Opérations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6" id="chart-pie-types">
          <h3 className="text-white font-semibold mb-4">Types d'opérations</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                paddingAngle={3} dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: '8px', color: '#f1f5f9'
                }}
              />
              <Legend
                iconType="circle"
                formatter={(value) => (
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workflow Pipeline */}
      <div className="glass-card p-6" id="workflow-pipeline">
        <h3 className="text-white font-semibold mb-4">Pipeline du Workflow</h3>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden pb-2">
          {WORKFLOW_STEPS.map((step, i) => (
            <React.Fragment key={step.id}>
              <div className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-xs font-semibold ${step.color}`}>
                {step.label}
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div className="flex-shrink-0 text-dark-600">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Recent operations */}
      <div className="glass-card" id="recent-operations">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-white font-semibold">Opérations Récentes</h3>
          <Link to="/operations" className="text-primary-400 text-sm hover:text-primary-300">
            Voir tout →
          </Link>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-dark-700 rounded-lg animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-3 bg-dark-700 rounded animate-pulse" />
                  <div className="w-48 h-3 bg-dark-800 rounded animate-pulse" />
                </div>
                <div className="w-20 h-6 bg-dark-700 rounded-full animate-pulse" />
              </div>
            ))
          ) : recentOps.length === 0 ? (
            <div className="p-8 text-center text-dark-400">
              <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune opération récente</p>
            </div>
          ) : (
            recentOps.map((op) => (
              <Link
                to={`/operations/${op.id}`}
                key={op.id}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                id={`recent-op-${op.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary-900/40 border border-primary-700/20
                                flex items-center justify-center flex-shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{op.referenceUnique}</p>
                  <p className="text-dark-400 text-xs truncate">
                    {op.nomDonneurOrdre} → {op.nomBeneficiaire}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-sm font-semibold">
                    {op.montant?.toLocaleString('fr-FR')} {op.devise}
                  </p>
                  <p className="text-dark-400 text-xs">{op.dateOperation}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
