package com.microlinks.institution.service;

import com.microlinks.institution.dto.CompteCorrespondanceDto;
import com.microlinks.institution.dto.CompteCorrespondanceRequest;
import com.microlinks.institution.entity.CompteCorrespondance;
import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.exception.BusinessException;
import com.microlinks.institution.exception.ResourceNotFoundException;
import com.microlinks.institution.repository.CompteCorrespondanceRepository;
import com.microlinks.institution.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CompteCorrespondanceService {

    private final CompteCorrespondanceRepository compteRepo;
    private final InstitutionRepository institutionRepo;

    public List<CompteCorrespondanceDto> findByInstitution(UUID institutionId) {
        return compteRepo.findByInstitutionProprietaireId(institutionId)
                .stream().map(this::toDto).toList();
    }

    @Transactional
    @CacheEvict(value = "institutions", key = "#institutionId")
    public CompteCorrespondanceDto create(UUID institutionId, CompteCorrespondanceRequest req) {
        Institution owner = findInst(institutionId);
        Institution banque = findInst(req.getBanqueDomiciliaireId());

        if (banque.getTypeInstitution() != TypeInstitution.BANQUE) {
            throw new BusinessException("La banque domiciliataire doit être de type BANQUE");
        }

        CompteCorrespondance cc = CompteCorrespondance.builder()
                .numeroCompte(req.getNumeroCompte())
                .libelle(req.getLibelle())
                .institutionProprietaire(owner)
                .banqueDomiciliataire(banque)
                .typeCompte(req.getTypeCompte() != null ? req.getTypeCompte() : "REGLEMENT")
                .statut(StatutEntite.ACTIF)
                .build();

        CompteCorrespondance saved = compteRepo.save(cc);
        log.info("Compte de règlement créé: {} pour institution {}", saved.getNumeroCompte(), institutionId);
        return toDto(saved);
    }

    @Transactional
    public CompteCorrespondanceDto update(UUID institutionId, UUID compteId, CompteCorrespondanceRequest req) {
        CompteCorrespondance cc = compteRepo.findById(compteId)
                .orElseThrow(() -> new ResourceNotFoundException("Compte introuvable: " + compteId));

        if (!cc.getInstitutionProprietaire().getId().equals(institutionId)) {
            throw new BusinessException("Ce compte n'appartient pas à cette institution");
        }

        Institution banque = findInst(req.getBanqueDomiciliaireId());
        if (banque.getTypeInstitution() != TypeInstitution.BANQUE) {
            throw new BusinessException("La banque domiciliataire doit être de type BANQUE");
        }

        cc.setNumeroCompte(req.getNumeroCompte());
        cc.setLibelle(req.getLibelle());
        cc.setBanqueDomiciliataire(banque);
        if (req.getTypeCompte() != null) cc.setTypeCompte(req.getTypeCompte());

        return toDto(compteRepo.save(cc));
    }

    @Transactional
    public void delete(UUID institutionId, UUID compteId) {
        CompteCorrespondance cc = compteRepo.findById(compteId)
                .orElseThrow(() -> new ResourceNotFoundException("Compte introuvable: " + compteId));

        if (!cc.getInstitutionProprietaire().getId().equals(institutionId)) {
            throw new BusinessException("Ce compte n'appartient pas à cette institution");
        }
        compteRepo.delete(cc);
        log.info("Compte de règlement {} supprimé pour institution {}", compteId, institutionId);
    }

    // ===== mapper =====

    private CompteCorrespondanceDto toDto(CompteCorrespondance cc) {
        CompteCorrespondanceDto dto = new CompteCorrespondanceDto();
        dto.setId(cc.getId());
        dto.setNumeroCompte(cc.getNumeroCompte());
        dto.setLibelle(cc.getLibelle());
        dto.setTypeCompte(cc.getTypeCompte());
        dto.setStatut(cc.getStatut());
        dto.setCreatedAt(cc.getCreatedAt());
        if (cc.getBanqueDomiciliataire() != null) {
            dto.setBanqueDomiciliaireId(cc.getBanqueDomiciliataire().getId());
            dto.setBanqueDomiciliaireNom(cc.getBanqueDomiciliataire().getNom());
            dto.setBanqueDomiciliaireCode(cc.getBanqueDomiciliataire().getCode());
        }
        return dto;
    }

    private Institution findInst(UUID id) {
        return institutionRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Institution introuvable: " + id));
    }
}
