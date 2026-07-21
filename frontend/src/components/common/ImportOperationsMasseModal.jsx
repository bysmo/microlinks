import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileUp, Loader2, Info, CheckCircle2, AlertOctagon,
  Building2, ChevronDown, Download, AlertCircle, RefreshCw, X
} from 'lucide-react';
import Modal from './Modal';
import { operationApi, institutionApi, compteReglementApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import PinValidationModal from './PinValidationModal';

const INPUT_CLS = 'w-full bg-dark-800/60 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm placeholder-dark-500 focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 transition-all';
const INPUT_RO_CLS = 'w-full bg-dark-900/60 border border-dark-700 rounded-lg px-3 py-2 text-dark-400 text-sm cursor-not-allowed opacity-70';
const LABEL_CLS = 'block text-dark-300 text-xs font-semibold mb-1.5';
const SECTION_CLS = 'glass-card p-5 space-y-4';

export default function ImportOperationsMasseModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  
  // Emetteur info
  const [myInstitution, setMyInstitution] = useState(null);
  const [mesComptesEmetteur, setMesComptesEmetteur] = useState([]);
  
  // Selection
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [selectedBeneficiareId, setSelectedBeneficiaireId] = useState('');
  const [selectedCompteId, setSelectedCompteId] = useState('');
  
  const [typeDebit, setTypeDebit] = useState('GLOBAL'); // 'GLOBAL' ou 'UNITAIRE'
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Workflow validation code PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCallback, setPinCallback] = useState(null);

  // Resultat de l'import
  const [result, setResult] = useState(null);

  const executeWithPin = (actionFn) => {
    setPinCallback(() => async (pin) => {
      setShowPinModal(false);
      await actionFn(pin);
    });
    setShowPinModal(true);
  };

  // Chargement des données de l'émetteur et des institutions réceptrices
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setResult(null);
      setSelectedBeneficiaireId('');
      setSelectedCompteId('');
      setTypeDebit('GLOBAL');
      return;
    }

    setLoading(true);

    const initData = async () => {
      try {
        // 1. Liste des institutions actives
        const instRes = await institutionApi.findAll({ statut: 'ACTIF', size: 200 });
        const all = instRes.data?.content || [];
        setAllInstitutions(all);

        // 2. Récupérer l'institution de l'utilisateur connecté
        let targetId = user?.institutionId;
        let mine = null;

        if (targetId) {
          try {
            const res = await institutionApi.findById(targetId);
            mine = res.data;
          } catch (_) {
            try {
              const res = await institutionApi.findByCode(targetId.toUpperCase());
              mine = res.data;
            } catch (__) {}
          }
        }

        if (mine) {
          setMyInstitution(mine);
          // Charger ses comptes de règlement
          const comptesRes = await compteReglementApi.findAll(mine.id);
          const comptes = comptesRes.data || [];
          setMesComptesEmetteur(comptes);
          if (comptes.length > 0) {
            setSelectedCompteId(comptes[0].id);
          }
        }
      } catch (err) {
        toast.error("Erreur de chargement des données de l'émetteur");
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [isOpen, user]);

  const accountLabel = (compteId) => {
    const c = mesComptesEmetteur.find(cc => cc.id === compteId);
    return c ? `${c.numeroCompte}${c.libelle ? ` · ${c.libelle}` : ''}` : '';
  };

  // Liste des bénéficiaires éligibles
  const beneficiairesDisponibles = useMemo(() => {
    if (!allInstitutions.length || !myInstitution) return [];
    const isBank = myInstitution.typeInstitution === 'BANQUE';
    return allInstitutions.filter(i => {
      if (String(i.id) === String(myInstitution.id)) return false;
      if (isBank && i.typeInstitution === 'BANQUE') return false; // Banque pas vers banque
      return true;
    });
  }, [myInstitution, allInstitutions]);

  // Modèle Excel/CSV de démonstration
  const handleDownloadTemplate = () => {
    const headers = [
      'compte_donneur_ordre',
      'nom_donneur_ordre',
      'compte_beneficiaire',
      'nom_beneficiaire',
      'montant',
      'devise',
      'motif',
      'nom_do_effectif',
      'nom_ben_effectif'
    ];
    const exampleGlobal = [
      '', // compte_donneur_ordre (vide pour GLOBAL car spécifié dans le formulaire)
      '', // nom_donneur_ordre (vide pour GLOBAL)
      'CM002-888-00045',
      'Jean Dupont',
      '150000',
      'XOF',
      'Paiement Facture 1032',
      'SARL Logistique',
      ''
    ];
    const exampleUnitary = [
      'SN001-100-00012',
      'Cabinet Conseil A',
      'CI004-999-00078',
      'Marie Konan',
      '450000',
      'XOF',
      'Honoraire Prestation Juin',
      '',
      ''
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), exampleGlobal.join(','), exampleUnitary.join(',')].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "gabarit_import_masse.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Gabarit téléchargé !");
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const validate = () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier Excel");
      return false;
    }
    if (!selectedBeneficiareId) {
      toast.error("Veuillez choisir l'institution bénéficiaire destinataire");
      return false;
    }
    if (typeDebit === 'GLOBAL' && !selectedCompteId) {
      toast.error("Veuillez choisir le compte de règlement pour le débit global");
      return false;
    }
    return true;
  };

  const handleImportSubmit = () => {
    if (!validate()) return;

    executeWithPin(async (pin) => {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("typeDebit", typeDebit);
      formData.append("institutionEmettriceId", myInstitution.id);
      formData.append("nomInstitutionEmettrice", myInstitution.nom);
      
      const benef = allInstitutions.find(i => i.id === selectedBeneficiareId);
      formData.append("institutionBeneficiaireId", benef.id);
      formData.append("nomInstitutionBeneficiaire", benef.nom);

      if (typeDebit === 'GLOBAL') {
        const c = mesComptesEmetteur.find(cc => cc.id === selectedCompteId);
        formData.append("compteDonneurOrdreGlobal", c.numeroCompte);
        formData.append("nomDonneurOrdreGlobal", myInstitution.nom);
      }

      try {
        const res = await operationApi.bulkImport(formData, pin);
        setResult(res.data);
        if (res.data.totalErreurs === 0) {
          toast.success("Toutes les opérations ont été importées avec succès !");
          onSuccess?.();
        } else if (res.data.totalSucces > 0) {
          toast.success(`${res.data.totalSucces} opérations créées avec succès, ${res.data.totalErreurs} en échec.`);
          onSuccess?.();
        } else {
          toast.error("Aucune opération n'a pu être importée. Vérifiez les erreurs.");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Erreur critique lors du traitement de l'import");
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import d'Opérations en Masse"
      size="xl"
      id="import-operations-masse"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Formulaire de configuration */}
            {!result && (
              <div className="space-y-4">
                
                {/* Mode de débit */}
                <div className={SECTION_CLS}>
                  <div className="flex items-center gap-2 text-primary-400 font-semibold text-sm border-b border-white/5 pb-2">
                    <Info className="w-4 h-4" /> Mode de débit sur compte donneur d'ordre
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      typeDebit === 'GLOBAL' 
                        ? 'bg-primary-500/10 border-primary-500 text-white' 
                        : 'bg-dark-900/40 border-dark-700 text-dark-400 hover:border-dark-600'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <input
                          type="radio"
                          name="typeDebit"
                          value="GLOBAL"
                          checked={typeDebit === 'GLOBAL'}
                          onChange={() => setTypeDebit('GLOBAL')}
                          className="text-primary-500 focus:ring-primary-500"
                        />
                        Débit Global (Salaires, Masses)
                      </div>
                      <span className="text-[11px] text-dark-300 mt-2">
                        Un seul débit global sera effectué sur le compte de règlement sélectionné. Les comptes bénéficiaires finaux seront crédités unitairement.
                      </span>
                    </label>

                    <label className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      typeDebit === 'UNITAIRE' 
                        ? 'bg-primary-500/10 border-primary-500 text-white' 
                        : 'bg-dark-900/40 border-dark-700 text-dark-400 hover:border-dark-600'
                    }`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <input
                          type="radio"
                          name="typeDebit"
                          value="UNITAIRE"
                          checked={typeDebit === 'UNITAIRE'}
                          onChange={() => setTypeDebit('UNITAIRE')}
                          className="text-primary-500 focus:ring-primary-500"
                        />
                        Débit Unitaire (Fournisseurs, Tiers)
                      </div>
                      <span className="text-[11px] text-dark-300 mt-2">
                        Chaque ligne du fichier Excel correspondra à une opération indépendante avec son propre compte donneur d'ordre à débiter.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Acteurs & Règlement */}
                <div className={SECTION_CLS}>
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm border-b border-white/5 pb-2">
                    <Building2 className="w-4 h-4" /> Institutions & Comptes de règlement
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Emetteur figé */}
                    <div>
                      <label className={LABEL_CLS}>Institution Émettrice</label>
                      <input type="text" readOnly value={myInstitution?.nom || ''} className={INPUT_RO_CLS} />
                    </div>

                    {/* Bénéficiaire */}
                    <div>
                      <label className={LABEL_CLS} htmlFor="bulk-inst-ben">Institution Bénéficiaire Destinataire *</label>
                      <div className="relative">
                        <select
                          id="bulk-inst-ben"
                          value={selectedBeneficiareId}
                          onChange={(e) => setSelectedBeneficiaireId(e.target.value)}
                          className={`${INPUT_CLS} appearance-none pr-8`}
                        >
                          <option value="">— Sélectionner l'institution bénéficiaire —</option>
                          {beneficiairesDisponibles.map(i => (
                            <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Compte DO Global (si global) */}
                    {typeDebit === 'GLOBAL' && (
                      <div className="sm:col-span-2">
                        <label className={LABEL_CLS} htmlFor="bulk-compte-global">Compte de règlement à débiter (Débit Global) *</label>
                        <div className="relative">
                          <select
                            id="bulk-compte-global"
                            value={selectedCompteId}
                            onChange={(e) => setSelectedCompteId(e.target.value)}
                            className={`${INPUT_CLS} appearance-none pr-8`}
                          >
                            {mesComptesEmetteur.map(cc => (
                              <option key={cc.id} value={cc.id}>{cc.numeroCompte} · {cc.libelle || 'Compte principal'}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-dark-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload et gabarit */}
                <div className="glass-card p-6 flex flex-col items-center justify-center border-2 border-dashed border-dark-600 rounded-xl hover:border-primary-500/50 transition-colors">
                  <FileUp className="w-12 h-12 text-dark-400 mb-3" />
                  
                  {file ? (
                    <div className="text-center">
                      <span className="text-white font-medium text-sm block">{file.name}</span>
                      <span className="text-dark-400 text-xs block mt-1">({(file.size / 1024).toFixed(1)} Ko)</span>
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold mt-2 underline"
                      >
                        Retirer le fichier
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <label className="btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5">
                        Sélectionner un fichier Excel
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-dark-400 text-xs block mt-2">
                        Fichiers supportés : Excel (.xlsx, .xls)
                      </span>
                    </div>
                  )}

                  <div className="w-full border-t border-white/5 mt-6 pt-4 flex justify-between items-center flex-wrap gap-2 text-xs">
                    <span className="text-dark-400">
                      Veuillez respecter l'ordre et le nom des colonnes du gabarit MicroLinks.
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Gabarit Excel/CSV
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={onClose} className="btn-secondary btn-sm" disabled={submitting}>
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={submitting}
                    className="btn-primary btn-sm flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        <FileUp className="w-4 h-4" />
                        Lancer l'importation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Rendu des résultats de l'importation */}
            {result && (
              <div className="space-y-4">
                
                {/* Statistiques générales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <span className="text-dark-400 text-xs block">Lignes analysées</span>
                    <span className="text-white text-2xl font-bold font-mono block mt-1">{result.totalLignes}</span>
                  </div>
                  <div className="glass-card p-4 border-l-2 border-emerald-500 text-center">
                    <span className="text-dark-400 text-xs block">Opérations créées</span>
                    <span className="text-emerald-400 text-2xl font-bold font-mono block mt-1">
                      {result.totalSucces}
                    </span>
                  </div>
                  <div className="glass-card p-4 border-l-2 border-red-500 text-center">
                    <span className="text-dark-400 text-xs block">Échecs / Rejets</span>
                    <span className="text-red-400 text-2xl font-bold font-mono block mt-1">
                      {result.totalErreurs}
                    </span>
                  </div>
                </div>

                {/* Informations de débit */}
                <div className="p-3.5 bg-dark-900/60 border border-dark-800 rounded-lg text-xs flex justify-between items-center text-dark-300">
                  <span>
                    Mode de débit : <strong className="text-white">{result.typeDebit}</strong>
                  </span>
                  {result.typeDebit === 'GLOBAL' && selectedCompteId && (
                    <span>
                      Compte débité : <strong className="text-primary-400 font-mono">{accountLabel(selectedCompteId)}</strong>
                    </span>
                  )}
                </div>

                {/* Tableau de log des lignes */}
                <div className="glass-card p-4 space-y-3">
                  <h4 className="text-white text-xs font-semibold uppercase tracking-wider pb-2 border-b border-white/5">
                    Rapport de traitement par ligne
                  </h4>
                  
                  <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-dark-900 text-dark-300 uppercase sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Ligne</th>
                          <th className="px-3 py-2">Statut</th>
                          <th className="px-3 py-2">Référence / Motif d'échec</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {result.details && result.details.map((det) => (
                          <tr key={det.numeroLigne} className="hover:bg-dark-900/40">
                            <td className="px-3 py-2.5 font-mono font-medium text-dark-300">
                              Ligne {det.numeroLigne + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              {det.succes ? (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Succès
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded">
                                  <AlertOctagon className="w-3 h-3" /> Échec
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-dark-200">
                              {det.succes ? (
                                <span className="text-primary-300">{det.referenceCreee}</span>
                              ) : (
                                <span className="text-red-400 font-sans">{det.erreur || "Erreur de format"}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer des résultats */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setFile(null);
                    }}
                    className="btn-secondary btn-sm"
                  >
                    Nouvel import
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSuccess?.();
                    }}
                    className="btn-primary btn-sm"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <PinValidationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={pinCallback}
      />
    </Modal>
  );
}
