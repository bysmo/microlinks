import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Settings, Tag, Building2, Plus, Pencil, Trash2,
  RefreshCw, Loader2, Save, AlertTriangle, ShieldAlert
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import DataTable from '../../components/common/DataTable';
import {
  tarifApi, billingSettingsApi, institutionBillingApi, institutionApi,
} from '../../services/api';

const TABS = [
  { id: 'parametres', label: 'Paramètres Facturation', icon: Settings },
  { id: 'tarifs', label: 'Tarifs Plateforme', icon: Tag },
  { id: 'abonnements', label: 'Abonnements Institutions', icon: Building2 },
];

const fmtMontant = (v, devise) =>
  v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${devise || ''}`;

export default function AdministrationPage() {
  const [activeTab, setActiveTab] = useState('parametres');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-400" /> Administration Globale
        </h1>
        <p className="text-dark-400 text-sm mt-1">
          Configuration des paramètres système, des grilles tarifaires et abonnements des institutions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              id={`admin-tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-primary-400 text-white font-bold'
                  : 'border-transparent text-dark-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab contents */}
      {activeTab === 'parametres' && <ParametresTab />}
      {activeTab === 'tarifs' && <TarifsTab />}
      {activeTab === 'abonnements' && <AbonnementsTab />}
    </div>
  );
}

/* ===================== PARAMÈTRES ===================== */
function ParametresTab() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await billingSettingsApi.get();
      setForm(res.data);
    } catch (e) {
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await billingSettingsApi.update(form);
      setForm(res.data);
      toast.success('Paramètres enregistrés avec succès');
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement des paramètres");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="glass-card p-12 text-center text-dark-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-400" />
        <p className="text-sm mt-3">Chargement des paramètres globaux...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={submit} className="glass-card p-6 lg:col-span-2 space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-400" /> Paramètres de Facturation & Recouvrement
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="block text-sm font-medium text-dark-300 mb-1">Jour de génération des factures (1-28)</label>
            <input
              type="number"
              min={1}
              max={28}
              className="form-control w-full"
              required
              value={form.jourGeneration}
              onChange={(e) => setForm({ ...form, jourGeneration: Number(e.target.value) })}
            />
            <p className="text-xs text-dark-500 mt-1">Jour du mois où la facturation mensuelle est générée.</p>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-dark-300 mb-1">Délai de paiement (jours)</label>
            <input
              type="number"
              min={0}
              className="form-control w-full"
              required
              value={form.delaiPaiementJours}
              onChange={(e) => setForm({ ...form, delaiPaiementJours: Number(e.target.value) })}
            />
            <p className="text-xs text-dark-500 mt-1">Nombre de jours accordés pour payer après émission.</p>
          </div>

          <div className="form-group">
            <label className="block text-sm font-medium text-dark-300 mb-1">Délai avant désactivation (jours)</label>
            <input
              type="number"
              min={0}
              className="form-control w-full"
              required
              value={form.delaiDesactivationJours}
              onChange={(e) => setForm({ ...form, delaiDesactivationJours: Number(e.target.value) })}
            />
            <p className="text-xs text-dark-500 mt-1">Nombre de jours après l'échéance avant suspension.</p>
          </div>

          <div className="form-group flex flex-col justify-center">
            <label className="flex items-center gap-3 text-sm text-dark-300 cursor-pointer mt-4 select-none">
              <input
                type="checkbox"
                checked={form.autoDesactivationActive}
                className="w-4 h-4 rounded border-dark-600 bg-dark-900 text-primary-500 focus:ring-primary-500"
                onChange={(e) => setForm({ ...form, autoDesactivationActive: e.target.checked })}
              />
              <span className="font-semibold text-white">Désactivation automatique activée</span>
            </label>
            <p className="text-xs text-dark-500 mt-1 ml-7">Suspendre automatiquement les institutions en impayés.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
          <button
            type="button"
            onClick={loadSettings}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Réinitialiser
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
          </button>
        </div>
      </form>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-yellow-500" /> Informations de Sécurité
        </h3>
        <div className="text-sm text-dark-300 space-y-3">
          <p>
            Ces paramètres régissent le cycle de facturation de la plateforme MicroLinks. 
          </p>
          <p className="text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs flex gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>
              <strong>Attention :</strong> L'activation de la désactivation automatique suspendra le statut opérationnel des institutions dont le solde facturé est en retard de paiement.
            </span>
          </p>
          <p className="text-xs text-dark-400">
            Dernière mise à jour effectuée par : <span className="font-mono text-dark-300">{form.updatedBy || 'système'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ===================== TARIFS ===================== */
function TarifsTab() {
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {tarif} or 'new'
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadTarifs = useCallback(async () => {
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

  useEffect(() => {
    loadTarifs();
  }, [loadTarifs]);

  const handleDelete = async (t) => {
    if (!window.confirm(`Supprimer définitivement le tarif "${t.libelle}" ?`)) return;
    try {
      await tarifApi.remove(t.id);
      toast.success('Tarif supprimé avec succès');
      loadTarifs();
    } catch (e) {
      toast.error('Erreur lors de la suppression du tarif');
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: info => <span className="font-mono text-xs text-white bg-dark-900 px-2 py-1 rounded border border-dark-700">{info.getValue()}</span>,
    },
    {
      accessorKey: 'libelle',
      header: 'Libellé',
      cell: info => <span className="font-medium text-white">{info.getValue()}</span>,
    },
    {
      accessorKey: 'modePaiement',
      header: 'Mode de Facturation',
      cell: info => <StatusBadge status={info.getValue()} />,
    },
    {
      accessorKey: 'montant',
      header: 'Montant',
      cell: info => {
        const row = info.row.original;
        return <span className="font-bold text-white">{fmtMontant(row.montant, row.devise)}</span>;
      },
    },
    {
      accessorKey: 'actif',
      header: 'Actif',
      cell: info => info.getValue() ? (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">Oui</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Non</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: info => {
        const t = info.row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModal({ tarif: t })}
              className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-950/40 hover:text-primary-300 transition-colors border border-transparent hover:border-primary-800/30"
              title="Modifier"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(t)}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-colors border border-transparent hover:border-red-900/30"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    }
  ], [tarifs]);

  const pagedTarifs = useMemo(() => {
    return tarifs.slice(page * pageSize, (page + 1) * pageSize);
  }, [tarifs, page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Grille Tarifaire de la Plateforme</h3>
          <p className="text-xs text-dark-400 mt-0.5">Configurez les tarifs d'abonnement et frais par opération.</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="btn-primary text-xs flex items-center gap-2"
          id="btn-create-tarif"
        >
          <Plus className="w-4 h-4" /> Nouveau Tarif
        </button>
      </div>

      <DataTable
        data={pagedTarifs}
        columns={columns}
        totalElements={tarifs.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={loading}
        emptyMessage="Aucun tarif configuré sur la plateforme."
      />

      {modal && (
        <TarifModal
          tarif={modal === 'new' ? null : modal.tarif}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            loadTarifs();
          }}
        />
      )}
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
      if (tarif) {
        await tarifApi.update(tarif.id, form);
        toast.success('Tarif mis à jour');
      } else {
        await tarifApi.create(form);
        toast.success('Tarif créé avec succès');
      }
      onDone();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement du tarif");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      id="tarif-edit-modal"
      title={tarif ? `Modifier le tarif : ${tarif.libelle}` : 'Créer un nouveau tarif'}
      footer={(
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-tarif" type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
          </button>
        </>
      )}
    >
      <form id="form-tarif" onSubmit={submit} className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Code Tarif</label>
          <input
            type="text"
            className="form-control w-full"
            required
            disabled={!!tarif}
            value={form.code}
            placeholder="EX: OP-STD"
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Mode de Paiement</label>
          <select
            className="form-control w-full"
            value={form.modePaiement}
            onChange={(e) => setForm({ ...form, modePaiement: e.target.value })}
          >
            <option value="PAR_OPERATION">Par opération</option>
            <option value="FORFAIT">Forfait (abonnement fixe)</option>
          </select>
        </div>
        <div className="form-group col-span-2">
          <label className="block text-sm font-medium text-dark-300 mb-1">Libellé</label>
          <input
            type="text"
            className="form-control w-full"
            required
            value={form.libelle}
            placeholder="Libellé explicatif"
            onChange={(e) => setForm({ ...form, libelle: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Montant</label>
          <input
            type="number"
            step="0.01"
            className="form-control w-full"
            required
            value={form.montant}
            onChange={(e) => setForm({ ...form, montant: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Devise</label>
          <input
            type="text"
            className="form-control w-full"
            required
            maxLength={3}
            value={form.devise}
            onChange={(e) => setForm({ ...form, devise: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-group col-span-2">
          <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
          <textarea
            className="form-control w-full"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm text-dark-300 cursor-pointer mt-2 select-none">
          <input
            type="checkbox"
            checked={form.actif}
            onChange={(e) => setForm({ ...form, actif: e.target.checked })}
          />
          Tarif actif et disponible pour les abonnements
        </label>
      </form>
    </Modal>
  );
}

/* ===================== CONFIG INSTITUTIONS (ABONNEMENTS) ===================== */
function AbonnementsTab() {
  const [configs, setConfigs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadAll = useCallback(async () => {
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
      toast.error('Erreur lors du chargement des configurations d\'abonnement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const getTarifLabel = (id) => {
    const t = tarifs.find((x) => x.id === id);
    return t ? `${t.libelle} (${fmtMontant(t.montant, t.devise)})` : 'Non configuré';
  };

  const columns = useMemo(() => [
    {
      accessorKey: 'institutionNom',
      header: 'Institution',
      cell: info => <span className="font-semibold text-white">{info.getValue() || info.row.original.institutionId?.slice(0, 8)}</span>,
    },
    {
      accessorKey: 'modePaiement',
      header: 'Mode de Facturation',
      cell: info => <StatusBadge status={info.getValue()} />,
    },
    {
      accessorKey: 'tarifId',
      header: 'Tarif Appliqué',
      cell: info => <span className="text-dark-200">{getTarifLabel(info.getValue())}</span>,
    },
    {
      accessorKey: 'institutionEmail',
      header: 'Email Alertes',
      cell: info => <span className="text-dark-300 font-mono text-xs">{info.getValue() || '—'}</span>,
    },
    {
      accessorKey: 'actif',
      header: 'Facturation Active',
      cell: info => info.getValue() ? (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">Oui</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Suspendue</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <button
          onClick={() => setModal({ config: info.row.original })}
          className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-950/40 hover:text-primary-300 transition-colors border border-transparent hover:border-primary-800/30"
          title="Modifier l'abonnement"
        >
          <Pencil className="w-4 h-4" />
        </button>
      ),
    }
  ], [configs, tarifs]);

  const pagedConfigs = useMemo(() => {
    return configs.slice(page * pageSize, (page + 1) * pageSize);
  }, [configs, page, pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Abonnements & Paramètres par Institution</h3>
          <p className="text-xs text-dark-400 mt-0.5">Associez chaque institution financière à sa formule d'abonnement ou de facturation.</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="btn-primary text-xs flex items-center gap-2"
          id="btn-config-institution"
        >
          <Plus className="w-4 h-4" /> Activer Facturation
        </button>
      </div>

      <DataTable
        data={pagedConfigs}
        columns={columns}
        totalElements={configs.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={loading}
        emptyMessage="Aucune institution configurée pour la facturation."
      />

      {modal && (
        <ConfigModal
          config={modal.config}
          institutions={institutions}
          tarifs={tarifs}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            loadAll();
          }}
        />
      )}
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

  const filteredTarifs = tarifs.filter((t) => t.modePaiement === form.modePaiement && t.actif);

  const onInstChange = (id) => {
    const inst = institutions.find((i) => i.id === id);
    setForm((f) => ({
      ...f,
      institutionId: id,
      institutionNom: inst?.nom || '',
      institutionEmail: inst?.email || f.institutionEmail
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.institutionId) {
      toast.error('Veuillez sélectionner une institution');
      return;
    }
    setSaving(true);
    try {
      await institutionBillingApi.upsert({ ...form, tarifId: form.tarifId || null });
      toast.success('Configuration enregistrée');
      onDone();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de l'abonnement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      id="config-inst-modal"
      title={config ? 'Modifier la facturation de l\'institution' : 'Activer la facturation pour une institution'}
      footer={(
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
          <button form="form-config" type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer
          </button>
        </>
      )}
    >
      <form id="form-config" onSubmit={submit} className="space-y-4">
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Institution Financière</label>
          <select
            className="form-control w-full"
            value={form.institutionId}
            disabled={!!config}
            onChange={(e) => onInstChange(e.target.value)}
            required
          >
            <option value="">Sélectionner une institution</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.nom} ({i.code})</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Email administrateur (alertes de factures)</label>
          <input
            type="email"
            className="form-control w-full"
            value={form.institutionEmail}
            onChange={(e) => setForm({ ...form, institutionEmail: e.target.value })}
            placeholder="admin@institution.com"
            required
          />
        </div>

        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Mode de Paiement</label>
          <select
            className="form-control w-full"
            value={form.modePaiement}
            onChange={(e) => setForm({ ...form, modePaiement: e.target.value, tarifId: '' })}
          >
            <option value="PAR_OPERATION">Par opération</option>
            <option value="FORFAIT">Forfait (abonnement fixe)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="block text-sm font-medium text-dark-300 mb-1">Tarif applicable</label>
          <select
            className="form-control w-full"
            value={form.tarifId}
            onChange={(e) => setForm({ ...form, tarifId: e.target.value })}
            required
          >
            <option value="">Sélectionner un tarif</option>
            {filteredTarifs.map((t) => (
              <option key={t.id} value={t.id}>{t.libelle} — {fmtMontant(t.montant, t.devise)}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-dark-300 cursor-pointer pt-2 select-none">
          <input
            type="checkbox"
            checked={form.actif}
            onChange={(e) => setForm({ ...form, actif: e.target.checked })}
          />
          Facturation active (si désactivé, l'institution ne sera pas facturée lors des générations mensuelles)
        </label>
      </form>
    </Modal>
  );
}
