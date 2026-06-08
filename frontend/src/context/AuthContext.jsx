import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import keycloak from '../keycloak';

const AuthContext = createContext(null);

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
    }).then((authenticated) => {
      setIsAuthenticated(authenticated);
      if (authenticated) {
        setToken(keycloak.token);
        const tokenParsed = keycloak.tokenParsed;
        const realmRoles = tokenParsed?.realm_access?.roles || [];

        setUser({
          id: tokenParsed?.sub,
          username: tokenParsed?.preferred_username,
          email: tokenParsed?.email,
          firstName: tokenParsed?.given_name,
          lastName: tokenParsed?.family_name,
          name: tokenParsed?.name || tokenParsed?.preferred_username,
          institutionId: tokenParsed?.institution_id,
          institutionNom: tokenParsed?.institution_nom,
        });
        setRoles(realmRoles);

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

