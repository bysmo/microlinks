package com.microlinks.operation.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.microlinks.operation.config.SecurityConfig;
import com.microlinks.operation.dto.OperationCreateRequest;
import com.microlinks.operation.dto.OperationDto;
import com.microlinks.operation.entity.StatutOperation;
import com.microlinks.operation.entity.TypeOperation;
import com.microlinks.operation.repository.HistoriqueStatutRepository;
import com.microlinks.operation.service.AmlService;
import com.microlinks.operation.service.OperationService;
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

@WebMvcTest(OperationController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration"
})
public class OperationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OperationService operationService;

    @MockBean
    private HistoriqueStatutRepository historiqueRepository;

    @MockBean
    private AmlService amlService;

    @MockBean
    private JwtDecoder jwtDecoder;

    private UUID operationId;
    private OperationDto operationDto;

    @BeforeEach
    public void setUp() {
        operationId = UUID.randomUUID();
        operationDto = OperationDto.builder()
                .id(operationId)
                .referenceUnique("ML-VIR-20260616-000001")
                .typeOperation(TypeOperation.VIREMENT)
                .statut(StatutOperation.BROUILLON)
                .montant(new BigDecimal("150000"))
                .build();
    }

    @Test
    public void testFindById_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/operations/" + operationId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testFindById_WithAuth_Success() throws Exception {
        when(operationService.findById(operationId)).thenReturn(operationDto);

        mockMvc.perform(get("/api/v1/operations/" + operationId)
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.referenceUnique").value("ML-VIR-20260616-000001"))
                .andExpect(jsonPath("$.montant").value(150000));
    }

    @Test
    public void testCreate_WithAgentRole_Success() throws Exception {
        OperationCreateRequest req = new OperationCreateRequest();
        req.setTypeOperation(TypeOperation.VIREMENT);
        req.setMontant(new BigDecimal("150000"));
        req.setDevise("XOF");
        req.setInstitutionEmettriceId(UUID.randomUUID());
        req.setNomInstitutionEmettrice("SGB");
        req.setCompteDonneurOrdre("123456789");
        req.setNomDonneurOrdre("Jean Dupont");
        req.setInstitutionBeneficiaireId(UUID.randomUUID());
        req.setNomInstitutionBeneficiaire("BOA");
        req.setCompteBeneficiaire("987654321");
        req.setNomBeneficiaire("Marie Konan");

        when(operationService.create(any(), any(), any(), any())).thenReturn(operationDto);

        mockMvc.perform(post("/api/v1/operations")
                        .with(jwt()
                                .authorities(new SimpleGrantedAuthority("ROLE_AGENT_SAISIE"))
                                .jwt(j -> j
                                        .claim("institution_id", UUID.randomUUID().toString())
                                        .claim("name", "John Agent")
                                )
                        )
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceUnique").value("ML-VIR-20260616-000001"));
    }
}
