package com.microlinks.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/**
 * Compteur d'opérations facturables par institution et par période (mois).
 * Alimenté par la consommation des événements opération (RabbitMQ).
 */
@Entity
@Table(name = "operation_usage",
       uniqueConstraints = @UniqueConstraint(columnNames = {"institution_id", "periode"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperationUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    /** Période au format YYYY-MM. */
    @Column(nullable = false, length = 7)
    private String periode;

    @Column(name = "nombre_operations", nullable = false)
    private Long nombreOperations;
}
