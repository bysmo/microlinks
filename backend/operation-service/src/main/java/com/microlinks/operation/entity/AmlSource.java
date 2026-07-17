package com.microlinks.operation.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "aml_sources")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AmlSource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(name = "lien_web", length = 255)
    private String lienWeb;

    @Column(name = "format_fichier", length = 20)
    private String formatFichier; // EXCEL, XML, JSON, CSV

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "date_derniere_sync")
    private LocalDateTime dateDerniereSync;
}
