package com.microlinks.operation.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.hibernate.Session;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Aspect Spring AOP activant automatiquement le filtre Hibernate multi-tenant
 * sur la session JPA active lors de chaque appel de repository.
 */
@Aspect
@Component
public class TenantAspect {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Intercepte l'exécution de toute méthode sur les dépôts Spring Data JPA
     * pour injecter le paramètre du filtre Hibernate 'tenantFilter'.
     */
    @Before("execution(* org.springframework.data.repository.Repository+.*(..))")
    public void beforeRepositoryMethod() {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (tenantId != null) {
            boolean isPlatformAdmin = false;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
                if (realmAccess != null && realmAccess.containsKey("roles")) {
                    @SuppressWarnings("unchecked")
                    List<String> roles = (List<String>) realmAccess.get("roles");
                    isPlatformAdmin = roles.contains("ADMIN_PLATEFORME");
                }
            }

            // Si l'utilisateur n'est pas administrateur général de la plateforme, on filtre ses requêtes
            if (!isPlatformAdmin) {
                Session session = entityManager.unwrap(Session.class);
                session.enableFilter("tenantFilter")
                       .setParameter("tenantId", tenantId.toString());
            }
        }
    }
}
