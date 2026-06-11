import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, CreditCard, Globe, Phone, Mail, MapPin,
  Save, AlertCircle, Calendar, ShieldCheck, Loader2,
  Plus, Trash2, Pencil, X, Check, ChevronsUpDown, Landmark
} from 'lucide-react';
import { institutionApi, compteReglementApi } from '../../services/api';
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
        try {
          const res = await institutionApi.findById(user.institutionId);
          data = res.data;
          resolvedId = user.institutionId;
        } catch (e) {
          console.warn('findById échoué, fallback...', e.message);
        }
      }

      if (!data && user?.username) {
        const sigle = user.username.split('.')[0].toUpperCase();
        try {
          const res = await institutionApi.findByCode(sigle);
          data = res.data; resolvedId = data?.id;
        } catch (_) {
          const listRes = await institutionApi.findAll({ search: sigle, size: 5 });
          const found = (listRes.data?.content || []).find(
            i => i.sigle?.toUpperCase() === sigle || i.code?.toUpperCase() === sigle
          );
          if (found) { data = found; resolvedId = found.id; }
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
      setComptes(comptesRes.data || []);
      const allInst = allInstRes.data?.content || [];
      setBanques(allInst.filter(i => i.typeInstitution === 'BANQUE'));
    } catch (e) {
      console.warn('Erreur chargement comptes:', e.message);
      // Fallback: try loading banks alone
      try {
        const banquesRes = await institutionApi.findAll({ statut: 'ACTIF', type: 'BANQUE', size: 200 });
        setBanques(banquesRes.data?.content || []);
      } catch (_) {}
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
    try {
      await institutionApi.update(instId, formData);
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
