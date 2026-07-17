package com.microlinks.operation.repository;

import com.microlinks.operation.entity.AmlSanction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AmlSanctionRepository extends JpaRepository<AmlSanction, UUID> {

    void deleteBySource(String source);

    @Query("SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END FROM AmlSanction s " +
           "WHERE LOWER(:nom) LIKE CONCAT('%', LOWER(s.nom), '%') " +
           "OR LOWER(s.nom) LIKE CONCAT('%', LOWER(:nom), '%')")
    boolean existsByNameMatch(@Param("nom") String nom);
}
