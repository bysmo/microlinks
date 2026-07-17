import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, CreditCard, Globe, Phone, Mail, MapPin,
  Save, AlertCircle, Calendar, ShieldCheck, Loader2,
  Plus, Trash2, Pencil, X, Check, ChevronsUpDown, Landmark,
  Users, UserPlus, Lock, RefreshCw, Server, FolderInput,
  FolderOutput, Archive, Network, Wifi
} from 'lucide-react';
import { institutionApi, compteReglementApi, userApi, protocolApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ─── Composant modal pour ajouter / modifier un compte de règlement ─────────
function CompteModal({ isOpen, onClose, onSave, compte, banques }) {
  const [form, setForm] = useState({ numeroCompte: '', libelle: '', banqueDomiciliaireId: '', typeCompte: 'REGLEMENT' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (compte) {
      setForm({
        numeroCompte: compte.numeroCompte || '',
        libelle: compte.libelle || '',
        banqueDomiciliaireId: compte.banqueDomiciliaireId || '',
        typeCompte: compte.typeCompte || 'REGLEMENT',
      });
    } else {
      setForm({ numeroCompte: '', libelle: '', banqueDomiciliaireId: '', typeCompte: 'REGLEMENT' });
    }
  }, [compte, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numeroCompte.trim()) return toast.error('Le numéro de compte est obligatoire');
    if (!form.banqueDomiciliaireId) return toast.error('Sélectionnez la banque domiciliataire');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-400" />
            {compte ? 'Modifier le compte' : 'Ajouter un compte de règlement'}
          </h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-dark-300 text-xs font-semibold" htmlFor="cm-numero">Numéro de compte *</label>
            <input
              id="cm-numero"
              type="text"
              value={form.numeroCompte}
              onChange={e => setForm(p => ({ ...p, numeroCompte: e.target.value }))}
              placeholder="Ex: BF-BCEAO-2024-001"
              className="input font-mono"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-dark-300 text-xs font-semibold" htmlFor="cm-libelle">Libellé (optionnel)</label>
            <input
              id="cm-libelle"
              type="text"
              value={form.libelle}
              onChange={e => setForm(p => ({ ...p, libelle: e.target.value }))}
              placeholder="Ex: Compte principal BCEAO"
              className="input"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-dark-300 text-xs font-semibold" htmlFor="cm-banque">Banque domiciliataire *</label>
            {banques.length === 0 ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Aucune banque active disponible. Vérifiez que des banques sont enregistrées et actives.
              </div>
            ) : (
              <select
                id="cm-banque"
                value={form.banqueDomiciliaireId}
                onChange={e => setForm(p => ({ ...p, banqueDomiciliaireId: e.target.value }))}
                className="select"
              >
                <option value="">— Sélectionner une banque —</option>
                {banques.map(b => (
                  <option key={b.id} value={b.id}>{b.nom} ({b.code})</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-dark-300 text-xs font-semibold" htmlFor="cm-type">Type de compte</label>
            <select
              id="cm-type"
              value={form.typeCompte}
              onChange={e => setForm(p => ({ ...p, typeCompte: e.target.value }))}
              className="select"
            >
              <option value="REGLEMENT">Compte de Règlement</option>
              <option value="CORRESPONDANCE">Compte de Correspondance</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">Annuler</button>
            <button type="submit" disabled={saving || banques.length === 0} className="btn-primary btn-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {compte ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant modal pour ajouter un collaborateur ──────────────────────────
function UserModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ username: '', email: '', firstName: '', lastName: '', phone: '', role: 'AGENT' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm({ username: '', email: '', firstName: '', lastName: '', phone: '', role: 'AGENT' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim()) return toast.error("Le nom d'utilisateur est obligatoire");
    if (form.username.trim().length < 3) return toast.error("Le nom d'utilisateur doit faire au moins 3 caractères");
    if (!form.email.trim()) return toast.error("L'adresse email est obligatoire");
    if (!/\S+@\S+\.\S+/.test(form.email)) return toast.error("Format d'adresse email invalide");
    if (!form.firstName.trim()) return toast.error("Le prénom est obligatoire");
    if (!form.lastName.trim()) return toast.error("Le nom est obligatoire");
    
    setSaving(true);
    try {
      const cleanedForm = { ...form };
      if (!cleanedForm.phone || cleanedForm.phone.trim() === '') {
        cleanedForm.phone = null;
      }
      await onSave(cleanedForm);
      onClose();
    } catch (err) {
      // Les erreurs de l'API sont gérées par le composant parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-6 space-y-5 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            Ajouter un collaborateur
          </h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="user-firstName">Prénom *</label>
              <input
                id="user-firstName"
                type="text"
                value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                placeholder="Ex: Jean"
                className="input"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="user-lastName">Nom *</label>
              <input
                id="user-lastName"
                type="text"
                value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                placeholder="Ex: Dupont"
                className="input"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-dark-300 text-xs font-semibold" htmlFor="user-username">Identifiant (Username) *</label>
            <input
              id="user-username"
              type="text"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              placeholder="Ex: jdupont"
              className="input font-mono"
              autoComplete="off"
            />
            <p className="text-[10px] text-dark-400">Le nom d'utilisateur servira pour la connexion.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-dark-300 text-xs font-semibold" htmlFor="user-email">Adresse Email *</label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Ex: jean.dupont@cmfbf.com"
              className="input"
              autoComplete="off"
            />
            <p className="text-[10px] text-dark-400">Un mail contenant les identifiants temporaires sera envoyé à cette adresse.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="user-phone">Téléphone</label>
              <input
                id="user-phone"
                type="text"
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="Ex: +22670123456"
                className="input"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="user-role">Profil / Rôle *</label>
              <select
                id="user-role"
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="select"
              >
                <option value="AGENT">Agent de Saisie</option>
                <option value="VALID">Agent de Validation</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary btn-sm">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Créer le compte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page principale ────────────────────────────────────────────────────────
export default function MonEtablissementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inst, setInst] = useState(null);
  const [instId, setInstId] = useState(null);

  // Comptes de règlement
  const [comptes, setComptes] = useState([]);
  const [banques, setBanques] = useState([]);
  const [compteModal, setCompteModal] = useState({ open: false, compte: null });

  // Gestion des utilisateurs / collaborateurs
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'users', 'security', 'protocol'
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const [newPin, setNewPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // ─── Protocole d'échange ────────────────────────────────────────────────────
  const [protocolForm, setProtocolForm] = useState({
    protocole: 'SFTP',
    nomHote: '',
    adresseIp: '',
    port: '22',
    utilisateur: '',
    motDePasse: '',
    repertoireEntree: '',
    repertoireSortie: '',
    repertoireArchivage: '',
    typesFichiersEnvoi: [],
    typesFichiersReception: [],
    actif: true,
  });
  const [loadingProtocol, setLoadingProtocol] = useState(false);
  const [savingProtocol, setSavingProtocol] = useState(false);

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    if (!newPin || !/^[0-9]{4,6}$/.test(newPin)) {
      toast.error("Le code PIN doit comporter entre 4 et 6 chiffres.");
      return;
    }
    setSavingPin(true);
    try {
      await userApi.updateMyPin(instId, newPin);
      toast.success("Votre code PIN de sécurité a été mis à jour avec succès !");
      setNewPin('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur de mise à jour du PIN : ${msg}`);
    } finally {
      setSavingPin(false);
    }
  };

  const loadUsers = useCallback(async (id) => {
    if (!id) return;
    setLoadingUsers(true);
    try {
      const res = await userApi.findAll(id);
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.warn('Erreur chargement collaborateurs:', e.message);
      toast.error('Impossible de charger la liste des collaborateurs');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && instId) {
      loadUsers(instId);
    }
    if (activeTab === 'protocol' && instId) {
      loadProtocol(instId);
    }
  }, [activeTab, instId, loadUsers]);

  const loadProtocol = useCallback(async (id) => {
    if (!id) return;
    setLoadingProtocol(true);
    try {
      const res = await protocolApi.get(id);
      if (res.data) {
        setProtocolForm(prev => ({
          ...prev,
          ...res.data,
          motDePasse: '',
          typesFichiersEnvoi: res.data.typesFichiersEnvoi || [],
          typesFichiersReception: res.data.typesFichiersReception || [],
        }));
      }
    } catch (e) {
      if (e.response?.status !== 404) {
        console.warn('Erreur chargement protocole:', e.message);
      }
    } finally {
      setLoadingProtocol(false);
    }
  }, []);

  const handleSaveProtocol = async (e) => {
    e.preventDefault();
    if (!protocolForm.nomHote.trim()) return toast.error('Le nom d\'hôte est obligatoire');
    if (!protocolForm.adresseIp.trim()) return toast.error('L\'adresse IP est obligatoire');
    if (!protocolForm.repertoireEntree.trim()) return toast.error('Le répertoire d\'entrée est obligatoire');
    if (!protocolForm.repertoireSortie.trim()) return toast.error('Le répertoire de sortie est obligatoire');
    setSavingProtocol(true);
    try {
      await protocolApi.upsert(instId, protocolForm);
      toast.success('Configuration du protocole enregistrée avec succès !');
      setProtocolForm(prev => ({ ...prev, motDePasse: '' }));
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSavingProtocol(false);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await userApi.create(instId, {
        ...userData,
        institutionId: instId
      });
      toast.success('Collaborateur créé avec succès. Un mail contenant ses identifiants lui a été envoyé !');
      loadUsers(instId);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur de création : ${msg}`);
      throw err;
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const actionName = currentStatus ? 'désactiver' : 'activer';
    if (!window.confirm(`Voulez-vous vraiment ${actionName} ce collaborateur ?`)) return;
    
    try {
      await userApi.updateStatus(instId, userId, !currentStatus);
      toast.success(`Collaborateur ${currentStatus ? 'désactivé' : 'activé'} avec succès !`);
      loadUsers(instId);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur : ${msg}`);
    }
  };

  // Form contact/settlement
  const [formData, setFormData] = useState({
    code: '', nom: '', sigle: '', typeInstitution: '',
    zoneMonetaireId: '', pays: '', adresse: '',
    telephone: '', email: '', siteWeb: '',
    banqueCorrespondanteId: '', dateAdhesion: '',
    codeBanqueRegional: '', codeBic: '',
    codeParticipantRtgs: '', compteReglement: '', banqueReglement: ''
  });

  // ─── Load institution ──────────────────────────────────────────────────────
  const loadInstitution = useCallback(async () => {
    setLoading(true);
    try {
      let data = null;
      let resolvedId = null;

      if (user?.institutionId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.institutionId);
        if (isUuid) {
          try {
            const res = await institutionApi.findById(user.institutionId);
            data = res.data;
            resolvedId = user.institutionId;
          } catch (e) {
            console.warn('findById échoué, fallback...', e.message);
          }
        } else {
          try {
            const res = await institutionApi.findByCode(user.institutionId.toUpperCase());
            data = res.data;
            resolvedId = data?.id;
          } catch (e) {
            console.warn('findByCode échoué pour institutionId non-UUID...', e.message);
          }
        }
      }

      if (!data && user?.username) {
        const sigle = user.username.includes('@')
          ? user.username.split('@')[1].split('.')[0].toUpperCase()
          : user.username.split('.')[0].toUpperCase();
        try {
          const res = await institutionApi.findByCode(sigle);
          data = res.data; resolvedId = data?.id;
        } catch (_) {
          try {
            const listRes = await institutionApi.findAll({ size: 100 });
            const cleanSigle = sigle.toLowerCase().replace(/[^a-z0-9]/g, "");
            const found = (listRes.data?.content || []).find(i => {
              const normSigle = (i.sigle || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const normCode = (i.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return normSigle === cleanSigle || normCode === cleanSigle;
            });
            if (found) { data = found; resolvedId = found.id; }
          } catch (e2) {
            console.warn('Fallback list search failed:', e2.message);
          }
        }
      }


      if (!data) {
        toast.error("Votre compte n'est rattaché à aucune institution connue.");
        setLoading(false);
        return;
      }

      setInst(data);
      setInstId(resolvedId || data.id);
      setFormData({
        code: data.code || '', nom: data.nom || '', sigle: data.sigle || '',
        typeInstitution: data.typeInstitution || '',
        zoneMonetaireId: data.zoneMonetaire?.id || '',
        pays: data.pays || '', adresse: data.adresse || '',
        telephone: data.telephone || '', email: data.email || '',
        siteWeb: data.siteWeb || '',
        banqueCorrespondanteId: data.banqueCorrespondanteId || '',
        dateAdhesion: data.dateAdhesion || '',
        codeBanqueRegional: data.codeBanqueRegional || '',
        codeBic: data.codeBic || '',
        codeParticipantRtgs: data.codeParticipantRtgs || '',
        compteReglement: data.compteReglement || '',
        banqueReglement: data.banqueReglement || ''
      });
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement de l'établissement");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ─── Load comptes de règlement et banques ──────────────────────────────────
  const loadComptes = useCallback(async (id) => {
    if (!id) return;
    try {
      // Load settlement accounts and ALL active institutions (to filter banks client-side)
      const [comptesRes, allInstRes] = await Promise.all([
        compteReglementApi.findAll(id),
        institutionApi.findAll({ statut: 'ACTIF', size: 200 })
      ]);
      const comptesData = Array.isArray(comptesRes.data) ? comptesRes.data : [];
      setComptes(comptesData);
      const allInst = allInstRes.data?.content || [];
      setBanques(Array.isArray(allInst) ? allInst.filter(i => i.typeInstitution === 'BANQUE') : []);
    } catch (e) {
      console.warn('Erreur chargement comptes:', e.message);
      setComptes([]);
      // Fallback: try loading banks alone
      try {
        const banquesRes = await institutionApi.findAll({ statut: 'ACTIF', type: 'BANQUE', size: 200 });
        const content = banquesRes.data?.content || [];
        setBanques(Array.isArray(content) ? content : []);
      } catch (_) {
        setBanques([]);
      }
    }
  }, []);

  useEffect(() => { loadInstitution(); }, [loadInstitution]);
  useEffect(() => { if (instId) loadComptes(instId); }, [instId, loadComptes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!instId) return;
    setSaving(true);

    // Nettoyer les champs pour éviter les erreurs de désérialisation (UUID, Date) et de validation
    const cleanedData = { ...formData };

    // Convertir les chaînes vides en null pour les champs optionnels ou typés
    Object.keys(cleanedData).forEach(key => {
      if (typeof cleanedData[key] === 'string' && cleanedData[key].trim() === '') {
        cleanedData[key] = null;
      }
    });

    // Validations de base côté client
    if (cleanedData.email && !/\S+@\S+\.\S+/.test(cleanedData.email)) {
      setSaving(false);
      return toast.error("Format d'email invalide");
    }

    if (cleanedData.telephone && !/^\+?[0-9\s\-()]{7,20}$/.test(cleanedData.telephone)) {
      setSaving(false);
      return toast.error("Format de téléphone invalide (7 à 20 caractères, chiffres, +, -, espaces)");
    }

    try {
      await institutionApi.update(instId, cleanedData);
      toast.success("Paramètres de l'établissement enregistrés avec succès !");
      loadInstitution();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Erreur de sauvegarde";
      toast.error(`Échec : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Comptes CRUD ─────────────────────────────────────────────────────────
  const handleSaveCompte = async (form) => {
    try {
      if (compteModal.compte) {
        await compteReglementApi.update(instId, compteModal.compte.id, form);
        toast.success('Compte modifié avec succès');
      } else {
        await compteReglementApi.create(instId, form);
        toast.success('Compte ajouté avec succès');
      }
      await loadComptes(instId);
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur : ${msg}`);
      throw err;
    }
  };

  const handleDeleteCompte = async (compte) => {
    if (!window.confirm(`Supprimer le compte ${compte.numeroCompte} ?`)) return;
    try {
      await compteReglementApi.remove(instId, compte.id);
      toast.success('Compte supprimé');
      await loadComptes(instId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (!inst) {
    return (
      <div className="glass-card p-8 text-center space-y-4 max-w-md mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Établissement introuvable</h2>
        <p className="text-dark-300 text-sm">
          Nous n'avons pas pu charger les informations de votre établissement. Veuillez vérifier vos accès.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up" id="mon-etablissement-page">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Mon Établissement</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Configurez et visualisez les paramètres réglementaires et opérationnels de votre institution.
          </p>
        </div>
        <span className="badge badge-success flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          Vérifié / Actif
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-white/5 pb-px mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'text-primary-400 border-primary-400'
              : 'text-dark-400 border-transparent hover:text-white'
          }`}
        >
          Paramètres de l'établissement
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'text-primary-400 border-primary-400'
              : 'text-dark-400 border-transparent hover:text-white'
          }`}
        >
          Collaborateurs & Utilisateurs
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'text-primary-400 border-primary-400'
              : 'text-dark-400 border-transparent hover:text-white'
          }`}
        >
          Sécurité & Code PIN
        </button>
        <button
          onClick={() => setActiveTab('protocol')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'protocol'
              ? 'text-primary-400 border-primary-400'
              : 'text-dark-400 border-transparent hover:text-white'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          Protocoles d'échange
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Card: Comptes de Règlement (multi) */}
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Comptes de Règlement</h2>
                  <p className="text-dark-400 text-xs mt-0.5">Gérez vos comptes de règlement et correspondance.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompteModal({ open: true, compte: null })}
                className="btn-primary btn-sm flex items-center gap-1.5"
                id="btn-add-compte"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>

            {comptes.length === 0 ? (
              <div className="text-center py-8 text-dark-400 text-sm">
                <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Aucun compte de règlement configuré.
                <br />
                <span className="text-xs">Cliquez sur "Ajouter" pour en créer un.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {comptes.map(cc => (
                  <div
                    key={cc.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-dark-800/60 border border-dark-700 hover:border-primary-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-primary-500/10 text-primary-400 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-mono text-sm font-medium truncate">{cc.numeroCompte}</p>
                        <p className="text-dark-400 text-xs truncate">
                          {cc.libelle || cc.typeCompte} — {cc.banqueDomiciliaireNom || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <button
                        type="button"
                        onClick={() => setCompteModal({ open: true, compte: cc })}
                        className="btn-ghost btn-sm p-1.5 text-dark-400 hover:text-primary-400"
                        title="Modifier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCompte(cc)}
                        className="btn-ghost btn-sm p-1.5 text-dark-400 hover:text-red-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Coordonnées & Contact */}
          <form onSubmit={handleSubmit}>
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-semibold">Coordonnées & Contact</h2>
                  <p className="text-dark-400 text-xs mt-0.5">Modifiez les informations publiques de votre établissement.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-dark-300 text-xs font-semibold" htmlFor="telephone">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 w-4 h-4 text-dark-400" />
                    <input id="telephone" name="telephone" type="text" value={formData.telephone} onChange={handleChange} className="input pl-10" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-dark-300 text-xs font-semibold" htmlFor="email">Adresse Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-dark-400" />
                    <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className="input pl-10" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-dark-300 text-xs font-semibold" htmlFor="siteWeb">Site Internet</label>
                  <input id="siteWeb" name="siteWeb" type="text" placeholder="https://..." value={formData.siteWeb} onChange={handleChange} className="input" />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-dark-300 text-xs font-semibold" htmlFor="adresse">Adresse Physique / Siège Social</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-dark-400" />
                    <input id="adresse" name="adresse" type="text" value={formData.adresse} onChange={handleChange} className="input pl-10" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                id="btn-save-etablissement"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement...</>
                ) : (
                  <><Save className="w-4 h-4" />Enregistrer les modifications</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ─── Right Column: Infos réglementaires ───────────────────────────── */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6 bg-dark-800/40">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-white font-semibold">Infos Réglementaires</h2>
            </div>

            <div className="space-y-4 text-sm">
              <div className="border-b border-white/5 pb-3">
                <span className="text-dark-400 text-xs block">Raison Sociale</span>
                <span className="text-white font-medium block mt-0.5">{inst.nom}</span>
              </div>

              {inst.sigle && (
                <div className="border-b border-white/5 pb-3">
                  <span className="text-dark-400 text-xs block">Sigle</span>
                  <span className="text-white font-medium block mt-0.5">{inst.sigle}</span>
                </div>
              )}

              <div className="border-b border-white/5 pb-3">
                <span className="text-dark-400 text-xs block">Code Plateforme</span>
                <span className="text-primary-400 font-mono font-bold block mt-0.5">{inst.code}</span>
              </div>

              {inst.codeMicrolink && (
                <div className="border-b border-white/5 pb-3">
                  <span className="text-dark-400 text-xs block">Identifiant Réseau MicroLinks</span>
                  <span className="text-yellow-400 font-mono font-semibold block mt-0.5">{inst.codeMicrolink}</span>
                </div>
              )}

              <div className="border-b border-white/5 pb-3">
                <span className="text-dark-400 text-xs block">Type d'Institution</span>
                <span className="text-white font-medium block mt-0.5">
                  {inst.typeInstitution === 'BANQUE' ? '🏦 Établissement Bancaire'
                    : inst.typeInstitution === 'MESO_FINANCE' ? '🏢 Méso-finance (SFD)'
                    : '💼 Microfinance (SFD)'}
                </span>
              </div>

              <div className="border-b border-white/5 pb-3">
                <span className="text-dark-400 text-xs block">Zone Monétaire & Pays</span>
                <span className="text-white font-medium block mt-0.5">
                  {inst.zoneMonetaire?.libelle} ({inst.pays})
                </span>
              </div>

              {inst.typeInstitution === 'BANQUE' && (
                <>
                  <div className="border-b border-white/5 pb-3">
                    <span className="text-dark-400 text-xs block">Code BIC/SWIFT</span>
                    <span className="text-white font-mono block mt-0.5">{inst.codeBic || '—'}</span>
                  </div>
                  <div className="border-b border-white/5 pb-3">
                    <span className="text-dark-400 text-xs block">Code RTGS Participant</span>
                    <span className="text-white font-mono block mt-0.5">{inst.codeParticipantRtgs || '—'}</span>
                  </div>
                  <div className="border-b border-white/5 pb-3">
                    <span className="text-dark-400 text-xs block">Code Banque Régional</span>
                    <span className="text-white font-mono block mt-0.5">{inst.codeBanqueRegional || '—'}</span>
                  </div>
                </>
              )}

              {inst.banqueCorrespondanteNom && (
                <div className="border-b border-white/5 pb-3">
                  <span className="text-dark-400 text-xs block">Banque Correspondante</span>
                  <span className="text-white font-medium block mt-0.5">{inst.banqueCorrespondanteNom}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-dark-400 text-xs pt-1">
                <Calendar className="w-3.5 h-3.5" />
                Adhérent depuis le {inst.dateAdhesion ? new Date(inst.dateAdhesion).toLocaleDateString('fr-FR') : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Collaborateurs de l'établissement</h2>
                <p className="text-dark-400 text-xs mt-0.5">
                  Gérez les accès des agents de saisie et des validateurs de votre institution.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUserModalOpen(true)}
              className="btn-primary btn-sm flex items-center gap-1.5"
              id="btn-add-collaborator"
            >
              <UserPlus className="w-4 h-4" />
              Créer un collaborateur
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-dark-400 text-sm">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              Aucun collaborateur enregistré pour le moment.
              <br />
              <span className="text-xs text-dark-500">
                Cliquez sur le bouton ci-dessus pour ajouter votre premier agent ou validateur.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-dark-300">
                <thead>
                  <tr className="border-b border-white/5 text-dark-400 text-xs font-semibold uppercase">
                    <th className="pb-3">Collaborateur</th>
                    <th className="pb-3">Identifiant</th>
                    <th className="pb-3">Rôle / Profil</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pr-3">
                        <div className="font-medium text-white">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-xs text-dark-400 mt-0.5">{u.email}</div>
                        {u.phone && (
                          <div className="text-[10px] text-dark-500 mt-0.5 font-mono">{u.phone}</div>
                        )}
                      </td>
                      <td className="py-4 font-mono text-xs">{u.username}</td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : u.role === 'VALID'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {u.role === 'ADMIN'
                            ? 'Administrateur'
                            : u.role === 'VALID'
                            ? 'Validateur'
                            : 'Agent'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.enabled
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.enabled ? 'bg-green-400' : 'bg-red-400'}`} />
                          {u.enabled ? 'Actif' : 'Désactivé'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {u.role !== 'ADMIN' ? (
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.enabled)}
                            className={`btn btn-sm ${
                              u.enabled
                                ? 'btn-ghost text-red-400 hover:bg-red-950/20 hover:text-red-300 font-medium'
                                : 'btn-ghost text-green-400 hover:bg-green-950/20 hover:text-green-300 font-medium'
                            }`}
                          >
                            {u.enabled ? 'Désactiver' : 'Activer'}
                          </button>
                        ) : (
                          <span className="text-xs text-dark-500 italic pr-3 font-medium">Système</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="glass-card p-6 max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base">Sécurité & Code PIN de Validation</h2>
              <p className="text-dark-400 text-xs mt-0.5">
                Configurez votre code PIN personnel requis pour valider les opérations financières de MicroLinks.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-dark-300 text-sm font-semibold" htmlFor="new-pin-input">
                Nouveau Code PIN de Sécurité
              </label>
              <input
                id="new-pin-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="4 à 6 chiffres"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2.5 text-white text-base font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              />
              <p className="text-xs text-dark-400">
                Saisissez un code PIN de 4 à 6 chiffres. Ce code vous sera demandé à chaque validation ou signature de transaction financière.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPin || newPin.length < 4}
                className="btn-primary px-5 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors border-none shadow-lg shadow-emerald-900/20"
              >
                {savingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Enregistrer le code PIN
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Onglet Protocoles d'échange ──────────────────────────────────────── */}
      {activeTab === 'protocol' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-base">Protocole d'échange de fichiers</h2>
                <p className="text-dark-400 text-xs mt-0.5">
                  Configurez le serveur SFTP/FTP/FTPS utilisé pour l'échange automatique de données avec la plateforme MicroLinks.
                </p>
              </div>
            </div>

            {loadingProtocol ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveProtocol} className="space-y-5">

                {/* Protocole & Statut */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-protocole">
                      Protocole *
                    </label>
                    <select
                      id="proto-protocole"
                      value={protocolForm.protocole}
                      onChange={e => {
                        const p = e.target.value;
                        setProtocolForm(prev => ({
                          ...prev,
                          protocole: p,
                          port: p === 'SFTP' ? '22' : p === 'FTPS' ? '990' : '21',
                        }));
                      }}
                      className="select"
                    >
                      <option value="SFTP">SFTP (SSH File Transfer)</option>
                      <option value="FTP">FTP (File Transfer Protocol)</option>
                      <option value="FTPS">FTPS (FTP over TLS/SSL)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold">Statut</label>
                    <div className="flex items-center gap-3 h-10 px-3 bg-dark-800/60 border border-dark-600 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setProtocolForm(prev => ({ ...prev, actif: !prev.actif }))}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${
                          protocolForm.actif ? 'bg-cyan-500' : 'bg-dark-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                          protocolForm.actif ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                      <span className={`text-sm font-medium ${
                        protocolForm.actif ? 'text-cyan-400' : 'text-dark-400'
                      }`}>
                        {protocolForm.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hôte & IP */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-host">Nom d'hôte *</label>
                    <div className="relative">
                      <Wifi className="absolute left-3 top-2.5 w-4 h-4 text-dark-400" />
                      <input
                        id="proto-host"
                        type="text"
                        placeholder="Ex: sftp.microlinks.bf"
                        value={protocolForm.nomHote}
                        onChange={e => setProtocolForm(prev => ({ ...prev, nomHote: e.target.value }))}
                        className="input pl-9"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-ip">Adresse IP du serveur *</label>
                    <div className="relative">
                      <Server className="absolute left-3 top-2.5 w-4 h-4 text-dark-400" />
                      <input
                        id="proto-ip"
                        type="text"
                        placeholder="Ex: 192.168.1.100"
                        value={protocolForm.adresseIp}
                        onChange={e => setProtocolForm(prev => ({ ...prev, adresseIp: e.target.value }))}
                        className="input pl-9 font-mono"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>

                {/* Port & Utilisateur */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-port">Port</label>
                    <input
                      id="proto-port"
                      type="number"
                      min="1"
                      max="65535"
                      value={protocolForm.port}
                      onChange={e => setProtocolForm(prev => ({ ...prev, port: e.target.value }))}
                      className="input font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-user">Utilisateur / Login</label>
                    <input
                      id="proto-user"
                      type="text"
                      placeholder="Ex: microlinks_user"
                      value={protocolForm.utilisateur}
                      onChange={e => setProtocolForm(prev => ({ ...prev, utilisateur: e.target.value }))}
                      className="input font-mono"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div className="space-y-1.5">
                  <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-pwd">Mot de passe / Passphrase</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-dark-400" />
                    <input
                      id="proto-pwd"
                      type="password"
                      placeholder="Laissez vide pour conserver l'actuel"
                      value={protocolForm.motDePasse}
                      onChange={e => setProtocolForm(prev => ({ ...prev, motDePasse: e.target.value }))}
                      className="input pl-9"
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-[10px] text-dark-400">Le mot de passe est chiffré. Laissez vide pour ne pas le modifier.</p>
                </div>

                {/* Répertoires */}
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <p className="text-dark-300 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
                    <FolderInput className="w-3.5 h-3.5" /> Répertoires sur le serveur
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-in">
                      <FolderInput className="inline w-3.5 h-3.5 mr-1 text-green-400" />
                      Répertoire d'entrée (réception) *
                    </label>
                    <input
                      id="proto-in"
                      type="text"
                      placeholder="Ex: /microlinks/entree"
                      value={protocolForm.repertoireEntree}
                      onChange={e => setProtocolForm(prev => ({ ...prev, repertoireEntree: e.target.value }))}
                      className="input font-mono text-green-300"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-out">
                      <FolderOutput className="inline w-3.5 h-3.5 mr-1 text-blue-400" />
                      Répertoire de sortie (émission) *
                    </label>
                    <input
                      id="proto-out"
                      type="text"
                      placeholder="Ex: /microlinks/sortie"
                      value={protocolForm.repertoireSortie}
                      onChange={e => setProtocolForm(prev => ({ ...prev, repertoireSortie: e.target.value }))}
                      className="input font-mono text-blue-300"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-dark-300 text-xs font-semibold" htmlFor="proto-arch">
                      <Archive className="inline w-3.5 h-3.5 mr-1 text-amber-400" />
                      Répertoire d'archivage
                    </label>
                    <input
                      id="proto-arch"
                      type="text"
                      placeholder="Ex: /microlinks/archive"
                      value={protocolForm.repertoireArchivage}
                      onChange={e => setProtocolForm(prev => ({ ...prev, repertoireArchivage: e.target.value }))}
                      className="input font-mono text-amber-300"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Types de fichiers échangeables */}
                <div className="border-t border-white/5 pt-4 space-y-4">
                  <p className="text-dark-300 text-xs font-semibold uppercase tracking-wide">
                    Types de fichiers échangeables
                  </p>

                  {/* Fichiers envoyés vers la plateforme */}
                  <div className="space-y-2">
                    <label className="text-dark-300 text-xs font-medium flex items-center gap-1.5">
                      <FolderOutput className="w-3.5 h-3.5 text-blue-400" />
                      Fichiers émis (envoyés vers la plateforme)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['MT', 'MX', 'AFB', 'CSV', 'XLSX', 'XML', 'JSON'].map(type => {
                        const selected = (protocolForm.typesFichiersEnvoi || []).includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setProtocolForm(prev => ({
                              ...prev,
                              typesFichiersEnvoi: selected
                                ? (prev.typesFichiersEnvoi || []).filter(t => t !== type)
                                : [...(prev.typesFichiersEnvoi || []), type]
                            }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              selected
                                ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-sm shadow-blue-500/10'
                                : 'bg-dark-800/60 border-dark-600 text-dark-400 hover:border-blue-500/30 hover:text-dark-200'
                            }`}
                          >
                            {selected && <span className="mr-1">✓</span>}{type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fichiers reçus depuis la plateforme */}
                  <div className="space-y-2">
                    <label className="text-dark-300 text-xs font-medium flex items-center gap-1.5">
                      <FolderInput className="w-3.5 h-3.5 text-green-400" />
                      Fichiers reçus (depuis la plateforme)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['MT', 'MX', 'AFB', 'CSV', 'XLSX', 'XML', 'JSON'].map(type => {
                        const selected = (protocolForm.typesFichiersReception || []).includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setProtocolForm(prev => ({
                              ...prev,
                              typesFichiersReception: selected
                                ? (prev.typesFichiersReception || []).filter(t => t !== type)
                                : [...(prev.typesFichiersReception || []), type]
                            }))}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              selected
                                ? 'bg-green-500/20 border-green-500/50 text-green-300 shadow-sm shadow-green-500/10'
                                : 'bg-dark-800/60 border-dark-600 text-dark-400 hover:border-green-500/30 hover:text-dark-200'
                            }`}
                          >
                            {selected && <span className="mr-1">✓</span>}{type}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Infos protocole */}
                <div className={`p-3 rounded-lg text-xs border ${
                  protocolForm.protocole === 'SFTP'
                    ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300'
                    : protocolForm.protocole === 'FTPS'
                    ? 'bg-purple-500/5 border-purple-500/20 text-purple-300'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                }`}>
                  {protocolForm.protocole === 'SFTP' && '🔒 SFTP utilise SSH pour chiffrer les données. Port par défaut : 22.'}
                  {protocolForm.protocole === 'FTPS' && '🔐 FTPS utilise TLS/SSL pour sécuriser la connexion FTP. Port par défaut : 990.'}
                  {protocolForm.protocole === 'FTP' && '⚠️ FTP transmet les données en clair. Utiliser uniquement sur un réseau privé sécurisé. Port par défaut : 21.'}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingProtocol}
                    className="btn-primary px-5 py-2 flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors border-none shadow-lg shadow-cyan-900/20"
                  >
                    {savingProtocol ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer la configuration
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal collaborateurs */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        onSave={handleCreateUser}
      />

      {/* Modal compte de règlement */}
      <CompteModal
        isOpen={compteModal.open}
        onClose={() => setCompteModal({ open: false, compte: null })}
        onSave={handleSaveCompte}
        compte={compteModal.compte}
        banques={banques}
      />
    </div>
  );
}
