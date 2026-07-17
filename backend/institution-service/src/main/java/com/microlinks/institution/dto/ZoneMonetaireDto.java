package com.microlinks.institution.dto;

import com.microlinks.institution.entity.StatutEntite;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ZoneMonetaireDto {
    private UUID id;
    private String code;
    private String libelle;
    private String devise;
    private String description;
    private StatutEntite statut;
    private LocalDateTime createdAt;
}
