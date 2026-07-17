import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Receipt, RefreshCw, PlayCircle, AlertTriangle, CreditCard, Ban, Loader2,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import {
  factureApi,
} from '../../services/api';
import PinValidationModal from '../../components/common/PinValidationModal';

const fmtMontant = (v, devise) =>
  v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${devise || ''}`;

export default function BillingAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary-400" /> Facturation Plate-forme
        </h1>
        <p className="text-dark-400 text-sm mt-1">
          Suivi des factures des institutions, génération mensuelle et encaissement des paiements.
        </p>
      </div>

      <FacturesTab />
    </div>
  );
}

/* ===================== FACTURES ===================== */
function FacturesTab() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [genModal, setGenModal] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await factureApi.findAll();
      setFactures(res.data || []);
    } catch (e) {
      toast.error("Erreur lors du chargement des factures");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTraiterRetards = async () => {
    setBusy(true);
    try {
      await factureApi.traiterRetards();
      toast.success('Traitement des retards effectué');
      load();
    } catch (e) {
      toast.error('Erreur lors du traitement des retards');
    } finally {
      setBusy(false);
    }
  };

  const handleAnnuler = async (f) => {
    if (!window.confirm(`Annuler la facture ${f.numero} ?`)) return;
    try {
      await factureApi.annuler(f.id);
      toast.success('Facture annulée');
      load();
    } catch (e) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'numero',
      header: 'N° Facture',
      cell: info => <span className="font-mono text-xs text-white bg-dark-900 px-2 py-1 rounded border border-dark-700">{info.getValue()}</span>,
    },
    {
      accessorKey: 'institutionNom',
      header: 'Institution',
      cell: info => <span className="text-white font-medium">{info.getValue() || info.row.original.institutionId?.slice(0, 8)}</span>,
    },
    {
      accessorKey: 'periode',
      header: 'Période',
      cell: info => <span className="text-dark-200">{info.getValue()}</span>,
    },
    {
      accessorKey: 'modePaiement',
      header: 'Mode',
      cell: info => <StatusBadge status={info.getValue()} />,
    },
    {
      accessorKey: 'montantTotal',
      header: 'Montant Total',
      cell: info => {
        const row = info.row.original;
        return <span className="font-bold text-white">{fmtMontant(row.montantTotal, row.devise)}</span>;
      },
    },
    {
      accessorKey: 'dateEcheance',
      header: 'Échéance',
      cell: info => <span className="text-dark-200">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: info => <StatusBadge status={info.getValue()} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: info => {
        const f = info.row.original;
        return (
          <div className="flex items-center gap-1">
            {f.statut !== 'PAYEE' && f.statut !== 'ANNULEE' && (
              <button
                onClick={() => setPayModal(f)}
                title="Enregistrer un paiement"
                className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-colors border border-transparent hover:border-emerald-900/30"
              >
                <CreditCard className="w-4 h-4" />
              </button>
            )}
            {f.statut !== 'ANNULEE' && f.statut !== 'PAYEE' && (
              <button
                onClick={() => handleAnnuler(f)}
                title="Annuler"
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors border border-transparent hover:border-red-900/30"
              >
                <Ban className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    }
  ], [factures]);

  const pagedFactures = useMemo(() => {
    return factures.slice(page * pageSize, (page + 1) * pageSize);
  }, [factures, page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-dark-300 text-sm font-semibold">{factures.length} facture(s) enregistrée(s)</span>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs flex items-center gap-1" id="btn-refresh-factures">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button onClick={handleTraiterRetards} disabled={busy} className="btn-secondary text-xs flex items-center gap-1" id="btn-traiter-retards">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Traiter les retards
          </button>
          <button onClick={() => setGenModal(true)} className="btn-primary text-xs flex items-center gap-1" id="btn-generer-factures">
            <PlayCircle className="w-4 h-4" /> Générer factures
          </button>
        </div>
      </div>

      <DataTable
        data={pagedFactures}
        columns={columns}
        totalElements={factures.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={loading}
        emptyMessage="Aucune facture disponible."
      />

      {payModal && <PaiementModal facture={payModal} onClose={() => setPayModal(null)} onDone={() => { setPayModal(null); load(); }} />}
      {genModal && <GenerationModal onClose={() => setGenModal(false)} onDone={() => { setGenModal(false); load(); }} />}
    </div>
  );
}

function PaiementModal({ facture, onClose, onDone }) {
  const reste = Number(facture.montantTotal) - Number(facture.montantPaye || 0);
  const [form, setForm] = useState({
    montant: reste > 0 ? reste : facture.montantTotal,
    datePaiement: new Date().toISOString().slice(0, 10),
    moyenPaiement: 'VIREMENT',
    reference: '',
    commentaire: '',
  });
  const [saving, setSaving] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCallback, setPinCallback] = useState(null);

  const executeWithPin = (actionFn) => {
    setPinCallback(() => async (pin) => {
      setShowPinModal(false);
      await actionFn(pin);
    });
    setShowPinModal(true);
  };

  const submit = (e) => {
    e.preventDefault();
    executeWithPin(async (pin) => {
      setSaving(true);
      try {
        await factureApi.payer(facture.id, form, pin);
        toast.success('Paiement enregistré avec succès');
        onDone();
      } catch (err) {
        toast.error("Erreur lors de l'enregistrement du paiement");
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <>
      <Modal
        isOpen
        onClose={onClose}
        id="paiement-modal"
        title={`Enregistrer un paiement — Facture N° ${facture.numero}`}
        footer={(
          <>
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Enregistrer le paiement
            </button>
          </>
        )}
      >
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-1">Montant à régler ({facture.devise})</label>
            <input
              type="number"
              step="0.01"
              required
              className="form-control w-full text-lg font-semibold text-white bg-dark-800"
              value={form.montant}
              onChange={(e) => setForm({ ...form, montant: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-dark-300 mb-1">Date Paiement</label>
            <input
              type="date"
              required
              className="form-control w-full text-white bg-dark-800"
              value={form.datePaiement}
              onChange={(e) => setForm({ ...form, datePaiement: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="block text-sm font-medium text-dark-300 mb-1">Moyen Paiement</label>
            <select
              className="form-control w-full bg-dark-800 text-white"
              value={form.moyenPaiement}
              onChange={(e) => setForm({ ...form, moyenPaiement: e.target.value })}
            >
              <option value="VIREMENT">Virement bancaire</option>
              <option value="CHEQUE">Chèque</option>
              <option value="ESPECES">Espèces</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-1">Référence Transaction</label>
            <input
              type="text"
              className="form-control w-full"
              value={form.reference}
              placeholder="N° de virement, chèque..."
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>
          <div className="form-group col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-1">Commentaire</label>
            <textarea
              className="form-control w-full"
              rows={2}
              value={form.commentaire}
              onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <PinValidationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onConfirm={pinCallback}
      />
    </>
  );
}

function GenerationModal({ onClose, onDone }) {
  const lastMonth = (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();
  const [periode, setPeriode] = useState(lastMonth);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await factureApi.generer(periode);
      toast.success(`${(res.data || []).length} facture(s) générée(s)`);
      onDone();
    } catch (err) {
      toast.error('Erreur lors de la génération des factures');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      id="generation-modal"
      title="Générer les factures"
      footer={(
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-gen" type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />} Générer
          </button>
        </>
      )}
    >
      <form id="form-gen" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-dark-300">
          Génère les factures pour toutes les institutions actives et configurées sur la période choisie. 
          La génération est idempotente (les factures existantes ne seront pas ré-émises).
        </p>
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Période (mois)</label>
          <input
            type="month"
            className="form-control w-full"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
