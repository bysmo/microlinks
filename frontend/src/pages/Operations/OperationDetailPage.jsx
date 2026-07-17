import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, ArrowUpRight, ArrowDownLeft, CheckCircle2,
  XCircle, Send, Ban, RefreshCw, Building2, User, Info,
  AlertTriangle, Check, X, FileText, ChevronRight, HelpCircle
} from 'lucide-react';
import StatusBadge from '../../components/common/StatusBadge';
import { operationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PinValidationModal from '../../components/common/PinValidationModal';

// ── Configuration des étapes du workflow ──
const STEPS = [
  { key: 'CREATION', label: 'Création', roles: ['AGENT_SAISIE'] },
  { key: 'SOUMIS', label: 'Validation Émetteur', roles: ['AGENT_VALIDATION'] },
  { key: 'ACCEPTE_EMETTEUR', label: 'Banque Émettrice', roles: ['AGENT_VALIDATION'] },
  { key: 'ACCEPTE_BANQUE_EMETTRICE', label: 'Banque Réceptrice', roles: ['AGENT_VALIDATION'] },
  { key: 'ACCEPTE_BANQUE_RECEPTRICE', label: 'Validation Bénéficiaire', roles: ['AGENT_VALIDATION'] },
  { key: 'ACCEPTE_BENEFICIAIRE', label: 'Comptabilisation', roles: ['AGENT_VALIDATION'] },
  { key: 'COMPTABILISE', label: 'Finalisé' }
];

export default function OperationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();

  const [op, setOp] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showValiderModal, setShowValiderModal] = useState(false);
  const [showRejeterModal, setShowRejeterModal] = useState(false);
  const [showAnnulerModal, setShowAnnulerModal] = useState(false);
  const [showSoumettreModal, setShowSoumettreModal] = useState(false);

  const [commentaire, setCommentaire] = useState('');
  const [motifRejet, setMotifRejet] = useState('');
  const [motifAnnulation, setMotifAnnulation] = useState('');

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCallback, setPinCallback] = useState(null);

  const executeWithPin = (actionFn) => {
    setPinCallback(() => async (pin) => {
      setShowPinModal(false);
      await actionFn(pin);
    });
    setShowPinModal(true);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Chargement des données
  // ────────────────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [opRes, histRes] = await Promise.all([
        operationApi.findById(id),
        operationApi.getHistorique(id)
      ]);
      setOp(opRes.data);
      setHistorique(histRes.data || []);
    } catch (err) {
      toast.error("Impossible de charger les détails de l'opération");
      navigate('/operations/du-jour');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ────────────────────────────────────────────────────────────────────────────
  // Détermination de l'acteur et des actions possibles
  // ────────────────────────────────────────────────────────────────────────────
  const userInstitutionId = user?.institutionId;

  // Déterminer si l'institution de l'utilisateur connecté est l'acteur actuel attendu
  const isCurrentActor = useMemo(() => {
    if (!op || !userInstitutionId) return false;
    const instId = String(userInstitutionId).trim();

    switch (op.statut) {
      case 'SOUMIS':
        return String(op.institutionEmettriceId).trim() === instId;
      case 'ACCEPTE_EMETTEUR':
        return op.banqueCorrespondanteEmettriceId && String(op.banqueCorrespondanteEmettriceId).trim() === instId;
      case 'ACCEPTE_BANQUE_EMETTRICE':
        return op.banqueCorrespondanteReceptriceId && String(op.banqueCorrespondanteReceptriceId).trim() === instId;
      case 'ACCEPTE_BANQUE_RECEPTRICE':
      case 'ACCEPTE_BENEFICIAIRE':
        return String(op.institutionBeneficiaireId).trim() === instId;
      default:
        return false;
    }
  }, [op, userInstitutionId]);

  // Rôles habilités pour valider / rejeter
  const canValidate = useMemo(() => {
    return isCurrentActor && hasAnyRole('AGENT_VALIDATION', 'ADMIN_INSTITUTION');
  }, [isCurrentActor, hasAnyRole]);

  // Émetteur créateur (pour annuler / soumettre)
  const isEmetteurCreateur = useMemo(() => {
    if (!op || !userInstitutionId) return false;
    return String(op.institutionEmettriceId).trim() === String(userInstitutionId).trim();
  }, [op, userInstitutionId]);

  // Déterminer le prochain statut si validé
  const nextStatus = useMemo(() => {
    if (!op) return null;
    switch (op.statut) {
      case 'SOUMIS': return 'ACCEPTE_EMETTEUR';
      case 'ACCEPTE_EMETTEUR': return 'ACCEPTE_BANQUE_EMETTRICE';
      case 'ACCEPTE_BANQUE_EMETTRICE': return 'ACCEPTE_BANQUE_RECEPTRICE';
      case 'ACCEPTE_BANQUE_RECEPTRICE': return 'ACCEPTE_BENEFICIAIRE';
      case 'ACCEPTE_BENEFICIAIRE': return 'COMPTABILISE';
      default: return null;
    }
  }, [op]);

  // ────────────────────────────────────────────────────────────────────────────
  // Actions du workflow
  // ────────────────────────────────────────────────────────────────────────────
  const handleSoumettre = () => {
    executeWithPin(async (pin) => {
      setActionLoading(true);
      try {
        await operationApi.soumettre(op.id, commentaire, pin);
        toast.success("Opération soumise avec succès !");
        setShowSoumettreModal(false);
        setCommentaire('');
        loadData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Échec de la soumission");
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleValider = () => {
    if (!nextStatus) return;
    executeWithPin(async (pin) => {
      setActionLoading(true);
      try {
        await operationApi.valider(op.id, nextStatus, commentaire, pin);
        toast.success("Opération approuvée et transmise à l'étape suivante !");
        setShowValiderModal(false);
        setCommentaire('');
        loadData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Échec de la validation");
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleRejeter = () => {
    if (!motifRejet.trim()) {
      toast.error("Veuillez saisir un motif de rejet");
      return;
    }
    executeWithPin(async (pin) => {
      setActionLoading(true);
      try {
        await operationApi.rejeter(op.id, motifRejet, pin);
        toast.success("Opération rejetée");
        setShowRejeterModal(false);
        setMotifRejet('');
        loadData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Échec du rejet");
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleAnnuler = () => {
    executeWithPin(async (pin) => {
      setActionLoading(true);
      try {
        await operationApi.annuler(op.id, motifAnnulation, pin);
        toast.success("Opération annulée");
        setShowAnnulerModal(false);
        setMotifAnnulation('');
        loadData();
      } catch (err) {
        toast.error(err.response?.data?.message || "Échec de l'annulation");
      } finally {
        setActionLoading(false);
      }
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Rendu de l'historique et du fil d'ariane
  // ────────────────────────────────────────────────────────────────────────────

  // Index du statut actuel dans le workflow
  const currentStepIndex = useMemo(() => {
    if (!op) return 0;
    if (op.statut === 'BROUILLON') return 0;
    if (op.statut === 'SOUMIS') return 1;
    if (op.statut === 'ACCEPTE_EMETTEUR') return 2;
    if (op.statut === 'ACCEPTE_BANQUE_EMETTRICE') return 3;
    if (op.statut === 'ACCEPTE_BANQUE_RECEPTRICE') return 4;
    if (op.statut === 'ACCEPTE_BENEFICIAIRE') return 5;
    if (op.statut === 'COMPTABILISE') return 6;
    // Si statut de rejet ou d'annulation
    if (op.statut.startsWith('REJETE') || op.statut === 'ANNULE') {
      // Trouver à quelle étape le rejet s'est produit
      if (op.statut === 'REJETE_EMETTEUR') return 1;
      if (op.statut === 'REJETE_BANQUE_EMETTRICE') return 2;
      if (op.statut === 'REJETE_BANQUE_RECEPTRICE') return 3;
      return 4; // Rejet final
    }
    return 0;
  }, [op]);

  const isRejected = op?.statut?.startsWith('REJETE') || op?.statut === 'ANNULE';

  if (loading || !op) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
          <span className="text-dark-400 text-sm">Chargement de l'opération...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-300 hover:text-white transition-colors"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white text-xl font-bold font-mono">{op.referenceUnique}</h1>
              <StatusBadge status={op.statut} customLabel={op.statutLabel} />
            </div>
            <p className="text-dark-400 text-xs mt-1">
              Créée le {format(new Date(op.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        </div>

        {/* Boutons d'actions contextuels */}
        <div className="flex gap-2 flex-wrap">
          {op.statut === 'BROUILLON' && isEmetteurCreateur && (
            <>
              <button
                onClick={() => setShowAnnulerModal(true)}
                className="btn-danger btn-sm flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> Annuler
              </button>
              <button
                onClick={() => setShowSoumettreModal(true)}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Soumettre
              </button>
            </>
          )}

          {op.statut === 'SOUMIS' && isEmetteurCreateur && (
            <button
              onClick={() => setShowAnnulerModal(true)}
              className="btn-danger btn-sm flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" /> Annuler
            </button>
          )}

          {canValidate && (
            <>
              <button
                onClick={() => setShowRejeterModal(true)}
                className="btn-danger btn-sm flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Rejeter
              </button>
              <button
                onClick={() => setShowValiderModal(true)}
                className="btn-success btn-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> {op.statut === 'ACCEPTE_BENEFICIAIRE' ? 'Comptabiliser' : 'Approuver'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Fil d'Ariane / Workflow Stepper ── */}
      <div className="glass-card p-5">
        <h2 className="text-white text-xs font-bold uppercase tracking-wider mb-4 text-dark-300">
          Cheminement et État du Workflow
        </h2>

        {/* Version Desktop Stepper */}
        <div className="hidden md:flex items-center justify-between relative py-2">
          {/* Ligne de fond */}
          <div className="absolute left-6 right-6 top-1/2 h-0.5 bg-dark-700 -translate-y-1/2 z-0" />

          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            const isFailedStep = isRejected && isCurrent;

            let iconCls = "bg-dark-800 border-dark-600 text-dark-500";
            if (isCompleted) {
              iconCls = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
            } else if (isFailedStep) {
              iconCls = "bg-red-500/20 border-red-500 text-red-400 animate-pulse";
            } else if (isCurrent) {
              iconCls = "bg-primary-500/20 border-primary-500 text-primary-400 ring-2 ring-primary-500/20";
            }

            return (
              <div key={step.key} className="flex flex-col items-center flex-1 z-10 relative">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${iconCls}`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isFailedStep ? (
                    <X className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-[10px] font-semibold mt-2 text-center max-w-20 ${isCompleted ? 'text-emerald-400' : isFailedStep ? 'text-red-400' : isCurrent ? 'text-primary-400 font-bold' : 'text-dark-400'
                  }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Message d'état actuel explicatif */}
        <div className="mt-4 p-3 rounded-lg bg-dark-900/60 border border-dark-800 flex items-start gap-2.5 text-xs text-dark-300">
          <Info className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            {isRejected ? (
              <p>
                <strong className="text-red-400">Transaction Rejetée / Annulée : </strong>
                L'opération a été arrêtée à l'étape <span className="font-semibold text-white">{STEPS[currentStepIndex]?.label}</span>.
                {op.commentaireRejet && <span className="block mt-1 text-dark-400">Motif : "{op.commentaireRejet}"</span>}
              </p>
            ) : op.statut === 'COMPTABILISE' ? (
              <p>
                <strong className="text-emerald-400">Succès : </strong>
                L'opération est finalisée et comptabilisée au niveau du grand livre de règlement.
              </p>
            ) : (
              <p>
                <strong>Étape Actuelle : </strong>
                En attente d'approbation par <span className="font-semibold text-white">{STEPS[currentStepIndex]?.label}</span>.
                {isCurrentActor ? (
                  <span className="text-primary-400 block mt-1 font-medium">
                    ⚡ Votre institution a la main pour valider ou rejeter cette opération.
                  </span>
                ) : (
                  <span className="text-dark-400 block mt-1">
                    En attente de traitement par le correspondant habilité.
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grille Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne Gauche : Infos Financières */}
        <div className="lg:col-span-2 space-y-6">

          <div className="glass-card p-6 space-y-5">
            <h2 className="text-white font-semibold text-sm border-b border-white/5 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-400" /> Informations Financières
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
              <div>
                <span className="text-dark-400 text-xs block">Type d'opération</span>
                <span className="text-white text-sm font-semibold mt-1 block">
                  {op.typeOperation === 'VIREMENT' ? '⇄ Virement Interbancaire' : op.typeOperation === 'CHEQUE' ? '⎗ Encaissement Chèque' : '↙ Prélèvement'}
                </span>
              </div>
              <div>
                <span className="text-dark-400 text-xs block">Montant</span>
                <span className="text-white text-lg font-mono font-bold mt-0.5 block">
                  {parseFloat(op.montant || 0).toLocaleString('fr-FR')} {op.devise}
                </span>
              </div>
              <div>
                <span className="text-dark-400 text-xs block">Date de règlement</span>
                <span className="text-white text-sm font-semibold mt-1 block">
                  {op.dateOperation ? format(new Date(op.dateOperation), 'dd/MM/yyyy') : '—'}
                </span>
              </div>
              <div>
                <span className="text-dark-400 text-xs block">Date valeur</span>
                <span className="text-white text-sm font-semibold mt-1 block">
                  {op.dateValeur ? format(new Date(op.dateValeur), 'dd/MM/yyyy') : 'Immédiate'}
                </span>
              </div>
              {op.numeroCheque && (
                <div>
                  <span className="text-dark-400 text-xs block">Numéro de chèque</span>
                  <span className="text-white font-mono text-sm font-semibold mt-1 block">{op.numeroCheque}</span>
                </div>
              )}
            </div>

            {op.motif && (
              <div className="pt-2">
                <span className="text-dark-400 text-xs block">Motif / Libellé de l'opération</span>
                <div className="bg-dark-900/40 border border-dark-800 rounded-lg p-3 text-dark-200 text-sm mt-1">
                  {op.motif}
                </div>
              </div>
            )}
          </div>

          {/* Acteurs Émetteurs / Récepteurs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* Donneur d'ordre (Émission) */}
            <div className="glass-card p-5 space-y-4 border-l-2 border-blue-500">
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2 text-blue-400">
                <ArrowUpRight className="w-4 h-4" /> Donneur d'ordre (Émetteur)
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-dark-400 text-[10px] uppercase block">Institution émettrice</span>
                  <span className="text-white text-xs font-semibold mt-0.5 block">{op.nomInstitutionEmettrice}</span>
                </div>
                {op.nomBanqueCorrespondanteEmettrice && (
                  <div>
                    <span className="text-dark-400 text-[10px] uppercase block">Banque correspondante</span>
                    <span className="text-white text-xs font-medium mt-0.5 block">{op.nomBanqueCorrespondanteEmettrice}</span>
                  </div>
                )}
                {op.compteCorrespondanceEmetteur && (
                  <div>
                    <span className="text-dark-400 text-[10px] uppercase block">Compte de règlement</span>
                    <span className="text-primary-300 font-mono text-xs font-bold mt-0.5 block">{op.compteCorrespondanceEmetteur}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-dark-400 text-[10px] uppercase block">Donneur d'ordre final</span>
                  <span className="text-white text-xs font-semibold mt-0.5 block">{op.nomDonneurOrdre}</span>
                  <span className="text-dark-300 font-mono text-[10px] block">Compte : {op.compteDonneurOrdre}</span>
                </div>
              </div>
            </div>

            {/* Bénéficiaire (Réception) */}
            <div className="glass-card p-5 space-y-4 border-l-2 border-emerald-500">
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2 text-emerald-400">
                <ArrowDownLeft className="w-4 h-4" /> Bénéficiaire (Récepteur)
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-dark-400 text-[10px] uppercase block">Institution bénéficiaire</span>
                  <span className="text-white text-xs font-semibold mt-0.5 block">{op.nomInstitutionBeneficiaire}</span>
                </div>
                {op.nomBanqueCorrespondanteReceptrice && (
                  <div>
                    <span className="text-dark-400 text-[10px] uppercase block">Banque correspondante</span>
                    <span className="text-white text-xs font-medium mt-0.5 block">{op.nomBanqueCorrespondanteReceptrice}</span>
                  </div>
                )}
                {op.compteCorrespondanceRecepteur && (
                  <div>
                    <span className="text-dark-400 text-[10px] uppercase block">Compte de règlement</span>
                    <span className="text-emerald-300 font-mono text-xs font-bold mt-0.5 block">{op.compteCorrespondanceRecepteur}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/5">
                  <span className="text-dark-400 text-[10px] uppercase block">Bénéficiaire final</span>
                  <span className="text-white text-xs font-semibold mt-0.5 block">{op.nomBeneficiaire}</span>
                  <span className="text-dark-300 font-mono text-[10px] block">Compte : {op.compteBeneficiaire}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Historique des actions */}
        <div className="space-y-6">
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-white font-semibold text-sm border-b border-white/5 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-400" /> Historique d'Approbation
            </h2>

            {historique.length === 0 ? (
              <div className="text-center py-6 text-dark-500 text-xs">
                Aucune action enregistrée pour le moment.
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(historique) &&

                  historique.map((h, index) => (
                    <div key={h.id || index} className="relative flex gap-3 pb-2 last:pb-0">
                      {/* Ligne verticale entre étapes */}
                      {index < historique.length - 1 && (
                        <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-dark-700" />
                      )}

                      {/* Statut indicateur dot */}
                      <div className={`w-6.5 h-6.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${h.statutApres?.startsWith('REJETE') || h.statutApres === 'ANNULE'
                        ? 'bg-red-500/10 border-red-500 text-red-400'
                        : h.statutApres === 'COMPTABILISE'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-primary-500/10 border-primary-500 text-primary-400'
                        }`}>
                        {h.statutApres?.startsWith('REJETE') || h.statutApres === 'ANNULE' ? (
                          <X className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <p className="text-white text-xs font-semibold">
                          {h.statutApres ? (
                            STEPS.find(s => s.key === h.statutApres)?.label || h.statutApres
                          ) : 'Action'}
                        </p>
                        <p className="text-dark-400 text-[10px]">
                          Par <span className="text-white">{h.acteurNom || h.acteurId || 'Système'}</span> ({h.dateAction ? format(new Date(h.dateAction), 'dd/MM/yy HH:mm') : '—'})
                        </p>
                        {h.commentaire && (
                          <p className="bg-dark-900/60 text-dark-300 text-xs italic px-2 py-1 rounded border border-dark-800 mt-1 max-w-full truncate whitespace-normal">
                            "{h.commentaire}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal d'Approbation ── */}
      {showValiderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {op.statut === 'ACCEPTE_BENEFICIAIRE' ? 'Confirmer la Comptabilisation' : 'Valider l\'opération'}
              </h3>
              <button onClick={() => setShowValiderModal(false)} className="text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-dark-300 text-sm">
              Vous vous apprêtez à valider l'opération <strong className="font-mono text-white">{op.referenceUnique}</strong> pour la transmettre à l'étape suivante.
            </p>

            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="val-comment">
                Commentaire de validation (optionnel)
              </label>
              <textarea
                id="val-comment"
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                placeholder="Ajoutez des notes ou détails de compensation..."
                rows={3}
                className="w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowValiderModal(false)}
                disabled={actionLoading}
                className="btn-secondary btn-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleValider}
                disabled={actionLoading}
                className="btn-success btn-sm flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {op.statut === 'ACCEPTE_BENEFICIAIRE' ? 'Comptabiliser' : 'Approuver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Rejet ── */}
      {showRejeterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4 border-red-500/20 animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Rejeter l'opération
              </h3>
              <button onClick={() => setShowRejeterModal(false)} className="text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-dark-300 text-sm">
              Vous vous apprêtez à rejeter définitivement l'opération <strong className="font-mono text-white">{op.referenceUnique}</strong>. Cette action est irréversible.
            </p>

            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold animate-pulse" htmlFor="rej-motif">
                Motif du rejet <span className="text-red-400">*</span>
              </label>
              <textarea
                id="rej-motif"
                value={motifRejet}
                onChange={e => setMotifRejet(e.target.value)}
                placeholder="Indiquez clairement la raison du rejet..."
                required
                rows={3}
                className="w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRejeterModal(false)}
                disabled={actionLoading}
                className="btn-secondary btn-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRejeter}
                disabled={actionLoading || !motifRejet.trim()}
                className="btn-danger btn-sm flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal d'Annulation ── */}
      {showAnnulerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4 border-amber-500/20 animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Ban className="w-5 h-5 text-amber-400" />
                Annuler l'opération
              </h3>
              <button onClick={() => setShowAnnulerModal(false)} className="text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-dark-300 text-sm">
              Êtes-vous sûr de vouloir annuler l'opération <strong className="font-mono text-white">{op.referenceUnique}</strong> ?
            </p>

            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="ann-motif">
                Motif d'annulation (optionnel)
              </label>
              <textarea
                id="ann-motif"
                value={motifAnnulation}
                onChange={e => setMotifAnnulation(e.target.value)}
                placeholder="Raison de l'annulation..."
                rows={3}
                className="w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAnnulerModal(false)}
                disabled={actionLoading}
                className="btn-secondary btn-sm"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleAnnuler}
                disabled={actionLoading}
                className="btn-danger btn-sm flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 border-none"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Annuler l'opération
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Soumission ── */}
      {showSoumettreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Send className="w-5 h-5 text-primary-400" />
                Soumettre l'opération
              </h3>
              <button onClick={() => setShowSoumettreModal(false)} className="text-dark-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-dark-300 text-sm">
              Vous êtes sur le point de soumettre l'opération <strong className="font-mono text-white">{op.referenceUnique}</strong> pour validation par l'agent de validation de votre institution.
            </p>

            <div className="space-y-1.5">
              <label className="text-dark-300 text-xs font-semibold" htmlFor="sub-comment">
                Commentaire de soumission (optionnel)
              </label>
              <textarea
                id="sub-comment"
                value={commentaire}
                onChange={e => setCommentaire(e.target.value)}
                placeholder="Ajoutez des notes ou détails importants..."
                rows={3}
                className="w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSoumettreModal(false)}
                disabled={actionLoading}
                className="btn-secondary btn-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSoumettre}
                disabled={actionLoading}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Soumettre l'opération
              </button>
            </div>
          </div>
        </div>
      )}

      <PinValidationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={pinCallback}
      />
    </div>
  );
}
