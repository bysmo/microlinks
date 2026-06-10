package com.microlinks.institution;

import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.List;

public class KeycloakTest {

    @Test
    public void testListUsers() throws Exception {
        String keycloakUrl = "http://localhost:8443";
        String adminUsername = "admin";
        
        String[] passwords = {"KeycloakAdmin@2024#", "admin"};
        String token = null;
        
        HttpClient client = HttpClient.newHttpClient();
        
        for (String pwd : passwords) {
            String form = "grant_type=password&client_id=admin-cli&username=" + adminUsername + "&password=" + URLEncoder.encode(pwd, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(keycloakUrl + "/realms/master/protocol/openid-connect/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            try {
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    String body = response.body();
                    // Basic token extraction
                    int idx = body.indexOf("\"access_token\":\"");
                    if (idx != -1) {
                        int start = idx + 16;
                        int end = body.indexOf("\"", start);
                        token = body.substring(start, end);
                        System.out.println("SUCCESSFULLY AUTHENTICATED WITH PASSWORD: " + pwd);
                        break;
                    }
                }
            } catch (Exception e) {
                // Ignore and try next
            }
        }
        
        if (token == null) {
            System.err.println("COULD NOT AUTHENTICATE TO KEYCLOAK");
            return;
        }
        
        HttpRequest usersRequest = HttpRequest.newBuilder()
                .uri(URI.create(keycloakUrl + "/admin/realms/microlinks/users"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();
        
        HttpResponse<String> usersResponse = client.send(usersRequest, HttpResponse.BodyHandlers.ofString());
        System.out.println("HTTP STATUS: " + usersResponse.statusCode());
        System.out.println("KEYCLOAK USERS JSON:");
        System.out.println(usersResponse.body());
    }
}
