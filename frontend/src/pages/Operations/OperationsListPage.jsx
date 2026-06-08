import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, RefreshCw, Download, Search, Eye } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import { operationApi, rapportApi, downloadBlob } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'VIREMENT', label: 'Virement' },
  { value: 'CHEQUE', label: 'Chèque' },
  { value: 'PRELEVEMENT', label: 'Prélèvement' },
];

const STATUT_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'SOUMIS', label: 'Soumis' },
  { value: 'ACCEPTE_EMETTEUR', label: 'Accepté Émetteur' },
  { value: 'ACCEPTE_BANQUE_EMETTRICE', label: 'Accepté Banque ÉM.' },
  { value: 'ACCEPTE_BANQUE_RECEPTRICE', label: 'Accepté Banque RÉC.' },
  { value: 'ACCEPTE_BENEFICIAIRE', label: 'Accepté Bénéficiaire' },
  { value: 'COMPTABILISE', label: 'Comptabilisé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'ANNULE', label: 'Annulé' },
];

export default function OperationsListPage() {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();

  const [data, setData] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    typeOperation: '',
    statut: '',
    dateDebut: '',
    dateFin: '',
    devise: '',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page, size: pageSize,
        ...(filters.search && { search: filters.search }),
        ...(filters.typeOperation && { typeOperation: filters.typeOperation }),
        ...(filters.statut && { statut: filters.statut }),
        ...(filters.dateDebut && { dateDebut: filters.dateDebut }),
        ...(filters.dateFin && { dateFin: filters.dateFin }),
        ...(filters.devise && { devise: filters.devise }),
      };
      const res = await operationApi.findAll(params);
      setData(res.data.content || []);
      setTotalElements(res.data.totalElements || 0);
    } catch (e) {
      toast.error('Erreur lors du chargement des opérations');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format) => {
    setExportLoading(true);
    try {
      const params = {
        ...(filters.dateDebut && { dateDebut: filters.dateDebut }),
        ...(filters.dateFin && { dateFin: filters.dateFin }),
        dateDebut: filters.dateDebut || new Date().toISOString().split('T')[0].replace(/-/g, '-').slice(0, 8) + '01',
        dateFin: filters.dateFin || new Date().toISOString().split('T')[0],
      };

      let res, filename, type;
      if (format === 'excel') {
        res = await rapportApi.exportExcel(params);
        filename = `microlinks_operations_${params.dateDebut}_${params.dateFin}.xlsx`;
        type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (format === 'csv') {
        res = await rapportApi.exportCSV(params);
        filename = `microlinks_operations_${params.dateDebut}_${params.dateFin}.csv`;
        type = 'text/csv';
      } else if (format === 'mt940') {
        res = await rapportApi.exportMT940(params);
        filename = `microlinks_mt940_${params.dateDebut}_${params.dateFin}.txt`;
        type = 'text/plain';
      } else if (format === 'camt053') {
        res = await rapportApi.exportCAMT053(params);
        filename = `microlinks_camt053_${params.dateDebut}_${params.dateFin}.xml`;
        type = 'application/xml';
      }

      downloadBlob(res.data, filename, type);
      toast.success(`Export ${format.toUpperCase()} généré avec succès`);
    } catch (e) {
      toast.error(`Erreur d'export: ${e.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const columns = useMemo(() => [
    {
      header: 'Référence',
      accessorKey: 'referenceUnique',
      cell: ({ getValue }) => (
        <span className="font-mono text-primary-300 text-xs font-bold">{getValue()}</span>
      ),
      size: 160,
    },
    {
      header: 'Date',
      accessorKey: 'dateOperation',
      cell: ({ getValue }) => (
        <span className="text-dark-300 text-xs">{getValue()}</span>
      ),
      size: 100,
    },
    {
      header: 'Type',
      accessorKey: 'typeOperation',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      size: 120,
    },
    {
      header: 'Statut',
      accessorKey: 'statut',
      cell: ({ row }) => <StatusBadge status={row.original.statut} customLabel={row.original.statutLabel} />,
      size: 180,
    },
    {
      header: 'Donneur d\'ordre',
      accessorKey: 'nomDonneurOrdre',
      cell: ({ row }) => (
        <div>
          <p className="text-white text-xs font-medium truncate max-w-36">{row.original.nomDonneurOrdre}</p>
          <p className="text-dark-400 text-xs truncate max-w-36">{row.original.nomInstitutionEmettrice}</p>
        </div>
      ),
    },
    {
      header: 'Bénéficiaire',
      accessorKey: 'nomBeneficiaire',
      cell: ({ row }) => (
        <div>
          <p className="text-white text-xs font-medium truncate max-w-36">{row.original.nomBeneficiaire}</p>
          <p className="text-dark-400 text-xs truncate max-w-36">{row.original.nomInstitutionBeneficiaire}</p>
        </div>
      ),
    },
    {
      header: 'Montant',
      accessorKey: 'montant',
      cell: ({ row }) => (
        <div className="text-right">
          <p className="text-white font-semibold text-sm">
            {Number(row.original.montant).toLocaleString('fr-FR')}
          </p>
          <p className="text-dark-400 text-xs">{row.original.devise}</p>
        </div>
      ),
      size: 130,
    },
    {
      header: '',
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/operations/${row.original.id}`); }}
            className="btn-ghost btn-sm p-1.5"
            id={`btn-view-op-${row.original.id}`}
            title="Voir le détail"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
      size: 60,
    },
  ], [navigate]);

  return (
    <div className="space-y-5 animate-slide-up" id="operations-list-page">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white text-xl font-bold">Suivi des Opérations</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {totalElements.toLocaleString('fr-FR')} opération(s)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary btn-sm" id="btn-toggle-filters">
            <Filter className="w-4 h-4" />
            Filtres
          </button>
          <button onClick={fetchData} className="btn-secondary btn-sm" id="btn-refresh-operations">
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              className="btn-secondary btn-sm"
              id="btn-export-operations"
              disabled={exportLoading}
            >
              <Download className="w-4 h-4" />
              {exportLoading ? 'Export...' : 'Exporter'}
            </button>
            <div className="absolute right-0 top-10 w-44 glass-card py-1 z-30 hidden group-hover:block animate-fade-in">
              {['excel', 'csv', 'mt940', 'camt053'].map(f => (
                <button
                  key={f}
                  onClick={() => handleExport(f)}
                  className="w-full px-4 py-2 text-sm text-dark-200 hover:bg-white/10 text-left"
                  id={`btn-export-${f}`}
                >
                  Export {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {hasAnyRole('ADMIN_PLATEFORME', 'ADMIN_INSTITUTION', 'AGENT_SAISIE') && (
            <button
              onClick={() => navigate('/operations/nouvelle')}
              className="btn-primary btn-sm"
              id="btn-new-operation"
            >
              <Plus className="w-4 h-4" />
              Nouvelle
            </button>
          )}
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="glass-card p-5 animate-slide-up" id="filters-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="search-bar">
              <Search className="search-icon" />
              <input
                id="filter-search"
                type="text"
                placeholder="Référence, nom..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="input pl-10"
              />
            </div>
            <select
              id="filter-type"
              value={filters.typeOperation}
              onChange={e => setFilters(f => ({ ...f, typeOperation: e.target.value }))}
              className="select"
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              id="filter-statut"
              value={filters.statut}
              onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}
              className="select"
            >
              {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              id="filter-devise"
              value={filters.devise}
              onChange={e => setFilters(f => ({ ...f, devise: e.target.value }))}
              className="select"
            >
              <option value="">Toutes devises</option>
              <option value="XOF">XOF (BCEAO)</option>
              <option value="XAF">XAF (BEAC)</option>
              <option value="GNF">GNF (BCRG)</option>
            </select>
            <div className="flex gap-2">
              <input type="date" id="filter-date-debut" value={filters.dateDebut}
                onChange={e => setFilters(f => ({ ...f, dateDebut: e.target.value }))}
                className="input text-sm" placeholder="Date début"
              />
              <input type="date" id="filter-date-fin" value={filters.dateFin}
                onChange={e => setFilters(f => ({ ...f, dateFin: e.target.value }))}
                className="input text-sm" placeholder="Date fin"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={() => { setPage(0); fetchData(); }}
                className="btn-primary btn-sm flex-1"
                id="btn-apply-filters"
              >
                Rechercher
              </button>
              <button
                onClick={() => setFilters({ search: '', typeOperation: '', statut: '', dateDebut: '', dateFin: '', devise: '' })}
                className="btn-secondary btn-sm"
                id="btn-reset-filters"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <DataTable
        data={data}
        columns={columns}
        totalElements={totalElements}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        isLoading={isLoading}
        emptyMessage="Aucune opération trouvée"
        onRowClick={(row) => navigate(`/operations/${row.id}`)}
      />
    </div>
  );
}
