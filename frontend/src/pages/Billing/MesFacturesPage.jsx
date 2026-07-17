import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Receipt, RefreshCw, Eye, Loader2, CreditCard, FileText } from 'lucide-react';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { factureApi } from '../../services/api';

const fmtMontant = (v, devise) =>
  v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${devise || ''}`;

export default function MesFacturesPage() {
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await factureApi.mesFactures();
      setFactures(res.data || []);
    } catch (e) {
      toast.error('Erreur lors du chargement de vos factures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totaux = factures.reduce(
    (acc, f) => {
      acc.total += Number(f.montantTotal || 0);
      if (f.statut !== 'PAYEE' && f.statut !== 'ANNULEE') {
        acc.du += Number(f.montantTotal || 0) - Number(f.montantPaye || 0);
      }
      return acc;
    },
    { total: 0, du: 0 }
  );
  const devise = factures[0]?.devise || 'XOF';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary-400" /> Mes Factures
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            Consultez l'historique de facturation de votre institution.
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-xs" id="btn-refresh-mes-factures">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-dark-400 text-xs uppercase tracking-wide">Total facturé</p>
          <p className="text-white text-xl font-bold mt-1">{fmtMontant(totaux.total, devise)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-dark-400 text-xs uppercase tracking-wide">Reste à payer</p>
          <p className="text-amber-400 text-xl font-bold mt-1">{fmtMontant(totaux.du, devise)}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-dark-400 text-xs uppercase tracking-wide">Nombre de factures</p>
          <p className="text-white text-xl font-bold mt-1">{factures.length}</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dark-300 border-b border-dark-700">
                <th className="px-4 py-3 font-semibold">N° FACTURE</th>
                <th className="px-4 py-3 font-semibold">PÉRIODE</th>
                <th className="px-4 py-3 font-semibold">MODE</th>
                <th className="px-4 py-3 font-semibold text-right">MONTANT</th>
                <th className="px-4 py-3 font-semibold text-right">PAYÉ</th>
                <th className="px-4 py-3 font-semibold">ÉCHÉANCE</th>
                <th className="px-4 py-3 font-semibold">STATUT</th>
                <th className="px-4 py-3 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-dark-400">
                  <Loader2 className="w-6 h-6 animate-spin inline" /></td></tr>
              ) : factures.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-dark-400">Aucune facture pour votre institution.</td></tr>
              ) : factures.map((f) => (
                <tr key={f.id} className="border-b border-dark-800 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-white">{f.numero}</td>
                  <td className="px-4 py-3 text-dark-200">{f.periode}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.modePaiement} /></td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{fmtMontant(f.montantTotal, f.devise)}</td>
                  <td className="px-4 py-3 text-right text-dark-200">{fmtMontant(f.montantPaye || 0, f.devise)}</td>
                  <td className="px-4 py-3 text-dark-200">{f.dateEcheance || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.statut} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetail(f)} title="Voir le détail"
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <FactureDetailModal facture={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function FactureDetailModal({ facture, onClose }) {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await factureApi.getPaiements(facture.id);
        setPaiements(res.data || []);
      } catch (e) {
        // pas de paiements / non autorisé : on ignore silencieusement
        setPaiements([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [facture.id]);

  const reste = Number(facture.montantTotal || 0) - Number(facture.montantPaye || 0);

  return (
    <Modal isOpen onClose={onClose} id="facture-detail" size="lg"
      title={`Facture ${facture.numero}`}
      footer={<button onClick={onClose} className="btn-secondary">Fermer</button>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Période" value={facture.periode} />
          <Info label="Statut" value={<StatusBadge status={facture.statut} />} />
          <Info label="Mode de paiement" value={<StatusBadge status={facture.modePaiement} />} />
          <Info label="Date d'émission" value={facture.dateEmission || '—'} />
          <Info label="Date d'échéance" value={facture.dateEcheance || '—'} />
          {facture.modePaiement === 'PAR_OPERATION' && (
            <Info label="Opérations facturées" value={facture.nombreOperations ?? '—'} />
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Montant total</span>
            <span className="font-semibold text-slate-900">{fmtMontant(facture.montantTotal, facture.devise)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 mt-1">
            <span>Déjà payé</span>
            <span className="font-semibold text-emerald-600">{fmtMontant(facture.montantPaye || 0, facture.devise)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-slate-200 mt-2 pt-2">
            <span className="font-semibold text-slate-700">Reste à payer</span>
            <span className="font-bold text-amber-600">{fmtMontant(reste, facture.devise)}</span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4" /> Paiements enregistrés
          </h3>
          {loading ? (
            <div className="text-center py-4 text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : paiements.length === 0 ? (
            <p className="text-sm text-slate-500 flex items-center gap-2 py-2">
              <FileText className="w-4 h-4" /> Aucun paiement enregistré pour cette facture.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Moyen</th>
                  <th className="py-2 font-medium">Référence</th>
                  <th className="py-2 font-medium text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{p.datePaiement || '—'}</td>
                    <td className="py-2 text-slate-700">{p.moyenPaiement || '—'}</td>
                    <td className="py-2 text-slate-500 font-mono text-xs">{p.reference || '—'}</td>
                    <td className="py-2 text-right font-semibold text-slate-900">{fmtMontant(p.montant, facture.devise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wide">{label}</p>
      <div className="text-slate-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}
