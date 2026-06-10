import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, CreditCard, Globe, Phone, Mail, MapPin, 
  Save, AlertCircle, Calendar, ShieldCheck, Loader2
} from 'lucide-react';
import { institutionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function MonEtablissementPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inst, setInst] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    sigle: '',
    typeInstitution: '',
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
    compteReglement: '',
    banqueReglement: ''
  });

  const loadInstitution = useCallback(async () => {
    if (!user?.institutionId) {
      toast.error("Votre compte n'est rattaché à aucune institution.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await institutionApi.findById(user.institutionId);
      const data = res.data;
      setInst(data);
      setFormData({
        code: data.code || '',
        nom: data.nom || '',
        sigle: data.sigle || '',
        typeInstitution: data.typeInstitution || '',
        zoneMonetaireId: data.zoneMonetaire?.id || '',
        pays: data.pays || '',
        adresse: data.adresse || '',
        telephone: data.telephone || '',
        email: data.email || '',
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
      toast.error("Erreur lors du chargement des détails de l'établissement");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInstitution();
  }, [loadInstitution]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.institutionId) return;
    setSaving(true);
    try {
      await institutionApi.update(user.institutionId, formData);
      toast.success("Paramètres de l'établissement enregistrés avec succès !");
      loadInstitution();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Erreur de sauvegarde";
      toast.error(`Échec de l'enregistrement : ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <span className="badge badge-success flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Vérifié / Actif
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config settlement & contact */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Compte de règlement */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Compte de Règlement</h2>
                <p className="text-dark-400 text-xs mt-0.5">Configurez le compte de règlement utilisé pour la compensation.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-dark-300 text-xs font-semibold" htmlFor="compteReglement">
                  Numéro de Compte de Règlement
                </label>
                <input
                  id="compteReglement"
                  name="compteReglement"
                  type="text"
                  placeholder="Ex: 102930293029"
                  value={formData.compteReglement}
                  onChange={handleChange}
                  className="input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-dark-300 text-xs font-semibold" htmlFor="banqueReglement">
                  Banque de Règlement / Correspondante
                </label>
                <input
                  id="banqueReglement"
                  name="banqueReglement"
                  type="text"
                  placeholder="Ex: BCEAO - Siège Principal"
                  value={formData.banqueReglement}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Card: Coordonnées & Contact */}
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
                <label className="text-dark-300 text-xs font-semibold" htmlFor="telephone">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-dark-400" />
                  <input
                    id="telephone"
                    name="telephone"
                    type="text"
                    value={formData.telephone}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-dark-300 text-xs font-semibold" htmlFor="email">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-dark-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-dark-300 text-xs font-semibold" htmlFor="siteWeb">
                  Site Internet
                </label>
                <input
                  id="siteWeb"
                  name="siteWeb"
                  type="text"
                  placeholder="https://..."
                  value={formData.siteWeb}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-dark-300 text-xs font-semibold" htmlFor="adresse">
                  Adresse Physique / Siège Social
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-dark-400" />
                  <input
                    id="adresse"
                    name="adresse"
                    type="text"
                    value={formData.adresse}
                    onChange={handleChange}
                    className="input pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              id="btn-save-etablissement"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer les modifications
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Read-only info & metadata */}
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
                  {inst.typeInstitution === 'BANQUE' ? '🏦 Établissement Bancaire' : inst.typeInstitution === 'MESO_FINANCE' ? '🏢 Méso-finance (SFD)' : '💼 Microfinance (SFD)'}
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
                    <span className="text-dark-400 text-xs block">Code Banque Régional (BCEAO)</span>
                    <span className="text-white font-mono block mt-0.5">{inst.codeBanqueRegional || '—'}</span>
                  </div>
                </>
              )}

              {inst.banqueCorrespondanteNom && (
                <div className="border-b border-white/5 pb-3">
                  <span className="text-dark-400 text-xs block">Banque Correspondante (Sèglement)</span>
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
      </form>
    </div>
  );
}
