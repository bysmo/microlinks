package com.microlinks.institution.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserUpdateRequest {
    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;

    private String genre; // "M" ou "F" ou "HOMME" ou "FEMME"
    
    private String phone;
}
