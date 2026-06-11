import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import keycloak from '../keycloak';
import { institutionApi } from '../services/api';

const AuthContext = createContext(null);

/**
 * Normalise les rôles Keycloak des institutions vers les rôles applicatifs standards.
 * Exemple : BANK_ADMIN → ADMIN_INSTITUTION, BANK_AGENT → AGENT_SAISIE, etc.
 */
function normalizeRoles(keycloakRoles) {
  const roleMap = {
    'BANK_ADMIN':  'ADMIN_INSTITUTION',
    'MESO_ADMIN':  'ADMIN_INSTITUTION',
    'BANK_AGENT':  'AGENT_SAISIE',
    'MESO_AGENT':  'AGENT_SAISIE',
    'BANK_VALID':  'AGENT_VALIDATION',
    'MESO_VALID':  'AGENT_VALIDATION',
  };
  const normalized = new Set(keycloakRoles);
  keycloakRoles.forEach(role => {
    if (roleMap[role]) normalized.add(roleMap[role]);
  });
  return Array.from(normalized);
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [roles, setRoles] = useState([]);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    }).then(async (authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setToken(keycloak.token);
        const tokenParsed = keycloak.tokenParsed;
        const realmRoles = tokenParsed?.realm_access?.roles || [];
        const normalizedRoles = normalizeRoles(realmRoles);

        console.log('KEYCLOAK TOKEN PARSED:', tokenParsed);

        // institution_id peut être dans le token (si Protocol Mapper configuré)
        // Keycloak user attributes peuvent être rétournés comme tableau ou string
        let rawInstitutionId = tokenParsed?.institution_id;
        let rawInstitutionNom = tokenParsed?.institution_nom;

        // Normalise : si tableau, prend le premier élément
        let institutionId = Array.isArray(rawInstitutionId) ? rawInstitutionId[0] : rawInstitutionId;
        let institutionNom = Array.isArray(rawInstitutionNom) ? rawInstitutionNom[0] : rawInstitutionNom;

        // Fallback : si institution_id absent du token, chercher via le username
        if (!institutionId) {
          console.warn('institution_id absent du JWT, tentative de récupération via API...');
          try {
            const username = tokenParsed?.preferred_username;
            if (username) {
              // Le format username est : sigle.admin, sigle.agent, sigle.valid
              // Extraire le préfixe institution (le sigle en minuscules)
              const parts = username.split('.');
              if (parts.length >= 2) {
                const sigle = parts[0].toUpperCase();
                // Essayer d'abord par le champ 'code'
                try {
                  const res = await institutionApi.findByCode(sigle);
                  if (res.data) {
                    institutionId = res.data.id;
                    institutionNom = res.data.nom;
                    console.log('institution_id récupéré via API (code):', institutionId);
                  }
                } catch (_) {
                  // Si échec, essayer de rechercher dans la liste par sigle
                  try {
                    const listRes = await institutionApi.findAll({ search: sigle, size: 5 });
                    const found = (listRes.data?.content || []).find(
                      i => i.sigle?.toUpperCase() === sigle || i.code?.toUpperCase() === sigle
                    );
                    if (found) {
                      institutionId = found.id;
                      institutionNom = found.nom;
                      console.log('institution_id récupéré via recherche liste:', institutionId);
                    }
                  } catch (e2) {
                    console.warn('Impossible de récupérer institution via liste:', e2.message);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Impossible de récupérer institution via API:', e.message);
          }
        }

        setUser({
          id: tokenParsed?.sub,
          username: tokenParsed?.preferred_username,
          email: tokenParsed?.email,
          firstName: tokenParsed?.given_name,
          lastName: tokenParsed?.family_name,
          name: tokenParsed?.name || tokenParsed?.preferred_username,
          institutionId: institutionId,
          institutionNom: institutionNom,
        });
        setRoles(normalizedRoles);

        // Refresh token automatique
        setInterval(() => {
          keycloak.updateToken(60).then((refreshed) => {
            if (refreshed) {
              setToken(keycloak.token);
            }
          }).catch(() => {
            keycloak.logout();
          });
        }, 30000);
      }
      setIsLoading(false);
    }).catch((err) => {
      console.error('Keycloak init failed:', err);
      setAuthError(err || 'Impossible de se connecter au serveur d\'authentification');
      setIsLoading(false);
    });
  }, []);

  const logout = () => keycloak.logout();

  const hasRole = (role) => roles.includes(role);

  const hasAnyRole = (...requiredRoles) =>
    requiredRoles.some(role => roles.includes(role));

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, token, roles,
      isLoading, authError, logout, hasRole, hasAnyRole, keycloak
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
