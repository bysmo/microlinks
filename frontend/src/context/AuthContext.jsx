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
  const [rawRoles, setRawRoles] = useState([]); // Rôles Keycloak bruts (BANK_AGENT, MESO_VALID, etc.)
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
        setRawRoles(realmRoles);

        console.log('KEYCLOAK TOKEN PARSED:', tokenParsed);

        // institution_id peut être dans le token (si Protocol Mapper configuré)
        // Keycloak user attributes peuvent être rétournés comme tableau ou string
        let rawInstitutionId = tokenParsed?.institution_id;
        let rawInstitutionNom = tokenParsed?.institution_nom;

        // Normalise : si tableau, prend le premier élément
        let institutionId = Array.isArray(rawInstitutionId) ? rawInstitutionId[0] : rawInstitutionId;
        let institutionNom = Array.isArray(rawInstitutionNom) ? rawInstitutionNom[0] : rawInstitutionNom;

        // Validation / Résolution de l'institutionId
        let resolvedInstitution = null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (institutionId) {
          if (uuidRegex.test(institutionId)) {
            // C'est un UUID, on vérifie s'il existe dans la base de données
            try {
              const res = await institutionApi.findById(institutionId);
              resolvedInstitution = res.data;
              console.log('institution_id (UUID) validé avec succès:', institutionId);
            } catch (e) {
              console.warn('L\'institution avec l\'UUID du token n\'existe pas dans la BD, tentative de résolution...', institutionId);
            }
          }
          
          if (!resolvedInstitution) {
            // Si pas trouvé ou si ce n'était pas un UUID, on essaye de chercher par le code/sigle
            try {
              const res = await institutionApi.findByCode(institutionId.toUpperCase());
              resolvedInstitution = res.data;
              console.log('institution_id résolu via code:', resolvedInstitution.id);
            } catch (e) {
              console.warn('Résolution de institutionId via code échouée:', e.message);
            }
          }
        }

        // Si toujours non résolu, on utilise le username comme fallback
        if (!resolvedInstitution) {
          console.warn('Tentative de récupération de l\'institution via le username...');
          try {
            const username = tokenParsed?.preferred_username;
            if (username) {
              const sigle = username.includes('@')
                ? username.split('@')[1].split('.')[0].toUpperCase()
                : username.split('.')[0].toUpperCase();

              if (sigle) {
                try {
                  const res = await institutionApi.findByCode(sigle);
                  resolvedInstitution = res.data;
                  console.log('institution récupérée via username (code):', resolvedInstitution.id);
                } catch (_) {
                  try {
                    const listRes = await institutionApi.findAll({ size: 100 });
                    const cleanSigle = sigle.toLowerCase().replace(/[^a-z0-9]/g, "");
                    const found = (listRes.data?.content || []).find(i => {
                      const normSigle = (i.sigle || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      const normCode = (i.code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                      return normSigle === cleanSigle || normCode === cleanSigle;
                    });
                    if (found) {
                      resolvedInstitution = found;
                      console.log('institution récupérée via username et recherche liste:', resolvedInstitution.id);
                    }
                  } catch (e2) {
                    console.warn('Impossible de récupérer institution via liste:', e2.message);
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Erreur lors du fallback username:', e.message);
          }
        }

        if (resolvedInstitution) {
          institutionId = resolvedInstitution.id;
          institutionNom = resolvedInstitution.nom;
        } else {
          console.error("Aucune institution correspondante n'a pu être trouvée dans la base de données.");
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

  const hasRole = (role) => roles.includes(role) || rawRoles.includes(role);

  const hasAnyRole = (...requiredRoles) =>
    requiredRoles.some(role => roles.includes(role) || rawRoles.includes(role));

  // Vérifie si l'user a EXACTEMENT un des rôles bruts Keycloak (BANK_AGENT, MESO_AGENT, BANK_VALID, MESO_VALID, etc.)
  const hasRawRole = (...requiredRoles) =>
    requiredRoles.some(role => rawRoles.includes(role));

  // Peut saisir des opérations : uniquement MESO_AGENT ou BANK_AGENT
  const canSaisirOperation = rawRoles.includes('MESO_AGENT') || rawRoles.includes('BANK_AGENT')
    || rawRoles.includes('MESO_ADMIN') || rawRoles.includes('BANK_ADMIN');

  // Peut valider des opérations : uniquement MESO_VALID ou BANK_VALID
  const canValiderOperation = rawRoles.includes('MESO_VALID') || rawRoles.includes('BANK_VALID')
    || rawRoles.includes('MESO_ADMIN') || rawRoles.includes('BANK_ADMIN');

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, token, roles, rawRoles,
      isLoading, authError, logout, hasRole, hasAnyRole, hasRawRole,
      canSaisirOperation, canValiderOperation, keycloak, setUser
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
