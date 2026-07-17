package com.microlinks.institution;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class InstitutionServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(InstitutionServiceApplication.class, args);
    }
}
