import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8443',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'microlinks',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'microlinks-frontend',
});

export default keycloak;
