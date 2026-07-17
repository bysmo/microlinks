import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Search, Plus, Edit2, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, X, HelpCircle, 
  MapPin, Phone, Mail, Globe, Calendar, Key, ShieldAlert
} from 'lucide-react';
import { institutionApi, zoneMonetaireApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import DataTable from '../../components/common/DataTable';

const TYPE_LABELS = {
  BANQUE: 'Banque',
  MICRO_FINANCE: 'Microfinance (SFD)',
  MESO_FINANCE: 'Mésofinance',
};

const STATUT_COLORS = {
  ACTIF: 'bg-green-500/10 text-green-400 border border-green-500/20',
  INACTIF: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  SUSPENDU: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function InstitutionsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN_PLATEFORME');

  // Lists and loading
  const [institutions, setInstitutions] = useState([]);
  const [zones, setZones] = useState([]);
  const [correspondantBanks, setCorrespondantBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [stats, setStats] = useState(null);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modals and selections
  const [showModal, setShowModal] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null); // null for create, object for edit
  const [viewDetailInst, setViewDetailInst] = useState(null); // object for details modal

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    sigle: '',
    typeInstitution: 'BANQUE',
    zoneMonetaireId: '',
    pays: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    banqueCorrespondanteId: '',
    dateAdhesion: '',
    codeBanqueRegional: '',
    codeBic: '',
    codeParticipantRtgs: '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Compteur de retry pour les zones monétaires
  const [zonesRetryCount, setZonesRetryCount] = useState(0);
  const zonesRetryRef = React.useRef(null);

  const columns = useMemo(() => [
    {
      header: 'Code / Sigle',
      accessorKey: 'code',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-slate-800">{row.original.code}</div>
          <div className="text-xs text-slate-400">{row.original.sigle || '—'}</div>
        </div>
      ),
      size: 110,
    },
    {
      header: "Nom de l'Institution",
      accessorKey: 'nom',
      cell: ({ row }) => (
        <button 
          onClick={() => setViewDetailInst(row.original)} 
          className="font-medium text-[#0B192C] hover:text-primary-500 hover:underline transition-colors text-left font-semibold"
        >
          {row.original.nom}
        </button>
      ),
      size: 240,
    },
    {
      header: 'Type',
      accessorKey: 'typeInstitution',
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-600 font-medium">{TYPE_LABELS[getValue()]}</span>
      ),
      size: 130,
    },
    {
      header: 'Zone / Pays',
      accessorKey: 'pays',
      cell: ({ row }) => (
        <div>
          <div className="text-xs text-slate-800 font-semibold">{row.original.zoneMonetaire?.code || '—'}</div>
          <div className="text-[10px] text-slate-400 font-medium">{row.original.pays}</div>
        </div>
      ),
      size: 110,
    },
    {
      header: 'Réf Microlink / Domiciliation',
      accessorKey: 'codeMicrolink',
      cell: ({ row }) => {
        const inst = row.original;
        return inst.typeInstitution === 'BANQUE' ? (
          <div className="text-[11px] text-slate-600">
            <div>BIC: <span className="text-slate-800 font-mono font-semibold">{inst.codeBic || '—'}</span></div>
            <div>CBR: <span className="text-slate-800 font-mono font-semibold">{inst.codeBanqueRegional || '—'}</span></div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-600">
            <div className="font-mono text-[#0B192C] font-semibold">{inst.codeMicrolink || 'Généré à l\'activation'}</div>
            <div className="text-[10px] text-slate-400 truncate max-w-40 font-medium" title={inst.banqueCorrespondanteNom}>
              Dom: {inst.banqueCorrespondanteNom || 'Non configuré'}
            </div>
          </div>
        );
      },
      size: 200,
    },
    {
      header: 'Statut',
      accessorKey: 'statut',
      cell: ({ getValue }) => (
        <span className={`badge ${STATUT_COLORS[getValue()]}`}>
          {getValue() === 'ACTIF' ? 'Validée / Active' : getValue() === 'INACTIF' ? 'Attente Validation' : 'Suspendue'}
        </span>
      ),
      size: 140,
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const inst = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button 
              onClick={() => setViewDetailInst(inst)}
              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
              title="Consulter"
            >
              <Globe className="w-4 h-4" />
            </button>

            {isAdmin && (
              <>
                <button 
                  onClick={() => openEditModal(inst)}
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-amber-500 rounded transition-colors"
                  title="Modifier"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {inst.statut === 'INACTIF' && (
                  <button 
                    onClick={() => handleStatusToggle(inst, 'ACTIF')}
                    className="px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded hover:bg-green-100 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                    title="Valider et Activer l'institution"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valider
                  </button>
                )}

                {inst.statut === 'ACTIF' && (
                  <button 
                    onClick={() => handleStatusToggle(inst, 'SUSPENDU')}
                    className="p-1 hover:bg-slate-100 text-red-500 hover:text-red-600 rounded transition-colors"
                    title="Suspendre"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}

                {inst.statut === 'SUSPENDU' && (
                  <button 
                    onClick={() => handleStatusToggle(inst, 'ACTIF')}
                    className="p-1 hover:bg-slate-100 text-green-500 hover:text-green-600 rounded transition-colors"
                    title="Réactiver"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
      size: 140,
    }
  ], [isAdmin]);


  useEffect(() => {
    fetchZones();
    fetchStats();
  }, []);

  useEffect(() => {
    // Recharger les banques correspondantes quand les institutions sont disponibles
    if (zones.length > 0) {
      fetchCorrespondantBanks();
    }
  }, [zones]);

  useEffect(() => {
    fetchInstitutions();
  }, [page, typeFilter, statutFilter, pageSize]);

  // Construit un message d'erreur lisible à partir d'une erreur Axios.
  const describeError = (e, fallback) => {
    if (e?.response) {
      // Le serveur a répondu avec un statut d'erreur
      const status = e.response.status;
      const serverMsg = e.response.data?.message;
      if (status === 401) return "Session expirée ou non authentifiée. Veuillez vous reconnecter.";
      if (status === 403) return "Accès refusé : droits insuffisants pour cette ressource.";
      if (status === 503) return "Service des institutions momentanément indisponible. Réessayez dans un instant.";
      return serverMsg || `${fallback} (code ${status})`;
    }
    if (e?.request) {
      // La requête est partie mais aucune réponse (réseau/CORS/passerelle injoignable)
      return `${fallback} : impossible de joindre le serveur (réseau, CORS ou passerelle indisponible).`;
    }
    return fallback;
  };

  const fetchStats = async () => {
    try {
      const res = await institutionApi.getStats();
      setStats(res.data);
    } catch (e) {
      // Les statistiques sont non bloquantes : on journalise sans alerter l'utilisateur
      console.warn('Erreur chargement stats:', describeError(e, 'Statistiques indisponibles'), e);
    }
  };

  // Charge les zones monétaires avec retry automatique (backoff exponentiel)
  // pour gérer le démarrage progressif des services Docker
  const fetchZones = async (attempt = 0) => {
    const MAX_ATTEMPTS = 6;
    try {
      const zonesRes = await zoneMonetaireApi.findAll();
      const data = zonesRes.data || [];
      setZones(data);
      setZonesRetryCount(0);
      if (zonesRetryRef.current) {
        clearTimeout(zonesRetryRef.current);
        zonesRetryRef.current = null;
      }
      if (data.length === 0 && attempt < MAX_ATTEMPTS) {
        // DB prête mais pas encore migrée : retry
        const delay = Math.min(2000 * Math.pow(1.5, attempt), 30000);
        console.warn(`Zones monétaires vides, retry dans ${delay}ms (tentative ${attempt + 1}/${MAX_ATTEMPTS})`);
        zonesRetryRef.current = setTimeout(() => fetchZones(attempt + 1), delay);
      }
    } catch (e) {
      const isNetworkError = !e?.response;
      if (attempt < MAX_ATTEMPTS) {
        // Retry silencieux pendant le démarrage des services
        const delay = Math.min(3000 * Math.pow(1.5, attempt), 30000);
        setZonesRetryCount(attempt + 1);
        console.warn(`Zones indisponibles (tentative ${attempt + 1}/${MAX_ATTEMPTS}), retry dans ${delay}ms :`, e?.message);
        zonesRetryRef.current = setTimeout(() => fetchZones(attempt + 1), delay);
      } else {
        // Toutes les tentatives épuisées : afficher l'erreur
        console.error('Zones monétaires inaccessibles après toutes les tentatives:', e);
        if (isNetworkError) {
          toast.error('Impossible de joindre le serveur. Vérifiez que les services sont démarrés.', { id: 'zones-error', duration: 8000 });
        } else {
          toast.error('Erreur lors du chargement des zones monétaires', { id: 'zones-error' });
        }
      }
    }
  };

  // Charge les banques correspondantes (nécessite un token JWT valide)
  const fetchCorrespondantBanks = async () => {
    try {
      const banksRes = await institutionApi.findAll({ type: 'BANQUE', size: 100 });
      setCorrespondantBanks(banksRes.data?.content || []);
    } catch (e) {
      console.warn('Banques correspondantes indisponibles:', e?.message);
    }
  };

  const fetchInstitutions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await institutionApi.findAll({
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        statut: statutFilter || undefined,
        page,
        size: pageSize,
      });
      setInstitutions(res.data?.content || []);
      setTotalPages(res.data?.totalPages || 0);
      setTotalElements(res.data?.totalElements || 0);
    } catch (e) {
      const msg = describeError(e, 'Erreur lors du chargement des institutions');
      console.error('Erreur chargement institutions:', msg, e);
      setLoadError(msg);
      setInstitutions([]);
      setTotalPages(0);
      setTotalElements(0);
      toast.error(msg, { id: 'institutions-error' }); // évite les toasts dupliqués
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchZones();
    fetchStats();
    fetchInstitutions();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    fetchInstitutions();
  };

  const handleResetSearch = () => {
    setSearch('');
    setPage(0);
    setTimeout(() => fetchInstitutions(), 50);
  };

  const openCreateModal = () => {
    setSelectedInst(null);
    setFormData({
      code: '',
      nom: '',
      sigle: '',
      typeInstitution: 'BANQUE',
      zoneMonetaireId: zones[0]?.id || '',
      pays: '',
      adresse: '',
      telephone: '',
      email: '',
      siteWeb: '',
      banqueCorrespondanteId: '',
      dateAdhesion: new Date().toISOString().split('T')[0],
      codeBanqueRegional: '',
      codeBic: '',
      codeParticipantRtgs: '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (inst) => {
    setSelectedInst(inst);
    setFormData({
      code: inst.code || '',
      nom: inst.nom || '',
      sigle: inst.sigle || '',
      typeInstitution: inst.typeInstitution || 'BANQUE',
      zoneMonetaireId: inst.zoneMonetaire?.id || '',
      pays: inst.pays || '',
      adresse: inst.adresse || '',
      telephone: inst.telephone || '',
      email: inst.email || '',
      siteWeb: inst.siteWeb || '',
      banqueCorrespondanteId: inst.banqueCorrespondanteId || '',
      dateAdhesion: inst.dateAdhesion || '',
      codeBanqueRegional: inst.codeBanqueRegional || '',
      codeBic: inst.codeBic || '',
      codeParticipantRtgs: inst.codeParticipantRtgs || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.code.trim()) errors.code = 'Le code est obligatoire';
    else if (!/^[A-Z0-9_-]+$/.test(formData.code.toUpperCase())) {
      errors.code = 'Le code doit être composé de majuscules et chiffres';
    }
    
    if (!formData.nom.trim()) errors.nom = 'Le nom est obligatoire';
    if (!formData.pays.trim()) errors.pays = 'Le pays est obligatoire';
    else if (formData.pays.trim().length < 2 || formData.pays.trim().length > 3) {
      errors.pays = 'Code pays invalide (ISO 2 ou 3 lettres)';
    }

    if (!formData.zoneMonetaireId) errors.zoneMonetaireId = 'La zone monétaire est obligatoire';

    if (formData.typeInstitution === 'BANQUE') {
      if (!formData.codeBanqueRegional?.trim()) errors.codeBanqueRegional = 'Code banque régional obligatoire';
      if (!formData.codeBic?.trim()) errors.codeBic = 'Code BIC/SWIFT obligatoire';
      if (!formData.codeParticipantRtgs?.trim()) errors.codeParticipantRtgs = 'Code participant RTGS obligatoire';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Format d'email invalide";
    }

    if (formData.telephone && !/^\+?[0-9\s\-()]{7,20}$/.test(formData.telephone)) {
      errors.telephone = 'Format de téléphone invalide';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formattedData = {
      ...formData,
      code: formData.code.toUpperCase(),
      pays: formData.pays.toUpperCase(),
      banqueCorrespondanteId: formData.typeInstitution !== 'BANQUE' && formData.banqueCorrespondanteId ? formData.banqueCorrespondanteId : null,
      codeBanqueRegional: formData.typeInstitution === 'BANQUE' ? formData.codeBanqueRegional : null,
      codeBic: formData.typeInstitution === 'BANQUE' ? formData.codeBic : null,
      codeParticipantRtgs: formData.typeInstitution === 'BANQUE' ? formData.codeParticipantRtgs : null,
    };

    try {
      if (selectedInst) {
        await institutionApi.update(selectedInst.id, formattedData);
        toast.success('Institution mise à jour avec succès');
      } else {
        await institutionApi.create(formattedData);
        toast.success('Institution créée avec statut INACTIF (en attente de validation)');
      }
      setShowModal(false);
      fetchInstitutions();
      fetchStats();
    } catch (err) {
      const errMsg = err.response?.data?.message || "Erreur lors de l'enregistrement de l'institution";
      toast.error(errMsg);
    }
  };

  const handleStatusToggle = async (inst, targetStatus) => {
    try {
      await institutionApi.changerStatut(inst.id, targetStatus);
      toast.success(
        targetStatus === 'ACTIF' 
          ? `Institution "${inst.nom}" validée et activée ! (Code Microlink et accès générés)`
          : `Institution "${inst.nom}" désactivée.`
      );
      fetchInstitutions();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up" id="institutions-page">
      {/* Header Banner */}
      <div className="glass-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#0B192C]" />
            Gestion des Institutions
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Création, validation et administration des banques et micro/méso-finances participantes.
          </p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="btn-primary" id="btn-create-institution">
            <Plus className="w-4 h-4" />
            Nouvelle Institution
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 flex flex-col justify-between bg-white">
            <span className="text-slate-500 text-xs font-semibold">Total Réseau</span>
            <span className="text-slate-800 text-2xl font-bold mt-2">{stats.total}</span>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between bg-white">
            <span className="text-slate-500 text-xs font-semibold">Banques</span>
            <span className="text-slate-800 text-2xl font-bold mt-2">{stats.banques}</span>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between bg-white">
            <span className="text-slate-500 text-xs font-semibold">Microfinances (SFD)</span>
            <span className="text-slate-800 text-2xl font-bold mt-2">{stats.microFinances}</span>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between bg-white">
            <span className="text-slate-500 text-xs font-semibold">Mésofinances</span>
            <span className="text-slate-800 text-2xl font-bold mt-2">{stats.mesoFinances}</span>
          </div>
          <div className="glass-card p-4 flex flex-col justify-between bg-green-50/50 border-green-200">
            <span className="text-green-800 text-xs font-bold">Actives / Validées</span>
            <span className="text-green-650 text-2xl font-bold mt-2">{stats.actives}</span>
          </div>
        </div>
      )}

      {/* Filters & Searching */}
      <div className="glass-card p-4 bg-dark-800/20 border-dark-700/30 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-dark-400" />
            <input 
              type="text" 
              placeholder="Rechercher par nom, code, sigle..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control pl-10 w-full"
            />
          </div>
          <button type="submit" className="btn bg-dark-700 border-dark-600 text-white hover:bg-dark-600 px-4">
            Filtrer
          </button>
          {search && (
            <button type="button" onClick={handleResetSearch} className="btn-ghost text-xs">
              Réinitialiser
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={typeFilter} 
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="form-control py-2 text-xs w-40"
          >
            <option value="">Tous les Types</option>
            <option value="BANQUE">Banques</option>
            <option value="MICRO_FINANCE">Microfinances</option>
            <option value="MESO_FINANCE">Mésofinances</option>
          </select>

          <select 
            value={statutFilter} 
            onChange={(e) => { setStatutFilter(e.target.value); setPage(0); }}
            className="form-control py-2 text-xs w-40"
          >
            <option value="">Tous les Statuts</option>
            <option value="ACTIF">Active</option>
            <option value="INACTIF">Inactive (En attente)</option>
            <option value="SUSPENDU">Suspendue</option>
          </select>
        </div>
      </div>

      {/* Error banner with retry */}
      {loadError && !loading && (
        <div className="glass-card p-4 border border-red-500/30 bg-red-500/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Impossible de charger les institutions</p>
              <p className="text-xs text-red-400/90">{loadError}</p>
            </div>
          </div>
          <button onClick={handleRetry} className="btn-secondary flex items-center gap-2 text-xs whitespace-nowrap">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      )}

      {/* List Table */}
      <DataTable
        data={institutions}
        columns={columns}
        totalElements={totalElements}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        isLoading={loading}
        emptyMessage="Aucune institution correspondante trouvée."
      />

      {/* Creation / Edition Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3>
                {selectedInst ? `Modifier l'institution : ${selectedInst.nom}` : 'Créer une nouvelle institution'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body space-y-6">
              {/* Type Selection */}
              <div className="grid grid-cols-3 gap-4">
                {['BANQUE', 'MICRO_FINANCE', 'MESO_FINANCE'].map((type) => (
                  <label 
                    key={type}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.typeInstitution === type 
                        ? 'border-[#0B192C] bg-[#0B192C]/5 text-[#0B192C]' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-350'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="typeInstitution" 
                      value={type} 
                      checked={formData.typeInstitution === type}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        typeInstitution: e.target.value,
                        // Reset banking fields depending on type
                        banqueCorrespondanteId: '',
                        codeBanqueRegional: '',
                        codeBic: '',
                        codeParticipantRtgs: ''
                      }))}
                      className="sr-only"
                    />
                    <Building2 className="w-6 h-6 mb-2" />
                    <span className="text-xs font-semibold text-center">{TYPE_LABELS[type]}</span>
                  </label>
                ))}
              </div>

              {/* Form Fields Section 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="code">Code Unique (Alphanumérique, Majuscules)</label>
                  <input 
                    type="text" 
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    disabled={!!selectedInst}
                    placeholder="Ex: CG-BGFI"
                    className={`form-control ${formErrors.code ? 'border-red-500/50' : ''}`}
                  />
                  {formErrors.code && <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="sigle">Sigle / Abréviation</label>
                  <input 
                    type="text" 
                    id="sigle"
                    value={formData.sigle}
                    onChange={(e) => setFormData(prev => ({ ...prev, sigle: e.target.value }))}
                    placeholder="Ex: BGFI"
                    className="form-control"
                  />
                </div>

                <div className="form-group md:col-span-2">
                  <label htmlFor="nom">Nom de l'Institution</label>
                  <input 
                    type="text" 
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                    placeholder="Ex: BGFI Bank Congo"
                    className={`form-control ${formErrors.nom ? 'border-red-500/50' : ''}`}
                  />
                  {formErrors.nom && <p className="text-red-550 text-xs mt-1">{formErrors.nom}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="zoneMonetaireId">
                    Zone Monétaire
                    {zonesRetryCount > 0 && zones.length === 0 && (
                      <span className="ml-2 text-xs text-yellow-500 font-normal">
                        ⏳ Chargement... (tentative {zonesRetryCount})
                      </span>
                    )}
                  </label>
                  <select 
                    id="zoneMonetaireId"
                    value={formData.zoneMonetaireId}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoneMonetaireId: e.target.value }))}
                    className={`form-control ${formErrors.zoneMonetaireId ? 'border-red-500/50' : ''}`}
                    disabled={zones.length === 0 && zonesRetryCount > 0}
                  >
                    {zones.length === 0 && zonesRetryCount > 0 ? (
                      <option value="">⏳ Chargement des zones en cours...</option>
                    ) : (
                      <>
                        <option value="">Sélectionner une zone</option>
                        {zones.map(z => (
                          <option key={z.id} value={z.id}>{z.libelle} ({z.code} - {z.devise})</option>
                        ))}
                      </>
                    )}
                  </select>
                  {formErrors.zoneMonetaireId && <p className="text-red-500 text-xs mt-1">{formErrors.zoneMonetaireId}</p>}
                  {zones.length === 0 && zonesRetryCount === 0 && (
                    <p className="text-yellow-600 text-xs mt-1">
                      ⚠️ Aucune zone disponible. 
                      <button type="button" className="underline ml-1" onClick={() => fetchZones()}>Recharger</button>
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="pays">Code Pays ISO (2 ou 3 lettres)</label>
                  <input 
                    type="text" 
                    id="pays"
                    value={formData.pays}
                    onChange={(e) => setFormData(prev => ({ ...prev, pays: e.target.value.toUpperCase() }))}
                    placeholder="Ex: CG"
                    maxLength={3}
                    className={`form-control ${formErrors.pays ? 'border-red-500/50' : ''}`}
                  />
                  {formErrors.pays && <p className="text-red-500 text-xs mt-1">{formErrors.pays}</p>}
                </div>
              </div>

              {/* Dynamic Banking info blocks */}
              {formData.typeInstitution === 'BANQUE' ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Informations de Règlement Bancaire
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label htmlFor="codeBanqueRegional">Code Banque Régional</label>
                      <input 
                        type="text" 
                        id="codeBanqueRegional"
                        value={formData.codeBanqueRegional}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBanqueRegional: e.target.value }))}
                        placeholder="Ex: 10045"
                        className={`form-control ${formErrors.codeBanqueRegional ? 'border-red-500/50' : ''}`}
                      />
                      {formErrors.codeBanqueRegional && <p className="text-red-500 text-xs mt-1">{formErrors.codeBanqueRegional}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="codeBic">Code BIC / SWIFT</label>
                      <input 
                        type="text" 
                        id="codeBic"
                        value={formData.codeBic}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeBic: e.target.value.toUpperCase() }))}
                        placeholder="Ex: BGFICGBX"
                        maxLength={11}
                        className={`form-control ${formErrors.codeBic ? 'border-red-500/50' : ''}`}
                      />
                      {formErrors.codeBic && <p className="text-red-550 text-xs mt-1">{formErrors.codeBic}</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="codeParticipantRtgs">Code Participant RTGS</label>
                      <input 
                        type="text" 
                        id="codeParticipantRtgs"
                        value={formData.codeParticipantRtgs}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeParticipantRtgs: e.target.value }))}
                        placeholder="Ex: RTGS-BGFI-CG"
                        className={`form-control ${formErrors.codeParticipantRtgs ? 'border-red-500/50' : ''}`}
                      />
                      {formErrors.codeParticipantRtgs && <p className="text-red-500 text-xs mt-1">{formErrors.codeParticipantRtgs}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                  <h4 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Compensation & Code d'accès
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="banqueCorrespondanteId">Banque Correspondante Domiciliataire</label>
                      <select 
                        id="banqueCorrespondanteId"
                        value={formData.banqueCorrespondanteId}
                        onChange={(e) => setFormData(prev => ({ ...prev, banqueCorrespondanteId: e.target.value }))}
                        className="form-control"
                      >
                        <option value="">Sélectionner une banque</option>
                        {correspondantBanks.map(b => (
                          <option key={b.id} value={b.id}>{b.nom} ({b.code})</option>
                        ))}
                      </select>
                      <p className="text-slate-500 text-[10px] mt-1">
                        Requis pour domicilier les transferts et compensation de cette micro/mésofinance.
                      </p>
                    </div>

                    <div className="form-group">
                      <label>Code Microlink (Généré)</label>
                      <div className="form-control bg-slate-100 border-slate-200 text-slate-500 font-mono flex items-center h-[42px]">
                        {selectedInst?.codeMicrolink || 'Généré automatiquement (ex: ML-' + (formData.pays || 'SN') + '-0001)'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Fields Section 2 (Contacts) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="telephone">Téléphone</label>
                  <input 
                    type="text" 
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                    placeholder="Ex: +242 06 123 4567"
                    className={`form-control ${formErrors.telephone ? 'border-red-500/50' : ''}`}
                  />
                  {formErrors.telephone && <p className="text-red-500 text-xs mt-1">{formErrors.telephone}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email de Contact</label>
                  <input 
                    type="email" 
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ex: contact@banque.com"
                    className={`form-control ${formErrors.email ? 'border-red-500/50' : ''}`}
                  />
                  {formErrors.email && <p className="text-red-550 text-xs mt-1">{formErrors.email}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="siteWeb">Site Web</label>
                  <input 
                    type="text" 
                    id="siteWeb"
                    value={formData.siteWeb}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteWeb: e.target.value }))}
                    placeholder="Ex: https://www.banque.com"
                    className="form-control"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateAdhesion">Date d'Adhésion au Réseau</label>
                  <input 
                    type="date" 
                    id="dateAdhesion"
                    value={formData.dateAdhesion}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateAdhesion: e.target.value }))}
                    className="form-control font-sans"
                  />
                </div>

                <div className="form-group md:col-span-2">
                  <label htmlFor="adresse">Adresse Physique</label>
                  <textarea 
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Ex: Boulevard Denis Sassou Nguesso, Brazzaville"
                    rows={2}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="btn-danger"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary px-6">
                  {selectedInst ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewDetailInst && (
        <div className="modal-overlay">
          <div className="modal-content max-w-xl">
            <div className="modal-header">
              <h3 className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Fiche Institution : {viewDetailInst.nom}
              </h3>
              <button onClick={() => setViewDetailInst(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body space-y-6">
              {/* Header profile */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="w-14 h-14 rounded-xl bg-[#0B192C]/10 border border-[#0B192C]/20 flex items-center justify-center text-[#0B192C]">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-slate-900 font-bold text-lg">{viewDetailInst.nom}</h4>
                    {viewDetailInst.sigle && (
                      <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                        {viewDetailInst.sigle}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs font-semibold uppercase mt-0.5 tracking-wider">
                    {TYPE_LABELS[viewDetailInst.typeInstitution]}
                  </p>
                </div>
              </div>

              {/* Status details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-3 flex flex-col bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">Statut Réseau</span>
                  <span className="text-sm font-semibold text-slate-900 mt-1">
                    {viewDetailInst.statut === 'ACTIF' ? '🟢 Validé / Actif' : viewDetailInst.statut === 'INACTIF' ? '🟡 En attente' : '🔴 Suspendu'}
                  </span>
                </div>
                <div className="glass-card p-3 flex flex-col bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">Zone Monétaire / Pays</span>
                  <span className="text-sm font-semibold text-slate-900 mt-1">
                    {viewDetailInst.zoneMonetaire?.libelle} ({viewDetailInst.zoneMonetaire?.code}) / {viewDetailInst.pays}
                  </span>
                </div>
              </div>

              {/* Banking & Routing credentials */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                  Routage & Compensation
                </h4>
                {viewDetailInst.typeInstitution === 'BANQUE' ? (
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Code Banque Régional</span>
                      <span className="text-slate-800 font-mono font-medium">{viewDetailInst.codeBanqueRegional || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Code BIC / SWIFT</span>
                      <span className="text-slate-800 font-mono font-medium">{viewDetailInst.codeBic || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Code Participant RTGS</span>
                      <span className="text-slate-800 font-mono font-medium">{viewDetailInst.codeParticipantRtgs || '—'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-200">
                      <span className="text-slate-500">Code Microlink (Inter-SFD)</span>
                      <span className="text-[#0B192C] font-mono font-bold">{viewDetailInst.codeMicrolink || 'Non activé'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Banque Correspondante</span>
                      <span className="text-slate-800 font-medium">{viewDetailInst.banqueCorrespondanteNom || 'Non configurée'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              <div className="space-y-2 text-xs">
                <h4 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider mb-3">
                  Informations de Contact & Adhésion
                </h4>
                <div className="flex items-center gap-3 py-1.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{viewDetailInst.adresse || 'Aucune adresse renseignée'}</span>
                </div>
                <div className="flex items-center gap-3 py-1.5 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{viewDetailInst.telephone || 'Aucun téléphone renseigné'}</span>
                </div>
                <div className="flex items-center gap-3 py-1.5 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{viewDetailInst.email || 'Aucun email renseigné'}</span>
                </div>
                <div className="flex items-center gap-3 py-1.5 text-slate-700">
                  <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{viewDetailInst.siteWeb || 'Aucun site web renseigné'}</span>
                </div>
                <div className="flex items-center gap-3 py-1.5 text-slate-700">
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>Adhésion au réseau : {viewDetailInst.dateAdhesion ? new Date(viewDetailInst.dateAdhesion).toLocaleDateString('fr-FR') : 'Non renseignée'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setViewDetailInst(null)} 
                className="btn-secondary px-6 py-2 text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
