package com.email.email_writer;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.Duration;
import java.util.Map;

@Service
public class EmailGeneratorService {

    private final WebClient webClient;
    private final String apiKey;
    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    public EmailGeneratorService(WebClient.Builder webClientBuilder,
                                 @Value("${gemini.api.url}") String baseUrl,
                                 @Value("${gemini.api.key}") String geminiApiKey) {
        this.webClient = webClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = geminiApiKey;
    }

    public String generateEmailReply(EmailRequest emailRequest) {

        // build prompt
        String prompt = buildPrompt(emailRequest);

        // build the request body as a real object graph instead of a hand-formatted
        // string, so special characters (quotes, newlines, %) in the email content
        // can't break the JSON. The Interactions API takes "input" as a plain string.
        Map<String, Object> requestBody = Map.of(
                "model", "gemini-3.6-flash",
                "input", prompt
        );

        try {
            String response = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1beta/interactions")
                            .build())
                    .header("x-goog-api-key", apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(jsonMapper.writeValueAsString(requestBody))
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            return extractResponseContent(response);

        } catch (WebClientResponseException e) {
            // surface Google's actual error instead of failing silently with a 500
            throw new RuntimeException(
                    "Gemini API call failed with status " + e.getStatusCode()
                            + ": " + e.getResponseBodyAsString(), e);
        }
    }

    private String extractResponseContent(String response) {
        JsonNode root = jsonMapper.readTree(response);

        // Interactions API response shape:
        // { "steps": [ { "type": "thought", ... }, { "type": "model_output", "content": [ { "type": "text", "text": "..." } ] } ] }
        // "steps[0]" is not guaranteed to be the answer - a "thought" step can come
        // first - so find the "model_output" step explicitly.
        JsonNode steps = root.path("steps");
        for (JsonNode step : steps) {
            if ("model_output".equals(step.path("type").asString(""))) {
                JsonNode content = step.path("content");
                for (JsonNode block : content) {
                    if ("text".equals(block.path("type").asString(""))) {
                        return block.path("text").asString();
                    }
                }
            }
        }

        throw new RuntimeException("No model_output text step found in Gemini response: " + response);
    }

    private String buildPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate a professional email reply for the following email content. ");

        if (emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()) {
            prompt.append("Use a ")
                    .append(emailRequest.getTone())
                    .append(" tone.\n");
        }

        prompt.append("Original Email: \n")
                .append(emailRequest.getEmailContent());

        return prompt.toString();
    }
}