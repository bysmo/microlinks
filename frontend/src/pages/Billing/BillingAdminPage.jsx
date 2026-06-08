import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Receipt, Tag, Settings, Building2, Plus, Pencil, Trash2,
  RefreshCw, PlayCircle, AlertTriangle, CreditCard, Ban, Loader2,
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import {
  tarifApi, factureApi, billingSettingsApi, institutionBillingApi, institutionApi,
} from '../../services/api';

const TABS = [
  { id: 'factures', label: 'Factures', icon: Receipt },
  { id: 'tarifs', label: 'Tarifs', icon: Tag },
  { id: 'config', label: 'Config. institutions', icon: Building2 },
  { id: 'parametres', label: 'Paramètres', icon: Settings },
];

const fmtMontant = (v, devise) =>
  v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${devise || ''}`;

export default function BillingAdminPage() {
  const [activeTab, setActiveTab] = useState('factures');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary-400" /> Facturation
        </h1>
        <p className="text-dark-400 text-sm mt-1">
          Gestion des tarifs, génération et suivi des factures des institutions.
        </p>
      </div>

      <div className="flex gap-2 border-b border-dark-700 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              id={`billing-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-primary-400 text-white'
                  : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'factures' && <FacturesTab />}
      {activeTab === 'tarifs' && <TarifsTab />}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'parametres' && <ParametresTab />}
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

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-dark-300 text-sm">{factures.length} facture(s)</span>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-xs" id="btn-refresh-factures">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button onClick={handleTraiterRetards} disabled={busy} className="btn-secondary text-xs" id="btn-traiter-retards">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Traiter les retards
          </button>
          <button onClick={() => setGenModal(true)} className="btn-primary text-xs" id="btn-generer-factures">
            <PlayCircle className="w-4 h-4" /> Générer factures
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-dark-300 border-b border-dark-700">
                <th className="px-4 py-3 font-semibold">N° FACTURE</th>
                <th className="px-4 py-3 font-semibold">INSTITUTION</th>
                <th className="px-4 py-3 font-semibold">PÉRIODE</th>
                <th className="px-4 py-3 font-semibold">MODE</th>
                <th className="px-4 py-3 font-semibold text-right">MONTANT</th>
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
                <tr><td colSpan={8} className="px-4 py-10 text-center text-dark-400">Aucune facture.</td></tr>
              ) : factures.map((f) => (
                <tr key={f.id} className="border-b border-dark-800 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-white">{f.numero}</td>
                  <td className="px-4 py-3 text-white">{f.institutionNom || f.institutionId?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-dark-200">{f.periode}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.modePaiement} /></td>
                  <td className="px-4 py-3 text-right text-white font-semibold">{fmtMontant(f.montantTotal, f.devise)}</td>
                  <td className="px-4 py-3 text-dark-200">{f.dateEcheance || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.statut} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {f.statut !== 'PAYEE' && f.statut !== 'ANNULEE' && (
                        <button onClick={() => setPayModal(f)} title="Enregistrer un paiement"
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      {f.statut !== 'ANNULEE' && f.statut !== 'PAYEE' && (
                        <button onClick={() => handleAnnuler(f)} title="Annuler"
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await factureApi.payer(facture.id, form);
      toast.success('Paiement enregistré');
      onDone();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} id="paiement" title={`Paiement — ${facture.numero}`}
      footer={(
        <>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-paiement" type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Enregistrer
          </button>
        </>
      )}>
      <form id="form-paiement" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label>Montant ({facture.devise})</label>
          <input type="number" step="0.01" className="form-control" required
            value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
          <p className="text-xs text-slate-500 mt-1">Total: {fmtMontant(facture.montantTotal, facture.devise)} · Déjà payé: {fmtMontant(facture.montantPaye || 0, facture.devise)}</p>
        </div>
        <div className="form-group">
          <label>Date du paiement</label>
          <input type="date" className="form-control" value={form.datePaiement}
            onChange={(e) => setForm({ ...form, datePaiement: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Moyen de paiement</label>
          <select className="form-control" value={form.moyenPaiement}
            onChange={(e) => setForm({ ...form, moyenPaiement: e.target.value })}>
            <option value="VIREMENT">Virement</option>
            <option value="CHEQUE">Chèque</option>
            <option value="ESPECES">Espèces</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
          </select>
        </div>
        <div className="form-group col-span-2">
          <label>Référence</label>
          <input type="text" className="form-control" value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>
      </form>
    </Modal>
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
    <Modal isOpen onClose={onClose} id="generation" title="Générer les factures"
      footer={(
        <>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-gen" type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />} Générer
          </button>
        </>
      )}>
      <form id="form-gen" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Génère les factures pour toutes les institutions configurées sur la période choisie.
          La génération est idempotente (aucun doublon par période).
        </p>
        <div className="form-group">
          <label>Période (mois)</label>
          <input type="month" className="form-control" value={periode}
            onChange={(e) => setPeriode(e.target.value)} required />
        </div>
      </form>
    </Modal>
  );
}

/* ===================== TARIFS ===================== */
function TarifsTab() {
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {tarif} or 'new'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tarifApi.findAll();
      setTarifs(res.data || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des tarifs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (t) => {
    if (!window.confirm(`Supprimer le tarif "${t.libelle}" ?`)) return;
    try {
      await tarifApi.remove(t.id);
      toast.success('Tarif supprimé');
      load();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-dark-300 text-sm">{tarifs.length} tarif(s)</span>
        <button onClick={() => setModal('new')} className="btn-primary text-xs" id="btn-create-tarif">
          <Plus className="w-4 h-4" /> Nouveau tarif
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-dark-300 border-b border-dark-700">
              <th className="px-4 py-3 font-semibold">CODE</th>
              <th className="px-4 py-3 font-semibold">LIBELLÉ</th>
              <th className="px-4 py-3 font-semibold">MODE</th>
              <th className="px-4 py-3 font-semibold text-right">MONTANT</th>
              <th className="px-4 py-3 font-semibold">ACTIF</th>
              <th className="px-4 py-3 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-dark-400"><Loader2 className="w-6 h-6 animate-spin inline" /></td></tr>
            ) : tarifs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-dark-400">Aucun tarif.</td></tr>
            ) : tarifs.map((t) => (
              <tr key={t.id} className="border-b border-dark-800 hover:bg-white/5">
                <td className="px-4 py-3 font-mono text-xs text-white">{t.code}</td>
                <td className="px-4 py-3 text-white">{t.libelle}</td>
                <td className="px-4 py-3"><StatusBadge status={t.modePaiement} /></td>
                <td className="px-4 py-3 text-right text-white font-semibold">{fmtMontant(t.montant, t.devise)}</td>
                <td className="px-4 py-3">{t.actif ? <span className="badge badge-comptabilise">Oui</span> : <span className="badge badge-annule">Non</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setModal({ tarif: t })} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <TarifModal tarif={modal === 'new' ? null : modal.tarif} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

function TarifModal({ tarif, onClose, onDone }) {
  const [form, setForm] = useState({
    code: tarif?.code || '',
    libelle: tarif?.libelle || '',
    description: tarif?.description || '',
    modePaiement: tarif?.modePaiement || 'PAR_OPERATION',
    montant: tarif?.montant ?? '',
    devise: tarif?.devise || 'XOF',
    actif: tarif?.actif ?? true,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (tarif) await tarifApi.update(tarif.id, form);
      else await tarifApi.create(form);
      toast.success(tarif ? 'Tarif mis à jour' : 'Tarif créé');
      onDone();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du tarif");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} id="tarif" title={tarif ? `Modifier le tarif : ${tarif.libelle}` : 'Nouveau tarif'}
      footer={(
        <>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-tarif" type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Enregistrer
          </button>
        </>
      )}>
      <form id="form-tarif" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label>Code</label>
          <input type="text" className="form-control" required value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </div>
        <div className="form-group">
          <label>Mode de paiement</label>
          <select className="form-control" value={form.modePaiement}
            onChange={(e) => setForm({ ...form, modePaiement: e.target.value })}>
            <option value="PAR_OPERATION">Par opération</option>
            <option value="FORFAIT">Forfait (abonnement)</option>
          </select>
        </div>
        <div className="form-group col-span-2">
          <label>Libellé</label>
          <input type="text" className="form-control" required value={form.libelle}
            onChange={(e) => setForm({ ...form, libelle: e.target.value })} />
        </div>
        <div className="form-group">
          <label>{form.modePaiement === 'PAR_OPERATION' ? 'Montant par opération' : 'Montant du forfait'}</label>
          <input type="number" step="0.01" className="form-control" required value={form.montant}
            onChange={(e) => setForm({ ...form, montant: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Devise</label>
          <input type="text" className="form-control" required maxLength={3} value={form.devise}
            onChange={(e) => setForm({ ...form, devise: e.target.value.toUpperCase() })} />
        </div>
        <div className="form-group col-span-2">
          <label>Description</label>
          <textarea className="form-control" rows={2} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
          Tarif actif
        </label>
      </form>
    </Modal>
  );
}

/* ===================== CONFIG INSTITUTIONS ===================== */
function ConfigTab() {
  const [configs, setConfigs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, instRes, tarifRes] = await Promise.all([
        institutionBillingApi.findAll(),
        institutionApi.findAll({ size: 200 }),
        tarifApi.findAll(),
      ]);
      setConfigs(cfgRes.data || []);
      setInstitutions(instRes.data?.content || []);
      setTarifs(tarifRes.data || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des configurations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tarifLabel = (id) => tarifs.find((t) => t.id === id)?.libelle || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-dark-300 text-sm">{configs.length} institution(s) configurée(s)</span>
        <button onClick={() => setModal({})} className="btn-primary text-xs" id="btn-config-institution">
          <Plus className="w-4 h-4" /> Configurer une institution
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-dark-300 border-b border-dark-700">
              <th className="px-4 py-3 font-semibold">INSTITUTION</th>
              <th className="px-4 py-3 font-semibold">MODE</th>
              <th className="px-4 py-3 font-semibold">TARIF</th>
              <th className="px-4 py-3 font-semibold">ACTIF</th>
              <th className="px-4 py-3 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-dark-400"><Loader2 className="w-6 h-6 animate-spin inline" /></td></tr>
            ) : configs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-dark-400">Aucune institution configurée.</td></tr>
            ) : configs.map((c) => (
              <tr key={c.id} className="border-b border-dark-800 hover:bg-white/5">
                <td className="px-4 py-3 text-white">{c.institutionNom || c.institutionId?.slice(0, 8)}</td>
                <td className="px-4 py-3"><StatusBadge status={c.modePaiement} /></td>
                <td className="px-4 py-3 text-dark-200">{tarifLabel(c.tarifId)}</td>
                <td className="px-4 py-3">{c.actif ? <span className="badge badge-comptabilise">Oui</span> : <span className="badge badge-annule">Non</span>}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setModal({ config: c })} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ConfigModal config={modal.config} institutions={institutions} tarifs={tarifs}
        onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

function ConfigModal({ config, institutions, tarifs, onClose, onDone }) {
  const [form, setForm] = useState({
    institutionId: config?.institutionId || '',
    institutionNom: config?.institutionNom || '',
    institutionEmail: config?.institutionEmail || '',
    modePaiement: config?.modePaiement || 'PAR_OPERATION',
    tarifId: config?.tarifId || '',
    actif: config?.actif ?? true,
  });
  const [saving, setSaving] = useState(false);
  const filteredTarifs = tarifs.filter((t) => t.modePaiement === form.modePaiement);

  const onInstChange = (id) => {
    const inst = institutions.find((i) => i.id === id);
    setForm((f) => ({ ...f, institutionId: id, institutionNom: inst?.nom || '', institutionEmail: inst?.email || f.institutionEmail }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.institutionId) { toast.error('Veuillez sélectionner une institution'); return; }
    setSaving(true);
    try {
      await institutionBillingApi.upsert({ ...form, tarifId: form.tarifId || null });
      toast.success('Configuration enregistrée');
      onDone();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} id="config-inst" title={config ? 'Modifier la configuration' : 'Configurer une institution'}
      footer={(
        <>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-config" type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Enregistrer
          </button>
        </>
      )}>
      <form id="form-config" onSubmit={submit} className="space-y-4">
        <div className="form-group">
          <label>Institution</label>
          <select className="form-control" value={form.institutionId} disabled={!!config}
            onChange={(e) => onInstChange(e.target.value)}>
            <option value="">Sélectionner une institution</option>
            {institutions.map((i) => <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Email administrateur (alertes)</label>
          <input type="email" className="form-control" value={form.institutionEmail}
            onChange={(e) => setForm({ ...form, institutionEmail: e.target.value })} placeholder="admin@institution.com" />
        </div>
        <div className="form-group">
          <label>Mode de paiement</label>
          <select className="form-control" value={form.modePaiement}
            onChange={(e) => setForm({ ...form, modePaiement: e.target.value, tarifId: '' })}>
            <option value="PAR_OPERATION">Par opération</option>
            <option value="FORFAIT">Forfait (abonnement)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Tarif appliqué</label>
          <select className="form-control" value={form.tarifId}
            onChange={(e) => setForm({ ...form, tarifId: e.target.value })}>
            <option value="">Sélectionner un tarif</option>
            {filteredTarifs.map((t) => <option key={t.id} value={t.id}>{t.libelle} — {fmtMontant(t.montant, t.devise)}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
          Facturation active
        </label>
      </form>
    </Modal>
  );
}

/* ===================== PARAMÈTRES ===================== */
function ParametresTab() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await billingSettingsApi.get();
        setForm(res.data);
      } catch (e) {
        toast.error('Erreur lors du chargement des paramètres');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await billingSettingsApi.update(form);
      setForm(res.data);
      toast.success('Paramètres enregistrés');
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) return <div className="glass-card p-10 text-center text-dark-400"><Loader2 className="w-6 h-6 animate-spin inline" /></div>;

  return (
    <form onSubmit={submit} className="glass-card p-6 max-w-2xl space-y-5">
      <h2 className="text-lg font-bold text-white">Paramètres de facturation</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label>Jour de génération (1-28)</label>
          <input type="number" min={1} max={28} className="form-control" value={form.jourGeneration}
            onChange={(e) => setForm({ ...form, jourGeneration: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label>Délai de paiement (jours)</label>
          <input type="number" min={0} className="form-control" value={form.delaiPaiementJours}
            onChange={(e) => setForm({ ...form, delaiPaiementJours: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label>Délai avant désactivation (jours après échéance)</label>
          <input type="number" min={0} className="form-control" value={form.delaiDesactivationJours}
            onChange={(e) => setForm({ ...form, delaiDesactivationJours: Number(e.target.value) })} />
        </div>
        <div className="form-group flex flex-col justify-end">
          <label className="flex items-center gap-2 text-sm text-slate-600 mt-2">
            <input type="checkbox" checked={form.autoDesactivationActive}
              onChange={(e) => setForm({ ...form, autoDesactivationActive: e.target.checked })} />
            Désactivation automatique activée
          </label>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Le délai de désactivation est configurable (non fixé à 5 jours). Une institution dont une facture
        reste impayée au-delà de « échéance + délai » est désactivée automatiquement si l'option est activée.
      </p>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Enregistrer
        </button>
      </div>
    </form>
  );
}
