package com.microlinks.operation.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Filtre HTTP pour intercepter les requêtes authentifiées, extraire le
 * code de l'institution (Tenant ID) du token JWT et l'injecter dans le contexte local.
 */
@Component
@Slf4j
public class TenantFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
                String tenantIdStr = jwt.getClaimAsString("institution_id");
                if (tenantIdStr == null) {
                    List<String> instIds = jwt.getClaimAsStringList("institution_id");
                    if (instIds != null && !instIds.isEmpty()) {
                        tenantIdStr = instIds.get(0);
                    }
                }

                if (tenantIdStr != null && !tenantIdStr.isBlank()) {
                    try {
                        UUID tenantId = UUID.fromString(tenantIdStr);
                        TenantContext.setCurrentTenant(tenantId);
                        log.debug("TenantContext initialisé pour le thread courant : {}", tenantId);
                    } catch (IllegalArgumentException e) {
                        log.warn("ID de tenant invalide dans le token JWT : {}", tenantIdStr);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Erreur lors de la configuration du TenantContext", e);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Nettoyer impérativement le ThreadLocal pour éviter toute pollution
            TenantContext.clear();
            log.debug("TenantContext libéré pour le thread courant");
        }
    }
}
