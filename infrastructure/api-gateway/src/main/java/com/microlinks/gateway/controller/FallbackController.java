package com.microlinks.gateway.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;
import java.util.Map;

@RestController
public class FallbackController {

    @GetMapping("/fallback")
    public Mono<Map<String, Object>> fallback() {
        return Mono.just(Map.of(
            "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
            "message", "Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.",
            "code", "SERVICE_UNAVAILABLE"
        ));
    }
}
