package com.microlinks.operation.config;

import java.util.UUID;

/**
 * Contexte de stockage de l'identifiant du tenant (institution) courant.
 * Utilisé pour isoler les requêtes HTTP dans des contextes multi-tenant via ThreadLocal.
 */
public class TenantContext {

    private static final ThreadLocal<UUID> currentTenant = new ThreadLocal<>();

    /**
     * Définit l'identifiant du tenant pour le thread courant.
     *
     * @param tenantId UUID du tenant.
     */
    public static void setCurrentTenant(UUID tenantId) {
        currentTenant.set(tenantId);
    }

    /**
     * Récupère l'identifiant du tenant du thread courant.
     *
     * @return UUID du tenant actif, ou null si non défini.
     */
    public static UUID getCurrentTenant() {
        return currentTenant.get();
    }

    /**
     * Nettoie le contexte du thread courant pour éviter les fuites de mémoire.
     */
    public static void clear() {
        currentTenant.remove();
    }
}
