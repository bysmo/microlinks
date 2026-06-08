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
