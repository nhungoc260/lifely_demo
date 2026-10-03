package com.lifely.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    OpenAPI lifelyOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("LIFELY API")
                        .description("Emergency Blood Donor Coordination Platform. "
                                + "LIFELY is a coordination platform and does not provide medical diagnosis, "
                                + "treatment, transfusion decisions, or final donor eligibility decisions.")
                        .version("0.1.0"))
                .components(new Components().addSecuritySchemes(BEARER,
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}
