import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, Key, RefreshCw, Eye, EyeOff, User, Save } from 'lucide-react';
import { userApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

/**
 * Modale "Mon profil" accessible depuis le header.
 * Permet à chaque utilisateur de :
 *  - consulter et modifier ses informations personnelles (prénom, nom, sexe, téléphone)
 *  - configurer son code PIN de sécurité (personnel, distinct du compte institution)
 *  - changer son mot de passe Keycloak
 */
export default function UserProfileModal({ isOpen, onClose, institutionId }) {
  const { user, setUser } = useAuth();

  // ── Informations personnelles ─────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [genre, setGenre] = useState('M'); // M = Homme, F = Femme
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Code PIN ──────────────────────────────────────────────────────────────
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // ── Mot de passe ──────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const id = institutionId || user?.institutionId;
      if (!id || !isOpen) return;
      setLoading(true);
      try {
        const res = await userApi.getMyProfile(id);
        const data = res.data;
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setPhone(data.phone || '');
        setGenre(data.gender || 'M');
      } catch (err) {
        console.error("Erreur lors de la récupération du profil :", err);
        setFirstName(user?.firstName || '');
        setLastName(user?.lastName || '');
        setPhone(user?.phone || '');
        setGenre(user?.gender || 'M');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isOpen, user, institutionId]);

  const resetForm = () => {
    setNewPin(''); setConfirmPin('');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setShowPwd(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Enregistrer les informations de profil ─────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Le prénom et le nom sont obligatoires.');
      return;
    }
    const id = institutionId || user?.institutionId;
    if (!id) {
      toast.error("Impossible d'identifier votre institution.");
      return;
    }
    setSavingProfile(true);
    try {
      await userApi.updateMyProfile(id, {
        firstName,
        lastName,
        genre,
        phone,
      });

      // Mettre à jour l'état local dans AuthContext pour le header et la session
      setUser((prev) => ({
        ...prev,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        gender: genre,
        phone,
      }));

      toast.success('Informations personnelles mises à jour avec succès !');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur profil : ${msg}`);
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Enregistrer le code PIN ───────────────────────────────────────────────
  const handleSavePin = async (e) => {
    e.preventDefault();
    if (!newPin || !/^[0-9]{4,6}$/.test(newPin)) {
      toast.error('Le code PIN doit comporter entre 4 et 6 chiffres.');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('Les deux codes PIN ne correspondent pas.');
      return;
    }
    const id = institutionId || user?.institutionId;
    if (!id) {
      toast.error("Impossible d'identifier votre institution.");
      return;
    }
    setSavingPin(true);
    try {
      await userApi.updateMyPin(id, newPin);
      toast.success('Votre code PIN a été mis à jour avec succès !');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur PIN : ${msg}`);
    } finally {
      setSavingPin(false);
    }
  };

  // ── Changer mot de passe ──────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPwd || newPwd.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('Les deux mots de passe ne correspondent pas.');
      return;
    }
    const id = institutionId || user?.institutionId;
    if (!id) {
      toast.error("Impossible d'identifier votre institution.");
      return;
    }
    setSavingPwd(true);
    try {
      await userApi.updateMyPassword(id, { currentPassword: currentPwd, newPassword: newPwd });
      toast.success('Mot de passe modifié avec succès !');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSavingPwd(false);
    }
  };

  if (!isOpen) return null;

  const initials = ((user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0] || 'U').toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      id="user-profile-modal-backdrop"
    >
      <div
        className="w-full max-w-lg bg-[#0f1c2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        id="user-profile-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F3C623] flex items-center justify-center text-[#0B192C] font-bold text-sm shadow-md">
              {initials}
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">
                {user?.name || user?.username || 'Mon profil'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            id="btn-close-user-profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-180px)]">
          {/* Infos utilisateur */}
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Informations personnelles</span>
            </div>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Ligne Email & Identifiant (non modifiables) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                  <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">Identifiant / Code User</p>
                  <p className="text-slate-300 text-xs font-mono">{user?.username || '—'}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                  <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">Adresse Email</p>
                  <p className="text-slate-300 text-xs truncate" title={user?.email}>{user?.email || '—'}</p>
                </div>
              </div>

              {/* Ligne Rôle & Institution (non modifiables) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                  <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">Rôle</p>
                  <p className="text-slate-300 text-xs">{
                    user?.roles?.includes('ADMIN_PLATEFORME') ? '🔑 Admin Plateforme'
                    : user?.roles?.includes('ADMIN_INSTITUTION') ? '🏛 Admin Institution'
                    : user?.roles?.includes('VALID') ? '✅ Validateur'
                    : '📝 Agent'
                  }</p>
                </div>
                {user?.institutionNom && (
                  <div className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2">
                    <p className="text-slate-500 text-[10px] font-medium uppercase mb-0.5">Institution</p>
                    <p className="text-slate-300 text-xs truncate" title={user.institutionNom}>{user.institutionNom}</p>
                  </div>
                )}
              </div>

              {/* Champs modifiables */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] font-medium font-sans" htmlFor="profile-firstname">Prénom *</label>
                  <input
                    id="profile-firstname"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading || savingProfile}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] font-medium font-sans" htmlFor="profile-lastname">Nom *</label>
                  <input
                    id="profile-lastname"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading || savingProfile}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] font-medium font-sans" htmlFor="profile-phone">Téléphone</label>
                  <input
                    id="profile-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: +226 70 00 00 00"
                    disabled={loading || savingProfile}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 text-[11px] font-medium font-sans" htmlFor="profile-gender">Sexe</label>
                  <select
                    id="profile-gender"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    disabled={loading || savingProfile}
                    className="w-full bg-[#0f1c2e] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                    style={{ colorScheme: 'dark' }}
                  >
                    <option value="M" className="bg-[#0f1c2e] text-white">Homme</option>
                    <option value="F" className="bg-[#0f1c2e] text-white">Femme</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={loading || savingProfile || !firstName.trim() || !lastName.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-lg shadow-cyan-900/20 font-sans"
                  id="btn-save-profile"
                >
                  {(loading || savingProfile) ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          {/* Section Code PIN */}
          <div className="px-6 py-5 border-b border-white/5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Code PIN de sécurité</span>
            </div>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Ce code PIN personnel (4 à 6 chiffres) est requis pour valider chaque opération financière.
              Il est propre à votre compte et ne peut être modifié que par vous.
            </p>
            <form onSubmit={handleSavePin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium" htmlFor="profile-new-pin">
                  Nouveau code PIN
                </label>
                <input
                  id="profile-new-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="4 à 6 chiffres"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-slate-600"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium" htmlFor="profile-confirm-pin">
                  Confirmer le code PIN
                </label>
                <input
                  id="profile-confirm-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Répétez le code PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-base font-mono tracking-widest focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:text-slate-600"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPin || newPin.length < 4 || confirmPin.length < 4}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-emerald-900/20"
                  id="btn-save-pin"
                >
                  {savingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Enregistrer le PIN
                </button>
              </div>
            </form>
          </div>

          {/* Section Changement mot de passe */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Changer le mot de passe</span>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium" htmlFor="profile-current-pwd">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="profile-current-pwd"
                    type={showPwd ? 'text' : 'password'}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Votre mot de passe actuel"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium" htmlFor="profile-new-pwd">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="profile-new-pwd"
                    type={showPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 text-xs font-medium" htmlFor="profile-confirm-pwd">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    id="profile-confirm-pwd"
                    type={showPwd ? 'text' : 'password'}
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="Répétez le nouveau mot de passe"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-slate-600"
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-amber-900/20"
                  id="btn-save-password"
                >
                  {savingPwd ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Changer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
