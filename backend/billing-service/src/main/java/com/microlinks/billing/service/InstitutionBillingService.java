package com.microlinks.billing.service;

import com.microlinks.billing.dto.InstitutionBillingRequest;
import com.microlinks.billing.entity.InstitutionBilling;
import com.microlinks.billing.repository.InstitutionBillingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InstitutionBillingService {

    private final InstitutionBillingRepository repository;

    public List<InstitutionBilling> findAll() {
        return repository.findAll();
    }

    public InstitutionBilling findByInstitution(UUID institutionId) {
        return repository.findByInstitutionId(institutionId).orElse(null);
    }

    public InstitutionBilling upsert(InstitutionBillingRequest req) {
        InstitutionBilling cfg = repository.findByInstitutionId(req.getInstitutionId())
                .orElseGet(() -> InstitutionBilling.builder()
                        .institutionId(req.getInstitutionId())
                        .build());
        cfg.setInstitutionNom(req.getInstitutionNom());
        cfg.setInstitutionEmail(req.getInstitutionEmail());
        cfg.setModePaiement(req.getModePaiement());
        cfg.setTarifId(req.getTarifId());
        cfg.setActif(req.getActif() == null || req.getActif());
        return repository.save(cfg);
    }
}
