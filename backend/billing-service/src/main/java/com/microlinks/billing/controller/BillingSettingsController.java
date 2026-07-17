package com.microlinks.billing.controller;

import com.microlinks.billing.dto.BillingSettingsRequest;
import com.microlinks.billing.entity.BillingSettings;
import com.microlinks.billing.service.SettingsService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/billing-settings")
@RequiredArgsConstructor
@Tag(name = "Paramètres facturation")
@SecurityRequirement(name = "bearerAuth")
public class BillingSettingsController {

    private final SettingsService settingsService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<BillingSettings> get() {
        return ResponseEntity.ok(settingsService.get());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN_PLATEFORME')")
    public ResponseEntity<BillingSettings> update(@Valid @RequestBody BillingSettingsRequest req,
                                                  @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(settingsService.update(req, jwt.getSubject()));
    }
}
