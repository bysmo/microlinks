import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import OperationsListPage from './pages/Operations/OperationsListPage';
import OperationsDuJourPage from './pages/Operations/OperationsDuJourPage';
import OperationDetailPage from './pages/Operations/OperationDetailPage';
import InstitutionsPage from './pages/Institutions/InstitutionsPage';
import MonEtablissementPage from './pages/Institutions/MonEtablissementPage';
import BillingAdminPage from './pages/Billing/BillingAdminPage';
import MesFacturesPage from './pages/Billing/MesFacturesPage';
import AdministrationPage from './pages/Administration/AdministrationPage';
import { AlertCircle } from 'lucide-react';

function MockPage({ title }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 bg-primary-950 border border-primary-800/30 text-primary-400 rounded-full flex items-center justify-center shadow-lg">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold text-white">Page en cours d'intégration</h2>
          <p className="text-dark-400 text-sm mt-2">
            L'interface utilisateur de la page <strong>{title}</strong> est actuellement en cours de développement et sera connectée sous peu aux services correspondants.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading, authError } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-primary text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-dark-300 font-medium">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-primary text-white p-4">
        <div className="glass-card max-w-md p-8 flex flex-col items-center justify-center text-center space-y-4 border-red-500/20">
          <div className="w-16 h-16 bg-red-950 border border-red-800/30 text-red-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Erreur d'authentification</h2>
            <p className="text-dark-300 text-sm mt-2">
              Le service d'authentification (Keycloak) est temporairement indisponible ou injoignable.
            </p>
            <p className="text-red-400/80 text-xs mt-3 bg-red-950/40 p-2 rounded border border-red-900/30 overflow-auto max-h-24">
              {typeof authError === 'string' ? authError : authError.message || JSON.stringify(authError)}
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary w-full mt-2"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="operations" element={<OperationsListPage />} />
        <Route path="operations/:id" element={<OperationDetailPage />} />
        <Route path="operations/du-jour" element={<OperationsDuJourPage />} />
        <Route path="institutions" element={<InstitutionsPage />} />
        <Route path="mon-etablissement" element={<MonEtablissementPage />} />
        <Route path="facturation" element={<BillingAdminPage />} />
        <Route path="mes-factures" element={<MesFacturesPage />} />
        <Route path="rapports" element={<MockPage title="Rapports & Exports" />} />
        <Route path="administration" element={<AdministrationPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#112240',
              color: '#ebf2f7',
              border: '1px solid rgba(243, 198, 35, 0.2)',
              borderRadius: '8px',
            }
          }} 
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
