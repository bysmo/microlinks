package com.microlinks.billing.service;

import com.microlinks.billing.dto.TarifRequest;
import com.microlinks.billing.entity.Tarif;
import com.microlinks.billing.repository.TarifRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TarifService {

    private final TarifRepository tarifRepository;

    public List<Tarif> findAll() {
        return tarifRepository.findAll();
    }

    public Tarif findById(UUID id) {
        return tarifRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Tarif introuvable: " + id));
    }

    public Tarif create(TarifRequest req, String user) {
        Tarif tarif = Tarif.builder()
                .code(req.getCode())
                .libelle(req.getLibelle())
                .description(req.getDescription())
                .modePaiement(req.getModePaiement())
                .montant(req.getMontant())
                .devise(req.getDevise())
                .actif(req.getActif() == null || req.getActif())
                .createdBy(user)
                .build();
        return tarifRepository.save(tarif);
    }

    public Tarif update(UUID id, TarifRequest req) {
        Tarif tarif = findById(id);
        tarif.setCode(req.getCode());
        tarif.setLibelle(req.getLibelle());
        tarif.setDescription(req.getDescription());
        tarif.setModePaiement(req.getModePaiement());
        tarif.setMontant(req.getMontant());
        tarif.setDevise(req.getDevise());
        if (req.getActif() != null) tarif.setActif(req.getActif());
        return tarifRepository.save(tarif);
    }

    public void delete(UUID id) {
        tarifRepository.deleteById(id);
    }
}
