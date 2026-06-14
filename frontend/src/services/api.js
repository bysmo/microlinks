import axios from 'axios';
import keycloak from '../keycloak';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur requêtes - injecter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = keycloak.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur réponses - gestion erreurs globale
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Token expiré : essayer de rafraîchir
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await keycloak.updateToken(30);
        originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
        return api(originalRequest);
      } catch {
        keycloak.logout();
      }
    }

    return Promise.reject(error);
  }
);

// ======================== INSTITUTIONS ========================

export const institutionApi = {
  findAll: (params) => api.get('/api/v1/institutions', { params }),
  findById: (id) => api.get(`/api/v1/institutions/${id}`),
  findByCode: (code) => api.get(`/api/v1/institutions/code/${code}`),
  create: (data) => api.post('/api/v1/institutions', data),
  update: (id, data) => api.put(`/api/v1/institutions/${id}`, data),
  changerStatut: (id, statut) => api.patch(`/api/v1/institutions/${id}/statut`, null, { params: { statut } }),
  getStats: () => api.get('/api/v1/institutions/stats'),
};

// ======================== COMPTES DE RÈGLEMENT ========================

export const compteReglementApi = {
  findAll: (institutionId) => api.get(`/api/v1/institutions/${institutionId}/comptes-reglement`),
  create: (institutionId, data) => api.post(`/api/v1/institutions/${institutionId}/comptes-reglement`, data),
  update: (institutionId, compteId, data) => api.put(`/api/v1/institutions/${institutionId}/comptes-reglement/${compteId}`, data),
  remove: (institutionId, compteId) => api.delete(`/api/v1/institutions/${institutionId}/comptes-reglement/${compteId}`),
};

// ======================== ZONES MONETAIRES ========================

export const zoneMonetaireApi = {
  findAll: () => api.get('/api/v1/zones-monetaires'),
};

// ======================== OPERATIONS ========================

export const operationApi = {
  findAll: (params) => api.get('/api/v1/operations', { params }),
  findById: (id) => api.get(`/api/v1/operations/${id}`),
  findByReference: (ref) => api.get(`/api/v1/operations/reference/${ref}`),
  getHistorique: (id) => api.get(`/api/v1/operations/${id}/historique`),
  create: (data) => api.post('/api/v1/operations', data),
  soumettre: (id, commentaire) => api.post(`/api/v1/operations/${id}/soumettre`, { commentaire }),
  valider: (id, nouveauStatut, commentaire) =>
    api.post(`/api/v1/operations/${id}/valider`, { commentaire }, { params: { nouveauStatut } }),
  rejeter: (id, motif) => api.post(`/api/v1/operations/${id}/rejeter`, { motif }),
  annuler: (id, motif) => api.post(`/api/v1/operations/${id}/annuler`, { motif }),
  getStats: () => api.get('/api/v1/operations/stats'),
};

// ======================== FACTURATION / BILLING ========================

export const tarifApi = {
  findAll: () => api.get('/api/v1/tarifs'),
  findById: (id) => api.get(`/api/v1/tarifs/${id}`),
  create: (data) => api.post('/api/v1/tarifs', data),
  update: (id, data) => api.put(`/api/v1/tarifs/${id}`, data),
  remove: (id) => api.delete(`/api/v1/tarifs/${id}`),
};

export const billingSettingsApi = {
  get: () => api.get('/api/v1/billing-settings'),
  update: (data) => api.put('/api/v1/billing-settings', data),
};

export const institutionBillingApi = {
  findAll: () => api.get('/api/v1/institution-billing'),
  findByInstitution: (institutionId) => api.get(`/api/v1/institution-billing/${institutionId}`),
  upsert: (data) => api.put('/api/v1/institution-billing', data),
};

export const factureApi = {
  findAll: () => api.get('/api/v1/factures'),
  mesFactures: () => api.get('/api/v1/factures/mes-factures'),
  byInstitution: (institutionId) => api.get(`/api/v1/factures/institution/${institutionId}`),
  findById: (id) => api.get(`/api/v1/factures/${id}`),
  getPaiements: (id) => api.get(`/api/v1/factures/${id}/paiements`),
  generer: (periode) => api.post('/api/v1/factures/generer', null, { params: periode ? { periode } : {} }),
  payer: (id, data) => api.post(`/api/v1/factures/${id}/paiement`, data),
  annuler: (id) => api.post(`/api/v1/factures/${id}/annuler`),
  traiterRetards: () => api.post('/api/v1/factures/traiter-retards'),
};

// ======================== RAPPORTS / EXPORTS ========================

export const rapportApi = {
  exportExcel: (params) => api.get('/api/v1/rapports/export/excel', {
    params, responseType: 'blob'
  }),
  exportCSV: (params) => api.get('/api/v1/rapports/export/csv', {
    params, responseType: 'blob'
  }),
  exportMT940: (params) => api.get('/api/v1/rapports/export/mt940', {
    params, responseType: 'blob'
  }),
  exportCAMT053: (params) => api.get('/api/v1/rapports/export/camt053', {
    params, responseType: 'blob'
  }),
  exportSingleMT101: (id) => api.get(`/api/v1/rapports/operations/${id}/mt101`, {
    responseType: 'blob'
  }),
  exportSinglePain001: (id) => api.get(`/api/v1/rapports/operations/${id}/pain001`, {
    responseType: 'blob'
  }),
  exportBulkMT101: (ids) => api.post('/api/v1/rapports/operations/bulk/mt101', ids, {
    responseType: 'blob'
  }),
  exportBulkPain001: (ids) => api.post('/api/v1/rapports/operations/bulk/pain001', ids, {
    responseType: 'blob'
  }),
};

// ======================== Helpers ========================

export const downloadBlob = (data, filename, type) => {
  const url = window.URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
