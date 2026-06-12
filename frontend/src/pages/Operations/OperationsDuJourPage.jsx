import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, ArrowUpRight, ArrowDownLeft, Eye, CheckCircle2, 
  XCircle, Send, Ban, RefreshCw, Search, Filter, Plus,
  Building2, ChevronDown, Check, X, Download, FileText
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import NouvelleOperationModal from '../../components/common/NouvelleOperationModal';
import OperationDetailModal from '../../components/common/OperationDetailModal';
import { operationApi, institutionApi, rapportApi, downloadBlob } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OperationsDuJourPage() {
  const navigate = useNavigate();
  const { user, hasAnyRole, canSaisirOperation, canValiderOperation } = useAuth();
  
  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showNewOpModal, setShowNewOpModal] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [workflowAction, setWorkflowAction] = useState(null);
  const [commentaire, setCommentaire] = useState('');

  // Institutions pour les filtres
  const [institutionsList, setInstitutionsList] = useState([]);
  const [banquesList, setBanquesList] = useState([]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [fluxTab, setFluxTab] = useState('ALL'); // 'ALL', 'EMISSION', 'RECEPTION'
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [institutionEmettriceFilter, setInstitutionEmettriceFilter] = useState('');
  const [institutionBeneficiaireFilter, setInstitutionBeneficiaireFilter] = useState('');
  const [banqueEmettriceFilter, setBanqueEmettriceFilter] = useState('');
  const [banqueReceptriceFilter, setBanqueReceptriceFilter] = useState('');
  const [deviseFilter, setDeviseFilter] = useState('');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Load institutions list for filters
  useEffect(() => {
    institutionApi.findAll({ statut: 'ACTIF', size: 200 })
      .then(res => {
        const all = res.data?.content || [];
        setInstitutionsList(all);
        setBanquesList(all.filter(i => i.typeInstitution === 'BANQUE'));
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page, 
        size: pageSize,
        excludeTerminal: true,
        ...(searchQuery && { search: searchQuery }),
        ...(typeFilter && { typeOperation: typeFilter }),
        ...(statutFilter && { statut: statutFilter }),
        ...(deviseFilter && { devise: deviseFilter }),
        ...(institutionEmettriceFilter && { institutionEmettriceId: institutionEmettriceFilter }),
        ...(institutionBeneficiaireFilter && { institutionBeneficiaireId: institutionBeneficiaireFilter }),
        ...(banqueEmettriceFilter && { banqueCorrespondanteEmettriceId: banqueEmettriceFilter }),
        ...(banqueReceptriceFilter && { banqueCorrespondanteReceptriceId: banqueReceptriceFilter }),
      };

      // Apply flux filtering at the API level
      if (fluxTab === 'EMISSION' && user?.institutionId) {
        params.institutionEmettriceId = user.institutionId;
      } else if (fluxTab === 'RECEPTION' && user?.institutionId) {
        params.institutionBeneficiaireId = user.institutionId;
      }

      const res = await operationApi.findAll(params);
      const content = res.data.content || [];

      setData(content);
      setTotalElements(res.data.totalElements || content.length);
    } catch (e) {
      toast.error('Erreur de chargement des opérations du jour');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, fluxTab, typeFilter, statutFilter, searchQuery, deviseFilter,
      institutionEmettriceFilter, institutionBeneficiaireFilter, 
      banqueEmettriceFilter, banqueReceptriceFilter, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setStatutFilter('');
    setDeviseFilter('');
    setInstitutionEmettriceFilter('');
    setInstitutionBeneficiaireFilter('');
    setBanqueEmettriceFilter('');
    setBanqueReceptriceFilter('');
    setPage(0);
  };

  // ===================== Actions workflow =====================

  const handleSoumettre = (e, op) => {
    e.stopPropagation();
    setWorkflowAction({ type: 'SOUMETTRE', op });
  };

  const handleValider = (e, op, nextStatus) => {
    e.stopPropagation();
    setWorkflowAction({ type: 'VALIDER', op, nextStatus });
  };

  const handleRejeter = (e, op) => {
    e.stopPropagation();
    setWorkflowAction({ type: 'REJETER', op });
  };

  const handleAnnuler = (e, op) => {
    e.stopPropagation();
    setWorkflowAction({ type: 'ANNULER', op });
  };

  const submitWorkflowAction = async () => {
    if (!workflowAction) return;
    setActionLoading(true);
    const { type, op, nextStatus } = workflowAction;
    try {
      if (type === 'SOUMETTRE') {
        await operationApi.soumettre(op.id, commentaire);
        toast.success("Opération soumise avec succès !");
      } else if (type === 'VALIDER') {
        await operationApi.valider(op.id, nextStatus, commentaire);
        toast.success("Opération validée avec succès !");
      } else if (type === 'REJETER') {
        await operationApi.rejeter(op.id, commentaire);
        toast.success("Opération rejetée avec succès !");
      } else if (type === 'ANNULER') {
        await operationApi.annuler(op.id, commentaire);
        toast.success("Opération annulée avec succès !");
      }
      setWorkflowAction(null);
      setCommentaire('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || `Échec de l'action`);
    } finally {
      setActionLoading(false);
    }
  };

  // ===================== Workflow complet =====================
  // BROUILLON → SOUMIS → ACCEPTE_EMETTEUR → ACCEPTE_BANQUE_EMETTRICE 
  //           → ACCEPTE_BANQUE_RECEPTRICE → ACCEPTE_BENEFICIAIRE → COMPTABILISE
  
  const getRowActions = (op) => {
    const myId = user?.institutionId;
    const isEmitter = op.institutionEmettriceId === myId;
    const isBeneficiary = op.institutionBeneficiaireId === myId;
    const isCorrespondentEmitter = op.banqueCorrespondanteEmettriceId === myId;
    const isCorrespondentReceiver = op.banqueCorrespondanteReceptriceId === myId;

    // Supporte les rôles normalisés et bruts Keycloak
    // Saisie : MESO_AGENT ou BANK_AGENT (et admins)
    // Validation : MESO_VALID ou BANK_VALID (et admins)
    const canSaisie = canSaisirOperation;
    const canValidate = canValiderOperation;

    const actions = [];

    // ① BROUILLON / REJETE_EMETTEUR → Émetteur Agent : Soumettre ou Annuler
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

    // ② SOUMIS → Émetteur Validateur : Signer (ACCEPTE_EMETTEUR) ou Rejeter
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

    // ③ ACCEPTE_EMETTEUR → Banque Correspondante Émettrice : Valider ou Rejeter
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

    // ④ ACCEPTE_BANQUE_EMETTRICE → Banque Correspondante Réceptrice : Valider ou Rejeter
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

    // ⑤ ACCEPTE_BANQUE_RECEPTRICE → Institution Bénéficiaire Validateur : Accepter (ACCEPTE_BENEFICIAIRE) ou Rejeter
    if (op.statut === 'ACCEPTE_BANQUE_RECEPTRICE' && isBeneficiary && canValidate) {
      actions.push({
        label: 'Accepter réception',
        icon: CheckCircle2,
        color: 'text-blue-400 hover:bg-blue-500/10',
        onClick: (e) => handleValider(e, op, 'ACCEPTE_BENEFICIAIRE')
      });
      actions.push({
        label: 'Rejeter',
        icon: XCircle,
        color: 'text-red-400 hover:bg-red-500/10',
        onClick: (e) => handleRejeter(e, op)
      });
    }

    // ⑥ ACCEPTE_BENEFICIAIRE → Institution Bénéficiaire Admin : Comptabiliser
    if (op.statut === 'ACCEPTE_BENEFICIAIRE' && isBeneficiary && canValidate) {
      actions.push({
        label: 'Comptabiliser',
        icon: CheckCircle2,
        color: 'text-emerald-400 hover:bg-emerald-500/10',
        onClick: (e) => handleValider(e, op, 'COMPTABILISE')
      });
    }

    return actions;
  };

  // Stats calculation
  const stats = useMemo(() => {
    let emissions = 0;
    let receptions = 0;
    let pendingMe = 0;
    const myId = user?.institutionId;

    data.forEach(op => {
      const isEmitter = op.institutionEmettriceId === myId;
      const isBeneficiary = op.institutionBeneficiaireId === myId;
      const isCorrespondentEmitter = op.banqueCorrespondanteEmettriceId === myId;
      const isCorrespondentReceiver = op.banqueCorrespondanteReceptriceId === myId;
      const canValidate = hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION', 'BANK_VALID', 'MESO_VALID', 'BANK_ADMIN', 'MESO_ADMIN');

      if (isEmitter) emissions++;
      if (isBeneficiary) receptions++;

      if (canValidate) {
        if (op.statut === 'SOUMIS' && isEmitter) pendingMe++;
        else if (op.statut === 'ACCEPTE_EMETTEUR' && isCorrespondentEmitter) pendingMe++;
        else if (op.statut === 'ACCEPTE_BANQUE_EMETTRICE' && isCorrespondentReceiver) pendingMe++;
        else if (op.statut === 'ACCEPTE_BANQUE_RECEPTRICE' && isBeneficiary) pendingMe++;
        else if (op.statut === 'ACCEPTE_BENEFICIAIRE' && isBeneficiary) pendingMe++;
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
      size: 150,
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
      size: 180,
    },
    {
      header: 'Institution Émettrice',
      accessorKey: 'nomInstitutionEmettrice',
      cell: ({ row }) => (
        <div>
          <p className="text-white text-xs font-medium truncate max-w-36">{row.original.nomInstitutionEmettrice}</p>
          <p className="text-dark-400 text-[10px] truncate max-w-36">{row.original.nomDonneurOrdre}</p>
        </div>
      ),
    },
    {
      header: 'Banque ÉM.',
      accessorKey: 'nomBanqueCorrespondanteEmettrice',
      cell: ({ getValue }) => (
        <span className="text-dark-400 text-xs truncate max-w-24 block">{getValue() || '—'}</span>
      ),
      size: 110,
    },
    {
      header: 'Institution Bénéficiaire',
      accessorKey: 'nomInstitutionBeneficiaire',
      cell: ({ row }) => (
        <div>
          <p className="text-white text-xs font-medium truncate max-w-36">{row.original.nomInstitutionBeneficiaire}</p>
          <p className="text-dark-400 text-[10px] truncate max-w-36">{row.original.nomBeneficiaire}</p>
        </div>
      ),
    },
    {
      header: 'Banque RÉC.',
      accessorKey: 'nomBanqueCorrespondanteReceptrice',
      cell: ({ getValue }) => (
        <span className="text-dark-400 text-xs truncate max-w-24 block">{getValue() || '—'}</span>
      ),
      size: 110,
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
        const isEmetteurValidated = !['BROUILLON', 'SOUMIS', 'REJETE_EMETTEUR', 'ANNULE'].includes(row.original.statut);
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedOperationId(row.original.id); setShowDetailModal(true); }}
              className="btn-ghost btn-sm p-1.5 text-dark-300 hover:text-white"
              title="Voir le détail"
            >
              <Eye className="w-4 h-4" />
            </button>
            {isEmetteurValidated && (
              <>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const res = await rapportApi.exportSingleMT101(row.original.id);
                      downloadBlob(res.data, `MT101_${row.original.referenceUnique}.txt`, 'text/plain');
                      toast.success("MT101 téléchargé avec succès !");
                    } catch (err) {
                      toast.error("Échec du téléchargement du MT101");
                    }
                  }}
                  className="btn-ghost btn-sm p-1.5 text-primary-400 hover:text-primary-300"
                  title="Télécharger MT101 (SWIFT)"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const res = await rapportApi.exportSinglePain001(row.original.id);
                      downloadBlob(res.data, `pain_001_${row.original.referenceUnique}.xml`, 'application/xml');
                      toast.success("pain.001 téléchargé avec succès !");
                    } catch (err) {
                      toast.error("Échec du téléchargement du pain.001");
                    }
                  }}
                  className="btn-ghost btn-sm p-1.5 text-emerald-400 hover:text-emerald-300"
                  title="Télécharger pain.001 (ISO 20022)"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
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
      size: 200,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [navigate, actionLoading, user, setSelectedOperationId, setShowDetailModal]);

  const canCreateOperation = canSaisirOperation;

  const selectCls = 'w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all';

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
            Suivi en temps réel des transactions actives en cours de traitement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateOperation && (
            <button 
              onClick={() => setShowNewOpModal(true)} 
              className="btn-primary btn-sm flex items-center gap-2"
              id="btn-nouvelle-operation"
            >
              <Plus className="w-4 h-4" />
              Nouvelle opération
            </button>
          )}
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

      {/* Tabs flux */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex bg-dark-900 p-0.5 rounded-lg border border-dark-700">
          {[
            { key: 'ALL', label: 'Toutes' },
            { key: 'EMISSION', label: 'Mes Émissions' },
            { key: 'RECEPTION', label: 'Mes Réceptions' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFluxTab(tab.key); setPage(0); }}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                fluxTab === tab.key ? 'bg-primary-500 text-dark-950 font-bold' : 'text-dark-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass-card p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <p className="text-dark-300 text-xs font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filtres avancés
            </p>
            <button onClick={resetFilters} className="text-xs text-dark-400 hover:text-primary-400 transition-colors">
              Réinitialiser
            </button>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Recherche texte */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-dark-400" />
              <input 
                type="text" 
                placeholder="Référence, nom..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-dark-800/60 border border-dark-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all"
              />
            </div>

            {/* Type opération */}
            <div className="relative">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Type d'opération (Tous)</option>
                <option value="VIREMENT">⇄ Virement</option>
                <option value="CHEQUE">⎗ Chèque</option>
                <option value="PRELEVEMENT">↙ Prélèvement</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>

            {/* Statut */}
            <div className="relative">
              <select value={statutFilter} onChange={e => setStatutFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Statut (Tous)</option>
                <option value="BROUILLON">Brouillon</option>
                <option value="SOUMIS">Soumis</option>
                <option value="ACCEPTE_EMETTEUR">Accepté Émetteur</option>
                <option value="ACCEPTE_BANQUE_EMETTRICE">Accepté Banque ÉM.</option>
                <option value="ACCEPTE_BANQUE_RECEPTRICE">Accepté Banque RÉC.</option>
                <option value="ACCEPTE_BENEFICIAIRE">Accepté Bénéficiaire</option>
                <option value="COMPTABILISE">Comptabilisé</option>
                <option value="REJETE">Rejeté</option>
                <option value="ANNULE">Annulé</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>

            {/* Devise */}
            <div className="relative">
              <select value={deviseFilter} onChange={e => setDeviseFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Devise (Toutes)</option>
                <option value="XOF">XOF</option>
                <option value="XAF">XAF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>
          </div>

          {/* Row 2 — Institution filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Institution départ */}
            <div className="relative">
              <select value={institutionEmettriceFilter} onChange={e => setInstitutionEmettriceFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Institution départ (Toutes)</option>
                {institutionsList.map(i => (
                  <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>

            {/* Banque du donneur d'ordre (Banque correspondante émettrice) */}
            <div className="relative">
              <select value={banqueEmettriceFilter} onChange={e => setBanqueEmettriceFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Banque du donneur d'ordre (Toutes)</option>
                {banquesList.map(b => (
                  <option key={b.id} value={b.id}>{b.nom} ({b.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>

            {/* Banque de réception (Banque correspondante réceptrice) */}
            <div className="relative">
              <select value={banqueReceptriceFilter} onChange={e => setBanqueReceptriceFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Banque de réception (Toutes)</option>
                {banquesList.map(b => (
                  <option key={b.id} value={b.id}>{b.nom} ({b.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>

            {/* Institution bénéficiaire */}
            <div className="relative">
              <select value={institutionBeneficiaireFilter} onChange={e => setInstitutionBeneficiaireFilter(e.target.value)} className={`${selectCls} pr-8`}>
                <option value="">Institution bénéficiaire (Toutes)</option>
                {institutionsList.map(i => (
                  <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>
          </div>
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
        onRowClick={(row) => { setSelectedOperationId(row.id); setShowDetailModal(true); }}
      />

      {/* Nouvelle Opération Modal */}
      <NouvelleOperationModal
        isOpen={showNewOpModal}
        onClose={() => setShowNewOpModal(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Détail Opération Modal */}
      <OperationDetailModal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedOperationId(null); }}
        operationId={selectedOperationId}
        onSuccess={fetchData}
      />

      {/* Validation workflow action Modal */}
      {workflowAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`glass-card w-full max-w-md p-6 space-y-4 animate-slide-up border ${
            workflowAction.type === 'VALIDER' 
              ? 'border-emerald-500/20' 
              : workflowAction.type === 'REJETER' 
                ? 'border-red-500/20' 
                : workflowAction.type === 'ANNULER' 
                  ? 'border-amber-500/20' 
                  : 'border-primary-500/20'
          }`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                {workflowAction.type === 'VALIDER' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {workflowAction.type === 'REJETER' && <XCircle className="w-5 h-5 text-red-400" />}
                {workflowAction.type === 'ANNULER' && <Ban className="w-5 h-5 text-amber-400" />}
                {workflowAction.type === 'SOUMETTRE' && <Send className="w-5 h-5 text-primary-400" />}
                {workflowAction.type === 'VALIDER' 
                  ? (workflowAction.op.statut === 'ACCEPTE_BENEFICIAIRE' ? 'Confirmer la Comptabilisation' : 'Valider l\'opération')
                  : workflowAction.type === 'REJETER'
                    ? 'Rejeter l\'opération'
                    : workflowAction.type === 'ANNULER'
                      ? 'Annuler l\'opération'
                      : 'Soumettre l\'opération'
                }
              </h3>
              <button onClick={() => { setWorkflowAction(null); setCommentaire(''); }} className="text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-dark-300 text-sm">
              {workflowAction.type === 'VALIDER' && (
                <span>Vous vous apprêtez à valider l'opération <strong className="font-mono text-white">{workflowAction.op.referenceUnique}</strong> pour la transmettre à l'étape suivante.</span>
              )}
              {workflowAction.type === 'REJETER' && (
                <span>Vous vous apprêtez à rejeter définitivement l'opération <strong className="font-mono text-white">{workflowAction.op.referenceUnique}</strong>. Cette action est irréversible.</span>
              )}
              {workflowAction.type === 'ANNULER' && (
                <span>Êtes-vous sûr de vouloir annuler l'opération <strong className="font-mono text-white">{workflowAction.op.referenceUnique}</strong> ?</span>
              )}
              {workflowAction.type === 'SOUMETTRE' && (
                <span>Vous êtes sur le point de soumettre l'opération <strong className="font-mono text-white">{workflowAction.op.referenceUnique}</strong> pour validation par l'agent de validation de votre institution.</span>
              )}
            </p>

            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="quick-action-comment">
                {workflowAction.type === 'REJETER' ? (
                  <span>Motif du rejet <span className="text-red-400">*</span></span>
                ) : workflowAction.type === 'ANNULER' ? (
                  <span>Motif d'annulation (optionnel)</span>
                ) : (
                  <span>Commentaire (optionnel)</span>
                )}
              </label>
              <textarea
                id="quick-action-comment"
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                placeholder={
                  workflowAction.type === 'REJETER' 
                    ? 'Indiquez clairement la raison du rejet...' 
                    : workflowAction.type === 'ANNULER' 
                      ? 'Raison de l\'annulation...' 
                      : 'Ajoutez des notes ou détails importants...'
                }
                required={workflowAction.type === 'REJETER'}
                rows={3}
                className={`w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none transition-all ${
                  workflowAction.type === 'VALIDER' 
                    ? 'focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30' 
                    : workflowAction.type === 'REJETER' 
                      ? 'focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30' 
                      : workflowAction.type === 'ANNULER' 
                        ? 'focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30' 
                        : 'focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30'
                }`}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setWorkflowAction(null); setCommentaire(''); }}
                disabled={actionLoading}
                className="btn-secondary btn-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitWorkflowAction}
                disabled={actionLoading || (workflowAction.type === 'REJETER' && !commentaire.trim())}
                className={`btn-sm flex items-center gap-1.5 ${
                  workflowAction.type === 'VALIDER' 
                    ? 'btn-success' 
                    : workflowAction.type === 'REJETER' 
                      ? 'btn-danger' 
                      : workflowAction.type === 'ANNULER' 
                        ? 'btn-danger bg-amber-600 hover:bg-amber-700 border-none' 
                        : 'btn-primary'
                }`}
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                  workflowAction.type === 'VALIDER' ? <Check className="w-4 h-4" /> :
                  workflowAction.type === 'REJETER' ? <X className="w-4 h-4" /> :
                  workflowAction.type === 'ANNULER' ? <Ban className="w-4 h-4" /> : <Send className="w-4 h-4" />
                )}
                {workflowAction.type === 'VALIDER' 
                  ? (workflowAction.op.statut === 'ACCEPTE_BENEFICIAIRE' ? 'Comptabiliser' : 'Approuver')
                  : workflowAction.type === 'REJETER'
                    ? 'Confirmer le rejet'
                    : workflowAction.type === 'ANNULER'
                      ? 'Annuler l\'opération'
                      : 'Soumettre'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
