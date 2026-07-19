package com.microlinks.institution.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserDto {
    private String id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private String role; // AGENT, VALID, ADMIN, LECTEUR
    private boolean enabled;
    private UUID institutionId;
    private String gender;
}
