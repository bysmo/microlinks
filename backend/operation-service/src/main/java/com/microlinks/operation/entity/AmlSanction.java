package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "aml_sanctions", indexes = {
    @Index(name = "idx_aml_nom", columnList = "nom")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmlSanction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String nom;

    @Column(nullable = false, length = 50)
    private String category; // SANCTION, PPE, UN, OFAC, etc.

    @Column(nullable = false, length = 100)
    private String source; // WEB, EXCEL

    @Column(length = 100)
    private String pays;

    @Column(name = "date_ajout", nullable = false)
    private LocalDateTime dateAjout;

    @Column(columnDefinition = "TEXT")
    private String details;
}
