package com.microlinks.operation.repository;

import com.microlinks.operation.entity.Operation;
import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.entity.TypeOperation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OperationRepository extends JpaRepository<Operation, UUID> {

    Optional<Operation> findByReferenceUnique(String reference);

    @Query("""
        SELECT o FROM Operation o
        WHERE (:search IS NULL OR
               LOWER(o.referenceUnique) LIKE LOWER(CONCAT('%',:search,'%')) OR
               LOWER(o.nomDonneurOrdre) LIKE LOWER(CONCAT('%',:search,'%')) OR
               LOWER(o.nomBeneficiaire) LIKE LOWER(CONCAT('%',:search,'%')))
        AND (:type IS NULL OR o.typeOperation = :type)
        AND (:statut IS NULL OR o.statut = :statut)
        AND (:emettriceId IS NULL OR o.institutionEmettriceId = :emettriceId)
        AND (:beneficiaireId IS NULL OR o.institutionBeneficiaireId = :beneficiaireId)
        AND (:dateDebut IS NULL OR o.dateOperation >= :dateDebut)
        AND (:dateFin IS NULL OR o.dateOperation <= :dateFin)
        AND (:devise IS NULL OR o.devise = :devise)
    """)
    Page<Operation> findWithFilters(
        @Param("search") String search,
        @Param("type") TypeOperation type,
        @Param("statut") StatutOperation statut,
        @Param("emettriceId") UUID emettriceId,
        @Param("beneficiaireId") UUID beneficiaireId,
        @Param("dateDebut") LocalDate dateDebut,
        @Param("dateFin") LocalDate dateFin,
        @Param("devise") String devise,
        Pageable pageable
    );

    @Query("""
        SELECT COUNT(o) FROM Operation o
        WHERE o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId
    """)
    long countByInstitution(@Param("institutionId") UUID institutionId);

    @Query("""
        SELECT COUNT(o) FROM Operation o
        WHERE (o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId)
        AND o.statut IN :statuts
    """)
    long countByInstitutionAndStatuts(@Param("institutionId") UUID institutionId,
                                       @Param("statuts") List<StatutOperation> statuts);

    @Query("""
        SELECT COUNT(o) FROM Operation o
        WHERE (o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId)
        AND o.statut = :statut
    """)
    long countByInstitutionAndStatut(@Param("institutionId") UUID institutionId,
                                      @Param("statut") StatutOperation statut);

    @Query("""
        SELECT o FROM Operation o
        WHERE (o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId)
        AND o.dateOperation BETWEEN :dateDebut AND :dateFin
        ORDER BY o.dateOperation ASC, o.referenceUnique ASC
    """)
    List<Operation> findForReleve(
        @Param("institutionId") UUID institutionId,
        @Param("dateDebut") LocalDate dateDebut,
        @Param("dateFin") LocalDate dateFin
    );
}
