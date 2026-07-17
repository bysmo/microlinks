package com.microlinks.operation.repository;

import com.microlinks.operation.entity.AmlSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AmlSourceRepository extends JpaRepository<AmlSource, UUID> {
    boolean existsByNomIgnoreCase(String nom);
}
