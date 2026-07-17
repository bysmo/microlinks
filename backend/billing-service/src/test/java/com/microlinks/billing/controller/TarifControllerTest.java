package com.microlinks.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microlinks.billing.config.SecurityConfig;
import com.microlinks.billing.dto.TarifRequest;
import com.microlinks.billing.entity.ModePaiement;
import com.microlinks.billing.entity.Tarif;
import com.microlinks.billing.service.TarifService;
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
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TarifController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration"
})
public class TarifControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TarifService tarifService;

    @MockBean
    private JwtDecoder jwtDecoder;

    private UUID tarifId;
    private Tarif tarif;

    @BeforeEach
    public void setUp() {
        tarifId = UUID.randomUUID();
        tarif = Tarif.builder()
                .id(tarifId)
                .code("FORFAIT_STANDARD")
                .libelle("Forfait Standard")
                .modePaiement(ModePaiement.FORFAIT)
                .montant(new BigDecimal("50000"))
                .devise("XOF")
                .actif(true)
                .build();
    }

    @Test
    public void testFindAll_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/tarifs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testFindAll_WithAuth_Success() throws Exception {
        when(tarifService.findAll()).thenReturn(List.of(tarif));

        mockMvc.perform(get("/api/v1/tarifs")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("FORFAIT_STANDARD"))
                .andExpect(jsonPath("$[0].montant").value(50000));
    }

    @Test
    public void testCreate_WithAdminRole_Success() throws Exception {
        TarifRequest req = new TarifRequest();
        req.setCode("FORFAIT_STANDARD");
        req.setLibelle("Forfait Standard");
        req.setModePaiement(ModePaiement.FORFAIT);
        req.setMontant(new BigDecimal("50000"));
        req.setDevise("XOF");

        when(tarifService.create(any(), any())).thenReturn(tarif);

        mockMvc.perform(post("/api/v1/tarifs")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN_PLATEFORME")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("FORFAIT_STANDARD"));
    }
}
