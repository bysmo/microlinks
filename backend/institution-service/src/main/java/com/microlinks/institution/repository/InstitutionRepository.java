package com.microlinks.institution.repository;

import com.microlinks.institution.entity.Institution;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.entity.StatutEntite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InstitutionRepository extends JpaRepository<Institution, UUID> {

    Optional<Institution> findByCode(String code);

    boolean existsByCode(String code);

    Page<Institution> findByStatut(StatutEntite statut, Pageable pageable);

    Page<Institution> findByTypeInstitution(TypeInstitution type, Pageable pageable);

    @Query("""
        SELECT i FROM Institution i
        WHERE (cast(:search as string) IS NULL OR LOWER(i.nom) LIKE LOWER(CONCAT('%', cast(:search as string), '%'))
               OR LOWER(i.code) LIKE LOWER(CONCAT('%', cast(:search as string), '%'))
               OR LOWER(i.sigle) LIKE LOWER(CONCAT('%', cast(:search as string), '%')))
        AND (cast(:type as string) IS NULL OR i.typeInstitution = :type)
        AND (cast(:statut as string) IS NULL OR i.statut = :statut)
        AND (cast(:zoneId as uuid) IS NULL OR i.zoneMonetaire.id = :zoneId)
        AND (cast(:pays as string) IS NULL OR i.pays = :pays)
    """)
    Page<Institution> findWithFilters(
            @Param("search") String search,
            @Param("type") TypeInstitution type,
            @Param("statut") StatutEntite statut,
            @Param("zoneId") UUID zoneId,
            @Param("pays") String pays,
            Pageable pageable);

    long countByTypeInstitution(TypeInstitution type);

    long countByStatut(StatutEntite statut);

    long countByPaysAndTypeInstitutionIn(String pays, java.util.Collection<TypeInstitution> types);
}
