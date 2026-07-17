package com.microlinks.rapport.controller;

import com.microlinks.rapport.service.CAMT053ExportService;
import com.microlinks.rapport.service.ExcelExportService;
import com.microlinks.rapport.service.MT101Pain001ExportService;
import com.microlinks.rapport.service.MT940ExportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RapportController.class)
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/jwk"
})
public class RapportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ExcelExportService excelService;

    @MockBean
    private MT940ExportService mt940Service;

    @MockBean
    private CAMT053ExportService camt053Service;

    @MockBean
    private MT101Pain001ExportService mt101Pain001Service;

    @MockBean
    private WebClient.Builder webClientBuilder;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    public void testExportExcel_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/rapports/export/excel")
                        .param("dateDebut", "2026-06-01")
                        .param("dateFin", "2026-06-16"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testExportExcel_WithAuth_Success() throws Exception {
        byte[] mockBytes = "mock-excel-data".getBytes();
        when(excelService.exportOperationsExcel(any(), any(), any(), any())).thenReturn(mockBytes);

        // We bypass the WebClient call since we'll mock its response or mock the fetchOperations return indirectly.
        // Wait, in fetchOperations, it calls webClientBuilder.build().get().uri()...
        // Let's mock the WebClient call chain to return an empty list or mock it safely.
        WebClient mockWebClient = mock(WebClient.class);
        WebClient.RequestHeadersUriSpec mockUriSpec = mock(WebClient.RequestHeadersUriSpec.class);
        WebClient.RequestHeadersSpec mockHeadersSpec = mock(WebClient.RequestHeadersSpec.class);
        WebClient.ResponseSpec mockResponseSpec = mock(WebClient.ResponseSpec.class);

        when(webClientBuilder.build()).thenReturn(mockWebClient);
        when(mockWebClient.get()).thenReturn(mockUriSpec);
        when(mockUriSpec.uri(any(String.class))).thenReturn(mockHeadersSpec);
        when(mockHeadersSpec.header(any(), any())).thenReturn(mockHeadersSpec);
        when(mockHeadersSpec.retrieve()).thenReturn(mockResponseSpec);
        
        // We return a Mono that resolves to Map.of("content", Collections.emptyList())
        reactor.core.publisher.Mono<Map> mockMono = reactor.core.publisher.Mono.just(
                Collections.singletonMap("content", Collections.emptyList())
        );
        when(mockResponseSpec.bodyToMono(Map.class)).thenReturn((reactor.core.publisher.Mono) mockMono);

        mockMvc.perform(get("/api/v1/rapports/export/excel")
                        .param("dateDebut", "2026-06-01")
                        .param("dateFin", "2026-06-16")
                        .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(content().bytes(mockBytes));
    }
}
