import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ArrowUpRight, ArrowDownLeft, Eye, CheckCircle2, 
  XCircle, Send, Ban, RefreshCw, Search, Filter
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { operationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OperationsDuJourPage() {
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  
  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [fluxTab, setFluxTab] = useState('ALL'); // 'ALL', 'EMISSION', 'RECEPTION'
  const [lieuFilter, setLieuFilter] = useState(''); // '', 'BANQUE', 'SFD'
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page, 
        size: pageSize,
        dateDebut: todayStr,
        dateFin: todayStr,
        ...(searchQuery && { search: searchQuery }),
        ...(typeFilter && { typeOperation: typeFilter }),
        ...(statutFilter && { statut: statutFilter }),
      };

      // Apply flux filtering at the API level if possible, or we will query accordingly
      if (fluxTab === 'EMISSION' && user?.institutionId) {
        params.institutionEmettriceId = user.institutionId;
      } else if (fluxTab === 'RECEPTION' && user?.institutionId) {
        params.institutionBeneficiaireId = user.institutionId;
      }

      const res = await operationApi.findAll(params);
      let content = res.data.content || [];

      // Local filtering for "Lieu de saisie"
      if (lieuFilter) {
        content = content.filter(op => {
          const name = (op.nomInstitutionEmettrice || '').toLowerCase();
          const isSfd = name.includes('meso') || name.includes('micro') || name.includes('finance') || name.includes('sfd');
          return lieuFilter === 'SFD' ? isSfd : !isSfd;
        });
      }

      setData(content);
      setTotalElements(content.length); // Approximate since we filter local lieuFilter
    } catch (e) {
      toast.error('Erreur de chargement des opérations du jour');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, fluxTab, lieuFilter, typeFilter, statutFilter, searchQuery, todayStr, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Actions
  const handleSoumettre = async (e, op) => {
    e.stopPropagation();
    if (!window.confirm(`Soumettre l'opération ${op.referenceUnique} pour validation ?`)) return;
    setActionLoading(true);
    try {
      await operationApi.soumettre(op.id, "Soumission automatique depuis les opérations du jour");
      toast.success("Opération soumise avec succès !");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur de soumission");
    } finally {
      setActionLoading(false);
    }
  };

  const handleValider = async (e, op, nextStatus) => {
    e.stopPropagation();
    const comment = prompt("Commentaire de validation (optionnel) :");
    if (comment === null) return; // cancelled
    setActionLoading(true);
    try {
      await operationApi.valider(op.id, nextStatus, comment);
      toast.success("Opération validée avec succès !");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur de validation");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejeter = async (e, op) => {
    e.stopPropagation();
    const motif = prompt("Motif du rejet (obligatoire) :");
    if (!motif) {
      if (motif === "") toast.error("Le motif de rejet est obligatoire");
      return;
    }
    setActionLoading(true);
    try {
      await operationApi.rejeter(op.id, motif);
      toast.success("Opération rejetée !");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors du rejet");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnnuler = async (e, op) => {
    e.stopPropagation();
    const motif = prompt("Motif de l'annulation (optionnel) :");
    if (motif === null) return;
    setActionLoading(true);
    try {
      await operationApi.annuler(op.id, motif);
      toast.success("Opération annulée !");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'annulation");
    } finally {
      setActionLoading(false);
    }
  };

  // Determine actions available for the user on a specific row
  const getRowActions = (op) => {
    const isEmitter = op.institutionEmettriceId === user?.institutionId;
    const isBeneficiary = op.institutionBeneficiaireId === user?.institutionId;
    const isCorrespondentEmitter = op.banqueCorrespondanteEmettriceId === user?.institutionId;
    const isCorrespondentReceiver = op.banqueCorrespondanteReceptriceId === user?.institutionId;

    const canSaisie = hasAnyRole('AGENT_SAISIE', 'ADMIN_INSTITUTION');
    const canValidate = hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION');

    const actions = [];

    // Draft / Rejected at Emitter level -> Emitter Saisie can submit or edit
    if ((op.statut === 'BROUILLON' || op.statut === 'REJETE_EMETTEUR') && isEmitter && canSaisie) {
      actions.push({
        label: 'Soumettre',
        icon: Send,
        color: 'text-primary-400 hover:bg-primary-500/10',
        onClick: (e) => handleSoumettre(e, op)
      });
      actions.push({
        label: 'Annuler',
        icon: Ban,
        color: 'text-red-400 hover:bg-red-500/10',
        onClick: (e) => handleAnnuler(e, op)
      });
    }

    // Submitted (SOUMIS) -> Emitter Validator can sign (ACCEPTE_EMETTEUR) or reject
    if (op.statut === 'SOUMIS' && isEmitter && canValidate) {
      actions.push({
        label: 'Signer',
        icon: CheckCircle2,
        color: 'text-green-400 hover:bg-green-500/10',
        onClick: (e) => handleValider(e, op, 'ACCEPTE_EMETTEUR')
      });
      actions.push({
        label: 'Rejeter',
        icon: XCircle,
        color: 'text-red-400 hover:bg-red-500/10',
        onClick: (e) => handleRejeter(e, op)
      });
    }

    // Accepted by Emitter (ACCEPTE_EMETTEUR) -> Emitter Correspondent Bank Validator must approve
    if (op.statut === 'ACCEPTE_EMETTEUR' && isCorrespondentEmitter && canValidate) {
      actions.push({
        label: 'Valider (C. émetteur)',
        icon: CheckCircle2,
        color: 'text-green-400 hover:bg-green-500/10',
        onClick: (e) => handleValider(e, op, 'ACCEPTE_BANQUE_EMETTRICE')
      });
      actions.push({
        label: 'Rejeter',
        icon: XCircle,
        color: 'text-red-400 hover:bg-red-500/10',
        onClick: (e) => handleRejeter(e, op)
      });
    }

    // Accepted by Emitter Bank (ACCEPTE_BANQUE_EMETTRICE) -> Receiver Correspondent Bank Validator must approve
    if (op.statut === 'ACCEPTE_BANQUE_EMETTRICE' && isCorrespondentReceiver && canValidate) {
      actions.push({
        label: 'Valider (C. récepteur)',
        icon: CheckCircle2,
        color: 'text-green-400 hover:bg-green-500/10',
        onClick: (e) => handleValider(e, op, 'ACCEPTE_BANQUE_RECEPTRICE')
      });
      actions.push({
        label: 'Rejeter',
        icon: XCircle,
        color: 'text-red-400 hover:bg-red-500/10',
        onClick: (e) => handleRejeter(e, op)
      });
    }

    // Accepted by Receiver Bank (ACCEPTE_BANQUE_RECEPTRICE) -> Receiver Validator must sign (COMPTABILISE)
    if (op.statut === 'ACCEPTE_BANQUE_RECEPTRICE' && isBeneficiary && canValidate) {
      actions.push({
        label: 'Comptabiliser',
        icon: CheckCircle2,
        color: 'text-emerald-400 hover:bg-emerald-500/10',
        onClick: (e) => handleValider(e, op, 'COMPTABILISE')
      });
      actions.push({
        label: 'Rejeter',
        icon: XCircle,
        color: 'text-red-400 hover:bg-red-500/10',
        onClick: (e) => handleRejeter(e, op)
      });
    }

    return actions;
  };

  // Stats calculation
  const stats = useMemo(() => {
    let emissions = 0;
    let receptions = 0;
    let pendingMe = 0;

    data.forEach(op => {
      const isEmitter = op.institutionEmettriceId === user?.institutionId;
      const isBeneficiary = op.institutionBeneficiaireId === user?.institutionId;
      const isCorrespondentEmitter = op.banqueCorrespondanteEmettriceId === user?.institutionId;
      const isCorrespondentReceiver = op.banqueCorrespondanteReceptriceId === user?.institutionId;
      const canValidate = hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION');

      if (isEmitter) emissions++;
      if (isBeneficiary) receptions++;

      // Pending my action
      if (canValidate) {
        if (op.statut === 'SOUMIS' && isEmitter) pendingMe++;
        else if (op.statut === 'ACCEPTE_EMETTEUR' && isCorrespondentEmitter) pendingMe++;
        else if (op.statut === 'ACCEPTE_BANQUE_EMETTRICE' && isCorrespondentReceiver) pendingMe++;
        else if (op.statut === 'ACCEPTE_BANQUE_RECEPTRICE' && isBeneficiary) pendingMe++;
      }
    });

    return { total: data.length, emissions, receptions, pendingMe };
  }, [data, user, hasAnyRole]);

  const columns = useMemo(() => [
    {
      header: 'Référence',
      accessorKey: 'referenceUnique',
      cell: ({ getValue }) => (
        <span className="font-mono text-primary-300 text-xs font-bold">{getValue()}</span>
      ),
      size: 140,
    },
    {
      header: 'Type',
      accessorKey: 'typeOperation',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      size: 110,
    },
    {
      header: 'Statut',
      accessorKey: 'statut',
      cell: ({ row }) => <StatusBadge status={row.original.statut} customLabel={row.original.statutLabel} />,
      size: 160,
    },
    {
      header: 'Donneur d\'ordre (Émetteur)',
      accessorKey: 'nomDonneurOrdre',
      cell: ({ row }) => (
        <div>
          <p className="text-white text-xs font-medium truncate max-w-32">{row.original.nomDonneurOrdre}</p>
          <p className="text-dark-400 text-[10px] truncate max-w-32">{row.original.nomInstitutionEmettrice}</p>
        </div>
      ),
    },
    {
      header: 'Bénéficiaire (Récepteur)',
      accessorKey: 'nomBeneficiaire',
      cell: ({ row }) => (
        <div>
          <p className="text-white text-xs font-medium truncate max-w-32">{row.original.nomBeneficiaire}</p>
          <p className="text-dark-400 text-[10px] truncate max-w-32">{row.original.nomInstitutionBeneficiaire}</p>
        </div>
      ),
    },
    {
      header: 'Montant',
      accessorKey: 'montant',
      cell: ({ row }) => (
        <div className="text-right">
          <p className="text-white font-semibold text-xs">
            {Number(row.original.montant).toLocaleString('fr-FR')}
          </p>
          <p className="text-dark-400 text-[10px]">{row.original.devise}</p>
        </div>
      ),
      size: 110,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const rowActions = getRowActions(row.original);
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/operations/${row.original.id}`); }}
              className="btn-ghost btn-sm p-1.5 text-dark-300 hover:text-white"
              title="Voir le détail"
            >
              <Eye className="w-4 h-4" />
            </button>
            {rowActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  disabled={actionLoading}
                  className={`btn-ghost btn-sm p-1.5 rounded-md transition-all ${action.color}`}
                  title={action.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        );
      },
      size: 160,
    }
  ], [navigate, actionLoading, user]);

  return (
    <div className="space-y-6 animate-slide-up" id="operations-du-jour-page">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            Opérations du Jour
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Suivi en temps réel des transactions compensées et saisies aujourd'hui ({new Date().toLocaleDateString('fr-FR')}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={`btn-secondary btn-sm ${showFilters ? 'bg-white/10' : ''}`}
            id="btn-toggle-filters"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
          <button onClick={fetchData} className="btn-secondary btn-sm" id="btn-refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <span className="text-dark-400 text-xs font-medium block">Total Journée</span>
            <span className="text-white text-xl font-bold mt-1 block">{stats.total}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary-500/10 text-primary-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <span className="text-dark-400 text-xs font-medium block">Mes Émissions</span>
            <span className="text-white text-xl font-bold mt-1 block">{stats.emissions}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <span className="text-dark-400 text-xs font-medium block">Mes Réceptions</span>
            <span className="text-white text-xl font-bold mt-1 block">{stats.receptions}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between border border-yellow-500/20">
          <div>
            <span className="text-yellow-400/80 text-xs font-medium block">À Valider par Moi</span>
            <span className="text-yellow-400 text-xl font-bold mt-1 block">{stats.pendingMe}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs / Toolbar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex bg-dark-900 p-0.5 rounded-lg border border-dark-700">
          <button 
            onClick={() => { setFluxTab('ALL'); setPage(0); }} 
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${fluxTab === 'ALL' ? 'bg-primary-500 text-dark-950 font-bold' : 'text-dark-300 hover:text-white'}`}
          >
            Toutes
          </button>
          <button 
            onClick={() => { setFluxTab('EMISSION'); setPage(0); }} 
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${fluxTab === 'EMISSION' ? 'bg-primary-500 text-dark-950 font-bold' : 'text-dark-300 hover:text-white'}`}
          >
            Émissions
          </button>
          <button 
            onClick={() => { setFluxTab('RECEPTION'); setPage(0); }} 
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${fluxTab === 'RECEPTION' ? 'bg-primary-500 text-dark-950 font-bold' : 'text-dark-300 hover:text-white'}`}
          >
            Réceptions
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="search-bar">
            <Search className="search-icon" />
            <input 
              type="text" 
              placeholder="Recherche rapide (Réf, motif)..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          <select 
            value={lieuFilter} 
            onChange={e => setLieuFilter(e.target.value)}
            className="select"
          >
            <option value="">Lieu de Saisie (Tous)</option>
            <option value="BANQUE">Banques</option>
            <option value="SFD">Micro/Méso Finances (SFD)</option>
          </select>

          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            className="select"
          >
            <option value="">Type d'Opération (Tous)</option>
            <option value="VIREMENT">Virement</option>
            <option value="CHEQUE">Chèque</option>
            <option value="PRELEVEMENT">Prélèvement</option>
          </select>

          <select 
            value={statutFilter} 
            onChange={e => setStatutFilter(e.target.value)}
            className="select"
          >
            <option value="">Statut (Tous)</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="SOUMIS">Soumis</option>
            <option value="ACCEPTE_EMETTEUR">Accepté Émetteur</option>
            <option value="ACCEPTE_BANQUE_EMETTRICE">Accepté Banque ÉM.</option>
            <option value="ACCEPTE_BANQUE_RECEPTRICE">Accepté Banque RÉC.</option>
            <option value="COMPTABILISE">Comptabilisé</option>
            <option value="REJETE">Rejeté / Retourné</option>
          </select>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={data}
        columns={columns}
        totalElements={totalElements}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        emptyMessage="Aucune opération pour cette journée."
        onRowClick={(row) => navigate(`/operations/${row.id}`)}
      />
    </div>
  );
}
