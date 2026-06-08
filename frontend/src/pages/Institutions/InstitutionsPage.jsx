import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Plus, Edit2, CheckCircle2, 
  XCircle, AlertTriangle, RefreshCw, X, HelpCircle, 
  MapPin, Phone, Mail, Globe, Calendar, Key, ShieldAlert
} from 'lucide-react';
import { institutionApi, zoneMonetaireApi } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

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
  const [stats, setStats] = useState(null);

  // Search and Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [page, setPage] = useState(0);
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

  useEffect(() => {
    fetchMetadata();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchInstitutions();
  }, [page, typeFilter, statutFilter]);

  const fetchStats = async () => {
    try {
      const res = await institutionApi.getStats();
      setStats(res.data);
    } catch (e) {
      console.warn('Erreur chargement stats:', e.message);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [zonesRes, banksRes] = await Promise.all([
        zoneMonetaireApi.findAll(),
        institutionApi.findAll({ type: 'BANQUE', size: 100 }),
      ]);
      setZones(zonesRes.data || []);
      setCorrespondantBanks(banksRes.data.content || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des référentiels (zones/banques)');
    }
  };

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const res = await institutionApi.findAll({
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        statut: statutFilter || undefined,
        page,
        size: 8,
      });
      setInstitutions(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (e) {
      toast.error('Erreur lors du chargement des institutions');
    } finally {
      setLoading(false);
    }
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

      {/* List Table */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code / Sigle</th>
              <th>Nom de l'Institution</th>
              <th>Type</th>
              <th>Zone / Pays</th>
              <th>Réf Microlink / Domiciliation</th>
              <th>Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(7)].map((_, c) => (
                    <td key={c}><div className="h-4 bg-dark-700 rounded w-3/4"></div></td>
                  ))}
                </tr>
              ))
            ) : institutions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-dark-400">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  Aucune institution correspondante trouvée.
                </td>
              </tr>
            ) : (
              institutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-white/5">
                  <td>
                    <div className="font-semibold text-white">{inst.code}</div>
                    <div className="text-xs text-dark-400">{inst.sigle || '—'}</div>
                  </td>
                  <td>
                    <button 
                      onClick={() => setViewDetailInst(inst)} 
                      className="font-medium text-white hover:text-primary-400 transition-colors text-left"
                    >
                      {inst.nom}
                    </button>
                  </td>
                  <td>
                    <span className="text-xs text-dark-200">{TYPE_LABELS[inst.typeInstitution]}</span>
                  </td>
                  <td>
                    <div className="text-xs text-white">{inst.zoneMonetaire?.code || '—'}</div>
                    <div className="text-[10px] text-dark-400">{inst.pays}</div>
                  </td>
                  <td>
                    {inst.typeInstitution === 'BANQUE' ? (
                      <div className="text-[11px] text-dark-300">
                        <div>BIC: <span className="text-white font-mono">{inst.codeBic || '—'}</span></div>
                        <div>CBR: <span className="text-white font-mono">{inst.codeBanqueRegional || '—'}</span></div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-dark-300">
                        <div className="font-mono text-primary-400 font-semibold">{inst.codeMicrolink || 'Généré à l\'activation'}</div>
                        <div className="text-[10px] text-dark-400 truncate max-w-40" title={inst.banqueCorrespondanteNom}>
                          Dom: {inst.banqueCorrespondanteNom || 'Non configuré'}
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUT_COLORS[inst.statut]}`}>
                      {inst.statut === 'ACTIF' ? 'Validée / Active' : inst.statut === 'INACTIF' ? 'Attente Validation' : 'Suspendue'}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewDetailInst(inst)}
                        className="p-1 hover:bg-white/5 text-dark-300 hover:text-white rounded"
                        title="Consulter"
                      >
                        <Globe className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => openEditModal(inst)}
                            className="p-1 hover:bg-white/5 text-dark-300 hover:text-primary-400 rounded"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {inst.statut === 'INACTIF' && (
                            <button 
                              onClick={() => handleStatusToggle(inst, 'ACTIF')}
                              className="p-1.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded hover:bg-green-500/20 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                              title="Valider et Activer l'institution"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Valider
                            </button>
                          )}

                          {inst.statut === 'ACTIF' && (
                            <button 
                              onClick={() => handleStatusToggle(inst, 'SUSPENDU')}
                              className="p-1 hover:bg-white/5 text-red-400 hover:text-red-300 rounded"
                              title="Suspendre"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}

                          {inst.statut === 'SUSPENDU' && (
                            <button 
                              onClick={() => handleStatusToggle(inst, 'ACTIF')}
                              className="p-1 hover:bg-white/5 text-green-400 hover:text-green-300 rounded"
                              title="Réactiver"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/5 text-xs text-dark-400">
            <span>Affichage de {institutions.length} sur {totalElements} institutions</span>
            <div className="pagination">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))} 
                disabled={page === 0}
                className="pagination-btn"
              >
                Précédent
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setPage(i)}
                  className={`pagination-btn ${page === i ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} 
                disabled={page === totalPages - 1}
                className="pagination-btn"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

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
                  <label htmlFor="zoneMonetaireId">Zone Monétaire</label>
                  <select 
                    id="zoneMonetaireId"
                    value={formData.zoneMonetaireId}
                    onChange={(e) => setFormData(prev => ({ ...prev, zoneMonetaireId: e.target.value }))}
                    className={`form-control ${formErrors.zoneMonetaireId ? 'border-red-500/50' : ''}`}
                  >
                    <option value="">Sélectionner une zone</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.libelle} ({z.code} - {z.devise})</option>
                    ))}
                  </select>
                  {formErrors.zoneMonetaireId && <p className="text-red-500 text-xs mt-1">{formErrors.zoneMonetaireId}</p>}
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
