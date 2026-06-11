package com.microlinks.institution.dto;

import com.microlinks.institution.entity.StatutEntite;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CompteCorrespondanceDto {
    private UUID id;
    private String numeroCompte;
    private String libelle;
    private UUID banqueDomiciliaireId;
    private String banqueDomiciliaireNom;
    private String banqueDomiciliaireCode;
    private String typeCompte;
    private StatutEntite statut;
    private LocalDateTime createdAt;
}
