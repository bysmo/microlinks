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

    Optional<Operation> findFirstByOrderByCreatedAtDesc();

    @Query("""
        SELECT o FROM Operation o
        WHERE (cast(:search as string) IS NULL OR
               LOWER(o.referenceUnique) LIKE LOWER(CONCAT('%', cast(:search as string), '%')) OR
               LOWER(o.nomDonneurOrdre) LIKE LOWER(CONCAT('%', cast(:search as string), '%')) OR
               LOWER(o.nomBeneficiaire) LIKE LOWER(CONCAT('%', cast(:search as string), '%')) OR
               LOWER(o.nomInstitutionEmettrice) LIKE LOWER(CONCAT('%', cast(:search as string), '%')) OR
               LOWER(o.nomInstitutionBeneficiaire) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))
        AND (cast(:type as string) IS NULL OR o.typeOperation = :type)
        AND (cast(:statut as string) IS NULL OR o.statut = :statut)
        AND (cast(:emettriceId as uuid) IS NULL OR o.institutionEmettriceId = :emettriceId)
        AND (cast(:beneficiaireId as uuid) IS NULL OR o.institutionBeneficiaireId = :beneficiaireId)
        AND (cast(:institutionId as uuid) IS NULL OR o.institutionEmettriceId = :institutionId
             OR o.institutionBeneficiaireId = :institutionId
             OR o.banqueCorrespondanteEmettriceId = :institutionId
             OR o.banqueCorrespondanteReceptriceId = :institutionId)
        AND (cast(:banqueEmettriceId as uuid) IS NULL OR o.banqueCorrespondanteEmettriceId = :banqueEmettriceId)
        AND (cast(:banqueReceptriceId as uuid) IS NULL OR o.banqueCorrespondanteReceptriceId = :banqueReceptriceId)
        AND (cast(:dateDebut as date) IS NULL OR o.dateOperation >= :dateDebut)
        AND (cast(:dateFin as date) IS NULL OR o.dateOperation <= :dateFin)
        AND (cast(:devise as string) IS NULL OR o.devise = :devise)
        AND (:excludeTerminal IS NULL OR :excludeTerminal = false OR o.statut NOT IN (
            com.microlinks.operation.entity.StatutOperation.COMPTABILISE,
            com.microlinks.operation.entity.StatutOperation.ANNULE,
            com.microlinks.operation.entity.StatutOperation.REJETE,
            com.microlinks.operation.entity.StatutOperation.REJETE_EMETTEUR,
            com.microlinks.operation.entity.StatutOperation.REJETE_BANQUE_EMETTRICE,
            com.microlinks.operation.entity.StatutOperation.REJETE_BANQUE_RECEPTRICE,
            com.microlinks.operation.entity.StatutOperation.REJETE_AML
        ))
        AND (:onlyTerminal IS NULL OR :onlyTerminal = false OR o.statut IN (
            com.microlinks.operation.entity.StatutOperation.COMPTABILISE,
            com.microlinks.operation.entity.StatutOperation.ANNULE,
            com.microlinks.operation.entity.StatutOperation.REJETE,
            com.microlinks.operation.entity.StatutOperation.REJETE_EMETTEUR,
            com.microlinks.operation.entity.StatutOperation.REJETE_BANQUE_EMETTRICE,
            com.microlinks.operation.entity.StatutOperation.REJETE_BANQUE_RECEPTRICE,
            com.microlinks.operation.entity.StatutOperation.REJETE_AML
        ))
    """)
    Page<Operation> findWithFilters(
        @Param("search") String search,
        @Param("type") TypeOperation type,
        @Param("statut") StatutOperation statut,
        @Param("emettriceId") UUID emettriceId,
        @Param("beneficiaireId") UUID beneficiaireId,
        @Param("institutionId") UUID institutionId,
        @Param("banqueEmettriceId") UUID banqueEmettriceId,
        @Param("banqueReceptriceId") UUID banqueReceptriceId,
        @Param("dateDebut") LocalDate dateDebut,
        @Param("dateFin") LocalDate dateFin,
        @Param("devise") String devise,
        @Param("excludeTerminal") Boolean excludeTerminal,
        @Param("onlyTerminal") Boolean onlyTerminal,
        Pageable pageable
    );

    @Query("""
        SELECT COUNT(o) FROM Operation o
        WHERE (cast(:institutionId as uuid) IS NULL OR o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId)
    """)
    long countByInstitution(@Param("institutionId") UUID institutionId);

    @Query("""
        SELECT COUNT(o) FROM Operation o
        WHERE (cast(:institutionId as uuid) IS NULL OR o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId)
        AND o.statut IN :statuts
    """)
    long countByInstitutionAndStatuts(@Param("institutionId") UUID institutionId,
                                       @Param("statuts") List<StatutOperation> statuts);

    @Query("""
        SELECT COUNT(o) FROM Operation o
        WHERE (cast(:institutionId as uuid) IS NULL OR o.institutionEmettriceId = :institutionId OR o.institutionBeneficiaireId = :institutionId)
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
