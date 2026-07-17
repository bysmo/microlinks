package com.microlinks.institution.controller;

import com.microlinks.institution.dto.ZoneMonetaireDto;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.ZoneMonetaire;
import com.microlinks.institution.repository.ZoneMonetaireRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/zones-monetaires")
@RequiredArgsConstructor
@Tag(name = "Zones Monétaires", description = "Gestion des zones monétaires")
public class ZoneMonetaireController {

    private final ZoneMonetaireRepository zoneMonetaireRepository;

    @GetMapping
    @Operation(summary = "Lister toutes les zones monétaires actives")
    public ResponseEntity<List<ZoneMonetaireDto>> findAll() {
        List<ZoneMonetaireDto> zones = zoneMonetaireRepository
                .findByStatutOrderByLibelleAsc(StatutEntite.ACTIF)
                .stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(zones);
    }

    private ZoneMonetaireDto toDto(ZoneMonetaire z) {
        ZoneMonetaireDto dto = new ZoneMonetaireDto();
        dto.setId(z.getId());
        dto.setCode(z.getCode());
        dto.setLibelle(z.getLibelle());
        dto.setDevise(z.getDevise());
        dto.setDescription(z.getDescription());
        dto.setStatut(z.getStatut());
        dto.setCreatedAt(z.getCreatedAt());
        return dto;
    }
}
