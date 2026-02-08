/**
 * Project Description Validation
 *
 * Uses AI to validate that project descriptions are legal, non-threatening,
 * and researchable via standard U.S. web search.
 */

import type { LLMProvider } from "../interfaces/llm-provider";
import type { ValidateProjectDescriptionResult } from "../models/ai";

const VALIDATION_TEMPERATURE = 0.2;

const SYSTEM_PROMPT = `You are a content moderator for a research project platform. Your job is to determine whether a project description is allowed for web research.

A description is INVALID (valid: false) if it:
1. Contains or solicits illegal content: child exploitation, fraud, identity theft, involuntary explicit content, or other illegal material
2. Contains threatening or harmful content: violence, terrorism, self-harm promotion, threats to individuals, or instructions for harming others
3. Asks for content that cannot be researched via standard U.S. web search: material that would be blocked or heavily restricted by major search engines (e.g., Google SafeSearch, typical Terms of Service) such as certain explicit adult content, illegal marketplaces, or content that violates platform policies

A description is VALID (valid: true) if it describes a legitimate research topic that can be found via normal web search: technology, business, science, news, industry trends, competitor analysis, academic research, product updates, etc.

Be permissive for legitimate research topics. Only reject clear violations.`;

const USER_PROMPT_TEMPLATE = `Evaluate this project description for a web research tool:

---
${"DESCRIPTION"}
---

Return ONLY a JSON object with exactly these fields:
- valid: boolean - true if the description is allowed, false otherwise
- reason: string (required only when valid is false) - a brief, user-friendly explanation (1-2 sentences) of why the description is not allowed. Do not include legal or technical jargon.

Example valid response: {"valid": true}
Example invalid response: {"valid": false, "reason": "This description asks for content that violates platform policies."}`;

/**
 * Validates a project description using AI to ensure it is legal, non-threatening,
 * and researchable via standard U.S. web search.
 *
 * @param llmProvider - The LLM provider (e.g., OpenAI) for classification
 * @param description - The project description to validate
 * @returns Promise with valid flag and optional reason when invalid
 */
export async function validateProjectDescription(
  llmProvider: LLMProvider,
  description: string
): Promise<ValidateProjectDescriptionResult> {
  const trimmed = description?.trim() ?? "";
  if (!trimmed) {
    return { valid: false, reason: "Project description is required." };
  }

  const userPrompt = USER_PROMPT_TEMPLATE.replace("DESCRIPTION", trimmed);

  const response = await llmProvider.query(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    VALIDATION_TEMPERATURE
  );

  const parsed = response as { valid?: boolean; reason?: string };

  if (typeof parsed?.valid !== "boolean") {
    // If AI returns unexpected format, fail open with a generic message
    // (treat as internal error - caller may want to retry or return 500)
    throw new Error("Invalid response format from AI validation");
  }

  return {
    valid: parsed.valid,
    reason: parsed.valid === false ? parsed.reason || "Project description is not allowed." : undefined,
  };
}
