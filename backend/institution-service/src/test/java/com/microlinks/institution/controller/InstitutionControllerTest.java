package com.microlinks.institution.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microlinks.institution.config.SecurityConfig;
import com.microlinks.institution.dto.InstitutionCreateRequest;
import com.microlinks.institution.dto.InstitutionDto;
import com.microlinks.institution.entity.StatutEntite;
import com.microlinks.institution.entity.TypeInstitution;
import com.microlinks.institution.service.InstitutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InstitutionController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration"
})
public class InstitutionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private InstitutionService institutionService;

    @MockBean
    private JwtDecoder jwtDecoder;

    private UUID institutionId;
    private InstitutionDto institutionDto;

    @BeforeEach
    public void setUp() {
        institutionId = UUID.randomUUID();
        institutionDto = new InstitutionDto();
        institutionDto.setId(institutionId);
        institutionDto.setCode("SGBS");
        institutionDto.setNom("Société Générale");
        institutionDto.setTypeInstitution(TypeInstitution.BANQUE);
        institutionDto.setStatut(StatutEntite.INACTIF);
    }

    @Test
    public void testFindById_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/institutions/" + institutionId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testFindById_WithAuth_Success() throws Exception {
        when(institutionService.findById(institutionId)).thenReturn(institutionDto);

        mockMvc.perform(get("/api/v1/institutions/" + institutionId)
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SGBS"))
                .andExpect(jsonPath("$.nom").value("Société Générale"));
    }

    @Test
    public void testCreate_WithAdminRole_Success() throws Exception {
        InstitutionCreateRequest req = new InstitutionCreateRequest();
        req.setCode("SGBS");
        req.setNom("Société Générale");
        req.setTypeInstitution(TypeInstitution.BANQUE);
        req.setZoneMonetaireId(UUID.randomUUID());
        req.setPays("SEN");

        when(institutionService.create(any(InstitutionCreateRequest.class), any())).thenReturn(institutionDto);

        mockMvc.perform(post("/api/v1/institutions")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN_PLATEFORME")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("SGBS"));
    }

    @Test
    public void testChangerStatut_WithAdminPlatformRole_Success() throws Exception {
        mockMvc.perform(patch("/api/v1/institutions/" + institutionId + "/statut")
                        .param("statut", "ACTIF")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN_PLATEFORME"))))
                .andExpect(status().isNoContent());

        verify(institutionService).changerStatut(eq(institutionId), eq(StatutEntite.ACTIF), any());
    }

    @Test
    public void testChangerStatut_WithoutAdminPlatformRole_Returns403() throws Exception {
        mockMvc.perform(patch("/api/v1/institutions/" + institutionId + "/statut")
                        .param("statut", "ACTIF")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_AGENT_SAISIE"))))
                .andExpect(status().isForbidden());
    }
}
