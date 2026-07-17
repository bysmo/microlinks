package com.microlinks.operation.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();
            Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
            if (realmAccess != null && realmAccess.containsKey("roles")) {
                @SuppressWarnings("unchecked")
                List<String> roles = (List<String>) realmAccess.get("roles");
                for (String role : roles) {
                    // Ajouter le rôle Keycloak brut
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    // Mapper vers les rôles applicatifs standards
                    String mapped = mapKeycloakRole(role);
                    if (mapped != null) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + mapped));
                    }
                }
            }
            return authorities;
        });
        return converter;
    }

    /**
     * Normalise les rôles Keycloak des institutions (BANK_ADMIN, MESO_AGENT, etc.)
     * vers les rôles applicatifs utilisés dans les @PreAuthorize.
     */
    private String mapKeycloakRole(String keycloakRole) {
        return switch (keycloakRole) {
            case "BANK_ADMIN", "MESO_ADMIN"     -> "ADMIN_INSTITUTION";
            case "BANK_AGENT", "MESO_AGENT"     -> "AGENT_SAISIE";
            case "BANK_VALID", "MESO_VALID"     -> "AGENT_VALIDATION";
            default -> null;
        };
    }
}
