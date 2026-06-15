import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, UploadCloud, RefreshCw, 
  CheckCircle2, XCircle, AlertOctagon, Users, Search, 
  ArrowRight, FileSpreadsheet, Info, Settings, Database, 
  Filter, Plus, Trash2, Edit2, Globe, FileText, ChevronRight
} from 'lucide-react';
import { operationApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AmlDashboardPage() {
  const [activeTab, setActiveTab] = useState('alerts'); // alerts, sanctions, sources
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deciding, setDeciding] = useState(false);

  // Data states
  const [suspendedOps, setSuspendedOps] = useState([]);
  const [sanctions, setSanctions] = useState([]);
  const [sources, setSources] = useState([]);

  // Filter states for sanctions database
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterCountry, setFilterCountry] = useState('ALL');
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Review modal state
  const [selectedOp, setSelectedOp] = useState(null);
  const [decisionComment, setDecisionComment] = useState('');

  // Source form states
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [sourceForm, setSourceForm] = useState({
    nom: '',
    lienWeb: '',
    formatFichier: 'EXCEL',
    description: ''
  });

  // Pagination for suspended queue
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchSuspendedQueue = async () => {
    setLoading(true);
    try {
      const res = await operationApi.getSuspendedAml({ page, size: 10 });
      setSuspendedOps(res.data.content || []);
      setTotalElements(res.data.totalElements || 0);
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger la file d'attente AML.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSanctions = async () => {
    try {
      const res = await operationApi.getSanctions();
      const list = res.data || [];
      setSanctions(list);
      // Auto-select first person to display details if list not empty
      if (list.length > 0 && !selectedPerson) {
        setSelectedPerson(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await operationApi.getAmlSources();
      setSources(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSuspendedQueue();
    fetchSanctions();
    fetchSources();
  }, [page]);

  const handleSyncWeb = async () => {
    setSyncing(true);
    try {
      await operationApi.syncSanctionsWeb();
      toast.success("Synchronisation des listes réussie !");
      fetchSanctions();
      fetchSources();
    } catch (e) {
      toast.error("Échec de la synchronisation web.");
    } finally {
      setSyncing(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await operationApi.importSanctionsExcel(formData);
      toast.success("Fichier Excel importé et traité !");
      fetchSanctions();
    } catch (err) {
      toast.error("Échec de l'importation. Vérifiez le format.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDecision = async (decision) => {
    if (!selectedOp) return;
    if (!decisionComment.trim()) {
      toast.error("Un commentaire de justification est obligatoire.");
      return;
    }

    setDeciding(true);
    try {
      await operationApi.decideAml(selectedOp.id, decision, decisionComment);
      toast.success(
        decision === 'APPROUVER' 
          ? "Opération libérée et ré-insérée dans le workflow." 
          : "Opération bloquée et rejetée définitivement."
      );
      setSelectedOp(null);
      setDecisionComment('');
      fetchSuspendedQueue();
    } catch (err) {
      toast.error("Erreur de soumission de la décision.");
    } finally {
      setDeciding(false);
    }
  };

  // Source CRUD Handlers
  const handleSaveSource = async (e) => {
    e.preventDefault();
    if (!sourceForm.nom.trim()) {
      toast.error("Le nom de la source est requis.");
      return;
    }

    try {
      if (editingSource) {
        await operationApi.updateAmlSource(editingSource.id, sourceForm);
        toast.success("Source de sanctions modifiée avec succès.");
      } else {
        await operationApi.createAmlSource(sourceForm);
        toast.success("Source de sanctions créée avec succès.");
      }
      setShowSourceModal(false);
      setEditingSource(null);
      setSourceForm({ nom: '', lienWeb: '', formatFichier: 'EXCEL', description: '' });
      fetchSources();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de la source.");
    }
  };

  const handleDeleteSource = async (id) => {
    if (!confirm("Voulez-vous vraiment supprimer cette source ?")) return;
    try {
      await operationApi.deleteAmlSource(id);
      toast.success("Source supprimée.");
      fetchSources();
    } catch (err) {
      toast.error("Impossible de supprimer la source.");
    }
  };

  const openEditSource = (src) => {
    setEditingSource(src);
    setSourceForm({
      nom: src.nom,
      lienWeb: src.lienWeb || '',
      formatFichier: src.formatFichier || 'EXCEL',
      description: src.description || ''
    });
    setShowSourceModal(true);
  };

  // Extracted lists for filtering dropdowns
  const uniqueSources = ['ALL', ...new Set(sanctions.map(s => s.source).filter(Boolean))];
  const uniqueCountries = ['ALL', ...new Set(sanctions.map(s => s.pays).filter(Boolean))];

  // Dynamic filter check
  const filteredSanctions = sanctions.filter(s => {
    const matchesSearch = s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.details && s.details.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'ALL' || s.category === filterType;
    const matchesSource = filterSource === 'ALL' || s.source === filterSource;
    const matchesCountry = filterCountry === 'ALL' || s.pays === filterCountry;
    return matchesSearch && matchesType && matchesSource && matchesCountry;
  });

  return (
    <div className="space-y-6 animate-slide-up" id="aml-dashboard-page">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-dark-700/50 pb-5">
        <div>
          <h1 className="text-white text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            Module AML/CFT & Conformité
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Filtrage en temps réel des flux financiers, gestion des bases souveraines et contrôle d'accès réglementaire.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 bg-dark-900 hover:bg-dark-800 text-white border border-dark-700 hover:border-dark-600 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 text-xs font-semibold">
            <UploadCloud className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
            {uploading ? 'Traitement...' : 'Charger Excel'}
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleExcelUpload} 
              className="hidden" 
              disabled={uploading}
            />
          </label>

          <button
            onClick={handleSyncWeb}
            disabled={syncing}
            className="btn-primary btn-sm flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Mise à jour Web
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex gap-2 p-1 bg-dark-900/60 border border-dark-700/40 rounded-xl max-w-md">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'alerts' 
              ? 'bg-primary-500 text-dark-950 shadow-md shadow-primary-500/10' 
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          Alertes ({totalElements})
        </button>

        <button
          onClick={() => setActiveTab('sanctions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'sanctions' 
              ? 'bg-primary-500 text-dark-950 shadow-md shadow-primary-500/10' 
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <Database className="w-4 h-4" />
          Base Sanctions ({sanctions.length})
        </button>

        <button
          onClick={() => setActiveTab('sources')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
            activeTab === 'sources' 
              ? 'bg-primary-500 text-dark-950 shadow-md shadow-primary-500/10' 
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Flux & Sources ({sources.length})
        </button>
      </div>

      {/* ===================== TAB: ALERTS ===================== */}
      {activeTab === 'alerts' && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-dark-700 pb-3">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-500 animate-pulse" />
              File d'attente des transactions suspendues pour évaluation de conformité
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400">
              Gel en temps réel
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : suspendedOps.length === 0 ? (
            <div className="py-16 text-center text-dark-500 space-y-3">
              <ShieldCheck className="w-12 h-12 text-emerald-500 opacity-60 mx-auto" />
              <div className="max-w-md mx-auto">
                <p className="text-sm font-semibold text-white">Aucun gel en cours</p>
                <p className="text-xs text-dark-400 mt-1">Toutes les opérations soumises ont passé avec succès l'évaluation automatisée de la liste noire.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-dark-700 text-dark-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-2">Référence</th>
                    <th className="py-3 px-2">Émetteur</th>
                    <th className="py-3 px-2">Donneur d'ordre</th>
                    <th className="py-3 px-2">Bénéficiaire</th>
                    <th className="py-3 px-2 text-right">Montant</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {suspendedOps.map((op) => (
                    <tr 
                      key={op.id} 
                      className="border-b border-dark-800 hover:bg-dark-800/40 text-dark-200 transition-colors"
                    >
                      <td className="py-3 px-2 font-mono text-white font-semibold">{op.referenceUnique}</td>
                      <td className="py-3 px-2 truncate max-w-[150px]">{op.nomInstitutionEmettrice}</td>
                      <td className="py-3 px-2 text-red-300 font-medium">{op.nomDonneurOrdre}</td>
                      <td className="py-3 px-2 text-red-300 font-medium">{op.nomBeneficiaire}</td>
                      <td className="py-3 px-2 text-right text-white font-bold">
                        {op.montant?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {op.devise}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => setSelectedOp(op)}
                          className="bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/30 px-3.5 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-wider transition-all duration-200"
                        >
                          Évaluer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalElements > 10 && (
                <div className="flex justify-between items-center pt-4 text-xs text-dark-400">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <span>Page {page + 1} sur {Math.ceil(totalElements / 10)}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * 10 >= totalElements}
                    className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB: SANCTIONS DATABASE ===================== */}
      {activeTab === 'sanctions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Main List Section (2/3 width) */}
          <div className="lg:col-span-2 glass-card p-5 space-y-4">
            
            {/* Search and Filters Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-dark-700 pb-3">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-400" />
                  Base de données des entités et PEPs
                </h3>
                <span className="text-[11px] text-dark-400 font-medium">
                  {filteredSanctions.length} entités correspondantes
                </span>
              </div>

              {/* Filters bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-dark-900/40 p-3 border border-dark-700/30 rounded-xl">
                
                {/* Search query input */}
                <div className="relative sm:col-span-1">
                  <Search className="w-4 h-4 text-dark-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nom, détails..."
                    className="w-full bg-dark-950/80 border border-dark-700 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50"
                  />
                </div>

                {/* Filter Type */}
                <div className="flex items-center gap-1.5 bg-dark-950/80 border border-dark-700 rounded-lg px-2.5">
                  <Filter className="w-3.5 h-3.5 text-dark-400" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-transparent text-white text-xs w-full py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-dark-950">Tous types</option>
                    <option value="SANCTION" className="bg-dark-950">SANCTION</option>
                    <option value="PPE" className="bg-dark-950">PPE (Exposé)</option>
                  </select>
                </div>

                {/* Filter Source */}
                <div className="flex items-center gap-1.5 bg-dark-950/80 border border-dark-700 rounded-lg px-2.5">
                  <Globe className="w-3.5 h-3.5 text-dark-400" />
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="bg-transparent text-white text-xs w-full py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-dark-950">Toutes sources</option>
                    {uniqueSources.filter(s => s !== 'ALL').map(s => (
                      <option key={s} value={s} className="bg-dark-950">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Country */}
                <div className="flex items-center gap-1.5 bg-dark-950/80 border border-dark-700 rounded-lg px-2.5">
                  <Globe className="w-3.5 h-3.5 text-dark-400" />
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="bg-transparent text-white text-xs w-full py-2 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-dark-950">Tous pays</option>
                    {uniqueCountries.filter(c => c !== 'ALL').map(c => (
                      <option key={c} value={c} className="bg-dark-950">{c}</option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            {/* Entities Table */}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
              {filteredSanctions.length === 0 ? (
                <div className="py-16 text-center text-dark-500">
                  <Users className="w-10 h-10 text-dark-600 mx-auto mb-2 opacity-50" />
                  Aucune entité correspondante aux filtres appliqués.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-dark-700 text-dark-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-2">Nom de l'entité / Personne</th>
                      <th className="py-3 px-2">Type</th>
                      <th className="py-3 px-2">Source</th>
                      <th className="py-3 px-2">Pays</th>
                      <th className="py-3 px-2 text-right">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSanctions.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedPerson(item)}
                        className={`border-b border-dark-800 hover:bg-dark-800/30 cursor-pointer text-dark-200 transition-colors ${
                          selectedPerson?.id === item.id ? 'bg-primary-500/5 border-l-2 border-l-primary-400' : ''
                        }`}
                      >
                        <td className="py-3.5 px-2 font-bold text-white flex items-center gap-2">
                          {item.nom}
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.category === 'SANCTION' 
                              ? 'bg-red-500/10 text-red-400' 
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-medium">{item.source}</td>
                        <td className="py-3.5 px-2 text-dark-300">{item.pays || 'Non spécifié'}</td>
                        <td className="py-3.5 px-2 text-right">
                          <ChevronRight className="w-4 h-4 ml-auto text-dark-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Profile Details Panel (1/3 width) */}
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-5 sticky top-6">
              <div className="flex items-center gap-2 border-b border-dark-700 pb-3">
                <Info className="w-4 h-4 text-primary-400" />
                <h3 className="text-white font-bold text-sm">Profil d'entité complet</h3>
              </div>

              {selectedPerson ? (
                <div className="space-y-4 text-xs animate-fade-in">
                  
                  {/* Avatar and main headers */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {selectedPerson.nom[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm leading-tight">{selectedPerson.nom}</h4>
                      <div className="flex gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          selectedPerson.category === 'SANCTION' 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {selectedPerson.category}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-dark-700 text-dark-300">
                          {selectedPerson.source}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile data grid */}
                  <div className="space-y-3 pt-3 border-t border-dark-700/50">
                    <div>
                      <span className="text-dark-500 block text-[10px] uppercase font-bold tracking-wider">Pays / Juridiction</span>
                      <span className="text-white font-medium text-xs mt-0.5 block">
                        {selectedPerson.pays || 'International / Multi-juridictions'}
                      </span>
                    </div>

                    <div>
                      <span className="text-dark-500 block text-[10px] uppercase font-bold tracking-wider">Date d'insertion</span>
                      <span className="text-white font-medium text-xs mt-0.5 block">
                        {new Date(selectedPerson.dateAjout).toLocaleString('fr-FR')}
                      </span>
                    </div>

                    <div>
                      <span className="text-dark-500 block text-[10px] uppercase font-bold tracking-wider">Dossier et Détails de conformité</span>
                      <p className="text-dark-300 leading-relaxed mt-1 text-xs bg-dark-900/60 p-3 border border-dark-800 rounded-lg whitespace-pre-wrap">
                        {selectedPerson.details || "Aucun commentaire ou détail de sanction supplémentaire n'a été spécifié pour cette fiche."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-dark-500 text-xs">
                  Sélectionnez un nom dans la liste de gauche pour voir sa fiche de conformité complète.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ===================== TAB: CONFIG SOURCES ===================== */}
      {activeTab === 'sources' && (
        <div className="glass-card p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-dark-700 pb-3">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary-400" />
              Registre des sources réglementaires AML/CFT
            </h2>
            
            <button
              onClick={() => {
                setEditingSource(null);
                setSourceForm({ nom: '', lienWeb: '', formatFichier: 'EXCEL', description: '' });
                setShowSourceModal(true);
              }}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ajouter une source
            </button>
          </div>

          {sources.length === 0 ? (
            <div className="py-16 text-center text-dark-500 space-y-3">
              <Globe className="w-12 h-12 text-primary-400 opacity-60 mx-auto animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-white">Aucune source configurée</p>
                <p className="text-xs text-dark-400 mt-1">Créez une source ou synchronisez pour importer les bases par défaut.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sources.map((src) => (
                <div 
                  key={src.id} 
                  className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex flex-col justify-between gap-4 text-xs shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-primary-400" />
                        {src.nom}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-dark-700 text-primary-400 border border-dark-600/50 uppercase">
                        {src.formatFichier}
                      </span>
                    </div>

                    <p className="text-dark-400 text-xs line-clamp-2">{src.description}</p>
                    
                    {src.lienWeb && (
                      <div className="text-[10px] text-dark-500 truncate bg-dark-950 p-1.5 rounded font-mono">
                        URL: {src.lienWeb}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-dark-800/60 pt-3 text-[10px] text-dark-500">
                    <span>Sync: {src.dateDerniereSync ? new Date(src.dateDerniereSync).toLocaleDateString('fr-FR') : 'Jamais'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditSource(src)}
                        className="p-1 hover:text-white transition-colors"
                        title="Modifier la source"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSource(src.id)}
                        className="p-1 hover:text-red-400 transition-colors text-red-500/80"
                        title="Supprimer la source"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Decision Review Modal */}
      {selectedOp && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 border border-dark-700/60 shadow-2xl space-y-4 animate-scale-in">
            
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500" />
                Vérification de Conformité AML
              </h3>
              <button 
                onClick={() => {
                  setSelectedOp(null);
                  setDecisionComment('');
                }}
                className="text-dark-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-dark-900/60 border border-dark-800 p-4 rounded-xl text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-dark-500 block">Référence</span>
                  <span className="text-white font-mono font-bold">{selectedOp.referenceUnique}</span>
                </div>
                <div>
                  <span className="text-dark-500 block">Montant</span>
                  <span className="text-white font-bold">
                    {selectedOp.montant?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {selectedOp.devise}
                  </span>
                </div>
              </div>

              <div className="border-t border-dark-800/60 pt-2 space-y-2">
                <div className="flex items-center justify-between bg-red-950/10 border border-red-900/20 p-2 rounded">
                  <div>
                    <span className="text-dark-400 block text-[10px]">Donneur d'Ordre</span>
                    <strong className="text-red-300">{selectedOp.nomDonneurOrdre}</strong>
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-red-950/10 border border-red-900/20 p-2 rounded">
                  <div>
                    <span className="text-dark-400 block text-[10px]">Bénéficiaire</span>
                    <strong className="text-red-300">{selectedOp.nomBeneficiaire}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-dark-300 text-xs font-semibold block">
                Commentaire de conformité / Justification d'action *
              </label>
              <textarea
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                placeholder="Renseignez la justification de la levée de l'alerte ou du gel réglementaire..."
                rows={3}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-xs text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => handleDecision('REJETER')}
                disabled={deciding}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Rejeter l'opération
              </button>

              <button
                onClick={() => handleDecision('APPROUVER')}
                disabled={deciding}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Libérer (Release)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Source Creation/Edition Modal */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveSource}
            className="glass-card max-w-md w-full p-6 border border-dark-700/60 shadow-2xl space-y-4 animate-scale-in text-xs"
          >
            <div className="flex items-center justify-between border-b border-dark-700 pb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-primary-400" />
                {editingSource ? 'Modifier la Source de sanctions' : 'Créer une Source de sanctions'}
              </h3>
              <button 
                type="button"
                onClick={() => {
                  setShowSourceModal(false);
                  setEditingSource(null);
                }}
                className="text-dark-400 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-dark-300 font-semibold block mb-1">Nom de la source *</label>
                <input
                  type="text"
                  value={sourceForm.nom}
                  onChange={(e) => setSourceForm({ ...sourceForm, nom: e.target.value })}
                  placeholder="Ex: OFAC, ONU, UK, National"
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-dark-300 font-semibold block mb-1">Lien Web / URL d'accès</label>
                <input
                  type="url"
                  value={sourceForm.lienWeb}
                  onChange={(e) => setSourceForm({ ...sourceForm, lienWeb: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-primary-500/50"
                />
              </div>

              <div>
                <label className="text-dark-300 font-semibold block mb-1">Format de fichier attendu</label>
                <select
                  value={sourceForm.formatFichier}
                  onChange={(e) => setSourceForm({ ...sourceForm, formatFichier: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg py-2 px-3 text-white focus:outline-none cursor-pointer"
                >
                  <option value="EXCEL">Excel (.xlsx)</option>
                  <option value="XML">XML (.xml)</option>
                  <option value="JSON">JSON (.json)</option>
                  <option value="CSV">CSV (.csv)</option>
                </select>
              </div>

              <div>
                <label className="text-dark-300 font-semibold block mb-1">Description / Notes</label>
                <textarea
                  value={sourceForm.description}
                  onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
                  placeholder="Description détaillée de la source et portée réglementaire..."
                  rows={3}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg p-3 text-white focus:outline-none focus:border-primary-500/50"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSourceModal(false);
                  setEditingSource(null);
                }}
                className="bg-dark-800 border border-dark-700 hover:bg-dark-700 text-white font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="btn-primary font-bold px-4 py-2 rounded-lg"
              >
                Enregistrer
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
