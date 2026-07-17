package com.microlinks.institution.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;

@Data
public class UserCreateRequest {

    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    @Size(min = 3, max = 50, message = "Le nom d'utilisateur doit contenir entre 3 et 50 caractères")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Le nom d'utilisateur ne doit contenir que des lettres, chiffres, tirets, points ou underscores")
    private String username;

    @NotBlank(message = "L'adresse email est obligatoire")
    @Email(message = "Format d'adresse email invalide")
    private String email;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(max = 100, message = "Le prénom ne peut pas dépasser 100 caractères")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 100, message = "Le nom ne peut pas dépasser 100 caractères")
    private String lastName;

    @Pattern(regexp = "^$|^\\+?[0-9\\s\\-()]{7,20}$", message = "Format de téléphone invalide")
    private String phone;

    @NotBlank(message = "Le rôle (profil) est obligatoire")
    @Pattern(regexp = "^(?i)(AGENT|VALID)$", message = "Le rôle doit être soit AGENT soit VALID")
    private String role;

    @NotNull(message = "L'ID de l'institution est obligatoire")
    private UUID institutionId;
}
