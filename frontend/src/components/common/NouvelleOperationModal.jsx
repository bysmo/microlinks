import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight, Send, Save, Loader2, Building2,
  User, AlertCircle, ChevronDown,
  Lock, Info, Hash
} from 'lucide-react';
import Modal from './Modal';
import { operationApi, institutionApi, compteReglementApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import PinValidationModal from './PinValidationModal';

const DEVISES = ['XOF', 'XAF', 'EUR', 'USD', 'GBP', 'MAD', 'GNF'];

// ── Génère un aperçu de référence côté client (la vraie vient du backend) ──
function previewReference(typeOperation, sigle) {
  const prefix = { VIREMENT: 'VIR', CHEQUE: 'CHQ', PRELEVEMENT: 'PRE' }[typeOperation] || 'OP';
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const sig = (sigle || '???').toUpperCase().slice(0, 8);
  return `ML-${prefix}-${sig}-${date}-XXXXXX`;
}

// ─── Styles constants (outside component for stability) ───────────────────────
const INPUT_CLS = 'w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all';
const INPUT_RO_CLS = 'w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-dark-400 text-sm cursor-not-allowed opacity-70';
const LABEL_CLS = 'block text-dark-300 text-xs font-semibold mb-1.5';
const SECTION_CLS = 'glass-card p-5 space-y-4';

// ─── Sub-components defined OUTSIDE the modal (prevents re-mount on each render) ──

const SelectField = ({ label, name, value, onChange, children, required, disabled, id }) => (
  <div>
    <label className={LABEL_CLS} htmlFor={id || name}>
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <div className="relative">
      <select
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${disabled ? INPUT_RO_CLS : INPUT_CLS} appearance-none pr-8`}
      >
        {children}
      </select>
      {disabled
        ? <Lock className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-500 pointer-events-none" />
        : <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
      }
    </div>
  </div>
);

const TextField = ({ label, name, value, onChange, placeholder, required, type = 'text', readOnly, id }) => (
  <div>
    <label className={LABEL_CLS} htmlFor={id || name}>
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <div className="relative">
      <input
        id={id || name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className={readOnly ? INPUT_RO_CLS : INPUT_CLS}
      />
      {readOnly && <Lock className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-500 pointer-events-none" />}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const initialForm = {
  typeOperation: 'VIREMENT',
  dateOperation: new Date().toISOString().split('T')[0],
  dateValeur: '',
  montant: '',
  devise: 'XOF',
  motif: '',
  // Émetteur (figé)
  institutionEmettriceId: '',
  nomInstitutionEmettrice: '',
  // Correspondance émetteur
  banqueCorrespondanteEmettriceId: '',
  nomBanqueCorrespondanteEmettrice: '',
  compteCorrespondanceEmetteurId: '',
  compteCorrespondanceEmetteur: '',
  // Donneur d'ordre client
  compteDonneurOrdre: '',
  nomDonneurOrdre: '',
  // Adresse DO
  adresseDoRue: '',
  adresseDoComplement: '',
  adresseDoVille: '',
  adresseDoCodePostal: '',
  adresseDoPays: '',
  // DO effectif
  nomDonneurOrdreEffectif: '',
  adresseDoeRue: '',
  adresseDoeComplement: '',
  adresseDoeVille: '',
  adresseDoeCodePostal: '',
  adresseDoePays: '',
  // Bénéficiaire
  institutionBeneficiaireId: '',
  nomInstitutionBeneficiaire: '',
  banqueCorrespondanteReceptriceId: '',
  nomBanqueCorrespondanteReceptrice: '',
  compteCorrespondanceRecepteurId: '',
  compteCorrespondanceRecepteur: '',
  compteBeneficiaire: '',
  nomBeneficiaire: '',
  // Adresse BEN
  adresseBenRue: '',
  adresseBenComplement: '',
  adresseBenVille: '',
  adresseBenCodePostal: '',
  adresseBenPays: '',
  // BEN effectif
  nomBeneficiaireEffectif: '',
  adresseBeneRue: '',
  adresseBeneComplement: '',
  adresseBeneVille: '',
  adresseBeneCodePostal: '',
  adresseBenePays: '',
  // Chèque
  numeroCheque: '',
};

export default function NouvelleOperationModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitAndSend, setSubmitAndSend] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCallback, setPinCallback] = useState(null);
  const [showAlmDO, setShowAlmDO] = useState(false);
  const [showAlmBen, setShowAlmBen] = useState(false);

  const executeWithPin = (actionFn) => {
    setPinCallback(() => async (pin) => {
      setShowPinModal(false);
      await actionFn(pin);
    });
    setShowPinModal(true);
  };

  // Data
  const [myInstitution, setMyInstitution] = useState(null);
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [mesComptesEmetteur, setMesComptesEmetteur] = useState([]);  // Tous les comptes de l'institution émettrice
  const [comptesRecepteur, setComptesRecepteur] = useState([]);       // Tous les comptes de l'institution bénéficiaire
  const [loadingInst, setLoadingInst] = useState(false);
  const [loadingComptesRec, setLoadingComptesRec] = useState(false);
  const [loadingComptesEms, setLoadingComptesEms] = useState(false);

  const isBank = myInstitution?.typeInstitution === 'BANQUE';

  const isBenefBank = useMemo(() => {
    if (!form.institutionBeneficiaireId) return false;
    const benef = allInstitutions.find(i => i.id === form.institutionBeneficiaireId);
    return benef?.typeInstitution === 'BANQUE';
  }, [form.institutionBeneficiaireId, allInstitutions]);

  // ────────────────────────────────────────────────────────────────────────────
  // Chargement initial
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm);
    setMyInstitution(null);
    setMesComptesEmetteur([]);
    setComptesRecepteur([]);
    setLoadingInst(true);
    setLoadingComptesEms(true);

    // 1. Toutes les institutions actives
    institutionApi.findAll({ statut: 'ACTIF', size: 200 })
      .then(res => {
        const all = res?.data?.content || [];
        setAllInstitutions(all);
      })
      .catch(() => toast.error('Erreur de chargement des institutions'));

    // 2. Mon institution + mes comptes de règlement
    const fetchMyInstitutionAndComptes = async () => {
      let mine = null;
      let targetId = user?.institutionId;

      if (targetId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
        if (isUuid) {
          try {
            const instRes = await institutionApi.findById(targetId);
            mine = instRes?.data;
          } catch (e) {
            console.warn('findById émetteur échoué, fallback...', e.message);
          }
        } else {
          try {
            const instRes = await institutionApi.findByCode(targetId.toUpperCase());
            mine = instRes?.data;
            targetId = mine?.id;
          } catch (e) {
            console.warn('findByCode émetteur échoué pour institutionId non-UUID...', e.message);
          }
        }
      }

      if (!mine && user?.username) {
        const sigle = user.username.includes('@')
          ? user.username.split('@')[1].split('.')[0].toUpperCase()
          : user.username.split('.')[0].toUpperCase();
        try {
          const res = await institutionApi.findByCode(sigle);
          mine = res.data;
          targetId = mine?.id;
        } catch (_) {
          try {
            const listRes = await institutionApi.findAll({ size: 100 });
            const cleanSigle = sigle.toLowerCase().replace(/[^a-z0-9]/g, "");
            const found = (listRes.data?.content || []).find(i => {
              const normSigle = (i.sigle || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const normCode = (i.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              return normSigle === cleanSigle || normCode === cleanSigle;
            });
            if (found) {
              mine = found;
              targetId = found.id;
            }
          } catch (e2) {
            console.warn('Impossible de récupérer institution émettrice via liste:', e2.message);
          }
        }
      }


      if (!mine || !targetId) {
        setLoadingInst(false);
        setLoadingComptesEms(false);
        return;
      }

      try {
        setMyInstitution(mine);
        const comptesRes = await compteReglementApi.findAll(targetId);
        const comptes = comptesRes?.data || [];
        setMesComptesEmetteur(comptes);

        const defaults = {
          institutionEmettriceId: mine.id,
          nomInstitutionEmettrice: mine.nom,
          devise: 'XOF',
        };

        if (mine.typeInstitution === 'BANQUE') {
          // Banque → émetteur figé à elle-même
          defaults.banqueCorrespondanteEmettriceId = mine.id;
          defaults.nomBanqueCorrespondanteEmettrice = mine.nom;
          // Pré-sélectionner le premier compte de règlement disponible
          if (comptes.length >= 1) {
            defaults.compteCorrespondanceEmetteurId = comptes[0].id;
            defaults.compteCorrespondanceEmetteur = comptes[0].numeroCompte;
          }
        } else {
          // MESO/MICRO → banque correspondante par défaut définie sur l'institution
          // Si aucune banque par défaut, on prend la première banque liée via les comptes
          const banqueDefaultId = mine.banqueCorrespondanteId
            || (comptes.length > 0 && comptes[0].banqueDomiciliaireId ? comptes[0].banqueDomiciliaireId : '');
          const banqueDefaultNom = mine.banqueCorrespondanteNom
            || (comptes.length > 0 ? comptes[0].banqueDomiciliaireNom || '' : '');

          if (banqueDefaultId) {
            defaults.banqueCorrespondanteEmettriceId = banqueDefaultId;
            defaults.nomBanqueCorrespondanteEmettrice = banqueDefaultNom;
            // Pré-sélectionner le premier compte lié à cette banque
            const filteredByBank = comptes.filter(
              c => c.banqueDomiciliaireId && String(c.banqueDomiciliaireId).trim() === String(banqueDefaultId).trim()
            );
            if (filteredByBank.length >= 1) {
              defaults.compteCorrespondanceEmetteurId = filteredByBank[0].id;
              defaults.compteCorrespondanceEmetteur = filteredByBank[0].numeroCompte;
            }
          }
        }

        setForm(prev => ({ ...prev, ...defaults }));
      } catch (err) {
        console.warn('Erreur chargement comptes émetteur:', err.message);
      } finally {
        setLoadingInst(false);
        setLoadingComptesEms(false);
      }
    };

    fetchMyInstitutionAndComptes();
  }, [isOpen, user]);

  // ────────────────────────────────────────────────────────────────────────────
  // Banques disponibles côté ÉMETTEUR : uniquement celles liées aux comptes enregistrés
  // ────────────────────────────────────────────────────────────────────────────
  const banquesEmetteur = useMemo(() => {
    if (!mesComptesEmetteur.length) return [];
    const seen = new Set();
    const result = [];
    for (const c of mesComptesEmetteur) {
      if (c.banqueDomiciliaireId && !seen.has(c.banqueDomiciliaireId)) {
        seen.add(c.banqueDomiciliaireId);
        result.push({
          id: c.banqueDomiciliaireId,
          nom: c.banqueDomiciliaireNom || c.banqueDomiciliaireId,
          code: c.banqueDomiciliaireCode || '',
        });
      }
    }
    return result;
  }, [mesComptesEmetteur]);

  // ────────────────────────────────────────────────────────────────────────────
  // Banques disponibles côté RÉCEPTEUR : uniquement celles liées aux comptes enregistrés
  // ────────────────────────────────────────────────────────────────────────────
  const banquesRecepteur = useMemo(() => {
    if (!comptesRecepteur.length) return [];
    const seen = new Set();
    const result = [];
    for (const c of comptesRecepteur) {
      if (c.banqueDomiciliaireId && !seen.has(c.banqueDomiciliaireId)) {
        seen.add(c.banqueDomiciliaireId);
        result.push({
          id: c.banqueDomiciliaireId,
          nom: c.banqueDomiciliaireNom || c.banqueDomiciliaireId,
          code: c.banqueDomiciliaireCode || '',
        });
      }
    }
    return result;
  }, [comptesRecepteur]);

  // ────────────────────────────────────────────────────────────────────────────
  // Comptes ÉMETTEUR filtrés par banque sélectionnée
  // Comparaison en String() pour éviter tout problème de type UUID vs string
  // ────────────────────────────────────────────────────────────────────────────
  const comptesEmetteurFiltres = useMemo(() => {
    if (isBank) return mesComptesEmetteur; // Si c'est une banque, elle a accès à tous ses comptes
    if (!form.banqueCorrespondanteEmettriceId) return []; // Pas de banque → vide
    if (!mesComptesEmetteur.length) return [];
    const bankId = String(form.banqueCorrespondanteEmettriceId).trim();
    return mesComptesEmetteur.filter(
      c => c.banqueDomiciliaireId && String(c.banqueDomiciliaireId).trim() === bankId
    );
  }, [mesComptesEmetteur, form.banqueCorrespondanteEmettriceId, isBank]);

  // ────────────────────────────────────────────────────────────────────────────
  // Comptes RÉCEPTEUR filtrés par banque sélectionnée
  // Règle : si banque sélectionnée → seuls les comptes liés à cette banque
  //         si aucune banque → tous les comptes du bénéficiaire (pour affichage général)
  // ────────────────────────────────────────────────────────────────────────────
  const comptesRecepteurFiltres = useMemo(() => {
    if (isBenefBank) return comptesRecepteur;
    if (!form.banqueCorrespondanteReceptriceId) return []; // Obliger à choisir une banque
    return comptesRecepteur.filter(
      c => c.banqueDomiciliaireId && String(c.banqueDomiciliaireId).trim() === String(form.banqueCorrespondanteReceptriceId).trim()
    );
  }, [comptesRecepteur, form.banqueCorrespondanteReceptriceId, isBenefBank]);

  // ────────────────────────────────────────────────────────────────────────────
  // Bénéficiaires disponibles
  // Règles : 1) Banque ne peut pas émettre vers une autre banque
  //          2) L'institution émettrice ne peut JAMAIS être bénéficiaire
  //             (fonctionne même avant que myInstitution soit chargée, via form.institutionEmettriceId)
  // ────────────────────────────────────────────────────────────────────────────
  const beneficiairesDisponibles = useMemo(() => {
    if (!allInstitutions.length) return [];
    const isBank = myInstitution?.typeInstitution === 'BANQUE';
    // L'ID de l'émetteur est disponible dès le chargement du form (avant myInstitution)
    const emettriceId = form.institutionEmettriceId
      || (myInstitution?.id ? String(myInstitution.id) : null);
    return allInstitutions.filter(i => {
      // Exclure systématiquement l'institution émettrice (même elle-même)
      if (emettriceId && String(i.id) === String(emettriceId)) return false;
      // Banque → pas vers une autre banque
      if (isBank && i.typeInstitution === 'BANQUE') return false;
      return true;
    });
  }, [myInstitution, allInstitutions, form.institutionEmettriceId]);

  // ── Aperçu de la référence qui sera générée ──
  const refPreview = useMemo(() =>
    previewReference(form.typeOperation, myInstitution?.sigle || myInstitution?.code),
    [form.typeOperation, myInstitution]
  );



  // ────────────────────────────────────────────────────────────────────────────
  // Handlers stables (useCallback pour éviter les re-renders)
  // ────────────────────────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  // Changement de banque émettrice (MESO/MICRO seulement)
  // Les comptes sont déjà chargés à l'ouverture du modal — on filtre juste localement
  const handleBanqueEmettriceChange = useCallback((e) => {
    const selectedId = e.target.value;
    const b = banquesEmetteur.find(b => b.id === selectedId);

    // Filtrage local des comptes déjà chargés par la banque sélectionnée
    const filtered = selectedId
      ? mesComptesEmetteur.filter(
        c => c.banqueDomiciliaireId && String(c.banqueDomiciliaireId).trim() === String(selectedId).trim()
      )
      : [];

    setForm(prev => ({
      ...prev,
      banqueCorrespondanteEmettriceId: selectedId,
      nomBanqueCorrespondanteEmettrice: b?.nom || '',
      // Réinitialiser le compte et pré-sélectionner le premier disponible
      compteCorrespondanceEmetteurId: filtered.length >= 1 ? filtered[0].id : '',
      compteCorrespondanceEmetteur: filtered.length >= 1 ? filtered[0].numeroCompte : '',
    }));
  }, [banquesEmetteur, mesComptesEmetteur]);

  // Sélection du compte de règlement émetteur
  const handleCompteEmetteurChange = useCallback((e) => {
    const selectedId = e.target.value;
    setForm(prev => {
      const cc = mesComptesEmetteur.find(c => c.id === selectedId);
      return {
        ...prev,
        compteCorrespondanceEmetteurId: selectedId,
        compteCorrespondanceEmetteur: cc?.numeroCompte || '',
      };
    });
  }, [mesComptesEmetteur]);

  // Sélection de l'institution bénéficiaire
  const handleBeneficiaireChange = useCallback(async (e) => {
    const selectedId = e.target.value;
    const selected = allInstitutions.find(i => i.id === selectedId);

    if (!selected) {
      setComptesRecepteur([]);
      setForm(prev => ({
        ...prev,
        institutionBeneficiaireId: '',
        nomInstitutionBeneficiaire: '',
        banqueCorrespondanteReceptriceId: '',
        nomBanqueCorrespondanteReceptrice: '',
        compteCorrespondanceRecepteurId: '',
        compteCorrespondanceRecepteur: '',
      }));
      return;
    }

    // Charger les comptes de règlement du bénéficiaire
    setLoadingComptesRec(true);
    let comptes = [];
    try {
      const res = await compteReglementApi.findAll(selected.id);
      comptes = res.data || [];
    } catch (_) {
    } finally {
      setLoadingComptesRec(false);
    }
    setComptesRecepteur(comptes);

    // Banque correspondante par défaut :
    // 1. Priorité à la banque définie sur le profil de l'institution bénéficiaire
    // 2. Sinon, la première banque trouvée dans ses comptes de règlement
    const banqueDefaultId = selected.banqueCorrespondanteId
      || (comptes.length > 0 && comptes[0].banqueDomiciliaireId ? comptes[0].banqueDomiciliaireId : '');
    const banqueDefaultNom = selected.banqueCorrespondanteNom
      || (comptes.length > 0 ? comptes[0].banqueDomiciliaireNom || '' : '');

    // Pré-sélectionner le premier compte correspondant à la banque par défaut
    const comptesForDefaultBank = banqueDefaultId
      ? comptes.filter(c => c.banqueDomiciliaireId && String(c.banqueDomiciliaireId).trim() === String(banqueDefaultId).trim())
      : comptes;

    setForm(prev => ({
      ...prev,
      institutionBeneficiaireId: selected.id,
      nomInstitutionBeneficiaire: selected.nom,
      banqueCorrespondanteReceptriceId: banqueDefaultId,
      nomBanqueCorrespondanteReceptrice: banqueDefaultNom,
      compteCorrespondanceRecepteurId: comptesForDefaultBank.length >= 1 ? comptesForDefaultBank[0].id : '',
      compteCorrespondanceRecepteur: comptesForDefaultBank.length >= 1 ? comptesForDefaultBank[0].numeroCompte : '',
    }));
  }, [allInstitutions]);

  // Sélection du compte de règlement récepteur
  const handleCompteRecepteurChange = useCallback((e) => {
    const selectedId = e.target.value;
    setForm(prev => {
      const cc = comptesRecepteur.find(c => c.id === selectedId);
      return {
        ...prev,
        compteCorrespondanceRecepteurId: selectedId,
        compteCorrespondanceRecepteur: cc?.numeroCompte || '',
        ...(cc?.banqueDomiciliaireId ? {
          banqueCorrespondanteReceptriceId: cc.banqueDomiciliaireId,
          nomBanqueCorrespondanteReceptrice: cc.banqueDomiciliaireNom || '',
        } : {}),
      };
    });
  }, [comptesRecepteur]);

  // Changement de banque réceptrice → pré-sélectionne le premier compte disponible
  const handleBanqueReceptriceChange = useCallback((e) => {
    const selectedId = e.target.value;
    const b = banquesRecepteur.find(b => b.id === selectedId);
    // Filtrer les comptes pour cette banque et pré-sélectionner le premier
    const filtered = selectedId
      ? comptesRecepteur.filter(
        c => c.banqueDomiciliaireId && String(c.banqueDomiciliaireId).trim() === String(selectedId).trim()
      )
      : [];
    setForm(prev => ({
      ...prev,
      banqueCorrespondanteReceptriceId: selectedId,
      nomBanqueCorrespondanteReceptrice: b?.nom || '',
      // Pré-sélectionner le premier compte disponible pour cette banque
      compteCorrespondanceRecepteurId: filtered.length >= 1 ? filtered[0].id : '',
      compteCorrespondanceRecepteur: filtered.length >= 1 ? filtered[0].numeroCompte : '',
    }));
  }, [banquesRecepteur, comptesRecepteur]);

  // ────────────────────────────────────────────────────────────────────────────
  // Validation & soumission
  // ────────────────────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.montant || isNaN(parseFloat(form.montant)) || parseFloat(form.montant) <= 0) {
      toast.error('Le montant doit être supérieur à 0'); return false;
    }
    if (!form.institutionBeneficiaireId) {
      toast.error("Veuillez sélectionner l'institution bénéficiaire"); return false;
    }
    // ── Contrôle : émetteur ≠ bénéficiaire ──
    if (form.institutionEmettriceId && form.institutionEmettriceId === form.institutionBeneficiaireId) {
      toast.error("L'institution émettrice et bénéficiaire doivent être différentes"); return false;
    }
    if (!form.compteDonneurOrdre) {
      toast.error("Le compte donneur d'ordre est obligatoire"); return false;
    }
    if (!form.nomDonneurOrdre) {
      toast.error("Le nom du donneur d'ordre est obligatoire"); return false;
    }
    if (!form.compteBeneficiaire) {
      toast.error('Le compte bénéficiaire est obligatoire'); return false;
    }
    if (!form.nomBeneficiaire) {
      toast.error('Le nom du bénéficiaire est obligatoire'); return false;
    }
    if (form.typeOperation === 'CHEQUE' && !form.numeroCheque) {
      toast.error('Le numéro de chèque est obligatoire'); return false;
    }
    // ── Contrôle règle métier : banque → pas vers banque ──
    if (isBank) {
      const benef = allInstitutions.find(i => i.id === form.institutionBeneficiaireId);
      if (benef?.typeInstitution === 'BANQUE') {
        toast.error('Une banque ne peut pas émettre une opération vers une autre banque'); return false;
      }
    }
    return true;
  };

  const buildPayload = () => {
    const cleanAddress = (rue, comp, vil, cp, pays) => {
      if (!rue && !comp && !vil && !cp && !pays) return undefined;
      return {
        rue: rue || undefined,
        complement: comp || undefined,
        ville: vil || undefined,
        codePostal: cp || undefined,
        pays: pays || undefined
      };
    };

    return {
      typeOperation: form.typeOperation,
      dateOperation: form.dateOperation || undefined,
      dateValeur: form.dateValeur || undefined,
      montant: parseFloat(form.montant),
      devise: form.devise,
      motif: form.motif || undefined,
      institutionEmettriceId: form.institutionEmettriceId,
      nomInstitutionEmettrice: form.nomInstitutionEmettrice,
      compteDonneurOrdre: form.compteDonneurOrdre,
      nomDonneurOrdre: form.nomDonneurOrdre,
      banqueCorrespondanteEmettriceId: form.banqueCorrespondanteEmettriceId || undefined,
      nomBanqueCorrespondanteEmettrice: form.nomBanqueCorrespondanteEmettrice || undefined,
      compteCorrespondanceEmetteur: form.compteCorrespondanceEmetteur || undefined,
      adresseDonneurOrdre: cleanAddress(form.adresseDoRue, form.adresseDoComplement, form.adresseDoVille, form.adresseDoCodePostal, form.adresseDoPays),
      nomDonneurOrdreEffectif: form.nomDonneurOrdreEffectif || undefined,
      adresseDonneurOrdreEffectif: cleanAddress(form.adresseDoeRue, form.adresseDoeComplement, form.adresseDoeVille, form.adresseDoeCodePostal, form.adresseDoePays),
      institutionBeneficiaireId: form.institutionBeneficiaireId,
      nomInstitutionBeneficiaire: form.nomInstitutionBeneficiaire,
      compteBeneficiaire: form.compteBeneficiaire,
      nomBeneficiaire: form.nomBeneficiaire,
      banqueCorrespondanteReceptriceId: form.banqueCorrespondanteReceptriceId || undefined,
      nomBanqueCorrespondanteReceptrice: form.nomBanqueCorrespondanteReceptrice || undefined,
      compteCorrespondanceRecepteur: form.compteCorrespondanceRecepteur || undefined,
      adresseBeneficiaire: cleanAddress(form.adresseBenRue, form.adresseBenComplement, form.adresseBenVille, form.adresseBenCodePostal, form.adresseBenPays),
      nomBeneficiaireEffectif: form.nomBeneficiaireEffectif || undefined,
      adresseBeneficiaireEffectif: cleanAddress(form.adresseBeneRue, form.adresseBeneComplement, form.adresseBeneVille, form.adresseBeneCodePostal, form.adresseBenePays),
      numeroCheque: form.typeOperation === 'CHEQUE' ? form.numeroCheque : undefined,
    };
  };

  const handleSubmit = (andSubmit = false) => {
    if (!validate()) return;
    executeWithPin(async (pin) => {
      setSubmitting(true);
      setSubmitAndSend(andSubmit);
      try {
        const res = await operationApi.create(buildPayload(), pin);
        const opId = res.data.id;
        const ref = res.data.referenceUnique;
        if (andSubmit) {
          await operationApi.soumettre(opId, 'Soumission directe depuis la saisie', pin);
          toast.success(`Opération ${ref} créée et soumise !`, { duration: 5000 });
        } else {
          toast.success(`Opération ${ref} enregistrée en brouillon`, { duration: 4000 });
        }
        onSuccess?.();
        onClose();
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Erreur lors de la création';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    });
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Footer
  // ────────────────────────────────────────────────────────────────────────────
  const footer = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <button type="button" onClick={onClose} className="btn-secondary btn-sm" disabled={submitting}>
        Annuler
      </button>
      <div className="flex gap-2">
        <button type="button" onClick={() => handleSubmit(false)} disabled={submitting}
          className="btn-secondary btn-sm flex items-center gap-2" id="btn-save-brouillon">
          {submitting && !submitAndSend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Brouillon
        </button>
        <button type="button" onClick={() => handleSubmit(true)} disabled={submitting}
          className="btn-primary btn-sm flex items-center gap-2" id="btn-create-and-submit">
          {submitting && submitAndSend ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Créer & Soumettre
        </button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle Opération" size="xl"
      id="nouvelle-operation" footer={footer}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-dark-600">

        {loadingInst && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        )}

        {/* ── Section 1 : Infos opération ──────────────────────────────────── */}
        <div className={SECTION_CLS}>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm">
              <ArrowLeftRight className="w-4 h-4" /> Informations de l'opération
            </div>
            {/* Aperçu de la référence qui sera attribuée */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-dark-400 bg-dark-800/60 border border-dark-600 rounded-lg px-2.5 py-1.5" title="Format de référence — les X seront remplacés par le numéro séquentiel du serveur">
              <Hash className="w-3.5 h-3.5 text-primary-500/70" />
              <span className="text-dark-300">{refPreview}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-2 lg:col-span-1">
              <SelectField label="Type d'opération" id="op-type" name="typeOperation"
                value={form.typeOperation} onChange={handleChange} required>
                <option value="VIREMENT">⇄ Virement</option>
                <option value="CHEQUE">⎗ Chèque</option>
                <option value="PRELEVEMENT">↙ Prélèvement</option>
              </SelectField>
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="op-montant">Montant <span className="text-red-400">*</span></label>
              <input id="op-montant" type="number" name="montant" value={form.montant}
                onChange={handleChange} placeholder="Ex: 500000" className={INPUT_CLS} />
            </div>
            <div>
              <SelectField label="Devise" id="op-devise" name="devise"
                value={form.devise} onChange={handleChange} required>
                {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
              </SelectField>
            </div>
            <div>
              <TextField label="Date valeur" id="op-date-valeur" name="dateValeur"
                value={form.dateValeur} onChange={handleChange} type="date" />
            </div>
          </div>
          <div>
            <label className={LABEL_CLS} htmlFor="op-motif">Motif / Libellé</label>
            <textarea id="op-motif" name="motif" value={form.motif} onChange={handleChange}
              rows={2} placeholder="Objet du transfert (optionnel)..."
              className={`${INPUT_CLS} resize-none`} />
          </div>
          {form.typeOperation === 'CHEQUE' && (
            <TextField label="Numéro de chèque" id="op-cheque" name="numeroCheque"
              value={form.numeroCheque} onChange={handleChange}
              placeholder="Ex: 0012345678" required />
          )}
        </div>

        {/* ── Section 2 : Émetteur ─────────────────────────────────────────── */}
        <div className={SECTION_CLS}>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm border-b border-white/5 pb-3">
            <Building2 className="w-4 h-4" /> Institution Émettrice (Donneur d'ordre)
          </div>

          {/* Institution émettrice : toujours figée */}
          <TextField label="Institution émettrice" id="op-inst-em" name="nomInstitutionEmettrice"
            value={form.nomInstitutionEmettrice} onChange={() => { }}
            placeholder="Votre institution" readOnly required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Banque émettrice */}
            {isBank ? (
              <div>
                <label className={LABEL_CLS}>
                  Banque émettrice <Lock className="inline w-3 h-3 ml-1 text-dark-500" />
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-dark-900/60 border border-dark-700">
                  <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-white text-sm truncate">{myInstitution?.nom}</span>
                  <span className="ml-auto text-xs text-dark-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Figée</span>
                </div>
              </div>
            ) : (
              <SelectField label="Banque correspondante émettrice" id="op-banque-em"
                name="banqueCorrespondanteEmettriceId"
                value={form.banqueCorrespondanteEmettriceId}
                onChange={handleBanqueEmettriceChange}>
                <option value="">— Choisir une banque —</option>
                {banquesEmetteur.map(b => <option key={b.id} value={b.id}>{b.nom}{b.code ? ` (${b.code})` : ''}</option>)}
              </SelectField>
            )}

            {/* Compte de règlement émetteur — filtré par banque sélectionnée */}
            {/* Compte de règlement émetteur : TOUJOURS un dropdown, jamais un champ texte */}
            <div>
              <label className={LABEL_CLS} htmlFor="op-compte-em">
                Compte de règlement
                {form.banqueCorrespondanteEmettriceId && (
                  <span className={`ml-2 font-normal ${loadingComptesEms ? 'text-dark-400'
                    : comptesEmetteurFiltres.length > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {loadingComptesEms ? '(chargement…)'
                      : comptesEmetteurFiltres.length > 0
                        ? `(${comptesEmetteurFiltres.length} disponible${comptesEmetteurFiltres.length > 1 ? 's' : ''})`
                        : '(aucun compte pour cette banque)'}
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  id="op-compte-em"
                  value={form.compteCorrespondanceEmetteurId}
                  onChange={handleCompteEmetteurChange}
                  disabled={!form.banqueCorrespondanteEmettriceId || comptesEmetteurFiltres.length === 0}
                  className={`${!form.banqueCorrespondanteEmettriceId || comptesEmetteurFiltres.length === 0
                    ? INPUT_RO_CLS
                    : INPUT_CLS
                    } appearance-none pr-8`}
                >
                  <option value="">
                    {!form.banqueCorrespondanteEmettriceId
                      ? '— Choisir d\'abord une banque —'
                      : comptesEmetteurFiltres.length === 0
                        ? '— Aucun compte pour cette banque —'
                        : '— Sélectionner un compte —'}
                  </option>
                  {comptesEmetteurFiltres.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.numeroCompte}{cc.libelle ? ` · ${cc.libelle}` : ''}
                    </option>
                  ))}
                </select>
                {!form.banqueCorrespondanteEmettriceId || comptesEmetteurFiltres.length === 0
                  ? <Lock className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-500 pointer-events-none" />
                  : <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
                }
              </div>
            </div>
          </div>

          {/* Donneur d'ordre client */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-dark-400 font-semibold text-xs mb-3">
              <User className="w-3.5 h-3.5" /> Donneur d'ordre (client)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* IDs stables et uniques pour éviter tout bug de focus */}
              <div>
                <label className={LABEL_CLS} htmlFor="op-compte-do">
                  Compte donneur d'ordre <span className="text-red-400">*</span>
                </label>
                <input
                  id="op-compte-do"
                  type="text"
                  name="compteDonneurOrdre"
                  value={form.compteDonneurOrdre}
                  onChange={handleChange}
                  placeholder="Ex: SN001-2023-00001"
                  className={INPUT_CLS}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="op-nom-do">
                  Nom du donneur d'ordre <span className="text-red-400">*</span>
                </label>
                <input
                  id="op-nom-do"
                  type="text"
                  name="nomDonneurOrdre"
                  value={form.nomDonneurOrdre}
                  onChange={handleChange}
                  placeholder="Nom / Raison sociale"
                  className={INPUT_CLS}
                  autoComplete="off"
                />
              </div>
            </div>
            {/* Bouton de bascule pour afficher les détails ALM / Adresse */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAlmDO(!showAlmDO)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 focus:outline-none"
              >
                {showAlmDO ? '▼ Masquer' : '▶ Afficher'} l'adresse & donneur d'ordre effectif (ALM / ISO 20022)
              </button>
            </div>

            {showAlmDO && (
              <div className="mt-4 p-4 rounded-lg bg-dark-900/40 border border-dark-700/60 space-y-4">
                {/* Adresse DO principal */}
                <div>
                  <h4 className="text-xs font-semibold text-blue-400 mb-2">Adresse du Donneur d'Ordre</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <TextField label="Rue et numéro (StrtNm)" id="do-rue" name="adresseDoRue" value={form.adresseDoRue} onChange={handleChange} placeholder="Ex: 12 Rue du Commerce" />
                    </div>
                    <div>
                      <TextField label="Complément (BldgNm)" id="do-comp" name="adresseDoComplement" value={form.adresseDoComplement} onChange={handleChange} placeholder="Ex: Appt 4B" />
                    </div>
                    <div>
                      <TextField label="Ville (TwnNm)" id="do-ville" name="adresseDoVille" value={form.adresseDoVille} onChange={handleChange} placeholder="Ex: Dakar" />
                    </div>
                    <div>
                      <TextField label="Code Postal (PstCd)" id="do-cp" name="adresseDoCodePostal" value={form.adresseDoCodePostal} onChange={handleChange} placeholder="Ex: 10000" />
                    </div>
                    <div>
                      <TextField label="Code Pays (Ctry - ISO 2 Lettres)" id="do-pays" name="adresseDoPays" value={form.adresseDoPays} onChange={handleChange} placeholder="Ex: SN" />
                    </div>
                  </div>
                </div>

                {/* DO effectif */}
                <div className="pt-3 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-blue-400 mb-2">Donneur d'Ordre Effectif (Ultimate Debtor)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <TextField label="Nom complet du DO effectif" id="doe-nom" name="nomDonneurOrdreEffectif" value={form.nomDonneurOrdreEffectif} onChange={handleChange} placeholder="Nom / Raison sociale du bénéficiaire réel du débit" />
                    </div>
                    <div className="sm:col-span-2">
                      <TextField label="Rue et numéro (StrtNm)" id="doe-rue" name="adresseDoeRue" value={form.adresseDoeRue} onChange={handleChange} placeholder="Ex: 45 Avenue de la Liberté" />
                    </div>
                    <div>
                      <TextField label="Complément (BldgNm)" id="doe-comp" name="adresseDoeComplement" value={form.adresseDoeComplement} onChange={handleChange} placeholder="Ex: Bureau 12" />
                    </div>
                    <div>
                      <TextField label="Ville (TwnNm)" id="doe-ville" name="adresseDoeVille" value={form.adresseDoeVille} onChange={handleChange} placeholder="Ex: Bamako" />
                    </div>
                    <div>
                      <TextField label="Code Postal (PstCd)" id="doe-cp" name="adresseDoeCodePostal" value={form.adresseDoeCodePostal} onChange={handleChange} placeholder="Ex: 2000" />
                    </div>
                    <div>
                      <TextField label="Code Pays (Ctry - ISO 2 Lettres)" id="doe-pays" name="adresseDoePays" value={form.adresseDoePays} onChange={handleChange} placeholder="Ex: ML" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3 : Bénéficiaire ─────────────────────────────────────── */}
        <div className={SECTION_CLS}>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm border-b border-white/5 pb-3">
            <Building2 className="w-4 h-4" /> Institution Bénéficiaire (Récepteur)
          </div>

          {isBank && (
            <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>En tant que banque, vous ne pouvez pas émettre vers une autre banque. La liste est filtrée en conséquence.</span>
            </div>
          )}

          {/* Avertissement émetteur = bénéficiaire (ne devrait pas arriver avec le filtrage, mais sécurité) */}
          {form.institutionBeneficiaireId && form.institutionEmettriceId &&
            form.institutionBeneficiaireId === form.institutionEmettriceId && (
              <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">
                  L'institution émettrice et bénéficiaire sont identiques. Une institution ne peut pas être à la fois émettrice et bénéficiaire d'une même opération.
                </span>
              </div>
            )}

          {/* Institution bénéficiaire */}
          <div>
            <label className={LABEL_CLS} htmlFor="op-inst-ben">
              Institution bénéficiaire <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select id="op-inst-ben" value={form.institutionBeneficiaireId}
                onChange={handleBeneficiaireChange} className={`${INPUT_CLS} appearance-none pr-8`}>
                <option value="">— Sélectionner l'institution —</option>
                {beneficiairesDisponibles.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.nom} ({i.code}) — {i.typeInstitution === 'BANQUE' ? '🏦' : '🏢'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Banque correspondante réceptrice */}
            <div>
              {!form.institutionBeneficiaireId ? (
                <div>
                  <label className={LABEL_CLS}>Banque correspondante réceptrice</label>
                  <input type="text" readOnly
                    placeholder="Sélectionnez d'abord l'institution" className={INPUT_RO_CLS} />
                </div>
              ) : isBenefBank ? (
                <div>
                  <label className={LABEL_CLS}>
                    Banque réceptrice <Lock className="inline w-3 h-3 ml-1 text-dark-500" />
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-dark-900/60 border border-dark-700">
                    <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-white text-sm truncate">{form.nomBanqueCorrespondanteReceptrice}</span>
                    <span className="ml-auto text-xs text-dark-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Figée</span>
                  </div>
                </div>
              ) : (
                <SelectField label="Banque correspondante réceptrice" id="op-banque-rec"
                  name="banqueCorrespondanteReceptriceId"
                  value={form.banqueCorrespondanteReceptriceId}
                  onChange={handleBanqueReceptriceChange}>
                  <option value="">— Choisir la banque —</option>
                  {banquesRecepteur.map(b => <option key={b.id} value={b.id}>{b.nom}{b.code ? ` (${b.code})` : ''}</option>)}
                </SelectField>
              )}
            </div>

            {/* Compte de règlement récepteur : TOUJOURS un dropdown, jamais un champ texte */}
            <div>
              <label className={LABEL_CLS} htmlFor="op-compte-rec">
                Compte de règlement récepteur
                {form.institutionBeneficiaireId && form.banqueCorrespondanteReceptriceId && (
                  <span className={`ml-2 font-normal ${loadingComptesRec ? 'text-dark-400'
                    : comptesRecepteurFiltres.length > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {loadingComptesRec ? '(chargement…)'
                      : comptesRecepteurFiltres.length > 0
                        ? `(${comptesRecepteurFiltres.length} disponible${comptesRecepteurFiltres.length > 1 ? 's' : ''})`
                        : '(aucun compte pour cette banque)'}
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  id="op-compte-rec"
                  value={form.compteCorrespondanceRecepteurId}
                  onChange={handleCompteRecepteurChange}
                  disabled={!form.institutionBeneficiaireId || loadingComptesRec || comptesRecepteurFiltres.length === 0}
                  className={`${!form.institutionBeneficiaireId || loadingComptesRec || comptesRecepteurFiltres.length === 0
                    ? INPUT_RO_CLS
                    : INPUT_CLS
                    } appearance-none pr-8`}
                >
                  <option value="">
                    {!form.institutionBeneficiaireId
                      ? '— Sélectionnez d\'abord l\'institution —'
                      : !form.banqueCorrespondanteReceptriceId
                        ? '— Choisir d\'abord une banque —'
                        : loadingComptesRec
                          ? '— Chargement… —'
                          : comptesRecepteurFiltres.length === 0
                            ? '— Aucun compte pour cette banque —'
                            : '— Sélectionner un compte —'}
                  </option>
                  {comptesRecepteurFiltres.map(cc => (
                    <option key={cc.id} value={cc.id}>
                      {cc.numeroCompte}{cc.libelle ? ` · ${cc.libelle}` : ''}
                    </option>
                  ))}
                </select>
                {!form.institutionBeneficiaireId || loadingComptesRec || comptesRecepteurFiltres.length === 0
                  ? <Lock className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-500 pointer-events-none" />
                  : <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
                }
              </div>
            </div>
          </div>

          {/* Bénéficiaire final */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 text-dark-400 font-semibold text-xs mb-3">
              <User className="w-3.5 h-3.5" /> Bénéficiaire final
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS} htmlFor="op-compte-ben">
                  Compte bénéficiaire <span className="text-red-400">*</span>
                </label>
                <input
                  id="op-compte-ben"
                  type="text"
                  name="compteBeneficiaire"
                  value={form.compteBeneficiaire}
                  onChange={handleChange}
                  placeholder="Ex: CM001-2023-00042"
                  className={INPUT_CLS}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="op-nom-ben">
                  Nom du bénéficiaire <span className="text-red-400">*</span>
                </label>
                <input
                  id="op-nom-ben"
                  type="text"
                  name="nomBeneficiaire"
                  value={form.nomBeneficiaire}
                  onChange={handleChange}
                  placeholder="Nom / Raison sociale"
                  className={INPUT_CLS}
                  autoComplete="off"
                />
              </div>
            </div>
            {/* Bouton de bascule pour afficher les détails ALM / Adresse */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowAlmBen(!showAlmBen)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 focus:outline-none"
              >
                {showAlmBen ? '▼ Masquer' : '▶ Afficher'} l'adresse & bénéficiaire effectif (ALM / ISO 20022)
              </button>
            </div>

            {showAlmBen && (
              <div className="mt-4 p-4 rounded-lg bg-dark-900/40 border border-dark-700/60 space-y-4">
                {/* Adresse BEN principal */}
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 mb-2">Adresse du Bénéficiaire</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <TextField label="Rue et numéro (StrtNm)" id="ben-rue" name="adresseBenRue" value={form.adresseBenRue} onChange={handleChange} placeholder="Ex: 50 Rue de la Gare" />
                    </div>
                    <div>
                      <TextField label="Complément (BldgNm)" id="ben-comp" name="adresseBenComplement" value={form.adresseBenComplement} onChange={handleChange} placeholder="Ex: Bâtiment A" />
                    </div>
                    <div>
                      <TextField label="Ville (TwnNm)" id="ben-ville" name="adresseBenVille" value={form.adresseBenVille} onChange={handleChange} placeholder="Ex: Douala" />
                    </div>
                    <div>
                      <TextField label="Code Postal (PstCd)" id="ben-cp" name="adresseBenCodePostal" value={form.adresseBenCodePostal} onChange={handleChange} placeholder="Ex: BP 120" />
                    </div>
                    <div>
                      <TextField label="Code Pays (Ctry - ISO 2 Lettres)" id="ben-pays" name="adresseBenPays" value={form.adresseBenPays} onChange={handleChange} placeholder="Ex: CM" />
                    </div>
                  </div>
                </div>

                {/* BEN effectif */}
                <div className="pt-3 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-emerald-400 mb-2">Bénéficiaire Effectif (Ultimate Creditor)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <TextField label="Nom complet du BEN effectif" id="bene-nom" name="nomBeneficiaireEffectif" value={form.nomBeneficiaireEffectif} onChange={handleChange} placeholder="Nom / Raison sociale du destinataire final des fonds" />
                    </div>
                    <div className="sm:col-span-2">
                      <TextField label="Rue et numéro (StrtNm)" id="bene-rue" name="adresseBeneRue" value={form.adresseBeneRue} onChange={handleChange} placeholder="Ex: 102 Boulevard du 20 Mai" />
                    </div>
                    <div>
                      <TextField label="Complément (BldgNm)" id="bene-comp" name="adresseBeneComplement" value={form.adresseBeneComplement} onChange={handleChange} placeholder="Ex: Etage 2" />
                    </div>
                    <div>
                      <TextField label="Ville (TwnNm)" id="bene-ville" name="adresseBeneVille" value={form.adresseBeneVille} onChange={handleChange} placeholder="Ex: Yaoundé" />
                    </div>
                    <div>
                      <TextField label="Code Postal (PstCd)" id="bene-cp" name="adresseBeneCodePostal" value={form.adresseBeneCodePostal} onChange={handleChange} placeholder="Ex: BP 500" />
                    </div>
                    <div>
                      <TextField label="Code Pays (Ctry - ISO 2 Lettres)" id="bene-pays" name="adresseBenePays" value={form.adresseBenePays} onChange={handleChange} placeholder="Ex: CM" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Info bloc ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 text-xs text-dark-400 bg-dark-800/40 rounded-lg p-3 border border-dark-700">
          <AlertCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-dark-300">Brouillon :</strong> enregistrée sans être soumise — vous pourrez la soumettre plus tard.
            <br />
            <strong className="text-dark-300">Créer & Soumettre :</strong> directement soumise pour validation auprès de votre validateur.
          </div>
        </div>
      </div>
      <PinValidationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={pinCallback}
      />
    </Modal>
  );
}
