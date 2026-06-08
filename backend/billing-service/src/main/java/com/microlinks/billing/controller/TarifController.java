package com.microlinks.billing.controller;

import com.microlinks.billing.dto.TarifRequest;
import com.microlinks.billing.entity.Tarif;
import com.microlinks.billing.service.TarifService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tarifs")
@RequiredArgsConstructor
@Tag(name = "Tarifs", description = "Gestion des tarifs de facturation")
@SecurityRequirement(name = "bearerAuth")
public class TarifController {

    private final TarifService tarifService;

    @GetMapping
    public ResponseEntity<List<Tarif>> findAll() {
        return ResponseEntity.ok(tarifService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Tarif> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(tarifService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Tarif> create(@Valid @RequestBody TarifRequest req,
                                        @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tarifService.create(req, jwt.getSubject()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Tarif> update(@PathVariable UUID id, @Valid @RequestBody TarifRequest req) {
        return ResponseEntity.ok(tarifService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tarifService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
