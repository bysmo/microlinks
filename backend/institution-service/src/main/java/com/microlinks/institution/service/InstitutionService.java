package com.microlinks.institution.service;

import com.microlinks.institution.dto.*;
import com.microlinks.institution.entity.*;
import com.microlinks.institution.exception.BusinessException;
import com.microlinks.institution.exception.ResourceNotFoundException;
import com.microlinks.institution.repository.InstitutionRepository;
import com.microlinks.institution.repository.ZoneMonetaireRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class InstitutionService {

    private final InstitutionRepository institutionRepository;
    private final ZoneMonetaireRepository zoneMonetaireRepository;
    private final KeycloakProvisioningService keycloakProvisioningService;

    public PagedResponse<InstitutionDto> findAll(
            String search, TypeInstitution type, StatutEntite statut,
            UUID zoneId, String pays, int page, int size, String sortBy, String sortDir) {

        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Institution> institutions = institutionRepository
                .findWithFilters(search, type, statut, zoneId, pays, pageable);

        return PagedResponse.of(
                institutions.getContent().stream().map(this::toDto).toList(),
                page, size, institutions.getTotalElements()
        );
    }

    @Cacheable(value = "institutions", key = "#id")
    public InstitutionDto findById(UUID id) {
        return toDto(findInstitutionById(id));
    }

    public InstitutionDto findByCode(String code) {
        return institutionRepository.findByCode(code)
                .map(this::toDto)
                .orElseThrow(() -> new ResourceNotFoundException("Institution avec le code " + code + " non trouvée"));
    }

    @Transactional
    @CacheEvict(value = "institutions", allEntries = true)
    public InstitutionDto create(InstitutionCreateRequest request, String currentUser) {
        if (institutionRepository.existsByCode(request.getCode())) {
            throw new BusinessException("Une institution avec le code '" + request.getCode() + "' existe déjà");
        }

        ZoneMonetaire zone = zoneMonetaireRepository.findById(request.getZoneMonetaireId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone monétaire non trouvée"));

        // VALIDATION REGLEMENTAIRE SPECIFIQUE
        String codeMicrolink = null;
        if (request.getTypeInstitution() == TypeInstitution.BANQUE) {
            if (request.getCodeBanqueRegional() == null || request.getCodeBanqueRegional().isBlank()) {
                throw new BusinessException("Le code banque régional est obligatoire pour une banque");
            }
            if (request.getCodeBic() == null || request.getCodeBic().isBlank()) {
                throw new BusinessException("Le code BIC/SWIFT est obligatoire pour une banque");
            }
            if (request.getCodeParticipantRtgs() == null || request.getCodeParticipantRtgs().isBlank()) {
                throw new BusinessException("Le code participant RTGS est obligatoire pour une banque");
            }
        } else {
            // Générer le code microlink automatiquement au format ML-PAYS-INCREMENT (ex: ML-SN-0001)
            long count = institutionRepository.countByPaysAndTypeInstitutionIn(
                    request.getPays().toUpperCase(),
                    java.util.List.of(TypeInstitution.MICRO_FINANCE, TypeInstitution.MESO_FINANCE)
            );
            codeMicrolink = String.format("ML-%s-%04d", request.getPays().toUpperCase(), count + 1);
        }

        Institution institution = Institution.builder()
                .code(request.getCode().toUpperCase())
                .nom(request.getNom())
                .sigle(request.getSigle())
                .typeInstitution(request.getTypeInstitution())
                .zoneMonetaire(zone)
                .pays(request.getPays().toUpperCase())
                .adresse(request.getAdresse())
                .telephone(request.getTelephone())
                .email(request.getEmail())
                .siteWeb(request.getSiteWeb())
                .dateAdhesion(request.getDateAdhesion())
                .codeBanqueRegional(request.getCodeBanqueRegional())
                .codeBic(request.getCodeBic())
                .codeParticipantRtgs(request.getCodeParticipantRtgs())
                .codeMicrolink(codeMicrolink)
                .statut(StatutEntite.INACTIF) // Commence en attente de validation
                .createdBy(currentUser)
                .updatedBy(currentUser)
                .build();

        if (request.getBanqueCorrespondanteId() != null) {
            Institution banque = findInstitutionById(request.getBanqueCorrespondanteId());
            if (banque.getTypeInstitution() != TypeInstitution.BANQUE) {
                throw new BusinessException("La banque correspondante doit être de type BANQUE");
            }
            institution.setBanqueCorrespondante(banque);
        }

        Institution saved = institutionRepository.save(institution);
        log.info("Institution créée : {} par {}", saved.getCode(), currentUser);
        return toDto(saved);
    }

    @Transactional
    @CacheEvict(value = "institutions", key = "#id")
    public InstitutionDto update(UUID id, InstitutionCreateRequest request, String currentUser) {
        Institution institution = findInstitutionById(id);

        // Vérifier unicité du code si modifié
        if (!institution.getCode().equals(request.getCode()) &&
                institutionRepository.existsByCode(request.getCode())) {
            throw new BusinessException("Code déjà utilisé par une autre institution");
        }

        ZoneMonetaire zone = zoneMonetaireRepository.findById(request.getZoneMonetaireId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone monétaire non trouvée"));

        // VALIDATION REGLEMENTAIRE SPECIFIQUE
        if (request.getTypeInstitution() == TypeInstitution.BANQUE) {
            if (request.getCodeBanqueRegional() == null || request.getCodeBanqueRegional().isBlank()) {
                throw new BusinessException("Le code banque régional est obligatoire pour une banque");
            }
            if (request.getCodeBic() == null || request.getCodeBic().isBlank()) {
                throw new BusinessException("Le code BIC/SWIFT est obligatoire pour une banque");
            }
            if (request.getCodeParticipantRtgs() == null || request.getCodeParticipantRtgs().isBlank()) {
                throw new BusinessException("Le code participant RTGS est obligatoire pour une banque");
            }
            institution.setCodeMicrolink(null); // Pas de code microlink pour les banques
        } else {
            // Si le type a été changé de banque à SFD, générer le code microlink si non existant
            if (institution.getCodeMicrolink() == null) {
                long count = institutionRepository.countByPaysAndTypeInstitutionIn(
                        request.getPays().toUpperCase(),
                        java.util.List.of(TypeInstitution.MICRO_FINANCE, TypeInstitution.MESO_FINANCE)
                );
                institution.setCodeMicrolink(String.format("ML-%s-%04d", request.getPays().toUpperCase(), count + 1));
            }
        }

        institution.setCode(request.getCode().toUpperCase());
        institution.setNom(request.getNom());
        institution.setSigle(request.getSigle());
        institution.setTypeInstitution(request.getTypeInstitution());
        institution.setZoneMonetaire(zone);
        institution.setPays(request.getPays().toUpperCase());
        institution.setAdresse(request.getAdresse());
        institution.setTelephone(request.getTelephone());
        institution.setEmail(request.getEmail());
        institution.setSiteWeb(request.getSiteWeb());
        institution.setDateAdhesion(request.getDateAdhesion());
        institution.setCodeBanqueRegional(request.getCodeBanqueRegional());
        institution.setCodeBic(request.getCodeBic());
        institution.setCodeParticipantRtgs(request.getCodeParticipantRtgs());
        institution.setUpdatedBy(currentUser);

        if (request.getBanqueCorrespondanteId() != null) {
            Institution banque = findInstitutionById(request.getBanqueCorrespondanteId());
            institution.setBanqueCorrespondante(banque);
        } else {
            institution.setBanqueCorrespondante(null);
        }

        return toDto(institutionRepository.save(institution));
    }

    @Transactional
    @CacheEvict(value = "institutions", key = "#id")
    public void changerStatut(UUID id, StatutEntite nouveauStatut, String currentUser) {
        Institution institution = findInstitutionById(id);
        
        // Si le statut change vers ACTIF, provisionner les utilisateurs Keycloak
        if (nouveauStatut == StatutEntite.ACTIF && institution.getStatut() != StatutEntite.ACTIF) {
            keycloakProvisioningService.provisionUsersForInstitution(institution);
        }

        institution.setStatut(nouveauStatut);
        institution.setUpdatedBy(currentUser);
        institutionRepository.save(institution);
        log.info("Statut institution {} changé à {} par {}", institution.getCode(), nouveauStatut, currentUser);
    }

    public DashboardStats getStats() {
        long totalInstitutions = institutionRepository.count();
        long banques = institutionRepository.countByTypeInstitution(TypeInstitution.BANQUE);
        long microFinances = institutionRepository.countByTypeInstitution(TypeInstitution.MICRO_FINANCE);
        long mesoFinances = institutionRepository.countByTypeInstitution(TypeInstitution.MESO_FINANCE);
        long actives = institutionRepository.countByStatut(StatutEntite.ACTIF);

        return new DashboardStats(totalInstitutions, banques, microFinances, mesoFinances, actives);
    }

    // ===================== Mappers =====================

    private InstitutionDto toDto(Institution i) {
        InstitutionDto dto = new InstitutionDto();
        dto.setId(i.getId());
        dto.setCode(i.getCode());
        dto.setNom(i.getNom());
        dto.setSigle(i.getSigle());
        dto.setTypeInstitution(i.getTypeInstitution());
        dto.setZoneMonetaire(toZoneDto(i.getZoneMonetaire()));
        dto.setPays(i.getPays());
        dto.setAdresse(i.getAdresse());
        dto.setTelephone(i.getTelephone());
        dto.setEmail(i.getEmail());
        dto.setSiteWeb(i.getSiteWeb());
        dto.setLogoUrl(i.getLogoUrl());
        dto.setStatut(i.getStatut());
        dto.setDateAdhesion(i.getDateAdhesion());
        dto.setCreatedAt(i.getCreatedAt());
        dto.setUpdatedAt(i.getUpdatedAt());
        dto.setCodeBanqueRegional(i.getCodeBanqueRegional());
        dto.setCodeBic(i.getCodeBic());
        dto.setCodeParticipantRtgs(i.getCodeParticipantRtgs());
        dto.setCodeMicrolink(i.getCodeMicrolink());
        if (i.getBanqueCorrespondante() != null) {
            dto.setBanqueCorrespondanteId(i.getBanqueCorrespondante().getId());
            dto.setBanqueCorrespondanteNom(i.getBanqueCorrespondante().getNom());
        }
        if (i.getAgences() != null) {
            dto.setNombreAgences(i.getAgences().size());
        }
        return dto;
    }

    private ZoneMonetaireDto toZoneDto(ZoneMonetaire z) {
        if (z == null) return null;
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

    private Institution findInstitutionById(UUID id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution avec l'id " + id + " non trouvée"));
    }

    public record DashboardStats(long total, long banques, long microFinances, long mesoFinances, long actives) {}
}
