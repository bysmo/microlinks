package com.microlinks.billing.repository;

import com.microlinks.billing.entity.Facture;
import com.microlinks.billing.entity.StatutFacture;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FactureRepository extends JpaRepository<Facture, UUID> {
    List<Facture> findByInstitutionIdOrderByCreatedAtDesc(UUID institutionId);
    List<Facture> findAllByOrderByCreatedAtDesc();
    boolean existsByInstitutionIdAndPeriode(UUID institutionId, String periode);
    List<Facture> findByStatut(StatutFacture statut);
    List<Facture> findByStatutInAndDateLimiteDesactivationBefore(List<StatutFacture> statuts, LocalDate date);
    List<Facture> findByStatutInAndDateEcheanceBefore(List<StatutFacture> statuts, LocalDate date);
}
